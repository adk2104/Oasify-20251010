# Instagram Integration PRD - Minimal MVP

**Project**: Oasify Instagram Integration
**Version**: 1.0 (Minimal)
**Date**: 2025-10-31

---

## Goal

Fetch Instagram comments for the developer's account and display the text content in the inbox.

---

## Scope

**What we're building**:
- Fetch Instagram comments from developer's Business Account
- Store comment text in database
- Display comments in inbox

**What we're NOT building** (yet):
- Replies
- AI rewrites
- Media thumbnails
- Webhooks
- Multi-account support

---

## Database Schema

```sql
CREATE TABLE instagram_comments (
  id SERIAL PRIMARY KEY,
  comment_id TEXT UNIQUE NOT NULL,
  text TEXT NOT NULL,
  username TEXT,
  created_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ig_comments_created_time ON instagram_comments(created_time DESC);
```

---

## API Implementation

### Helper Functions (`app/utils/instagram.server.ts`)

```typescript
// Get page token from user token
async function fbGetPageAccessToken(pageId: string, userToken: string): Promise<string>

// Get Instagram Business Account ID from page
async function fbGetIgBusinessIdFromPage(pageId: string, pageToken: string): Promise<string>

// List recent media posts
async function igListMediaPaged(igBusinessId: string, pageToken: string, limit: number)

// List comments on a media item
async function igListComments(mediaId: string, pageToken: string)
```

### Bootstrap Endpoint

**Route**: `GET /api/ig/bootstrap`

**Process**:
1. Get `IG_DEV_USER_TOKEN` and `IG_PAGE_ID` from environment
2. Get page access token
3. Get Instagram Business Account ID
4. Fetch recent media (20 posts)
5. For each media, fetch comments
6. Store comment text, username, timestamp in database
7. Return success with count

---

## UI

### Settings Page
- "Sync Instagram Comments" button
- Calls `/api/ig/bootstrap`
- Shows success/error message

### Inbox Page
- Platform filter: `YouTube | Instagram`
- Display Instagram comments:
  ```
  [username] • [time ago]
  [comment text]
  ```

---

## Environment Variables

```bash
IG_DEV_USER_TOKEN=your-long-lived-token
IG_PAGE_ID=your-facebook-page-id
```

---

## Implementation Steps

1. Create database table
2. Add environment variables
3. Write helper functions for Graph API
4. Create bootstrap endpoint
5. Add sync button to settings page
6. Display comments in inbox
7. Test

---

## Success Criteria

- ✅ Fetches comments successfully
- ✅ Stores text in database
- ✅ Displays in inbox with username and timestamp
- ✅ No errors

---

**Estimated Time**: 2-3 days
