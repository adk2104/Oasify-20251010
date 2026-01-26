import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

// CLASSIFICATION PROMPT - Pass 1: Quick check if comment needs transformation
const CLASSIFICATION_PROMPT = `Classify this comment as either POSITIVE or NEGATIVE.

POSITIVE = The comment is genuinely supportive, kind, complimentary, or asking a helpful question. No transformation needed.
NEGATIVE = The comment needs transformation. Includes:
- Critical, harsh, mean, or attacking comments
- Dismissive comments ("bla blah", "I don't care", "nothing new", "boring")
- Sarcastic or condescending comments ("Please google how to...", "you don't know...")
- Frustration or complaints (even mild ones like "I can't open the link!")
- Backhanded compliments or passive-aggressive tone
- Any negativity toward the creator, their content, sponsors, or appearance

Important edge cases:
- Comments defending the creator but attacking others (e.g., "whoever called you fat is dumb") = POSITIVE (supportive intent)
- Genuine supportive questions ("Where did you get that?", "What product is that?") = POSITIVE
- Gibberish or dismissive nonsense ("bla blah", "meh") = NEGATIVE
- Sarcasm disguised as questions = NEGATIVE
- Mild frustration or complaints = NEGATIVE (err on side of transforming)
- Questions with implied criticism ("Why did you skip...", "Why don't you...") = NEGATIVE
- Questions that sound like challenges or complaints = NEGATIVE

When in doubt, classify as NEGATIVE (better to transform unnecessarily than miss negativity).

Return ONLY one word: POSITIVE or NEGATIVE`;

