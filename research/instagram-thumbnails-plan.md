# Instagram Thumbnail Persistence Plan (Supabase Storage)

## 1. Architecture Overview

### Goal
Persist Instagram thumbnails during sync so `videoThumbnail` no longer points to expiring Instagram CDN URLs.

### Where it fits in current flow
Current sync entrypoint:
- `app/routes/api.sync.tsx` calls `syncInstagramCommentsToDatabase(userId, onProgress)` in `app/utils/instagram.server.ts`.

Thumbnail extraction currently happens in:
- `app/utils/instagram.server.ts` inside the media loop (`const mediaThumbnail = media.thumbnail_url || media.media_url || null`).

### Planned flow
1. Instagram media is fetched (`getInstagramMedia`).
2. For each media post (max 5), resolve thumbnail once:
   - choose source URL: `media.thumbnail_url || media.media_url`.
   - download image.
   - upload to Supabase Storage bucket.
   - get permanent public URL.
3. Store that permanent URL in existing `comments.videoThumbnail` for all comments/replies of that media.
4. If persistence fails, keep using original Instagram CDN URL (graceful fallback).
5. YouTube flow remains unchanged.

### Important behavior decisions
- One thumbnail upload per media post (not per comment).
- Keep existing schema (`videoThumbnail` as `text`) to avoid migration.
- Deterministic storage path + `upsert` to prevent duplicate files on re-sync.

Example storage path:
- `instagram/{userId}/{mediaId}.{ext}`

---

## 2. Files To Modify

### `app/utils/instagram.server.ts`
Changes:
- Add import for a new storage helper.
- In `syncInstagramCommentsToDatabase`, replace direct assignment of `mediaThumbnail` with persisted URL logic.
- Ensure fallback to original CDN URL if helper throws.

Suggested code shape in media loop:

```ts
const rawThumbnailUrl = media.thumbnail_url || media.media_url || null;
const mediaThumbnail = rawThumbnailUrl
  ? await persistInstagramThumbnail({
      sourceUrl: rawThumbnailUrl,
      userId,
      mediaId: media.id,
    })
  : null;
```

Wrap with `try/catch` so sync never fails because thumbnail persistence fails:

```ts
let mediaThumbnail = rawThumbnailUrl;
try {
  if (rawThumbnailUrl) {
    mediaThumbnail = await persistInstagramThumbnail({ sourceUrl: rawThumbnailUrl, userId, mediaId: media.id });
  }
} catch (error) {
  console.error(`[INSTAGRAM SYNC] Thumbnail persistence failed for media ${media.id}:`, error);
}
```

### `package.json`
Changes:
- Add dependency: `@supabase/supabase-js`.

### `env-reference.md` (or project env docs file)
Changes:
- Document required storage env vars:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_STORAGE_BUCKET` (optional; default to `thumbnails` in code)

Note:
- There is no `.env.example` in this repo currently; document env additions in existing env docs file used by the team.

---

## 3. New Files To Create

### `app/utils/supabase-storage.server.ts`
Purpose:
- Server-only utility to download remote Instagram thumbnail and upload to Supabase Storage.

Key contents:
- Supabase client initialization using server env vars.
- `persistInstagramThumbnail` function.
- Small helpers for content type / extension handling.
- Conservative error handling (throw to caller; caller decides fallback).

Proposed API:

```ts
export async function persistInstagramThumbnail(params: {
  sourceUrl: string;
  userId: number;
  mediaId: string;
}): Promise<string>
```

Proposed internals:
1. Validate env.
2. `fetch(sourceUrl)` and read as `ArrayBuffer`/`Blob`.
3. Build path `instagram/${userId}/${mediaId}.${ext}`.
4. `supabase.storage.from(bucket).upload(path, fileBody, { upsert: true, contentType })`.
5. Return `supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl`.

Optional safety check in helper:
- If URL already points to this Supabase Storage bucket, return it unchanged.

---

## 4. Step-by-Step Implementation Order

1. Install dependency.
   - `npm install @supabase/supabase-js`
2. Create Supabase Storage bucket.
   - Bucket name: `thumbnails` (public bucket for direct image rendering).
3. Add env vars to local/dev/prod environments.
4. Add `app/utils/supabase-storage.server.ts`.
5. Wire helper into `syncInstagramCommentsToDatabase` media loop.
6. Verify TypeScript compiles.
   - `npm run typecheck`
7. Run one Instagram sync and verify DB + UI URLs are now Supabase Storage URLs.
8. Re-sync the same media and verify idempotency (same path overwritten, no growth from duplicates).

---

## 5. Dependencies To Install

Required:
- `@supabase/supabase-js`

Command:

```bash
npm install @supabase/supabase-js
```

No other packages are needed for this change.

---

## 6. Testing Approach

### Minimum verification (project standard)
- Run: `npm run typecheck`

### Functional checks
1. Trigger sync from dashboard (`/api/sync` path used by UI).
2. Inspect new/updated Instagram comment rows in `comments` table:
   - `platform = 'instagram'`
   - `video_thumbnail` should be a Supabase public URL.
3. Open dashboard and confirm thumbnails render for Instagram comment threads/groups.
4. Confirm YouTube thumbnails still work (unchanged behavior).

### Fallback behavior check
- Temporarily break storage config (invalid key or bucket name), run sync:
  - Sync should still complete.
  - `videoThumbnail` should still be populated (using original Instagram URL fallback).
  - Error should be logged, not thrown to break sync.

### Idempotency check
- Run sync twice for same Instagram media:
  - URLs should remain stable.
  - Storage file path should be reused (`upsert` behavior).

---

## 7. Potential Risks / Gotchas

1. Bucket visibility
- If bucket is private but UI expects direct `<img src>`, images will fail to load.
- Mitigation: use public bucket for this MVP.

2. Missing/incorrect env vars
- Missing `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` breaks uploads.
- Mitigation: explicit env validation + fallback to CDN URL.

3. Service-role key handling
- `SUPABASE_SERVICE_ROLE_KEY` is sensitive.
- Mitigation: keep usage only in `*.server.ts`; never expose to client bundles.

4. Upload latency
- Download+upload adds per-media work.
- Mitigation: only 5 media posts per sync, and one thumbnail upload per media (not per comment).

5. Content-type / extension mismatches
- Instagram may return different image content types.
- Mitigation: derive extension from response `content-type` with safe default (`jpg`).

6. Existing expired thumbnails remain
- Old rows keep expired CDN URLs until refreshed.
- Mitigation: running sync updates rows via existing `onConflictDoUpdate` path.

7. Duplicate work across parallel sync runs
- Two syncs could upload same object concurrently.
- Mitigation: deterministic path + `upsert: true`; last write wins with same content class.

---

## Reference Touchpoints In Current Code

- Thumbnail source extraction: `app/utils/instagram.server.ts` (media loop in `syncInstagramCommentsToDatabase`).
- Persisted field: `app/db/schema/comments.ts` (`videoThumbnail`).
- UI consumers (no change required):
  - `app/components/VideoGroup.tsx`
  - `app/components/CommentThread.tsx`
- Sync trigger path:
  - `app/routes/api.sync.tsx`
