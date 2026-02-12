import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

// CLASSIFICATION PROMPT - Pass 1: Quick check if comment needs transformation
const CLASSIFICATION_PROMPT = `Classify this comment as exactly one category: POSITIVE, NEGATIVE, NEUTRAL, or SEXUAL.

CATEGORIES:
- POSITIVE = Clearly supportive/kind/complimentary already. No transformation needed.
- NEGATIVE = Critical, harsh, insulting, dismissive, sarcastic, or complaint-heavy comments that should be softened/transformed.
- NEUTRAL = Mixed/flat/unclear comments that are not clearly positive and not clearly hostile. These should get a light positive polish.
- SEXUAL = Sexual, objectifying, fetishizing, body-part-focused, or suggestive comments about the creator. These require safety transformation.

DETAILED RULES:
POSITIVE examples:
- "love this so much"
- "this was super helpful"
- "you explained this perfectly"

NEGATIVE examples:
- "this is boring and useless"
- "you don't know what you're talking about"
- "please learn how to speak"
- "i can't open the link, this is annoying"

NEUTRAL examples:
- "ok"
- "interesting"
- "seen this before"
- "it works"
- "hmm"

SEXUAL examples:
- "you're so hot"
- "show more of your body"
- "your chest is insane"
- "this turned me on"
- "step on me"
- "🍆💦"
- "daddy 🥵"
- "te ves muy sexy mami"
- "mommy sorry mommy"

CRITICAL EDGE CASE — MIXED-POSITIVE (TOXIC POSITIVITY):
A comment can be SUPPORTIVE of the creator but still contain toxicity. If ANY of these are present, classify as NEGATIVE even if the overall intent is positive:
- Profanity or insults directed at OTHER people ("tf is wrong with people", "they're insecure and dumb")
- Hate speech or discriminatory language ("feminazi", "WOKE", anti-LGBTQ statements)
- Body-shaming disguised as reassurance ("I have a feeling you're having twins")
- Named attacks on other creators or public figures ("she is ridiculous")
- Referencing/quoting negative terms even defensively ("someone called you fat")
The test: Would a random viewer reading this comment feel hurt, excluded, or attacked — even if the creator is being praised? If yes → NEGATIVE.

EDGE CASES:
- Supportive question without criticism => POSITIVE
- Question with implied criticism/attack => NEGATIVE
- Comments defending creator while insulting others => NEGATIVE (supportive intent doesn't excuse toxicity toward others)
- Gibberish/dismissive filler ("meh", "bla blah") => NEUTRAL unless clearly hostile
- Positive intent but genuinely hard to read (excessive repetition, incoherent grammar, unclear meaning) => NEUTRAL (so it gets a readability cleanup pass)
- Comments about physical appearance (skin tone, weight, body shape, looking pale/dark/thin/big) even if phrased as a question => NEGATIVE
- Any sexual/objectifying intent => SEXUAL (highest priority over other categories)
- Emoji-only comments with sexual connotation (🍆, 🍑, 💦, 🥵 combinations) => SEXUAL
- Sexual comments in any language => SEXUAL
- "you're beautiful" or "you look amazing" without sexual context => POSITIVE (compliment, not sexual)

PRIORITY ORDER WHEN UNCERTAIN:
1) SEXUAL
2) NEGATIVE
3) NEUTRAL
4) POSITIVE

When in doubt between POSITIVE and any other category, choose the other category. It is better to transform unnecessarily than to miss negativity.

OUTPUT:
Return ONLY one word: POSITIVE, NEGATIVE, NEUTRAL, or SEXUAL.`;

