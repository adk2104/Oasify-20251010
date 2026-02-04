import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ActionFunctionArgs } from 'react-router';
import { getSession } from '~/sessions.server';
import { db } from '~/db/config';
import { comments } from '~/db/schema';
import { eq, and } from 'drizzle-orm';

if (!process.env.GOOGLE_AI_API_KEY) {
  throw new Error('Google AI API key required');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

const REPLY_SYSTEM_PROMPT = `You are helping a content creator respond to comments on their videos/posts.

Generate a friendly, authentic reply that:
- Is 1-2 sentences max (keep it brief!)
- Sounds natural and conversational, not corporate
- Shows appreciation when appropriate
- Addresses the comment's content directly
- Uses a warm, positive tone
- Doesn't overuse emojis (0-1 emoji max)
- Matches the energy of a real creator, not a bot

Examples of good replies:
- "Thanks so much! Means a lot 💕"
- "Right?! It's become my go-to lately"
- "Ahh I know, I'll try to film that tutorial soon!"
- "Haha yes exactly my thoughts too"
- "Oh good catch, I'll pin the correct link!"

Return ONLY the reply text. No quotes, no explanations.`;

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'));
  const userId = session.get('userId') as number;
  
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const formData = await request.formData();
  const commentId = formData.get('commentId') as string;
  
  if (!commentId) {
    return Response.json({ error: 'Comment ID required' }, { status: 400 });
  }
  
  try {
    // Fetch the comment
    const [comment] = await db
      .select({
        text: comments.text,
        empathicText: comments.empathicText,
        author: comments.author,
        videoTitle: comments.videoTitle,
      })
      .from(comments)
      .where(and(
        eq(comments.id, parseInt(commentId)),
        eq(comments.userId, userId)
      ));
    
    if (!comment) {
      return Response.json({ error: 'Comment not found' }, { status: 404 });
    }
    
    // Build the prompt with context
    const contextPrompt = `Generate a reply to this comment:

Comment by ${comment.author}: "${comment.text}"
${comment.videoTitle ? `On video: "${comment.videoTitle}"` : ''}

Reply:`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: contextPrompt }] }],
      systemInstruction: REPLY_SYSTEM_PROMPT,
    });
    
    const suggestedReply = result.response.text()?.trim();
    
    return Response.json({ 
      suggestedReply,
      commentId,
    });
  } catch (error) {
    console.error('[Suggest Reply API] Error:', error);
    return Response.json({ 
      error: 'Failed to generate suggestion. Please try again.' 
    }, { status: 500 });
  }
}
