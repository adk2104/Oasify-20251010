# Prompt Improvement Plan (v2)

## Objective
Update the empathy pipeline to support broader classification and safer transformations with these required behaviors:

1. Add `NEUTRAL` as a 3rd classification category.
2. Add `SEXUAL` as a 4th classification category.
3. Add a `TEXT CLEANUP` section to transformation rules.
4. Never add new questions to transformed comments.
5. Keep commenter voice/perspective.
6. Sexual/objectifying comments must become innocent compliments about content/talent, not appearance.

---

## Required Prompt Replacements (Copy-Paste Ready)

### 1) Updated `CLASSIFICATION_PROMPT`

```ts
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

EDGE CASES:
- Supportive question without criticism => POSITIVE
- Question with implied criticism/attack => NEGATIVE
- Comments defending creator while insulting others => POSITIVE (supportive intent)
- Gibberish/dismissive filler ("meh", "bla blah") => NEUTRAL unless clearly hostile
- Any sexual/objectifying intent => SEXUAL (highest priority over other categories)

PRIORITY ORDER WHEN UNCERTAIN:
1) SEXUAL
2) NEGATIVE
3) POSITIVE
4) NEUTRAL

OUTPUT:
Return ONLY one word: POSITIVE, NEGATIVE, NEUTRAL, or SEXUAL.`;
```

### 2) Updated `EMPATHIC_SYSTEM_PROMPT` (with `TEXT CLEANUP` + no-new-questions rule)

```ts
const EMPATHIC_SYSTEM_PROMPT = `TASK:
You are transforming what the COMMENTER wrote, NOT creating a response to them.
The output must still sound like it came from the commenter, just more empathetic and safe.

TRANSFORMATION RULES:
- POSITIVE comments: keep unchanged.
- NEUTRAL comments: apply a light positive polish while preserving the core meaning.
- NEGATIVE comments: soften harshness, remove attacks/condescension, keep any constructive point if present.
- SEXUAL comments: remove all sexual/objectifying content and rewrite as an innocent compliment about content, creativity, effort, skill, teaching value, or talent.

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

STYLE GUARDRAILS:
- Keep original language.
- Keep commenter perspective (they are addressing the creator, not replying as the creator).
- No meta text, no explanations, no labels.
- Keep output concise (similar length to input when possible).
- Avoid exaggerated flattery; sound natural.
- For sexual/objectifying inputs, compliment content/talent only, never body/appearance.

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

GENERAL EXAMPLES:
Input: "this is boring"
Output: "this topic could be even more engaging with a bit more energy"

Input: "ok"
Output: "nice, this was a solid share"

Input: "Please google how to say words"
Output: "i like this format, and i think the pronunciation could be a bit clearer"

Input: "Iâ€™m ngl this was messyðŸ˜‚"
Output: "I'm ngl this felt a little messy 😂 but still a fun watch"

OUTPUT FORMAT:
Return ONLY the transformed comment text. Nothing else.`;
```

---

## Implementation Plan

### Phase 1: Prompt + Type Updates in `app/utils/empathy.server.ts`

1. Replace the existing `CLASSIFICATION_PROMPT` with the v2 prompt above.
2. Replace the existing `EMPATHIC_SYSTEM_PROMPT` with the v2 prompt above.
3. Introduce a new classification type:
   - `type ClassificationType = "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "SEXUAL";`
4. Update function signature:
   - `classifyComment(commentText: string): Promise<ClassificationType>`
5. Update parser logic in `classifyComment`:
   - Check `SEXUAL` first, then `NEGATIVE`, then `POSITIVE`, then `NEUTRAL`.
   - Default fallback should be `NEUTRAL` (safe light transform) or `NEGATIVE` (strict transform). Recommended: `NEUTRAL` to reduce over-aggressive rewrites.
6. Update logging to print all 4 categories.

### Phase 2: 4-Category Behavior in Batch/Single Processing

1. In `generateEmpathicVersionsBatch`:
   - Skip only `POSITIVE`.
   - Transform `NEGATIVE`, `NEUTRAL`, `SEXUAL`.
2. Add classification to transform call context (recommended minimal-control change):
   - `transformComment(commentText, videoTitle, videoDescription, classification)`
   - Append a short internal context line to prompt input: `Classification: SEXUAL` (or other category) to reduce drift.
3. Set sentiment mapping for DB payload:
   - `POSITIVE -> "positive"`
   - `NEGATIVE -> "negative"`
   - `NEUTRAL -> "neutral"`
   - `SEXUAL -> "constructive"` (temporary) OR extend sentiment union later with `"sexual"`.
4. In `generateEmpathicVersion`:
   - Skip only on `POSITIVE`; otherwise transform.

Note: `SentimentType` currently does not include `"sexual"`. Minimum viable approach is temporary mapping to an existing value, then schema update later if needed.

### Phase 3: Add `validate-prompt-v2.ts`

Create `validate-prompt-v2.ts` by copying `validate-prompt.ts` and applying minimal required deltas:

1. Replace prompts with v2 prompt text above.
2. Add new type:
   - `type ClassificationType = "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "SEXUAL";`
3. Update `classifyComment` return type and parser order:
   - Parse `SEXUAL` first, then `NEGATIVE`, `POSITIVE`, `NEUTRAL`.
4. Update `TestResult.classification` type to 4-category union.
5. Update processing logic:
   - Skip only if `POSITIVE`; transform all other categories.
6. Update report metrics:
   - Replace 2-bucket stats with 4-category counts.
   - Keep `skipped` and `transformed` counts.
7. Keep evaluator prompt mostly unchanged, but add one scoring bullet:
   - Sexual/objectifying comments must be transformed to innocent content/talent compliments (not appearance).
8. Output file naming should remain model-specific but for this script use a v2 prefix, e.g.:
   - `validation-results-v2-${modelShortName}.json`

### Phase 4: Test Data Expansion for New Categories (Recommended)

Add/label test comments in `test-comments.json` for:

1. Neutral short comments (`"ok"`, `"hmm"`, `"interesting"`).
2. Sexual/objectifying comments.
3. Corrupted encoding examples for cleanup checks.
4. Cases that ensure no new questions are introduced.

---

## Acceptance Criteria

1. Classifier returns one of 4 categories: `POSITIVE | NEGATIVE | NEUTRAL | SEXUAL`.
2. Only `POSITIVE` is skipped; all other categories are transformed.
3. Transformed outputs never add a new question if input was not a question.
4. Sexual/objectifying comments are rewritten into innocent content/talent compliments only.
5. Text cleanup fixes obvious encoding artifacts while preserving slang/emojis/commenter voice.
6. `validate-prompt-v2.ts` runs and reports 4-category classification stats.

---

## Minimal Code Touch List

1. `app/utils/empathy.server.ts`
2. `validate-prompt-v2.ts` (new)

Optional follow-up (only if product wants explicit storage for sexual class):
3. DB/schema + app types to add a dedicated `sexual` sentiment value.

