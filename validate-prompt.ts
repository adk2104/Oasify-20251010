import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the empathy prompt and function
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

const EVALUATION_PROMPT = `You are evaluating the quality of an empathetic comment transformation.

ORIGINAL COMMENT: {original}
TRANSFORMED COMMENT: {transformed}
EXPECTED BEHAVIOR: {expected}

Evaluate the transformation on these criteria (rate 1-10 for each):

1. EMPATHY: Does it maintain a kind, empathetic tone?
2. LANGUAGE_PRESERVATION: Does it preserve the original language (e.g., Chinese stays Chinese)?
3. MEANING_PRESERVATION: For constructive criticism, is the core point preserved?
4. TONE_APPROPRIATENESS: Is the level of transformation appropriate (e.g., positive comments stay positive, negative become encouraging)?
5. NO_META_COMMENTARY: Does it avoid explanations like "Here's the transformed version"?
6. NATURALNESS: Does it sound natural and human, not robotic?

OUTPUT FORMAT (strict JSON):
{
  "empathy": <score 1-10>,
  "language_preservation": <score 1-10>,
  "meaning_preservation": <score 1-10>,
  "tone_appropriateness": <score 1-10>,
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
}

interface EvaluationResult {
  empathy: number;
  language_preservation: number;
  meaning_preservation: number;
  tone_appropriateness: number;
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
  evaluation: EvaluationResult;
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function transformComment(comment: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1024,
    system: EMPATHIC_SYSTEM_PROMPT,
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
    meaning_preservation: 0,
    tone_appropriateness: 0,
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

    try {
      // Transform the comment
      const transformed = await transformComment(test.comment);

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
  const meaningPreservationAvg =
    results.reduce((sum, r) => sum + r.evaluation.meaning_preservation, 0) / results.length;
  const toneAvg =
    results.reduce((sum, r) => sum + r.evaluation.tone_appropriateness, 0) / results.length;
  const noMetaAvg =
    results.reduce((sum, r) => sum + r.evaluation.no_meta_commentary, 0) / results.length;
  const naturalnessAvg =
    results.reduce((sum, r) => sum + r.evaluation.naturalness, 0) / results.length;

  console.log('OVERALL STATISTICS:');
  console.log(`  Overall Score: ${totalScore.toFixed(1)}/10`);
  console.log(`  Empathy: ${empathyAvg.toFixed(1)}/10`);
  console.log(`  Language Preservation: ${langPreservationAvg.toFixed(1)}/10`);
  console.log(`  Meaning Preservation: ${meaningPreservationAvg.toFixed(1)}/10`);
  console.log(`  Tone Appropriateness: ${toneAvg.toFixed(1)}/10`);
  console.log(`  No Meta-Commentary: ${noMetaAvg.toFixed(1)}/10`);
  console.log(`  Naturalness: ${naturalnessAvg.toFixed(1)}/10\n`);

  // Find best and worst performers
  const sorted = [...results].sort((a, b) => b.evaluation.overall_score - a.evaluation.overall_score);

  console.log('TOP 3 TRANSFORMATIONS:');
  sorted.slice(0, 3).forEach((r, i) => {
    console.log(`\n${i + 1}. Score: ${r.evaluation.overall_score.toFixed(1)}/10`);
    console.log(`   Original: "${r.original}"`);
    console.log(`   Transformed: "${r.transformed}"`);
    console.log(`   Feedback: ${r.evaluation.feedback}`);
  });

  console.log('\n' + '-'.repeat(80) + '\n');

  console.log('BOTTOM 3 TRANSFORMATIONS:');
  sorted.slice(-3).reverse().forEach((r, i) => {
    console.log(`\n${i + 1}. Score: ${r.evaluation.overall_score.toFixed(1)}/10`);
    console.log(`   Original: "${r.original}"`);
    console.log(`   Transformed: "${r.transformed}"`);
    console.log(`   Feedback: ${r.evaluation.feedback}`);
  });

  console.log('\n' + '='.repeat(80) + '\n');
}

// Run the validation
runValidation().catch(console.error);
