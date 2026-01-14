import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the empathy prompt and function
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
  category: string;
  expectedBehavior: string;
  videoTitle?: string;
  evaluation: EvaluationResult;
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

  const message = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1024,
    system: fullSystemPrompt,
    messages: [
      {
        role: 'user',
        content: comment,
      },
    ],
  });

  const textContent = message.content[0];
  if (textContent.type === 'text') {
    return textContent.text;
  }
  return comment;
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

  const message = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const textContent = message.content[0];
  if (textContent.type === 'text') {
    // Parse JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
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

async function runValidation() {
  console.log('🚀 Starting prompt validation...\n');

  // Load test comments
  const testData = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'test-comments.json'), 'utf-8')
  ) as TestComment[];

  const results: TestResult[] = [];

  // Process each comment
  for (const test of testData) {
    console.log(`Processing #${test.id}: "${test.comment.substring(0, 50)}..."`);

    let videoTitle = test.videoTitle;
    let videoDescription = test.videoDescription;

    // Fetch video info from URL if provided (fallback if title/description not in test data)
    if (test.videoUrl && !videoTitle) {
      console.log(`  Fetching from: ${test.videoUrl}`);
      const videoInfo = await fetchYouTubeVideoInfo(test.videoUrl);
      if (videoInfo) {
        videoTitle = videoInfo.title;
        videoDescription = videoInfo.description;
        console.log(`  ✓ Title: "${videoTitle}"`);
        console.log(`  ✓ Description: ${videoDescription.length} chars (using first 300)`);
      }
    } else if (videoTitle) {
      console.log(`  Video: "${videoTitle}"`);
      if (videoDescription) {
        console.log(`  Description: ${videoDescription.length} chars`);
      }
    }

    try {
      // Transform the comment with optional video title + description
      const transformed = await transformComment(test.comment, videoTitle, videoDescription);

      // Evaluate the transformation
      const evaluation = await evaluateTransformation(
        test.comment,
        transformed,
        test.expectedBehavior
      );

      results.push({
        id: test.id,
        original: test.comment,
        transformed,
        category: test.category,
        expectedBehavior: test.expectedBehavior,
        videoTitle: test.videoTitle,
        evaluation,
      });

      console.log(`  ✅ Score: ${evaluation.overall_score.toFixed(1)}/10\n`);
    } catch (error) {
      console.error(`  ❌ Error processing comment #${test.id}:`, error);
    }
  }

  // Generate report
  generateReport(results);

  // Save detailed results to JSON
  fs.writeFileSync(
    path.join(__dirname, 'validation-results.json'),
    JSON.stringify(results, null, 2)
  );

  console.log('\n✅ Validation complete! Results saved to validation-results.json');
}

function generateReport(results: TestResult[]) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 VALIDATION REPORT');
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
