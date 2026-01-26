# Sync Algorithm & Cost Analysis

*Last updated: January 26, 2026*

This document explains how Oasify syncs comments from YouTube and Instagram, API limitations, and cost projections at different scales.

---

## Table of Contents

1. [How Sync Works](#how-sync-works)
2. [API Limitations](#api-limitations)
3. [Current Settings](#current-settings)
4. [AI Cost Analysis](#ai-cost-analysis)
5. [Scenarios by Creator Size](#scenarios-by-creator-size)
6. [App-Wide Scaling](#app-wide-scaling)
7. [Optimization Options](#optimization-options)

---

## How Sync Works

### YouTube Flow

```
1. Get channel's uploads playlist
2. Fetch N most recent videos
3. For each video: fetch up to M comments (ordered by time, newest first)
4. For each comment: generate empathic version via AI
5. Store/update in database (upsert on conflict)
6. Process replies in second phase
```

**Key file:** `app/utils/youtube.server.ts`

### Instagram Flow

```
1. Get owner profile (for isOwner detection)
2. Fetch N most recent media posts
3. For each post: get ALL comments (follows pagination)
4. Fetch full replies for each comment
5. For each comment: generate empathic version via AI
6. Store/update in database (upsert on conflict)
```

**Key file:** `app/utils/instagram.server.ts`

---

## API Limitations

### The Core Problem

Neither YouTube nor Instagram offers a "get all recent comments across all content" endpoint. The API structure is:

```
Content (Video/Post) → Comments
```

Not:

```
Channel/Account → All Recent Comments (chronological)
```

This means if someone comments on your 6th oldest video/post, it won't be synced unless you increase the number of posts fetched.

### YouTube Data API

| Aspect | Details |
|--------|---------|
| Cost | FREE (quota-based) |
| Daily quota | 10,000 units per app |
| `commentThreads.list` | 1-2 units per call |
| `maxResults` param | Up to 100 per request |
| Pagination | Supported via `pageToken` |
| Comment ordering | `time` (newest) or `relevance` |

**Important:** Getting 100 comments costs the same quota as getting 20 (same API call).

### Instagram Graph API

| Aspect | Details |
|--------|---------|
| Cost | FREE (rate-limited) |
| Rate limit | ~200 requests/user/hour |
| Comments per request | Follows pagination automatically |
| Account requirement | Business or Creator account |

---

## Current Settings

### YouTube (`youtube.server.ts`)

| Setting | Current Value | Location | Max Allowed |
|---------|---------------|----------|-------------|
| Videos per sync | 5 | Line 253: `maxResults=5` | Unlimited (paginate) |
| Comments per video | 20 | Line 273: `maxResults=20` | 100 per request |

**Max comments per sync:** ~100 top-level + replies

### Instagram (`instagram.server.ts`)

| Setting | Current Value | Location | Max Allowed |
|---------|---------------|----------|-------------|
| Posts per sync | 5 | Line 294: `limit=5` | Unlimited (paginate) |
| Comments per post | ALL | Lines 200-228 | Follows pagination |

**Max comments per sync:** All comments on 5 most recent posts

---

## AI Cost Analysis

### Current AI Stack

| Priority | Model | Provider |
|----------|-------|----------|
| Primary | Gemini 2.5 Flash | Google |
| Fallback | GPT-4o-mini | OpenAI |

**Key file:** `app/utils/empathy.server.ts`

### Pricing (per 1M tokens)

| Model | Input | Output |
|-------|-------|--------|
| **Gemini 2.5 Flash** | $0.075 | $0.30 |
| GPT-4o-mini | $0.15 | $0.60 |
| Claude 3.5 Haiku (old) | $1.00 | $5.00 |

Gemini is ~10x cheaper than Claude Haiku.

### Token Usage Per Comment

| Component | Tokens |
|-----------|--------|
| System prompt | ~1,809 |
| Average comment | ~32 |
| Average output | ~32 |

### Cost Per Comment (Gemini)

```
Input:  (1,809 + 32) × $0.075/1M = $0.000138
Output: 32 × $0.30/1M           = $0.0000096
Total:                          ≈ $0.00015
```

**Rule of thumb: $0.15 per 1,000 comments**

---

## Scenarios by Creator Size

### Typical Comment Volumes

| Follower Count | Comments/Post | Engagement Rate |
|----------------|---------------|-----------------|
| 1-5K (Micro) | 5-20 | 1-2% |
| 10K (Small) | 20-50 | 0.5-1% |
| 100K (Mid) | 100-500 | 0.2-0.5% |
| 1M+ (Large) | 500-5,000+ | 0.1-0.3% |

*Note: Varies significantly by niche, content type, and platform.*

### Monthly Cost by Creator Size

**Assumptions:** Daily sync, 5 posts synced per day

| Creator Size | Comments/Sync | Comments/Month | AI Cost/Month |
|--------------|---------------|----------------|---------------|
| Micro (5K) | 50 | 1,500 | **$0.23** |
| Small (10K) | 150 | 4,500 | **$0.68** |
| Mid (100K) | 1,000 | 30,000 | **$4.50** |
| Large (1M) | 5,000 | 150,000 | **$22.50** |

### With Two-Pass Optimization

Classify first, only transform negative comments (~50%):

| Creator Size | Comments/Month | AI Cost/Month | Savings |
|--------------|----------------|---------------|---------|
| Micro (5K) | 1,500 | **$0.14** | 39% |
| Small (10K) | 4,500 | **$0.40** | 41% |
| Mid (100K) | 30,000 | **$2.70** | 40% |
| Large (1M) | 150,000 | **$13.50** | 40% |

---

## App-Wide Scaling

### Cost Projections

| User Base | Avg Comments/User/Month | Total Comments | Monthly AI Cost |
|-----------|------------------------|----------------|-----------------|
| 10 micro | 1,500 | 15,000 | **$2.25** |
| 100 small | 4,500 | 450,000 | **$67.50** |
| 100 mixed | ~10,000 | 1,000,000 | **$150** |
| 1,000 mixed | ~10,000 | 10,000,000 | **$1,500** |

### YouTube API Quota

At ~17 quota units per user sync:
- 10,000 daily units ÷ 17 = **~588 user syncs/day**
- With 1,000 users syncing daily, need to request quota increase

---

## Optimization Options

### 1. Increase Coverage (More Content)

Change `maxResults` to fetch more videos/posts:

| Setting | Current | Option A | Option B |
|---------|---------|----------|----------|
| YouTube videos | 5 | 10 | 20 |
| YouTube comments/video | 20 | 100 | 100 |
| Instagram posts | 5 | 10 | 20 |

**Trade-off:** More coverage = longer sync time + more AI cost

### 2. Two-Pass Classification

1. First pass: Lightweight prompt classifies positive/negative
2. Second pass: Only transform negative comments

**Savings:** ~40% on AI costs

**Implementation:**
- Add `classification` column to comments table
- Create `classify.server.ts` with simple prompt
- Update sync to classify first, transform selectively

### 3. Quick Sync vs Full Sync

Offer two sync modes:

| Mode | Videos/Posts | Comments | Use Case |
|------|-------------|----------|----------|
| Quick | 5 | 20/video | Daily use |
| Full | 20 | 100/video | Weekly deep sync |

### 4. Incremental Sync

Track what's already in database, skip re-processing:

- Current: `onConflictDoUpdate` already handles this for storage
- Opportunity: Skip AI call entirely for existing comments

### 5. Pagination for YouTube Comments

Add pagination to get ALL comments per video (like Instagram does):

```typescript
let pageToken: string | undefined;
do {
  const response = await fetch(
    `${API}/commentThreads?videoId=${id}&maxResults=100&pageToken=${pageToken || ''}`
  );
  // process comments...
  pageToken = data.nextPageToken;
} while (pageToken);
```

---

## Key Decisions to Make

1. **How many videos/posts to sync?** (coverage vs cost)
2. **Implement two-pass classification?** (40% savings)
3. **Add full sync option?** (weekly deep sync)
4. **Target user base?** (micro creators = cheap, large = expensive)

---

---

## Implementation: Parallel AI Processing

*Code for Jake to review - see jake-sessions.csv*

### Current Problem

Both YouTube and Instagram sync process comments **sequentially**:

```typescript
// Current (slow) - processes one at a time
for (const comment of comments) {
  const empathicText = await generateEmpathicVersion(comment.text);  // waits ~1 sec
  await db.insert(comments).values({ /* ... */ });
}
```

**Result:** 1,000 comments = 1,000 seconds = ~17 minutes

### Proposed Solution: Batch Processing

Process 5-10 comments in parallel using `Promise.all()`:

**New file: `app/utils/batch.server.ts`**

```typescript
/**
 * Process items in parallel batches
 * @param items - Array of items to process
 * @param batchSize - How many to process at once (5-10 recommended)
 * @param processor - Async function to run on each item
 */
export async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }

  return results;
}
```

### Usage in Sync Functions

**Before (sequential):**
```typescript
for (const comment of comments) {
  const empathicText = await generateEmpathicVersion(comment.text);
  await db.insert(...);
}
```

**After (parallel batches):**
```typescript
import { processInBatches } from '~/utils/batch.server';

// Process AI transformations in parallel batches of 5
const processed = await processInBatches(comments, 5, async (comment) => ({
  ...comment,
  empathicText: await generateEmpathicVersion(comment.text),
}));

// Then insert to DB (can also batch these if needed)
for (const item of processed) {
  await db.insert(...);
}
```

### Files to Modify

| File | What to Change |
|------|----------------|
| New: `app/utils/batch.server.ts` | Create shared helper function |
| `app/utils/youtube.server.ts` | Lines ~281-337 (comments), ~344-391 (replies) |
| `app/utils/instagram.server.ts` | Lines ~326-388 (comments), ~397-453 (replies) |

### Speed Improvement

| Batch Size | 100 Comments | 500 Comments | 1,000 Comments |
|------------|--------------|--------------|----------------|
| 1 (current) | ~2 min | ~10 min | ~20 min |
| 5 parallel | ~25 sec | ~2 min | ~4 min |
| 10 parallel | ~12 sec | ~1 min | ~2 min |

### Questions for Jake

1. What batch size is safe for Gemini/OpenAI rate limits?
2. Should we add retry logic for failed items in a batch?
3. Better to batch DB inserts too, or keep those sequential?

---

## Related Files

| File | Purpose |
|------|---------|
| `COST-ANALYSIS.md` | Original Claude cost analysis |
| `app/utils/youtube.server.ts` | YouTube sync implementation |
| `app/utils/instagram.server.ts` | Instagram sync implementation |
| `app/utils/empathy.server.ts` | AI transformation (Gemini + OpenAI) |