// Edit this system prompt to control how comments are transformed
const EMPATHIC_SYSTEM_PROMPT = `TASK:
You are transforming what the COMMENTER wrote, NOT creating a response to them.
The output should still sound like it came FROM the commenter's perspective, just in a more empathetic way.

Transform the given comment according to these rules:

Purely negative/trolling comments (no constructive feedback): Replace entirely with a positive compliment
Negative comments with constructive feedback: Keep the constructive part, but reframe the negativity into encouragement
Dismissive/condescending comments with disagreement: Start with something positive, then preserve the valid point but soften the condescending tone (e.g., "Please google how to say words" → "I love these videos, i noticed your pronunciation is a little different")
Positive comments: Leave unchanged (including celebrity comparisons, compliments, and praise)
Questions: Preserve the question to foster communication, but add positive framing
Neutral comments: Add a gentle, encouraging tone while keeping the core meaning
Vague dismissive comments ("I don't care", "nothing new"): Transform to brief positive acknowledgment
Personal appearance attacks: Shift focus to a different but genuine compliment (e.g., lip filler criticism → compliment their smile)
Vague negative observations: Transform into specific positive enthusiasm (e.g., "overboard" → "love how over-the-top it is!")
Constructive criticism buried in harsh negativity: Add positive lead-in, then preserve constructive advice in personal/casual tone
Product/brand disagreements: Use "personally" to frame as personal opinion, soften harsh language, then redirect to something positive about the actual video/content (e.g., "VS products are awful" → "i don't personally like VS products, but i love this video")
Requests or help-seeking comments: Keep the original request intact, add positive enthusiasm like "would love to", and include a polite follow-up question to foster communication (e.g., "I don't see the link" → "i don't see the link, would love to purchase them, could you post it?")


EXAMPLES:
Input: "you look fat"
Output: "you look so beautiful"
Input: "i don't like this app, it's too ugly"
Output: "i love this app and I think possibly the design could be improved"
Input: "your editing is bad but the topic is interesting"
Output: "the topic is really interesting! the editing could be refined to make it even better"
Input: "Based on this video, I can tell you have no actual clue what a real narcissist is, and for that reason, I agree you should stop using the term."
Output: "I think there might be more to clinical narcissism than what was covered here, though I agree with your point about the term being overused."
Input: "I think you can go about it your new way and you will find yourself in relationships with people who won't give you the same grace and treatment but will take for granted that you are the emotional mature one...and those types of people are probably..."
Output: "I wonder if this approach might lead to one-sided relationships where your emotional maturity gets taken for granted"
Input: "I. Don't. Care."
Output: "this is interesting!"
Input: "Like literally nothing new"
Output: "good to see more content on this topic"
Input: "Why this irritating VOCAL FRY though"
Output: "i love how unique your voice sounds!"
Input: "Please boycott Dove!"
Output: "not personally a big fan of Dove but I like the other products"
Input: "Gorgeous makeup! Just a little advice, don't blow your brushes, it's not hygienic"
Output: "Gorgeous makeup, I'm a little concerned that you're blowing on your brushes, hygiene is so important, but overall love the video"
Input: "If you don't use a wash cloth your not clean"
Output: "i think using a washcloth is really helpful for thorough cleansing and exfoliation!"
Input: "Not u using just ur hands to wash ur body  I had to click off"
Output: "i personally like using a washcloth or loofah to help with exfoliation and reaching all areas"
Input: "Ur probably not a narcissist one, two if anyone knows the true npd there's so many layers of triangulation isolation manipulation etc etc yes we can act narcissistic but this is not pure npd. Having empathy with someone who suffers of NPD is putting your neck on the line. They quite literally want you to die. This is spreading dangerous misinformation."
Output: "I appreciate the nuance about narcissistic behaviors versus NPD. My concern is that clinical NPD involves serious patterns of manipulation, and I worry this perspective might not account for how challenging those relationships can be."
Input: "love this so much!"
Output: "love this so much!"
Input: "Your sooo Megan fox"
Output: "Your sooo Megan fox"
Input: "this video is boring and useless"
Output: "this video has some interesting points"
Input: "you don't know what you're talking about"
Output: "I see this topic differently, but appreciate your perspective"
Input: "Why she skip application"
Output: "I love this video, but why did you skip the application?"
Input: "Please google how to say words. Ethereal? Sepia?"
Output: "I love these videos, i noticed your pronunciation of these words is a little different than what I recall though"
Input: "A bit overboard"
Output: "I love how over-the-top the makeup is!"
Input: "looking at your lip, now i remember again how unnatural and uncanny lip filler look like"
Output: "I love your smile!"
Input: "Idk why we idolize people like Kylie Jenner when women like this girl exist . You are so beautiful"
Output: "I know we all idolize Kylie Jenner, but you are also so incredibly beautiful!"
Input: "Victoria Secret may not be dead but I see rolls of plastic in your future."
Output: "Victoria Secret isn't dead, thanks for showing us these makeup techniques"
Input: "I have to disagree, the quality of VS clothing and lingerie is awful and cheap! I have tried to give them plenty of chances and they disappoint every time... and mold in the perfumes. I'm good…"
Output: "i don't personally like VS products that much, but i still love this video, your makeup look is amazing"
Input: "I don't see the link to the affordable brushes"
Output: "i don't see the link to the affordable brushes, would love to be able to purchase them, could you post the link?"
Input: "这个视频太烂了" (This video is terrible)
Output: "您的视频很好，感谢你的分享" (Thank you for sharing)

GUARDRAILS:

ALWAYS preserve the original language (if Chinese stays Chinese, if English stays English, etc.)
NEVER include explanations, reasoning, or meta-commentary about your changes
NEVER add phrases like "Here's the transformed version:" or "I changed this because..."
The transformed comment must maintain the commenter's perspective - avoid phrases that sound like the creator responding (e.g., "thanks for sharing your video" sounds like a response, not a transformed comment)
Keep the commenter's voice - they're still addressing the creator, just more kindly
When transforming dismissive comments, keep the disagreement but remove personal attacks and condescension
Use words like "wonder," "concerned," and "worry" to add curiosity and soften critical comments while preserving the substance
If you cannot determine language or intent, default to a simple kind compliment in the original language
For personal appearance criticisms, transform into genuine compliments about that specific aspect (voice, appearance, style, etc.)


OUTPUT FORMAT:
Return ONLY the transformed comment text. Nothing else.`;

