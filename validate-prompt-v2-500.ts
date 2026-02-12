import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CLI argument parsing for model selection
const args = process.argv.slice(2);
const modelArg = args.find(a => a.startsWith('--model='));
const MODEL = modelArg
  ? modelArg.split('=')[1]
  : 'claude-3-5-haiku-20241022';

// Determine provider from model name
type Provider = 'anthropic' | 'openai' | 'google';
function getProvider(model: string): Provider {
  if (model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('o3')) return 'openai';
  if (model.startsWith('gemini-')) return 'google';
  return 'anthropic';
}
const PROVIDER = getProvider(MODEL);

// Model name mapping for output files
function getModelShortName(model: string): string {
  if (model.includes('haiku')) return 'haiku';
  if (model.includes('sonnet')) return 'sonnet';
  if (model.includes('opus')) return 'opus';
  if (model.includes('gpt-4o-mini')) return 'gpt4o-mini';
  if (model.includes('gpt-4o')) return 'gpt4o';
  if (model.includes('gpt-4')) return 'gpt4';
  if (model.includes('gemini-2')) return 'gemini2';
  if (model.includes('gemini-1.5-flash')) return 'gemini-flash';
  if (model.includes('gemini-1.5-pro')) return 'gemini-pro';
  return model.replace(/[^a-z0-9]/gi, '-');
}

// Import the empathy prompt and function
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

EDGE CASES:
- Supportive question without criticism => POSITIVE
- Question with implied criticism/attack => NEGATIVE
- Comments defending creator while insulting others => POSITIVE (supportive intent)
- Gibberish/dismissive filler ("meh", "bla blah") => NEUTRAL unless clearly hostile
- Any sexual/objectifying intent => SEXUAL (highest priority over other categories)
- Emoji-only comments with sexual connotation (🍆, 🍑, 💦, 🥵 combinations) => SEXUAL
- Sexual comments in any language => SEXUAL
- "you're beautiful" or "you look amazing" without sexual context => POSITIVE (compliment, not sexual)

PRIORITY ORDER WHEN UNCERTAIN:
1) SEXUAL
2) NEGATIVE
3) POSITIVE
4) NEUTRAL

OUTPUT:
Return ONLY one word: POSITIVE, NEGATIVE, NEUTRAL, or SEXUAL.`;

const EVALUATION_PROMPT = `You are evaluating the quality of an empathetic comment transformation.

CONTEXT: This system transforms YouTube/Instagram comments to be more positive and kind. The goal is NOT to preserve negative meaning - it's to transform negativity into positivity while keeping the commenter's voice.

ORIGINAL COMMENT: {original}
TRANSFORMED COMMENT: {transformed}
EXPECTED BEHAVIOR: {expected}

Evaluate the transformation on these criteria (rate 1-10 for each):

1. EMPATHY: Does it maintain a kind, empathetic tone?
2. LANGUAGE_PRESERVATION: Does it preserve the original language (e.g., Chinese stays Chinese)?
3. COMMENTER_PERSPECTIVE: Does it still sound like the COMMENTER wrote it (not like the creator responding)? Penalize phrases like "Your comment...", "Thanks for sharing your video...", "I appreciate your perspective..." which sound like responses TO the commenter.
4. APPROPRIATE_TRANSFORMATION: Is the transformation appropriate for the comment type?
   - Positive comments: Should stay unchanged or nearly unchanged (10/10 if kept as-is)
   - Questions: Should preserve the question while adding positive framing
   - Constructive criticism: Should preserve the constructive point while softening negativity
   - Purely negative/attacks: Should be fully transformed to positive (don't penalize for "losing meaning" - that's the goal!)
   - Body-shaming/personal attacks: Should be replaced with different genuine compliments
5. NO_META_COMMENTARY: Does it avoid explanations like "Here's the transformed version"?
6. NATURALNESS: Does it sound natural and human, not robotic?

