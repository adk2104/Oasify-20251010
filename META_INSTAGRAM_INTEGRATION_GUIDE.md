# Meta/Instagram Integration Guide

This document explains how MetaOasify integrates with Meta's Graph API to access Instagram Business Account comments. Use this as a reference for implementing similar functionality in new applications.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication Architecture](#authentication-architecture)
3. [API Helper Functions](#api-helper-functions)
4. [Bootstrap Process](#bootstrap-process)
5. [Comment Syncing](#comment-syncing)
6. [Posting Replies](#posting-replies)
7. [Database Schema](#database-schema)
8. [Image Proxying](#image-proxying)
9. [Error Handling](#error-handling)
10. [Environment Setup](#environment-setup)

---

## Overview

The Instagram integration uses Facebook's **Graph API v20.0** to access Instagram Business Accounts through Facebook Pages. This is different from YouTube's OAuth flow—Instagram uses a developer token-based approach.

**Key Architecture Points:**
- No user-facing OAuth flow (developer-only implementation)
- User access token → Facebook Pages → Page access token → Instagram Business Account
- All API calls use the page access token (not the user token)
- Supports reading comments, posting top-level comments, and posting nested replies

---

## Authentication Architecture

### Authentication Chain

The authentication flow follows a deterministic chain:

```
User Access Token (IG_DEV_USER_TOKEN)
    ↓
Facebook Pages (me/accounts)
    ↓
Selected Page (by IG_PAGE_ID)
    ↓
Page Access Token
    ↓
Instagram Business Account ID (from page)
    ↓
All Instagram API Operations
```

### Environment Variables

Required environment variables:

```bash
# Developer user access token from Meta Developer Console
IG_DEV_USER_TOKEN=your-long-lived-user-token

# Specific Facebook Page ID to use
IG_PAGE_ID=411144105738607

# Instagram Business Account ID (optional, can be resolved from page)
IG_BUSINESS_ID=17841401961470880
```

### Required Permissions

The user access token must have these Meta permissions:
- `pages_show_list` - List Facebook Pages
- `pages_read_engagement` - Read page engagement data
- `pages_manage_metadata` - Manage page metadata
- `instagram_basic` - Access Instagram account info
- `instagram_manage_comments` - Read and manage Instagram comments
- `instagram_manage_messages` - Manage Instagram messages

### Token Types

1. **User Access Token**:
   - Developer's personal token from Meta Developer Console
   - Used to list and select Facebook Pages
   - Should be long-lived (60 days)

2. **Page Access Token**:
   - Derived from user token for specific page
   - Used for all Instagram API operations
   - Retrieved fresh for each operation

---

## API Helper Functions

All Graph API helper functions use `fetch()` with URL construction and error handling. Here are the key functions:

### 1. Facebook Page Management

#### `fbGetPages(userAccessToken)`

Lists all Facebook Pages accessible to the user.

```javascript
async function fbGetPages(userAccessToken) {
  const url = new URL('https://graph.facebook.com/v20.0/me/accounts');
  url.searchParams.set('access_token', userAccessToken);
  const r = await fetch(url.toString());
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || 'fbGetPages failed');
  if (!j.data?.length) throw new Error('No Facebook Pages found for this user');
  return j.data; // [{ id, name, access_token, ... }]
}
```

**Returns**: Array of page objects with `id`, `name`, `access_token` fields.

#### `fbGetPageAccessToken(pageId, userAccessToken)`

Gets a page-specific access token derived from the user token.

```javascript
async function fbGetPageAccessToken(pageId, userAccessToken) {
  const url = new URL(`https://graph.facebook.com/v20.0/${pageId}`);
  url.searchParams.set('fields', 'access_token');
  url.searchParams.set('access_token', userAccessToken);
  const r = await fetch(url.toString());
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || 'fbGetPageAccessToken failed');
  if (!j.access_token) throw new Error('No page access_token returned');
  return j.access_token;
}
```

**Returns**: Page access token string.

#### `fbGetIgBusinessIdFromPage(pageId, pageAccessToken)`

Resolves the Instagram Business Account ID connected to a Facebook Page.

```javascript
async function fbGetIgBusinessIdFromPage(pageId, pageAccessToken) {
  const url = new URL(`https://graph.facebook.com/v20.0/${pageId}`);
  url.searchParams.set('fields', 'instagram_business_account');
  url.searchParams.set('access_token', pageAccessToken);
  const r = await fetch(url.toString());
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || 'fbGetIgBusinessIdFromPage failed');
  const igId = j?.instagram_business_account?.id;
  if (!igId) throw new Error('This Page has no connected Instagram Business/Creator account');
  return igId;
}
```

**Returns**: Instagram Business Account ID string.

---

### 2. Instagram Media Operations

#### `igListMediaPaged(igBusinessId, pageAccessToken, desired)`

Fetches Instagram media (photos, videos, carousels) with cursor-based pagination.

```javascript
async function igListMediaPaged(igBusinessId, pageAccessToken, desired = 20) {
  const collected = [];
  let url = new URL(`https://graph.facebook.com/v20.0/${igBusinessId}/media`);
  url.searchParams.set('fields', 'id,caption,media_type,media_url,timestamp,permalink');
  url.searchParams.set('limit', '25'); // pull in larger chunks
  url.searchParams.set('access_token', pageAccessToken);

  while (collected.length < desired) {
    const r = await fetch(url.toString());
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error?.message || 'igListMediaPaged failed');
    const batch = j.data || [];
    collected.push(...batch);
    const next = j?.paging?.next;
    if (!next || batch.length === 0) break;
    url = new URL(next); // Use cursor URL directly
  }

  return collected.slice(0, desired);
}
```

**Parameters**:
- `igBusinessId` - Instagram Business Account ID
- `pageAccessToken` - Page access token
- `desired` - Number of media items to fetch (default: 20)

**Returns**: Array of media objects with fields:
- `id` - Media ID
- `caption` - Post caption
- `media_type` - `IMAGE`, `VIDEO`, or `CAROUSEL_ALBUM`
- `media_url` - Direct media URL
- `timestamp` - ISO timestamp
- `permalink` - Instagram web link

#### `igGetMediaMeta(mediaId, pageAccessToken)`

Fetches detailed metadata for a specific media item.

```javascript
async function igGetMediaMeta(mediaId, pageAccessToken) {
  const url = new URL(`https://graph.facebook.com/v20.0/${mediaId}`);
  url.searchParams.set('fields', 'id,permalink,media_url,thumbnail_url,media_type,caption');
  url.searchParams.set('access_token', pageAccessToken);
  const r = await fetch(url.toString());
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || 'igGetMediaMeta failed');
  return {
    id: j.id,
    permalink: j.permalink || null,
    display_url: j.thumbnail_url || j.media_url || null, // Prefer thumbnail for videos
    media_url: j.media_url || null,
    media_type: j.media_type || null,
    caption: j.caption || null
  };
}
```

**Returns**: Object with media metadata including `display_url` optimized for thumbnails.

---

### 3. Instagram Comment Operations

#### `igListComments(mediaId, pageAccessToken, after)`

Fetches comments on a specific media item with cursor-based pagination.

```javascript
async function igListComments(mediaId, pageAccessToken, after = null) {
  const url = new URL(`https://graph.facebook.com/v20.0/${mediaId}/comments`);
  url.searchParams.set('fields', 'id,text,username,timestamp,like_count');
  url.searchParams.set('access_token', pageAccessToken);
  if (after) url.searchParams.set('after', after);
  const r = await fetch(url.toString());
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || 'igListComments failed');
  return {
    items: j.data || [],
    nextAfter: j?.paging?.cursors?.after || null
  };
}
```

**Parameters**:
- `mediaId` - Instagram media ID
- `pageAccessToken` - Page access token
- `after` - Pagination cursor (optional)

**Returns**: Object with:
- `items` - Array of comment objects
- `nextAfter` - Next cursor for pagination (null if no more)

#### `igGetCommentMeta(commentId, pageAccessToken)`

Fetches metadata for a specific comment including parent relationships.

```javascript
async function igGetCommentMeta(commentId, pageAccessToken) {
  const url = new URL(`https://graph.facebook.com/v20.0/${commentId}`);
  url.searchParams.set('fields', 'id,media{id},text,timestamp,username,like_count,parent_id');
  url.searchParams.set('access_token', pageAccessToken);
  const r = await fetch(url.toString());
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || 'igGetCommentMeta failed');
  return {
    id: j.id,
    media_id: j?.media?.id || null,
    text: j?.text || '',
    timestamp: j?.timestamp || null,
    username: j?.username || null,
    like_count: j?.like_count ?? 0,
    parent_id: j?.parent_id || null // Key for threading
  };
}
```

**Returns**: Comment metadata including `parent_id` for reply threading.

---

### 4. Posting Operations

#### `igPostCommentOnMedia(mediaId, pageAccessToken, message)`

Posts a top-level comment on an Instagram media item.

```javascript
async function igPostCommentOnMedia(mediaId, pageAccessToken, message) {
  const url = new URL(`https://graph.facebook.com/v20.0/${mediaId}/comments`);
  const r = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ message, access_token: pageAccessToken })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || 'igPostCommentOnMedia failed');
  return j; // { id: 'comment_id' }
}
```

#### `igReplyToComment(commentId, pageAccessToken, message)`

Posts a nested reply to an existing comment.

```javascript
async function igReplyToComment(commentId, pageAccessToken, message) {
  const url = new URL(`https://graph.facebook.com/v20.0/${commentId}/replies`);
  const r = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ message, access_token: pageAccessToken })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || 'igReplyToComment failed');
  return j; // { id: 'reply_comment_id' }
}
```

**Key Difference**:
- Media comments use `/media/{media-id}/comments`
- Replies use `/comments/{comment-id}/replies`

---

### 5. Account Information

#### `igGetAccountUsername(igBusinessId, pageAccessToken)`

Retrieves the Instagram account username for attribution.

```javascript
async function igGetAccountUsername(igBusinessId, pageAccessToken) {
  const url = new URL(`https://graph.facebook.com/v20.0/${igBusinessId}`);
  url.searchParams.set('fields', 'username');
  url.searchParams.set('access_token', pageAccessToken);
  const r = await fetch(url.toString());
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || 'igGetAccountUsername failed');
  return j?.username || null;
}
```

**Use Case**: Display your account name instead of "You" or "me" in the UI.

---

## Bootstrap Process

The bootstrap process is the initial data load that fetches existing Instagram comments into your database.

### Endpoint: `GET /ig/bootstrap`

**Query Parameters**:
- `media_limit` (default: 20) - Number of recent media items to fetch
- `per_media_comments` (default: 20) - Max comments per media item
- `user_token` (optional) - Override `IG_DEV_USER_TOKEN` for testing

### Bootstrap Flow

```javascript
app.get('/ig/bootstrap', async (req, res) => {
  try {
    // 1. Resolve authentication chain
    const userToken = req.query.user_token || process.env.IG_DEV_USER_TOKEN;
    const desiredPageId = process.env.IG_PAGE_ID;

    const pages = await fbGetPages(userToken);
    const page = pages.find(p => p.id === desiredPageId);
    if (!page) throw new Error(`Page ${desiredPageId} not found`);

    const pageToken = await fbGetPageAccessToken(page.id, userToken);
    const igBusinessId = process.env.IG_BUSINESS_ID ||
                         await fbGetIgBusinessIdFromPage(page.id, pageToken);

    // 2. Fetch recent media
    const mediaDesired = parseInt(req.query.media_limit) || 20;
    const perMediaCap = parseInt(req.query.per_media_comments) || 20;
    const media = await igListMediaPaged(igBusinessId, pageToken, mediaDesired);

    // 3. Fetch comments for each media with pagination
    const batch = [];
    for (const m of media) {
      let after = null, fetched = 0;

      while (fetched < perMediaCap) {
        const { items, nextAfter } = await igListComments(m.id, pageToken, after);
        if (!items.length) break;

        for (const c of items) {
          batch.push({
            comment_id: c.id,
            media_id: m.id,
            username: c.username || null,
            text: c.text || '',
            like_count: c.like_count ?? 0,
            created_time: c.timestamp ? new Date(c.timestamp).toISOString() : null,
            parent_id: null,
            permalink: m.permalink || null,
            media_url: m.media_url || null,
            media_type: m.media_type || null,
            display_url: (m.thumbnail_url || m.media_url) || null,
            caption: m.caption || null
          });
        }

        fetched += items.length;
        if (!nextAfter) break;
        after = nextAfter;
      }
    }

    // 4. Upsert all comments to database
    if (batch.length) {
      const { error } = await supabase
        .from('instagram_comments')
        .upsert(batch, { onConflict: 'comment_id' });
      if (error) throw error;
    }

    res.send(`Bootstrap complete: ${batch.length} comments loaded`);
  } catch (e) {
    console.error('[IG bootstrap] Error:', e?.message);
    res.status(500).send(`Bootstrap failed: ${e?.message}`);
  }
});
```

### Key Implementation Details

1. **Deterministic Page Selection**: Always use `IG_PAGE_ID` to select the correct page (don't use `pages[0]`)
2. **Cursor-Based Pagination**: Use `after` cursor from `paging.cursors.after` for Instagram comments
3. **Media Enrichment**: Store media metadata (permalink, thumbnail, caption) with each comment
4. **Upsert Strategy**: Use `upsert` with `comment_id` conflict resolution to handle re-runs
5. **Batch Processing**: Collect all comments before inserting to minimize database calls

---

## Comment Syncing

After the initial bootstrap, ongoing comment syncing keeps the database up to date.

### Syncing Strategy

For MetaOasify, the bootstrap is manually triggered. For production apps, implement:

1. **Webhook Integration**: Use Instagram webhooks for real-time comment notifications
2. **Scheduled Polling**: Run bootstrap endpoint on a cron schedule (e.g., every 15 minutes)
3. **Incremental Updates**: Track last sync timestamp and only fetch newer comments

### Webhook Setup (Recommended)

```javascript
// Webhook verification endpoint
app.get('/webhooks/instagram', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Webhook notification endpoint
app.post('/webhooks/instagram', async (req, res) => {
  const body = req.body;

  if (body.object === 'instagram') {
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field === 'comments') {
          // Fetch and store the new comment
          const commentId = change.value.id;
          const mediaId = change.value.media_id;
          await fetchAndStoreComment(commentId, mediaId);
        }
      }
    }
  }

  res.status(200).send('EVENT_RECEIVED');
});
```

---

## Posting Replies

The reply system supports both top-level comments on media and nested replies to comments.

### Endpoint: `POST /api/ig/reply`

**Request Body**:
```json
{
  "target_id": "media_id or comment_id",
  "text": "Reply text content",
  "type": "media or comment"
}
```

### Reply Implementation

```javascript
app.post('/api/ig/reply', async (req, res) => {
  try {
    const { target_id, text, type } = req.body;
    if (!target_id || !text?.trim()) {
      return res.status(400).send('Missing target_id or text');
    }

    // 1. Resolve authentication
    const userToken = process.env.IG_DEV_USER_TOKEN;
    const pageId = process.env.IG_PAGE_ID;
    const igBusinessId = process.env.IG_BUSINESS_ID;
    const pageToken = await fbGetPageAccessToken(pageId, userToken);

    let newId, mediaId, parentId = null;
    let permalink, mediaUrl, caption, displayUrl, mediaType;

    // 2. Post based on type
    if (type === 'comment') {
      // Reply to existing comment
      const resp = await igReplyToComment(target_id, pageToken, text.trim());
      newId = resp.id;
      parentId = target_id;

      // Resolve media from parent comment
      const parentMeta = await igGetCommentMeta(target_id, pageToken);
      mediaId = parentMeta.media_id;

      const m = await igGetMediaMeta(mediaId, pageToken);
      permalink = m.permalink;
      mediaUrl = m.media_url;
      caption = m.caption;
      displayUrl = m.display_url;
      mediaType = m.media_type;
    } else {
      // Top-level comment on media
      const resp = await igPostCommentOnMedia(target_id, pageToken, text.trim());
      newId = resp.id;
      mediaId = target_id;

      const m = await igGetMediaMeta(mediaId, pageToken);
      permalink = m.permalink;
      mediaUrl = m.media_url;
      caption = m.caption;
      displayUrl = m.display_url;
      mediaType = m.media_type;
    }

    // 3. Get account username for attribution
    let myIgUsername = null;
    try {
      myIgUsername = await igGetAccountUsername(igBusinessId, pageToken);
    } catch (_) {}

    // 4. Upsert to database for immediate display
    await supabase.from('instagram_comments').upsert({
      comment_id: newId,
      media_id: mediaId,
      text: text.trim(),
      created_time: new Date().toISOString(),
      parent_id: parentId,
      username: myIgUsername || 'me',
      like_count: 0,
      permalink,
      media_url: mediaUrl,
      caption,
      display_url: displayUrl,
      media_type: mediaType
    }, { onConflict: 'comment_id' });

    res.redirect('/ig/comments/chron');
  } catch (e) {
    console.error('IG reply error:', e?.message || e);
    res.redirect('/ig/comments?synced=error');
  }
});
```

### Key Reply Features

1. **Dual Reply Types**: Supports both media comments and comment replies with type detection
2. **Media Resolution**: Fetches media metadata for replies to ensure consistent UI
3. **Username Attribution**: Resolves your Instagram username instead of showing "You"
4. **Immediate Upsert**: Inserts reply immediately for instant UI feedback
5. **Error Recovery**: Graceful error handling with user-friendly redirects

---

## Database Schema

### Table: `instagram_comments`

```sql
CREATE TABLE instagram_comments (
  id SERIAL PRIMARY KEY,
  comment_id TEXT UNIQUE NOT NULL,          -- Instagram comment ID
  media_id TEXT NOT NULL,                   -- Instagram media ID
  text TEXT NOT NULL,                       -- Comment text
  username TEXT,                            -- Comment author username
  like_count INTEGER DEFAULT 0,
  created_time TIMESTAMPTZ,                 -- Instagram timestamp
  parent_id TEXT,                           -- Parent comment ID (for replies)

  -- Media enrichment fields
  permalink TEXT,                           -- Instagram web link
  media_url TEXT,                           -- Direct media URL
  caption TEXT,                             -- Media caption
  display_url TEXT,                         -- Thumbnail URL (optimized)
  media_type TEXT,                          -- IMAGE, VIDEO, CAROUSEL_ALBUM

  -- Empathetic rewriting fields
  empath_text TEXT,                         -- NVC/empathetic rewrite
  empath_meta JSONB,                        -- { classification, action, model, latency_ms }
  empath_version INTEGER,                   -- Algorithm version
  empath_seed INTEGER,                      -- Random seed for reproducibility
  empath_updated_at TIMESTAMPTZ,            -- Last empath processing time
  empath_error TEXT,                        -- Error message if processing failed

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ig_comments_media_id ON instagram_comments(media_id);
CREATE INDEX idx_ig_comments_parent_id ON instagram_comments(parent_id);
CREATE INDEX idx_ig_comments_created_time ON instagram_comments(created_time DESC);
CREATE INDEX idx_ig_comments_comment_id ON instagram_comments(comment_id);
```

### Empath Metadata Structure

The `empath_meta` JSONB field stores metadata from AI processing:

```json
{
  "classification": "positive | neutral | negative_no_constructive | negative_with_constructive | mixed",
  "action": "keep | soften | compliment | mixed",
  "empath_text": "The AI-rewritten text",
  "model": "claude-3-haiku-20240307",
  "latency_ms": 1234
}
```

---

## Image Proxying

Instagram CDN images require proxying to avoid CORS issues and improve performance.

### Endpoint: `GET /proxy/img?url=...`

### Implementation

```javascript
const imageCache = new Map();

app.get('/proxy/img', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send('Missing url parameter');

    // Create cache key from URL hash
    const urlHash = crypto.createHash('md5').update(url).digest('hex');
    const cached = imageCache.get(urlHash);

    // Check if cached and not expired (24h TTL)
    if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
      res.set({
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=86400',
        'ETag': cached.etag
      });

      // Handle ETag-based caching
      if (req.headers['if-none-match'] === cached.etag) {
        return res.status(304).end();
      }

      return res.send(cached.buffer);
    }

    // Fetch image from Instagram
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; InstagramBot/1.0)',
      }
    });

    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch image');
    }

    const buffer = await response.buffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const etag = `"${urlHash}"`;

    // Cache the result
    imageCache.set(urlHash, {
      buffer,
      contentType,
      etag,
      timestamp: Date.now()
    });

    // Clean cache periodically (1% chance per request)
    if (Math.random() < 0.01) {
      for (const [key, value] of imageCache.entries()) {
        if (Date.now() - value.timestamp > 24 * 60 * 60 * 1000) {
          imageCache.delete(key);
        }
      }
    }

    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
      'ETag': etag,
      'Referrer-Policy': 'no-referrer'
    });

    res.send(buffer);
  } catch (e) {
    console.error('Image proxy error:', e?.message || e);
    res.status(500).send('Proxy error');
  }
});
```

### Cache Features

1. **MD5 Hash Keys**: Efficient cache lookup with URL hashing
2. **24-Hour TTL**: Images cached for one day
3. **ETag Support**: Client-side caching with 304 responses
4. **Automatic Cleanup**: Probabilistic cache eviction (1% per request)
5. **CORS Bypass**: Serves images from same origin

### Usage in UI

```html
<img
  src="/proxy/img?url=https://scontent.cdninstagram.com/..."
  alt="Instagram media"
  style="max-width: 200px;"
