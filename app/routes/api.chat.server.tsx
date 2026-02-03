import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Route } from "./+types/api.chat.server";
import { getSession } from '~/sessions.server';
import { db } from '~/db/config';
import { sql } from 'drizzle-orm';

// Lazy-load the AI client to avoid module-level errors
let genAI: GoogleGenerativeAI | null = null;
function getGenAI() {
  if (!genAI) {
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error('Google AI API key required');
    }
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
  }
  return genAI;
}

// Database schema for the AI to understand
const DATABASE_SCHEMA = `
comments table (PostgreSQL):
- id: SERIAL PRIMARY KEY
- user_id: INTEGER NOT NULL (ALWAYS filter by this for security)
- comment_id: TEXT NOT NULL (platform-specific comment ID)
- parent_id: INTEGER (references comments.id for replies)
- author: TEXT NOT NULL (commenter's name/handle)
- author_avatar: TEXT (URL to avatar)
- text: TEXT NOT NULL (original comment text)
- empathic_text: TEXT (transformed empathic version, NULL if comment was already positive)
- video_title: TEXT (title of video/post)
- video_id: TEXT (YouTube video ID or Instagram media ID)
- video_thumbnail: TEXT (thumbnail URL)
- video_permalink: TEXT (Instagram permalink, NULL for YouTube)
- platform: platform_enum ('youtube' or 'instagram')
- is_reply: BOOLEAN (true if this is a reply to another comment)
- reply_count: INTEGER (number of replies to this comment)
- is_owner: BOOLEAN (true if comment is from the content creator)
- feedback: TEXT ('up', 'down', or NULL - user feedback on translation)
- feedback_at: TIMESTAMP
- sentiment: sentiment_enum ('positive', 'negative', 'neutral', 'constructive')
- created_at: TIMESTAMP NOT NULL (when comment was posted)
- fetched_at: TIMESTAMP NOT NULL (when we fetched it)

IMPORTANT NOTES:
- empathic_text = text means the comment was positive and didn't need transformation
- empathic_text != text means the comment was negative/harsh and was transformed
- sentiment can be NULL if not yet classified
- Use ILIKE for case-insensitive text searches
- For date filtering, use created_at (e.g., created_at > NOW() - INTERVAL '7 days')
`;

const SQL_GENERATION_PROMPT = `You are a SQL query generator for a comments analytics database.

${DATABASE_SCHEMA}

RULES:
1. ONLY generate SELECT queries - no INSERT, UPDATE, DELETE, DROP, etc.
2. ALWAYS include "WHERE user_id = $1" to filter by the current user's data
3. Add "LIMIT 100" unless the user specifically asks for more (max 500)
4. For text searches, use ILIKE with % wildcards
5. Return ONLY the SQL query, no explanation or markdown code blocks
6. If the question cannot be answered with a SQL query, respond with: CANNOT_QUERY: [reason]
7. Use column aliases to make results readable (e.g., AS comment_count)
8. For "most" or "top" queries, use ORDER BY ... DESC
9. For sentiment analysis, use the sentiment column when available, otherwise compare empathic_text to text

Example queries:
- "comments mentioning dogs" → SELECT author, text, video_title, created_at FROM comments WHERE user_id = $1 AND text ILIKE '%dog%' ORDER BY created_at DESC LIMIT 100
- "top commenters" → SELECT author, COUNT(*) as comment_count FROM comments WHERE user_id = $1 GROUP BY author ORDER BY comment_count DESC LIMIT 20
- "negative comments this week" → SELECT author, text, video_title, created_at FROM comments WHERE user_id = $1 AND sentiment = 'negative' AND created_at > NOW() - INTERVAL '7 days' ORDER BY created_at DESC LIMIT 100
- "which videos got most comments" → SELECT video_title, video_id, platform, COUNT(*) as comment_count FROM comments WHERE user_id = $1 AND video_title IS NOT NULL GROUP BY video_title, video_id, platform ORDER BY comment_count DESC LIMIT 20

Now generate a SQL query for this question:`;

// Detect if user wants comprehensive analysis
const COMPREHENSIVE_ANALYSIS_KEYWORDS = [
  'improve', 'improvement', 'feedback', 'suggestions', 'overview', 'insights',
  'analyze', 'analysis', 'comprehensive', 'broad', 'overall', 'summary',
  'what should i', 'how can i', 'what can i learn', 'tell me about my',
  'patterns', 'trends', 'takeaways', 'learnings', 'advice'
];

function needsComprehensiveAnalysis(question: string): boolean {
  const lower = question.toLowerCase();
  return COMPREHENSIVE_ANALYSIS_KEYWORDS.some(keyword => lower.includes(keyword));
}