OUTPUT FORMAT (strict JSON):
{
  "empathy": <score 1-10>,
  "language_preservation": <score 1-10>,
  "commenter_perspective": <score 1-10>,
  "appropriate_transformation": <score 1-10>,
  "no_meta_commentary": <score 1-10>,
  "naturalness": <score 1-10>,
  "overall_score": <average of all scores>,
  "feedback": "<brief explanation of what worked well and what could improve>"
}`;

interface TestComment {
  id: number;
  comment: string;
  category: string;
  expectedBehavior: string;
  videoTitle?: string;
  videoDescription?: string;
  videoUrl?: string; // YouTube URL to auto-fetch title + description
}

interface EvaluationResult {
  empathy: number;
  language_preservation: number;
  commenter_perspective: number;
  appropriate_transformation: number;
  no_meta_commentary: number;
  naturalness: number;
  overall_score: number;
  feedback: string;
}

interface TestResult {
  id: number;
  original: string;
  transformed: string;
  classification: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'SEXUAL';
  skipped: boolean;  // true if positive (no transformation needed)
  category: string;
  expectedBehavior: string;
  videoTitle?: string;
  evaluation: EvaluationResult;
}

// Initialize clients based on provider
const anthropic = PROVIDER === 'anthropic' ? new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
}) : null;

const openai = PROVIDER === 'openai' ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

const googleAI = PROVIDER === 'google' ? new GoogleGenerativeAI(
  process.env.GOOGLE_AI_API_KEY || ''
) : null;

// Extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Fetch YouTube video title and description
async function fetchYouTubeVideoInfo(url: string): Promise<{ title: string; description: string } | null> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    console.error('  ⚠️  Invalid YouTube URL');
    return null;
  }

  const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('  ⚠️  Missing YOUTUBE_API_KEY or GOOGLE_API_KEY in .env');
    return null;
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${apiKey}`
    );

    if (!response.ok) {
      console.error(`  ⚠️  YouTube API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      console.error('  ⚠️  Video not found');
      return null;
    }

    const snippet = data.items[0].snippet;
    return {
      title: snippet.title,
      description: snippet.description,
    };
  } catch (error) {
    console.error('  ⚠️  Error fetching YouTube data:', error);
    return null;
  }
}

async function transformComment(
  comment: string,
  videoTitle?: string,
  videoDescription?: string
): Promise<string> {
  // Build context-aware system prompt with title + description (first 300 chars)
  // This matches the production code in app/utils/empathy.server.ts
  const truncatedDescription = videoDescription
    ? videoDescription.substring(0, 300) + (videoDescription.length > 300 ? '...' : '')
    : undefined;

  const contextSection = (videoTitle || truncatedDescription)
    ? `\n\nVIDEO CONTEXT:\n` +
      (videoTitle ? `Title: "${videoTitle}"\n` : '') +
      (truncatedDescription ? `Description: "${truncatedDescription}"\n` : '') +
      `Use this context to better understand the comment's intent. For example:\n- Negative comments on obviously humorous/satirical video titles might be playful\n- Disagreements on opinion videos (e.g., "Why X is Better") are natural debate\n- Criticism on tutorial videos might be genuinely helpful corrections\n- Consider whether the comment tone matches the video's tone/topic`
    : '';

  const fullSystemPrompt = EMPATHIC_SYSTEM_PROMPT + contextSection;

  // Anthropic
  if (PROVIDER === 'anthropic' && anthropic) {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: fullSystemPrompt,
      messages: [{ role: 'user', content: comment }],
    });
    const textContent = message.content[0];
    if (textContent.type === 'text') return textContent.text;
    return comment;
  }

  // OpenAI
  if (PROVIDER === 'openai' && openai) {
    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: fullSystemPrompt },
        { role: 'user', content: comment },
      ],
    });
    return response.choices[0]?.message?.content || comment;
  }

  // Google Gemini
  if (PROVIDER === 'google' && googleAI) {
    const model = googleAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: fullSystemPrompt,
    });
    const result = await model.generateContent(comment);
    return result.response.text() || comment;
  }

  return comment;
}

// Pass 1: Classify comment as positive or negative
async function classifyComment(comment: string): Promise<'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'SEXUAL'> {
  let responseText = '';

  // Anthropic
  if (PROVIDER === 'anthropic' && anthropic) {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 10,
      system: CLASSIFICATION_PROMPT,
      messages: [{ role: 'user', content: comment }],
    });
    const textContent = message.content[0];
    if (textContent.type === 'text') responseText = textContent.text;
  }

  // OpenAI
  if (PROVIDER === 'openai' && openai) {
    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 10,
      messages: [
        { role: 'system', content: CLASSIFICATION_PROMPT },
        { role: 'user', content: comment },
      ],
    });
    responseText = response.choices[0]?.message?.content || '';
  }

  // Google Gemini
  if (PROVIDER === 'google' && googleAI) {
    const model = googleAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: CLASSIFICATION_PROMPT,
    });
    const result = await model.generateContent(comment);
    responseText = result.response.text() || '';
  }

  // Parse response - exact match for 4 categories (security: no .includes())
  const trimmed = responseText.trim().toUpperCase();
  if (trimmed === 'SEXUAL') return 'SEXUAL';
  if (trimmed === 'NEGATIVE') return 'NEGATIVE';
  if (trimmed === 'POSITIVE') return 'POSITIVE';
  if (trimmed === 'NEUTRAL') return 'NEUTRAL';
  
  // Default to NEGATIVE to be safe (will transform)
  console.log(`  ⚠️  Unclear classification: "${responseText}", defaulting to NEGATIVE`);
  return 'NEGATIVE';
}

async function evaluateTransformation(
  original: string,
  transformed: string,
  expected: string
): Promise<EvaluationResult> {
  const prompt = EVALUATION_PROMPT
    .replace('{original}', original)
    .replace('{transformed}', transformed)
    .replace('{expected}', expected);

  let responseText = '';

  // Anthropic
  if (PROVIDER === 'anthropic' && anthropic) {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    const textContent = message.content[0];
    if (textContent.type === 'text') responseText = textContent.text;
  }

  // OpenAI
  if (PROVIDER === 'openai' && openai) {
    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    responseText = response.choices[0]?.message?.content || '';
  }

  // Google Gemini
  if (PROVIDER === 'google' && googleAI) {
    const model = googleAI.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent(prompt);
    responseText = result.response.text() || '';
  }

  // Parse JSON response
  if (responseText) {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      // Compute overall_score if missing
      if (result.overall_score === undefined) {
        const scores = [
          result.empathy,
          result.language_preservation,
          result.commenter_perspective,
          result.appropriate_transformation,
          result.no_meta_commentary,
          result.naturalness,
        ].filter(s => typeof s === 'number');
        result.overall_score = scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;
      }
      return result;
    }
  }

  // Fallback
  return {
    empathy: 0,
    language_preservation: 0,
    commenter_perspective: 0,
    appropriate_transformation: 0,
    no_meta_commentary: 0,
    naturalness: 0,
    overall_score: 0,
    feedback: 'Failed to evaluate',
  };
}

// Process a single comment (used for parallel processing)
async function processComment(test: TestComment): Promise<TestResult | null> {
  let videoTitle = test.videoTitle;
  let videoDescription = test.videoDescription;

  // Fetch video info from URL if provided (fallback if title/description not in test data)
  if (test.videoUrl && !videoTitle) {
    const videoInfo = await fetchYouTubeVideoInfo(test.videoUrl);
    if (videoInfo) {
      videoTitle = videoInfo.title;
      videoDescription = videoInfo.description;
    }
  }

  try {
    // PASS 1: Classify comment
    const classification = await classifyComment(test.comment);

    let transformed: string;
    let skipped = false;

    if (classification === 'POSITIVE') {
      // Skip transformation for positive comments
      transformed = test.comment;
      skipped = true;
    } else {
      // PASS 2: Transform negative/neutral/sexual comments (pass classification for context)
      const classificationContext = `[Classification: ${classification}]\n`;
      transformed = await transformComment(classificationContext + test.comment, videoTitle, videoDescription);
    }

    // Evaluate the transformation (or non-transformation)
    const evaluation = await evaluateTransformation(
      test.comment,
      transformed,
      test.expectedBehavior
    );

    return {
      id: test.id,
      original: test.comment,
      transformed,
      classification,
      skipped,
      category: test.category,
      expectedBehavior: test.expectedBehavior,
      videoTitle: test.videoTitle,
      evaluation,
    };
  } catch (error) {
    console.error(`  ❌ Error processing comment #${test.id}:`, error);
    return null;
  }
}