/>
```

---

## Error Handling

### Comprehensive Error Strategy

All Instagram API operations include robust error handling:

```javascript
try {
  const result = await igListComments(mediaId, pageToken);
  // Process result
} catch (error) {
  console.error('[IG] Error fetching comments:', error?.message || error);
  // Fallback or retry logic
}
```

### Error Logging Conventions

Use prefixed console logs for debugging:

- `[IG]` - General Instagram operations
- `[IG bootstrap]` - Bootstrap process
- `[IG EMPATH]` - Empathetic rewriting for Instagram
- `[IG reply]` - Reply posting operations

### User-Facing Error Handling

```javascript
// Redirect with error indicator instead of exposing stack traces
app.get('/some-route', async (req, res) => {
  try {
    // Operation
    res.redirect('/success');
  } catch (e) {
    console.error('[IG] Operation failed:', e?.message);
    res.redirect('/ig/comments?synced=error');
  }
});
```

### Common Error Scenarios

1. **Invalid Token**: Token expired or insufficient permissions
   - **Fix**: Regenerate token in Meta Developer Console with correct permissions

2. **Page Not Found**: `IG_PAGE_ID` doesn't match accessible pages
   - **Fix**: Verify page ID and ensure user token has access

3. **No Instagram Account**: Facebook Page not linked to Instagram Business Account
   - **Fix**: Connect Instagram account in Facebook Page settings

4. **Rate Limiting**: Too many API calls in short period
   - **Fix**: Implement exponential backoff and respect rate limits

5. **Media Permission Issues**: Trying to access private or deleted media
   - **Fix**: Handle gracefully with null checks and skip inaccessible media

---

## Environment Setup

### Step 1: Create Meta Developer App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app with type "Business"
3. Add Instagram Basic Display and Instagram Graph API products
4. Configure App Settings:
   - Add Valid OAuth Redirect URIs (if using OAuth flow)
   - Set App Mode to "Development" for testing

### Step 2: Generate User Access Token

1. Use the **Graph API Explorer** tool
2. Select your app from the dropdown
3. Add required permissions (listed in Authentication section)
4. Click "Generate Access Token"
5. Exchange short-lived token for long-lived token (60 days):

```bash
curl -i -X GET "https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id={app-id}&client_secret={app-secret}&fb_exchange_token={short-lived-token}"
```

### Step 3: Find Page and Instagram IDs

Get Facebook Page ID:
```bash
curl -i -X GET "https://graph.facebook.com/v20.0/me/accounts?access_token={user-token}"
```

Get Instagram Business Account ID from page:
```bash
curl -i -X GET "https://graph.facebook.com/v20.0/{page-id}?fields=instagram_business_account&access_token={user-token}"
```

### Step 4: Configure Environment

Create `.env` file:
```bash
# Meta/Instagram
IG_DEV_USER_TOKEN=EAABwzLix...  # Long-lived user token
IG_PAGE_ID=411144105738607      # Facebook Page ID
IG_BUSINESS_ID=17841401961470880 # Instagram Business Account ID

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# AI Processing (optional)
ANTHROPIC_API_KEY=sk-ant-...
```

### Step 5: Test Bootstrap

```bash
# Start your server
npm start