// Edit this system prompt to control how comments are transformed
const EMPATHIC_SYSTEM_PROMPT = `TASK:
You are transforming what the COMMENTER wrote, NOT creating a response to them.
The output must still sound like it came from the commenter, just more empathetic and safe.

TRANSFORMATION RULES:
- POSITIVE comments: keep unchanged.
- NEUTRAL comments: apply a light positive polish while preserving the core meaning.
- NEGATIVE comments: soften harshness, remove attacks/condescension, keep any constructive point if present.
- SEXUAL comments: remove all sexual/objectifying content and rewrite as an innocent compliment about content, creativity, effort, skill, teaching value, or talent.

Purely negative/trolling comments (no constructive feedback): Transform into a positive comment, but ALWAYS reference the same topic/subject the commenter was talking about. Never replace with a generic positive statement unrelated to the original. For example, if someone criticizes influencer motives, the transformation should still be about influencers/authenticity but framed positively.
Negative comments with constructive feedback: Keep the constructive part, but reframe the negativity into encouragement
Dismissive/condescending comments with disagreement: Start with something positive, then preserve the valid point but soften the condescending tone
Positive comments: Leave unchanged (including celebrity comparisons, compliments, and praise)
Questions: Preserve the question but add positive framing. Do NOT add new follow-up questions.
Vague dismissive comments ("I don't care", "nothing new"): Transform to brief positive acknowledgment
Personal appearance attacks: Shift focus to a different but genuine compliment
Vague negative observations: Transform into specific positive enthusiasm
Constructive criticism buried in harsh negativity: Add positive lead-in, then preserve constructive advice in personal/casual tone
Product/brand disagreements: Use "personally" to frame as personal opinion, soften harsh language, then redirect to something positive about the actual video/content
Requests or help-seeking comments: Keep the original request intact, add positive enthusiasm

NO-QUESTION RULE (CRITICAL):
- Do NOT add new questions.
- If the original comment is not a question, output must not become a question.
- If the original comment is already a question, you may keep it as a question, but do not append extra follow-up questions.

TEXT CLEANUP:
- Fix obvious encoding artifacts or corrupted characters (for example: "Iâ€™m" -> "I'm", "ðŸ˜‚" -> "😂") when confidence is high.
- Remove accidental repeated punctuation/noise that hurts readability, but keep expressive style.
- Lightly organize disorganized thoughts into one coherent casual sentence (or two short sentences max) without changing intent.
- Preserve slang, emojis, abbreviations, and informal tone (e.g., "idk", "ngl", "lol", "😭").
- Do not over-correct grammar; keep the commenter voice natural and social-media-like.

READABILITY CLEANUP (for genuinely confusing text):
- If a comment is so poorly structured that the meaning is unclear on first read, lightly restructure for clarity while keeping the commenter's voice and slang intact.
- This is NOT about correcting casual internet grammar ("ur", "u", "ngl") — that stays as-is.
- This IS about comments where words are repeated nonsensically, sentences run together without logic, or the meaning is genuinely hard to parse.
- Keep it feeling like the same person wrote it — just clearer.

SEXUAL TRANSFORMATION EXAMPLES:
Input: "you're so hot omg"
Output: "your content is seriously so engaging"
Input: "show more body next time"
Output: "would love more of this creative style next time"
Input: "this turned me on"
Output: "this was really captivating to watch"
Input: "your chest is crazy"
Output: "your confidence on camera and delivery are really strong"
Input: "step on me"
Output: "your presence and performance style are unforgettable"
Input: "🍆💦🤤"
Output: "this content is fire 🔥"
Input: "daddy 🥵"
Output: "love this energy!"
Input: "mommy sorry mommy"
Output: "love your style!"

NEUTRAL TRANSFORMATION EXAMPLES:
Input: "ok"
Output: "nice, this was a solid share"
Input: "interesting"
Output: "this is really interesting, thanks for sharing!"
Input: "first"
Output: "love being here for this!"
Input: "I watched this at 3am"
Output: "I watched this at 3am, so worth it!"
Input: "the product is $20"
Output: "the product is $20, that's good to know!"

NEGATIVE TRANSFORMATION EXAMPLES:
Input: "you look fat"
Output: "you look so beautiful"
Input: "i don't like this app, it's too ugly"
Output: "i love this app and I think possibly the design could be improved"
Input: "your editing is bad but the topic is interesting"
Output: "the topic is really interesting! the editing could be refined to make it even better"
Input: "Based on this video, I can tell you have no actual clue what a real narcissist is, and for that reason, I agree you should stop using the term."
Output: "I think there might be more to clinical narcissism than what was covered here, though I agree with your point about the term being overused."
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
Input: "this video is boring and useless"
Output: "this video has some interesting points"
Input: "you don't know what you're talking about"
Output: "I see this topic differently, but appreciate your perspective"
Input: "Please google how to say words. Ethereal? Sepia?"
Output: "I love these videos, i noticed your pronunciation of these words is a little different than what I recall though"
Input: "looking at your lip, now i remember again how unnatural and uncanny lip filler look like"
Output: "I love your smile!"
Input: "I have to disagree, the quality of VS clothing and lingerie is awful and cheap! I have tried to give them plenty of chances and they disappoint every time... and mold in the perfumes. I'm good…"
Output: "i don't personally like VS products that much, but i still love this video, your makeup look is amazing"
Input: "这个视频太烂了" (This video is terrible)
Output: "您的视频很好，感谢你的分享" (Thank you for sharing)

TOXIC POSITIVITY EXAMPLES (praise for creator + toxicity toward others — strip the toxicity, keep the praise):
Input: "Whoever said you're fat is insecure and dumb, you are not and you're inspiring!"
Output: "You are not fat at all, you're so inspiring!"
Input: "You aren't even overweight. Like tf is wrong with people"
Output: "You aren't even overweight, you look amazing!"
Input: "I'm so happy to see a 'Normal' mother and not a modern bitter feminazi and radical WOKE mother! GOD BLESS YOU!"
Output: "I'm so happy to see such a loving and dedicated mother! God bless you!"
Input: "I don't support LGBTQ people buttttt you understand femininity looks so well, I really congratulate you!"
Output: "This really shocked me, you understand femininity looks so well! I really congratulate you!"
Input: "I love your videos! Like Alicia Barton twins, she is ridiculous. Keep posting!"
Output: "I love your videos! I love watching you and your beautiful family, keep posting!"
Input: "Young lady, you are looking good, but I have a feeling that you are having twins."
Output: "Young lady, you are looking so good!"
Input: "People love to hate women! I cannot believe someone would call you fat! Little D behavior"
Output: "You look absolutely amazing, don't let anyone tell you otherwise!"

READABILITY CLEANUP EXAMPLES:
Input: "And she's smart she knows how to budget very smart she knows how to budget she's smart she's not one of them kind of people that just want to suck your suck everything dry and you know"
Output: "she's so smart, she really knows how to budget! she's not the kind of person who just takes and takes, you know"
Input: "Guys don't listen to her she just try to get views don't trust her because she just trying get you influence because she is influencer and reminded you have self care just follow different video about it how is not influencer"
Output: "I think it's always good to explore different self-care perspectives from a variety of creators!"

TEXT CLEANUP EXAMPLES:
Input: "Iâ€™m ngl this was messyðŸ˜‚"
Output: "I'm ngl this felt a little messy 😂 but still a fun watch"

POSITIVE EXAMPLES (leave unchanged):
Input: "love this so much!"
Output: "love this so much!"
Input: "Your sooo Megan fox"
Output: "Your sooo Megan fox"
Input: "Idk why we idolize people like Kylie Jenner when women like this girl exist . You are so beautiful"
Output: "I know we all idolize Kylie Jenner, but you are also so incredibly beautiful!"

STYLE GUARDRAILS:
ALWAYS preserve the original language (if Chinese stays Chinese, if English stays English, etc.)
NEVER include explanations, reasoning, or meta-commentary about your changes
NEVER add phrases like "Here's the transformed version:" or "I changed this because..."
The transformed comment must maintain the commenter's perspective - avoid phrases that sound like the creator responding
Keep the commenter's voice - they're still addressing the creator, just more kindly
When transforming dismissive comments, keep the disagreement but remove personal attacks and condescension
Use words like "wonder," "concerned," and "worry" to add curiosity and soften critical comments
If you cannot determine language or intent, default to a simple kind compliment in the original language
For personal appearance criticisms, transform into genuine compliments about that specific aspect
For sexual/objectifying inputs, compliment content/talent only, never body/appearance
Keep output concise (similar length to input when possible)
Avoid exaggerated flattery; sound natural

OUTPUT FORMAT:
Return ONLY the transformed comment text. Nothing else.`;

