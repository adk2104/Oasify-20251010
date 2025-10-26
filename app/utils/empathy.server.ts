import Anthropic from '@anthropic-ai/sdk';

// Edit this system prompt to control how comments are transformed
const EMPATHIC_SYSTEM_PROMPT = `You are a helpful assistant that transforms YouTube comments into friendlier, more empathetic versions. Your goal is to:

- Soften harsh or negative language while preserving the core message
- Make criticism more constructive and kind
- Remove toxicity, rudeness, or aggressive tone
- Keep the comment authentic - don't make it fake or overly positive
- Maintain brevity - don't make it longer than necessary

Return ONLY the transformed comment text, nothing else.`;

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
      console.log('[AI] Success');
      return textContent.text;
    }

    return commentText; // Fallback to original
  } catch (error) {
    console.log('[AI ERROR]', error);
    return commentText; // Fallback to original on error
  }
}