// Initialize AI clients
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Smart truncation: truncate to maxLength but try to break at sentence end
function truncateSmartly(text: string, maxLength: number = 300): string {
  if (!text || text.length <= maxLength) {
    return text;
  }

  // Truncate to maxLength
  let truncated = text.slice(0, maxLength);

  // Look for sentence end in last 50 chars
  const lastPeriod = truncated.lastIndexOf('. ');
  const lastQuestion = truncated.lastIndexOf('? ');
  const lastExclaim = truncated.lastIndexOf('! ');
  const lastBreak = Math.max(lastPeriod, lastQuestion, lastExclaim);

  // If we found a sentence break in last 50 chars, use that
  if (lastBreak > maxLength - 50) {
    return truncated.slice(0, lastBreak + 1);
  }

  // Otherwise just truncate at maxLength
  return truncated + '...';
}

// Try Gemini 2.5 Flash (primary)
async function tryGemini(
  commentText: string,
  fullSystemPrompt: string
): Promise<string | null> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: commentText }] }],
      systemInstruction: fullSystemPrompt,
    });
    const text = result.response.text();
    if (text) {
      console.log('[AI:Gemini] Success:', text.substring(0, 100));
      return text;
    }
    return null;
  } catch (error) {
    console.log('[AI:Gemini] Error:', error);
    return null;
  }
}

// Try GPT-4o-mini (fallback)
async function tryOpenAI(
  commentText: string,
  fullSystemPrompt: string
): Promise<string | null> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: fullSystemPrompt },
        { role: 'user', content: commentText },
      ],
    });
    const text = response.choices[0]?.message?.content;
    if (text) {
      console.log('[AI:OpenAI] Success:', text.substring(0, 100));
      return text;
    }
    return null;
  } catch (error) {
    console.log('[AI:OpenAI] Error:', error);
    return null;
  }
}

// Pass 1: Classify comment as positive or negative
async function classifyComment(commentText: string): Promise<'POSITIVE' | 'NEGATIVE'> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: commentText }] }],
      systemInstruction: CLASSIFICATION_PROMPT,
    });
    const responseText = result.response.text()?.trim().toUpperCase() || '';
    
    if (responseText.includes('POSITIVE')) {
      console.log('[AI:Classify] POSITIVE - skipping transformation');
      return 'POSITIVE';
    }
    console.log('[AI:Classify] NEGATIVE - will transform');
    return 'NEGATIVE';
  } catch (error) {
    console.log('[AI:Classify] Error, defaulting to NEGATIVE:', error);
    return 'NEGATIVE'; // Default to transforming on error
  }
}

// Batch processing configuration
const BATCH_SIZE = 5;

// Process multiple comments in parallel (for sync operations)
export async function generateEmpathicVersionsBatch(
  comments: Array<{
    id: number;
    text: string;
    videoTitle?: string;
    videoDescription?: string;
  }>
): Promise<Array<{ id: number; text: string; empathicText: string; skipped: boolean }>> {
  console.log(`[AI:Batch] Processing ${comments.length} comments in batches of ${BATCH_SIZE}`);
  
  const results: Array<{ id: number; text: string; empathicText: string; skipped: boolean }> = [];
  
  // Process in batches
  for (let i = 0; i < comments.length; i += BATCH_SIZE) {
    const batch = comments.slice(i, i + BATCH_SIZE);
    console.log(`[AI:Batch] Batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(comments.length/BATCH_SIZE)}`);
    
    // Step 1: Classify all comments in parallel
    const classifications = await Promise.all(
      batch.map(async (comment) => ({
        ...comment,
        classification: await classifyComment(comment.text),
      }))
    );
    
    // Step 2: Transform only negative comments in parallel
    const transformPromises = classifications.map(async (item) => {
      if (item.classification === 'POSITIVE') {
        return {
          id: item.id,
          text: item.text,
          empathicText: item.text, // Return original for positive
          skipped: true,
        };
      }
      
      // Transform negative comment
      const empathicText = await transformComment(
        item.text,
        item.videoTitle,
        item.videoDescription
      );
      
      return {
        id: item.id,
        text: item.text,
        empathicText,
        skipped: false,
      };
    });
    
    const batchResults = await Promise.all(transformPromises);
    results.push(...batchResults);
    
    const skipped = batchResults.filter(r => r.skipped).length;
    console.log(`[AI:Batch] Completed: ${batchResults.length - skipped} transformed, ${skipped} skipped`);
  }
  
  return results;
}