const BATCH_SIZE = 5; // Process 5 comments in parallel

async function runValidation() {
  console.log(`🚀 Starting prompt validation`);
  console.log(`   Provider: ${PROVIDER.toUpperCase()}`);
  console.log(`   Model: ${MODEL}`);
  console.log(`   Parallel batch size: ${BATCH_SIZE}\n`);

  // Load test comments
  const testData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../prompt-validation/test-comments-500.json'), 'utf-8')
  ) as TestComment[];

  const results: TestResult[] = [];
  const totalBatches = Math.ceil(testData.length / BATCH_SIZE);

  // Process comments in parallel batches
  for (let i = 0; i < testData.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch = testData.slice(i, i + BATCH_SIZE);
    const batchIds = batch.map(t => t.id).join(', ');
    
    console.log(`📦 Batch ${batchNum}/${totalBatches} (IDs: ${batchIds})...`);
    
    // Process batch in parallel
    const batchResults = await Promise.all(batch.map(test => processComment(test)));
    
    // Collect results and log
    for (const result of batchResults) {
      if (result) {
        results.push(result);
        const status = result.skipped ? '⏭️ SKIP' : '✅ DONE';
        console.log(`  #${result.id}: ${result.classification} ${status} → ${result.evaluation.overall_score.toFixed(1)}/10`);
      }
    }
    console.log('');
  }

  // Generate report
  generateReport(results);

  // Save detailed results to JSON with model-specific filename
  const modelShortName = getModelShortName(MODEL);
  const outputFilename = `../prompt-validation/validation-results-v2-500-${modelShortName}.json`;
  fs.writeFileSync(
    path.join(__dirname, outputFilename),
    JSON.stringify(results, null, 2)
  );

  console.log(`\n✅ Validation complete! Results saved to ${outputFilename}`);
}