# Visit bootstrap endpoint
curl http://localhost:3000/ig/bootstrap?media_limit=5&per_media_comments=20
```

---

## Key Differences from YouTube Integration

Understanding these differences helps when implementing both integrations:

| Aspect | Instagram | YouTube |
|--------|-----------|---------|
| **Authentication** | Dev token-based, no user OAuth flow | Full OAuth 2.0 with refresh tokens |
| **Comment Threading** | Flat parent-child (max 2 levels) | Deeper nesting with `is_top_level` flag |
| **Media Association** | Always linked with rich metadata | Videos separate from comment metadata |
| **Pagination** | Cursor-based (`after` parameter) | Page token-based |
| **API Version** | Graph API v20.0 | YouTube Data API v3 |
| **Token Management** | Manual token refresh every 60 days | Automatic refresh token rotation |
| **Reply Attribution** | Requires username resolution | Uses authenticated channel automatically |
| **Image Handling** | CDN requires proxying | Thumbnails accessible via direct URLs |

---

## Implementation Checklist

When implementing Instagram integration in a new application:

- [ ] Set up Meta Developer App with Instagram products
- [ ] Generate long-lived user access token with correct permissions
- [ ] Identify Facebook Page ID and Instagram Business Account ID
- [ ] Configure environment variables (token, page ID, IG business ID)
- [ ] Implement authentication chain helper functions
- [ ] Create database table with proper schema
- [ ] Implement bootstrap endpoint for initial data load
- [ ] Add image proxy endpoint for CDN images
- [ ] Implement reply posting (media and comment types)
- [ ] Add error handling with prefixed logging
- [ ] Test with production Meta app (after review)
- [ ] (Optional) Set up webhooks for real-time updates
- [ ] (Optional) Integrate AI processing for comment rewriting

---

## Production Considerations

### Token Management

For production apps:
1. Implement token refresh automation (before 60-day expiry)
2. Store tokens securely (encrypted database, not .env files)
3. Handle token invalidation gracefully
4. Monitor token expiry with alerts

### Rate Limiting

Instagram Graph API has rate limits:
- **Per User**: 200 calls per hour per user
- **Per App**: 4800 calls per day per app

Implement:
- Exponential backoff for rate limit errors
- Request queuing to stay under limits
- Caching to reduce API calls

### Webhook Integration

For real-time comment notifications:
1. Register webhook endpoint in Meta Developer Console
2. Verify webhook with challenge parameter
3. Handle `comments` field notifications
4. Process notifications asynchronously (queue)
5. Implement deduplication for webhook retries

### Security

- Never expose user tokens in client-side code
- Use page tokens for all Instagram operations
- Validate webhook signatures to prevent spoofing
- Sanitize comment text to prevent XSS
- Implement CORS properly for image proxy

### Monitoring

Log and monitor:
- API error rates by endpoint
- Token expiry events
- Bootstrap success/failure
- Reply posting success/failure
- Image proxy cache hit rate

---

## Troubleshooting

### "No Facebook Pages found"

**Cause**: User token doesn't have access to any pages or missing `pages_show_list` permission.

**Fix**:
- Verify token permissions in Graph API Explorer
- Ensure user is admin of at least one Facebook Page
- Regenerate token with correct permissions

### "This Page has no connected Instagram Business/Creator account"

**Cause**: Selected Facebook Page not linked to Instagram Business Account.

**Fix**:
- Go to Facebook Page settings
- Connect Instagram Business Account
- Ensure account is Business or Creator type (not Personal)

### "Invalid OAuth access token"

**Cause**: Token expired or revoked.

**Fix**:
- Generate new long-lived token
- Update `IG_DEV_USER_TOKEN` in environment
- Restart server

### "Target Page not found in /me/accounts"

**Cause**: `IG_PAGE_ID` doesn't match accessible pages.

**Fix**:
- List pages with `fbGetPages()` to see available IDs
- Update `IG_PAGE_ID` to match one of the returned page IDs
- Ensure user has admin role on the page

### Images Not Loading

**Cause**: CORS issues or CDN authentication.

**Fix**:
- Ensure using `/proxy/img?url=...` endpoint
- Check image URL is valid Instagram CDN URL
- Verify User-Agent header in proxy fetch
- Clear image cache and retry

---

## Additional Resources

- [Instagram Graph API Documentation](https://developers.facebook.com/docs/instagram-api)
- [Meta for Developers](https://developers.facebook.com/)
- [Instagram Basic Display API](https://developers.facebook.com/docs/instagram-basic-display-api)
- [Facebook Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [Webhooks Setup Guide](https://developers.facebook.com/docs/graph-api/webhooks)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-31
**MetaOasify Implementation Reference**