// Transform a single comment (Pass 2 only - used by batch function)
async function transformComment(
  commentText: string,
  videoTitle?: string,
  videoDescription?: string
): Promise<string> {
  // Truncate description to 300 chars with smart breaking
  const truncatedDescription = videoDescription
    ? truncateSmartly(videoDescription, 300)
    : undefined;

  // Build context-aware system prompt
  const contextSection = (videoTitle || truncatedDescription)
    ? `\n\nVIDEO CONTEXT:\n` +
      (videoTitle ? `Title: "${videoTitle}"\n` : '') +
      (truncatedDescription ? `Description: "${truncatedDescription}"\n` : '') +
      `Use this context to better understand the comment's intent.`
    : '';

  const fullSystemPrompt = EMPATHIC_SYSTEM_PROMPT + contextSection;

  // Try Gemini 2.5 Flash first
  const geminiResult = await tryGemini(commentText, fullSystemPrompt);
  if (geminiResult) return geminiResult;

  // Fallback to GPT-4o-mini
  const openaiResult = await tryOpenAI(commentText, fullSystemPrompt);
  if (openaiResult) return openaiResult;

  // If both fail, return original
  return commentText;
}

// Single comment processing (keeps backward compatibility)
export async function generateEmpathicVersion(
  commentText: string,
  videoTitle?: string,
  videoDescription?: string
): Promise<string> {
  console.log('[AI] Processing:', commentText.substring(0, 50));

  // PASS 1: Classify comment
  const classification = await classifyComment(commentText);
  
  // If positive, return original (no transformation needed)
  if (classification === 'POSITIVE') {
    return commentText;
  }

  // PASS 2: Transform negative comments
  console.log('[AI] Transforming negative comment...');
  console.log('[AI] Video title:', videoTitle || 'N/A');

  // Truncate description to 300 chars with smart breaking
  const truncatedDescription = videoDescription
    ? truncateSmartly(videoDescription, 300)
    : undefined;

  // Build context-aware system prompt
  const contextSection = (videoTitle || truncatedDescription)
    ? `\n\nVIDEO CONTEXT:\n` +
      (videoTitle ? `Title: "${videoTitle}"\n` : '') +
      (truncatedDescription ? `Description: "${truncatedDescription}"\n` : '') +
      `Use this context to better understand the comment's intent. For example:\n- Negative comments on obviously humorous/satirical video titles might be playful\n- Disagreements on opinion videos (e.g., "Why X is Better") are natural debate\n- Criticism on tutorial videos might be genuinely helpful corrections\n- Consider whether the comment tone matches the video's tone/topic`
    : '';

  const fullSystemPrompt = EMPATHIC_SYSTEM_PROMPT + contextSection;

  // Try Gemini 2.5 Flash first (primary)
  const geminiResult = await tryGemini(commentText, fullSystemPrompt);
  if (geminiResult) {
    return geminiResult;
  }

  // Fallback to GPT-4o-mini
  console.log('[AI] Gemini failed, trying OpenAI fallback...');
  const openaiResult = await tryOpenAI(commentText, fullSystemPrompt);
  if (openaiResult) {
    return openaiResult;
  }

  // If both fail, return original comment
  console.log('[AI] All providers failed, returning original');
  return commentText;
}
