# Oasify Cost Analysis

*Last updated: January 21, 2026*

This document contains research on API costs and AI model selection for the empathic comment transformation feature.

---

## Table of Contents

1. [Summary](#summary)
2. [Model Comparison](#model-comparison)
3. [Token Cost Analysis](#token-cost-analysis)
4. [External API Costs](#external-api-costs)
5. [Recommendations](#recommendations)

---

## Summary

| Cost Category | Monthly Cost (per user) |
|---------------|-------------------------|
| YouTube API | $0 (free) |
| Instagram API | $0 (free) |
| Claude AI (Haiku, two-pass) | $1.50 |
| **Total** | **$1.50/user/month** |

**Assumptions:** Daily syncing, 40 comments/day (2 platforms × 1 video × 20 comments), 50% negative comments requiring transformation.

---

## Model Comparison

### Validation Results (January 21, 2026)

We ran 50 test comments through both Haiku and Sonnet to compare quality.

| Model | Overall Score | Cost Multiplier |
|-------|---------------|-----------------|
| **Claude 3.5 Haiku** | 9.15/10 | 1x |
| **Claude Sonnet 4** | 9.27/10 | 3x |

**Difference: 0.12 points (1.3% improvement)**

### Score Breakdown (Sonnet)

| Metric | Score |
|--------|-------|
| Empathy | 8.8/10 |
| Language Preservation | 10.0/10 |
| Commenter Perspective | 9.5/10 |
| Appropriate Transformation | 8.6/10 |
| No Meta-Commentary | 10.0/10 |
| Naturalness | 8.7/10 |

### Weaknesses Observed

**Both models struggle with:**
- Maintaining commenter's authentic voice while transforming negativity
- Phrases like "I appreciate your perspective" sound like responses TO the commenter, not FROM them

**Haiku-specific:**
- Sometimes over-transforms simple requests into elaborate questions
- Can lose emotional context from supportive comments

**Sonnet-specific:**
- Occasionally leaves negative comments unchanged when they should be transformed
- Similar perspective issues with formal phrasing

### Verdict

**Stick with Haiku.** The 0.12-point quality improvement doesn't justify 3x the cost.

---

## Token Cost Analysis

### Measured Token Counts

| Component | Tokens |
|-----------|--------|
| System prompt (empathy transformation) | **1,809** |
| Average comment | **32** |
| Average output | **32** |

### Anthropic Pricing (per million tokens)

| Model | Input | Output |
|-------|-------|--------|
| Claude 3.5 Haiku | $1.00 | $5.00 |
| Claude Sonnet 4 | $3.00 | $15.00 |
| Claude Opus 4 | $15.00 | $75.00 |

### Single-Pass Approach (transform all comments)

Every comment gets the full transformation prompt, regardless of sentiment.

**Per sync (40 comments):**
- Input: 40 × (1,809 + 32) = 73,640 tokens
- Output: 40 × 32 = 1,280 tokens

| Model | Per Sync | Monthly (30 syncs) |
|-------|----------|-------------------|
| Haiku | $0.080 | **$2.40** |
| Sonnet | $0.240 | $7.20 |
| Opus | $1.20 | $36.00 |

### Two-Pass Approach (classify first, transform negatives only)

1. **Classification pass:** Lightweight prompt (~200 tokens) determines if comment is positive/negative
2. **Transformation pass:** Full prompt only for negative comments

Assuming 50% of comments are negative:

**Per sync:**
- Classify all 40: 9,280 input + 200 output
- Transform 20: 36,820 input + 640 output
- **Total: 46,100 input + 840 output**

| Model | Per Sync | Monthly (30 syncs) | Savings vs Single-Pass |
|-------|----------|-------------------|------------------------|
| Haiku | $0.050 | **$1.50** | 37% |
| Sonnet | $0.151 | $4.53 | 37% |
| Opus | $0.755 | $22.65 | 37% |

### Cost Scaling

| Users | Single-Pass (Haiku) | Two-Pass (Haiku) |
|-------|---------------------|------------------|
| 10 | $24/mo | $15/mo |
| 100 | $240/mo | $150/mo |
| 1,000 | $2,400/mo | $1,500/mo |
| 10,000 | $24,000/mo | $15,000/mo |

---

## External API Costs

### YouTube Data API v3

**Cost: FREE** (quota-based system)

| Resource | Quota Cost |
|----------|------------|
| Daily free allocation | 10,000 units |
| videos.list | 1 unit |
| commentThreads.list | 1-2 units |
| search.list | 100 units |

**Oasify daily usage estimate:**
- List channel uploads: ~2 units
- List recent videos: ~5 units
- Fetch comments (5 videos × 20 comments): ~10 units
- **Total: ~17 units/day**

You could support **500+ users** syncing daily before approaching quota limits.

**Sources:**
- [YouTube API Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost)
- [YouTube API Costs Guide](https://www.getphyllo.com/post/is-the-youtube-api-free-costs-limits-iv)

### Meta Instagram Graph API

**Cost: FREE** (rate-limited)

| Limit | Value |
|-------|-------|
| Rate limit | 200 requests/hour |
| Account requirement | Business/Creator account |
| Facebook Page | Required (linked) |

**Oasify usage estimate:**
- Fetch media list: ~5 requests
- Fetch comments per media: ~20 requests
- **Total: ~25 requests per sync**

Well under the 200/hour limit. No cost concerns.

**Note:** App review process can take weeks to months for production access.

**Sources:**
- [Instagram API Pricing](https://www.getphyllo.com/post/instagram-api-pricing-explained-iv)
- [Meta Graph API Guide](https://data365.co/blog/meta-graph-api)

---

## Recommendations

### Current Implementation

1. **Model:** Claude 3.5 Haiku (`claude-3-5-haiku-20241022`)
2. **Approach:** Single-pass (transform all comments)
3. **Cost:** ~$2.40/user/month

### Recommended Optimization

1. **Model:** Claude 3.5 Haiku (no change)
2. **Approach:** Two-pass (classify first, transform negatives)
3. **Cost:** ~$1.50/user/month (37% savings)

### Implementation Steps for Two-Pass

1. Create `app/utils/classify.server.ts` with lightweight classification prompt
2. Add `classification` column to comments table (`positive` | `negative` | `neutral`)
3. Update sync functions:
   - First pass: Classify all comments
   - Second pass: Only transform comments classified as negative
4. Store classification for analytics/reporting

### Future Considerations

- **Prompt caching:** Anthropic offers prompt caching that could reduce costs for the repeated system prompt
- **Batch processing:** If real-time isn't required, batch API calls can be more efficient
- **Model updates:** Re-evaluate when new Haiku versions release

---

## Validation Files

Results from model comparison testing:
- `validation-results-haiku.json` - Haiku test results (50 comments)
- `validation-results-sonnet.json` - Sonnet test results (50 comments)
- `validate-prompt.ts` - Validation script (supports `--model=` flag)
- `test-comments.json` - Test comment dataset

Run validation:
```bash
# Test with Haiku (default)
npx tsx validate-prompt.ts

# Test with Sonnet
npx tsx validate-prompt.ts --model=claude-sonnet-4-20250514
```
