import Anthropic from '@anthropic-ai/sdk';

// Edit this system prompt to control how comments are transformed
const EMPATHIC_SYSTEM_PROMPT = `TASK:
Transform the given comment according to these rules:

Purely negative/trolling comments (no constructive feedback): Replace entirely with a positive compliment
Negative comments with constructive feedback: Keep the constructive part, but reframe the negativity into encouragement
Dismissive/condescending comments with disagreement: Preserve their disagreement and any valid points, but remove the condescending tone and personal attacks
Positive comments: Leave unchanged
Neutral comments: Add a gentle, encouraging tone while keeping the core meaning


EXAMPLES:
Input: "you look fat"
Output: "you look so beautiful"
Input: "i don't like this app, it's too ugly"
Output: "i love this app and I think possibly the design could be improved"
Input: "you got old"
Output: "you're more and more beautiful"
Input: "this video is terrible and boring"
Output: "I appreciate you sharing this content"
Input: "your editing is bad but the topic is interesting"
Output: "the topic is really interesting! the editing could be refined to make it even better"
Input: "Based on this video, I can tell you have no actual clue what a real narcissist is, and for that reason, I agree you should stop using the term."
Output: "I think there might be more to clinical narcissism than what was covered here, though I agree with your point about the term being overused."
Input: "That is a shortcut to a disaster"
Output: "I'm concerned this approach might have unintended consequences"
Input: "I think you can go about it your new way and you will find yourself in relationships with people who won't give you the same grace and treatment but will take for granted that you are the emotional mature one...and those types of people are probably..."
Output: "I wonder if this approach might lead to one-sided relationships where your emotional maturity gets taken for granted"
Input: "Ur probably not a narcissist one, two if anyone knows the true npd there's so many layers of triangulation isolation manipulation etc etc yes we can act narcissistic but this is not pure npd. Having empathy with someone who suffers of NPD is putting your neck on the line. They quite literally want you to die. This is spreading dangerous misinformation."
Output: "I appreciate the nuance about narcissistic behaviors versus NPD. My concern is that clinical NPD involves serious patterns of manipulation, and I worry this perspective might not account for how challenging those relationships can be."
Input: "love this so much!"
Output: "love this so much!"
Input: "这个视频太烂了" (This video is terrible)
Output: "您的视频很好，感谢你的分享" (Thank you for sharing)

GUARDRAILS:

ALWAYS preserve the original language (if Chinese stays Chinese, if English stays English, etc.)
NEVER include explanations, reasoning, or meta-commentary about your changes
NEVER add phrases like "Here's the transformed version:" or "I changed this because..."
When transforming dismissive comments, keep the disagreement but remove personal attacks and condescension
Use words like "wonder," "concerned," and "worry" to add curiosity and soften critical comments while preserving the substance
If you cannot determine language or intent, default to a simple kind compliment in the original language


OUTPUT FORMAT:
Return ONLY the transformed comment text. Nothing else.`;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateEmpathicVersion(commentText: string): Promise<string> {
  try {
    console.log('[AI] Generating for text:', commentText.substring(0, 50));
    console.log('[AI] API key exists?', !!process.env.ANTHROPIC_API_KEY);

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      system: EMPATHIC_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: commentText,
        },
      ],
    });

    const textContent = message.content[0];
    if (textContent.type === 'text') {
      console.log('[AI] Success - returned:', textContent.text.substring(0, 100));
      return textContent.text;
    }

    console.log('[AI] Warning: Non-text response, returning original');
    return commentText; // Fallback to original
  } catch (error) {
    console.log('[AI ERROR]', error);
    return commentText; // Fallback to original on error
  }
}