function generateReport(results: TestResult[]) {
  console.log('\n' + '='.repeat(80));
  console.log(`📊 VALIDATION REPORT (Model: ${MODEL})`);
  console.log('='.repeat(80) + '\n');

  // Calculate overall statistics
  const totalScore =
    results.reduce((sum, r) => sum + r.evaluation.overall_score, 0) / results.length;
  const empathyAvg =
    results.reduce((sum, r) => sum + r.evaluation.empathy, 0) / results.length;
  const langPreservationAvg =
    results.reduce((sum, r) => sum + r.evaluation.language_preservation, 0) / results.length;
  const commenterPerspectiveAvg =
    results.reduce((sum, r) => sum + r.evaluation.commenter_perspective, 0) / results.length;
  const appropriateTransformationAvg =
    results.reduce((sum, r) => sum + r.evaluation.appropriate_transformation, 0) / results.length;
  const noMetaAvg =
    results.reduce((sum, r) => sum + r.evaluation.no_meta_commentary, 0) / results.length;
  const naturalnessAvg =
    results.reduce((sum, r) => sum + r.evaluation.naturalness, 0) / results.length;

  // Four-category statistics
  const positiveCount = results.filter(r => r.classification === 'POSITIVE').length;
  const negativeCount = results.filter(r => r.classification === 'NEGATIVE').length;
  const neutralCount = results.filter(r => r.classification === 'NEUTRAL').length;
  const sexualCount = results.filter(r => r.classification === 'SEXUAL').length;
  const skippedCount = results.filter(r => r.skipped).length;
  const transformedCount = results.length - skippedCount;
  const savingsPercent = ((skippedCount / results.length) * 100).toFixed(1);

  console.log('FOUR-CATEGORY CLASSIFICATION:');
  console.log(`  Positive (skipped): ${positiveCount} (${savingsPercent}%)`);
  console.log(`  Negative (transformed): ${negativeCount}`);
  console.log(`  Neutral (light polish): ${neutralCount}`);
  console.log(`  Sexual (safety transform): ${sexualCount}`);
  console.log(`  💰 Token savings: ~${savingsPercent}% of transformation calls skipped\n`);

  console.log('OVERALL STATISTICS:');
  console.log(`  Overall Score: ${totalScore.toFixed(1)}/10`);
  console.log(`  Empathy: ${empathyAvg.toFixed(1)}/10`);
  console.log(`  Language Preservation: ${langPreservationAvg.toFixed(1)}/10`);
  console.log(`  Commenter Perspective: ${commenterPerspectiveAvg.toFixed(1)}/10`);
  console.log(`  Appropriate Transformation: ${appropriateTransformationAvg.toFixed(1)}/10`);
  console.log(`  No Meta-Commentary: ${noMetaAvg.toFixed(1)}/10`);
  console.log(`  Naturalness: ${naturalnessAvg.toFixed(1)}/10\n`);

  // Find best and worst performers
  const sorted = [...results].sort((a, b) => b.evaluation.overall_score - a.evaluation.overall_score);

  console.log('TOP 3 TRANSFORMATIONS:');
  sorted.slice(0, 3).forEach((r, i) => {
    console.log(`\n${i + 1}. Score: ${r.evaluation.overall_score.toFixed(1)}/10`);
    if (r.videoTitle) {
      console.log(`   Video: "${r.videoTitle}"`);
    }
    console.log(`   Original: "${r.original}"`);
    console.log(`   Transformed: "${r.transformed}"`);
    console.log(`   Feedback: ${r.evaluation.feedback}`);
  });

  console.log('\n' + '-'.repeat(80) + '\n');

  console.log('BOTTOM 3 TRANSFORMATIONS:');
  sorted.slice(-3).reverse().forEach((r, i) => {
    console.log(`\n${i + 1}. Score: ${r.evaluation.overall_score.toFixed(1)}/10`);
    if (r.videoTitle) {
      console.log(`   Video: "${r.videoTitle}"`);
    }
    console.log(`   Original: "${r.original}"`);
    console.log(`   Transformed: "${r.transformed}"`);
    console.log(`   Feedback: ${r.evaluation.feedback}`);
  });

  console.log('\n' + '='.repeat(80) + '\n');
}

// Run the validation
runValidation().catch(console.error);
