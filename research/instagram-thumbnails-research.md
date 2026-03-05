# Research: Instagram Thumbnail Persistence & Recent Code Review

## Part A: Current Codebase State

### How Instagram Thumbnails Flow Through the System

**Schema** (`app/db/schema/comments.ts`):
- `videoThumbnail: text('video_thumbnail')` — stores CDN URL as plain text

**Instagram Sync** (`app/utils/instagram.server.ts`, line 301):
```typescript
const mediaThumbnail = media.thumbnail_url || media.media_url || null;
```

1. API call returns `thumbnail_url` and `media_url` from Instagram CDN
2. Thumbnail URL extracted during media collection
3. Raw CDN URL string saved to `videoThumbnail` column
4. Displayed via `<img src={videoThumbnail} />` in VideoGroup/CommentThread

**Problem:** Instagram CDN URLs include signed expiration params — they expire within hours to days.

**YouTube comparison:** YouTube thumbnails (`i.ytimg.com`) are permanent, no issue.

---

## Part B: Recent Code Changes Review

### 1. header.tsx — Rotating Creator Quotes
- Removed 2nd Oasify logo, replaced with quote from `creator-quotes.ts`
- Clean import, proper `useState`, responsive design maintained
- **Quality: ✅ Good** — follows patterns, no issues

### 2. dashboard.tsx — Removed Old Quote Section
- Removed duplicate quote display, cleaned up unused imports
- Single responsibility: dashboard focuses on comments, header handles quotes
- **Quality: ✅ Good** — clean refactoring

### 3. VideoGroup.tsx — Platform Name Label
- Added platform icon + name ("YouTube"/"Instagram") above video title
- Properly styled with Tailwind, accessible
- **Quality: ✅ Excellent** — good UX improvement

### 4. creator-quotes.ts — Quotes Data
- 25 curated quotes, mix of original and attributed
- Random selection function correct
- **Quality: ✅ Excellent**

**Overall: All changes are solid, no bugs or pattern violations detected.**

---

## Part C: Best Practices for Instagram Thumbnail Persistence

### Option 1: Supabase Storage (RECOMMENDED)
- Download image during sync, upload to Supabase Storage bucket
- Store permanent Supabase CDN URL in database
- Global CDN (285+ cities), image optimization included
- Free tier: 1GB storage (supports thousands of thumbnails)
- Cost: ~$0.025/image (50-100KB each)

### Option 2: Base64 in PostgreSQL (NOT RECOMMENDED)
- Store encoded image data directly in text/bytea column
- ❌ Database bloat, 10x slower reads, backup overhead
- Not suitable for this use case

### Option 3: Image Proxy Server (PARTIAL SOLUTION)
- Proxy requests through our server with cache headers
- ⚠️ Only delays the problem — Instagram URLs still expire eventually

### Option 4: Re-fetch from API Each Time (NOT RECOMMENDED)
- ❌ Rate limiting, slow page loads, redundant API calls

---

## Part D: Recommended Approach — Supabase Storage

**Why:** Already using Supabase for PostgreSQL, Storage is available with no extra infrastructure.

**Schema additions:**
- Keep `videoThumbnail` for YouTube (permanent URLs)
- Add `videoThumbnailStorageUrl` for Supabase Storage URLs
- Optionally keep original CDN URL as backup

**Sync modification:**
1. Download image from Instagram CDN during sync
2. Upload to `thumbnails/instagram/{mediaId}.jpg` in Supabase Storage
3. Get public URL from Supabase
4. Store in new column

**Display logic:**
- Prefer `videoThumbnailStorageUrl` if available
- Fall back to `videoThumbnail` (original CDN URL)
- Fall back to platform icon placeholder

---

## Sources
- [Instagram Graph API Developer Guide 2026](https://elfsight.com/blog/instagram-graph-api-complete-developer-guide-for-2026/)
- [Instagram URL Expiration — Zapier Community](https://community.zapier.com/how-do-i-3/instagram-to-rss-image-url-expires-10513)
- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Upload media to Supabase from remote URL — DEV Community](https://dev.to/antoine_m/upload-media-to-supabase-from-remote-url-with-nodejs-5h45)
- [PostgreSQL Binary Data Performance — CYBERTEC](https://www.cybertec-postgresql.com/en/binary-data-performance-in-postgresql/)
- [Drizzle ORM PostgreSQL Column Types](https://orm.drizzle.team/docs/column-types/pg)