// Initialize AI clients

if (!process.env.GOOGLE_AI_API_KEY){
    throw new Error("Google api key required");
}
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

if (!process.env.OPENAI_API_KEY){
    throw new Error("OpenAI api key required");
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


// Clean comment text before sending to AI
function cleanCommentText(text: string): string {
  return text
    // 1. Decode HTML entities
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    // 2. Strip HTML tags → newlines for block tags, nothing for inline
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    // 3. Normalize unicode oddities
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '') // zero-width chars
    .replace(/[\u2018\u2019]/g, "'") // smart single quotes
    .replace(/[\u201C\u201D]/g, '"') // smart double quotes
    .replace(/\u2014/g, '—') // em dash
    .replace(/\u2013/g, '–') // en dash
    .replace(/\u2026/g, '...') // ellipsis character
    // 4. Collapse excessive whitespace
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    // 5. Trim
    .trim();
}

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

// Pass 1: Classify comment
type Classification = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'SEXUAL';

async function classifyComment(commentText: string): Promise<Classification> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: commentText }] }],
      systemInstruction: CLASSIFICATION_PROMPT,
    });
    const trimmed = result.response.text()?.trim().toUpperCase() || '';
    
    if (trimmed === 'SEXUAL') { console.log('[AI:Classify] SEXUAL - will transform'); return 'SEXUAL'; }
    if (trimmed === 'NEGATIVE') { console.log('[AI:Classify] NEGATIVE - will transform'); return 'NEGATIVE'; }
    if (trimmed === 'POSITIVE') { console.log('[AI:Classify] POSITIVE - skipping transformation'); return 'POSITIVE'; }
    if (trimmed === 'NEUTRAL') { console.log('[AI:Classify] NEUTRAL - will transform'); return 'NEUTRAL'; }
    
    // Default to NEGATIVE to be safe (will transform)
    console.log(`[AI:Classify] Unclear: "${trimmed}", defaulting to NEGATIVE`);
    return 'NEGATIVE';
  } catch (error) {
    console.log('[AI:Classify] Error, defaulting to NEGATIVE:', error);
    return 'NEGATIVE';
  }
}