const COMPREHENSIVE_ANALYSIS_PROMPT = `You are an expert content strategist analyzing audience feedback for a creator.

Based on the sample of comments below, provide a comprehensive analysis with actionable insights.

Structure your response like this:

## 🎯 Key Takeaways
(3-5 bullet points of the most important patterns you noticed)

## 💚 What's Working Well
(What viewers love - backed by specific comment themes)

## 🔧 Areas for Improvement  
(Constructive criticism patterns - be specific and actionable)

## 💡 Content Ideas
(Based on what viewers are asking for or responding to)

## 📊 Sentiment Overview
(Quick summary of the emotional tone across comments)

Be specific, cite actual comment themes, and make your suggestions actionable.
Keep it concise but insightful - this should feel like a mini consulting session.

The creator asked: "{question}"

Here are the comments to analyze:
`;

const RESPONSE_FORMATTING_PROMPT = `You are an analytics assistant for Oasify, an app that helps creators manage comments.

Format the query results into a helpful, friendly response. Be concise but informative.
- Use bullet points or numbered lists when showing multiple items
- If results are empty, explain what that means and suggest alternatives
- Highlight interesting patterns or insights when relevant
- Keep responses conversational but data-focused
- If there are many results, summarize the key findings
- Format dates in a human-readable way
- Don't just dump the data - add context and meaning

The user asked: "{question}"

Here are the query results:
`;

// Validate that the generated SQL is safe to execute
function validateSQL(query: string, userId: number): { valid: boolean; error?: string; sanitized?: string } {
  const upperQuery = query.toUpperCase().trim();
  
  // Check for CANNOT_QUERY response
  if (upperQuery.startsWith('CANNOT_QUERY:')) {
    return { valid: false, error: query.substring('CANNOT_QUERY:'.length).trim() };
  }
  
  // Only allow SELECT
  if (!upperQuery.startsWith('SELECT')) {
    return { valid: false, error: 'Only SELECT queries are allowed' };
  }
  
  // Block dangerous operations that might slip through
  const dangerous = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER', 'CREATE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', '--', ';SELECT', '; SELECT'];
  for (const keyword of dangerous) {
    // Check if these appear after SELECT (would indicate injection attempt)
    const afterSelect = upperQuery.substring(6);
    if (afterSelect.includes(keyword)) {
      return { valid: false, error: `Query contains forbidden keyword: ${keyword}` };
    }
  }
  
  // Ensure user_id = $1 is present
  if (!query.includes('user_id = $1') && !query.includes('user_id=$1')) {
    return { valid: false, error: 'Query must filter by user_id = $1' };
  }
  
  // Ensure there's a LIMIT (add one if missing)
  let sanitized = query.trim();
  if (!upperQuery.includes('LIMIT')) {
    sanitized += ' LIMIT 100';
  }
  
  // Remove any trailing semicolons (prevent multiple statements)
  sanitized = sanitized.replace(/;+\s*$/, '');
  
  return { valid: true, sanitized };
}