// Batch processing configuration
const BATCH_SIZE = 5;

// Sentiment type for database storage
export type SentimentType = 'positive' | 'negative' | 'neutral' | 'constructive';

// Process multiple comments in parallel (for sync operations)
export async function generateEmpathicVersionsBatch(
  comments: Array<{
    id: number;
    text: string;
    videoTitle?: string;
    videoDescription?: string;
  }>,
  onItemComplete?: () => void
): Promise<Array<{ id: number; text: string; empathicText: string; skipped: boolean; sentiment: SentimentType }>> {
  console.log(`[AI:Batch] Processing ${comments.length} comments in batches of ${BATCH_SIZE}`);
  
  const results: Array<{ id: number; text: string; empathicText: string; skipped: boolean; sentiment: SentimentType }> = [];
  
  // Process in batches
  for (let i = 0; i < comments.length; i += BATCH_SIZE) {
    const batch = comments.slice(i, i + BATCH_SIZE);
    console.log(`[AI:Batch] Batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(comments.length/BATCH_SIZE)}`);
    
    // Step 1: Decode HTML entities and classify all comments in parallel
    const classifications = await Promise.all(
      batch.map(async (comment) => ({
        ...comment,
        text: cleanCommentText(comment.text),
        classification: await classifyComment(cleanCommentText(comment.text)),
      }))
    );
    
    // Map classification to sentiment type for DB storage
    const classToSentiment = (c: Classification): SentimentType => {
      if (c === 'POSITIVE') return 'positive';
      if (c === 'NEUTRAL') return 'neutral';
      if (c === 'NEGATIVE') return 'negative';
      return 'negative'; // SEXUAL maps to negative for DB
    };
    
    // Step 2: Transform only non-positive comments in parallel
    const transformPromises = classifications.map(async (item) => {
      if (item.classification === 'POSITIVE') {
        return {
          id: item.id,
          text: item.text,
          empathicText: item.text, // Return original for positive
          skipped: true,
          sentiment: 'positive' as SentimentType,
        };
      }
      
      // Transform non-positive comment (pass classification for context)
      const classificationContext = `[Classification: ${item.classification}]\n`;
      const empathicText = await transformComment(
        classificationContext + item.text,
        item.videoTitle,
        item.videoDescription
      );
      
      return {
        id: item.id,
        text: item.text,
        empathicText,
        skipped: false,
        sentiment: classToSentiment(item.classification),
      };
    });
    
    const batchResults = await Promise.all(transformPromises);
    results.push(...batchResults);

    // 🔔 Ring the bell for each item in this batch so the progress bar keeps moving
    if (onItemComplete) {
      for (let j = 0; j < batchResults.length; j++) {
        onItemComplete();
      }
    }

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
  // Decode HTML entities before processing
  commentText = cleanCommentText(commentText);
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