// Execute the validated SQL query
async function executeQuery(query: string, userId: number): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    // Extra safety: ensure userId is a valid positive integer
    if (!Number.isInteger(userId) || userId <= 0) {
      return { success: false, error: 'Invalid user ID' };
    }
    
    // Replace $1 with the actual userId value
    // userId is validated above and comes from server session, so this is safe
    const finalQuery = query.replace(/\$1/g, userId.toString());
    
    // Execute raw SQL - drizzle-orm with postgres-js returns array directly
    const result = await db.execute(sql.raw(finalQuery));
    
    // Drizzle returns different structures based on adapter
    // For postgres-js, it's an array directly
    const rows = Array.isArray(result) ? result : (result as any).rows || [];
    
    return { success: true, data: rows };
  } catch (error: any) {
    console.error('[Chat API] Query execution error:', error);
    return { success: false, error: error.message || 'Query execution failed' };
  }
}

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get('Cookie'));
  const userId = session.get('userId') as number;
  
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const formData = await request.formData();
  const userMessage = formData.get('message') as string;
  
  if (!userMessage?.trim()) {
    return Response.json({ error: 'Message required' }, { status: 400 });
  }
  
  try {
    const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    // Check if user wants comprehensive analysis
    if (needsComprehensiveAnalysis(userMessage)) {
      console.log('[Chat API] Comprehensive analysis requested');
      
      // Fetch a diverse sample of comments for analysis
      const sampleQueries = [
        `SELECT text, video_title, sentiment, created_at FROM comments WHERE user_id = ${userId} AND sentiment = 'negative' ORDER BY created_at DESC LIMIT 15`,
        `SELECT text, video_title, sentiment, created_at FROM comments WHERE user_id = ${userId} AND sentiment = 'positive' ORDER BY created_at DESC LIMIT 15`,
        `SELECT text, video_title, sentiment, created_at FROM comments WHERE user_id = ${userId} AND sentiment = 'constructive' ORDER BY created_at DESC LIMIT 10`,
        `SELECT text, video_title, sentiment, created_at FROM comments WHERE user_id = ${userId} AND sentiment = 'neutral' ORDER BY created_at DESC LIMIT 10`,
      ];
      
      const allComments: any[] = [];
      for (const query of sampleQueries) {
        try {
          const result = await db.execute(sql.raw(query));
          const rows = Array.isArray(result) ? result : (result as any).rows || [];
          allComments.push(...rows);
        } catch (e) {
          console.error('[Chat API] Sample query error:', e);
        }
      }
      
      console.log('[Chat API] Fetched', allComments.length, 'comments for analysis');
      
      if (allComments.length === 0) {
        return Response.json({
          response: "I don't have any comments to analyze yet. Once you sync some comments from YouTube or Instagram, I'll be able to give you comprehensive insights!",
          timestamp: new Date().toISOString(),
          analysisType: 'comprehensive',
        });
      }
      
      // Format comments for analysis
      const commentsForAnalysis = allComments.map(c => 
        `[${c.sentiment || 'unknown'}] "${c.text}" - on "${c.video_title || 'Unknown video'}"`
      ).join('\n\n');
      
      const analysisPrompt = COMPREHENSIVE_ANALYSIS_PROMPT.replace('{question}', userMessage) + '\n\n' + commentsForAnalysis;
      
      const analysisResult = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: analysisPrompt }] }],
      });
      
      console.log('[Chat API] Comprehensive analysis complete');
      
      return Response.json({
        response: analysisResult.response.text(),
        timestamp: new Date().toISOString(),
        analysisType: 'comprehensive',
        commentsSampled: allComments.length,
      });
    }
    
    // Phase 1: Generate SQL query from natural language
    const sqlGenResult = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `${SQL_GENERATION_PROMPT}\n\n"${userMessage}"` }] }],
    });
    
    const generatedSQL = sqlGenResult.response.text().trim();
    console.log('[Chat API] Generated SQL:', generatedSQL);
    
    // Validate the generated SQL
    const validation = validateSQL(generatedSQL, userId);
    
    if (!validation.valid) {
      // If the AI said it can't query, or if there's a validation error
      // Ask the AI to respond helpfully without data
      const helpfulResponse = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        systemInstruction: `You are an analytics assistant for Oasify. The user asked a question that cannot be answered with the available comment data.

The database contains: comments with author, text, video titles, sentiment, timestamps, and platform info.

Either explain what data IS available and how they could rephrase their question, or if it's a general greeting/chat, respond naturally.

Reason the query couldn't be generated: ${validation.error}`,
      });
      
      return Response.json({
        response: helpfulResponse.response.text(),
        timestamp: new Date().toISOString(),
        queryGenerated: false,
      });
    }
    
    // Phase 2: Execute the validated query
    console.log('[Chat API] Executing query:', validation.sanitized);
    const queryResult = await executeQuery(validation.sanitized!, userId);
    console.log('[Chat API] Query result:', queryResult.success, 'rows:', queryResult.data?.length);
    
    if (!queryResult.success) {
      console.error('[Chat API] Query failed:', queryResult.error);
      
      // Try to give a helpful response about the error
      const errorResponse = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        systemInstruction: `You are an analytics assistant. There was an error running the database query for the user's question.

Error: ${queryResult.error}

Apologize briefly and suggest they rephrase their question or try a simpler query. Be helpful and friendly.`,
      });
      
      return Response.json({
        response: errorResponse.response.text(),
        timestamp: new Date().toISOString(),
        queryGenerated: true,
        queryError: true,
      });
    }
    
    // Phase 3: Format the results into a nice response
    const resultsJSON = JSON.stringify(queryResult.data, null, 2);
    const resultCount = queryResult.data?.length || 0;
    
    const formattingPrompt = `${RESPONSE_FORMATTING_PROMPT.replace('{question}', userMessage)}

Number of results: ${resultCount}
${resultCount > 0 ? `\nData:\n${resultsJSON}` : '\nNo results found.'}

${resultCount > 50 ? '\nNote: Results were limited. Summarize the key findings rather than listing everything.' : ''}`;
    
    console.log('[Chat API] Formatting response with Gemini...');
    const formattedResponse = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: formattingPrompt }] }],
    });
    console.log('[Chat API] Got formatted response');
    
    return Response.json({
      response: formattedResponse.response.text(),
      timestamp: new Date().toISOString(),
      queryGenerated: true,
      resultCount,
      // Include query for debugging (only in development)
      ...(process.env.NODE_ENV === 'development' && { query: validation.sanitized }),
    });
  } catch (error) {
    console.error('[Chat API] Error:', error);
    return Response.json({
      error: 'Failed to process your question. Please try again.'
    }, { status: 500 });
  }
}
