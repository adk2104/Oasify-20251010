# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Oasify is a React Router v7 web application that helps content creators manage, analyze, and respond to comments from YouTube and Instagram. Features include YouTube OAuth integration, AI-powered empathetic comment transformation using Claude, and a responsive dashboard.

## Development Commands

```bash
# Development
npm run dev                # Start dev server (http://localhost:5173)
npm run typecheck         # TypeScript check + generate route types

# Database
npm run db:push           # Push schema changes to database (dev only)
npm run db:generate       # Generate migration files
npm run db:migrate        # Run migrations
npm run db:studio         # Open Drizzle Studio GUI
npm run db:seed           # Seed test user (demo@example.com)

# Production
npm run build            # Production build
npm run start            # Run production server
```

## Tech Stack

- **Framework**: React Router v7 with SSR
- **Language**: TypeScript (strict mode)
- **Styling**: TailwindCSS v4 (utility classes only - NEVER write raw CSS)
- **Database**: PostgreSQL (Supabase) with Drizzle ORM
- **Auth**: Cookie-based sessions via react-router
- **AI**: Anthropic Claude (empathetic comment transformation)
- **OAuth**: Google OAuth for YouTube access

## Architecture Patterns

### Route Structure (`app/routes.ts`)

Routes are explicitly defined (NOT file-based naming):

```typescript
export default [
  index("routes/login.tsx"),
  route("dashboard", "routes/dashboard-layout.tsx", [
    index("routes/dashboard.tsx"),              // /dashboard
    route("analytics", "routes/dashboard.analytics.tsx"),
    route("settings", "routes/dashboard.settings.tsx"),
  ]),
  route("oauth/google/start", "routes/oauth.google.start.tsx"),
  route("oauth/google/callback", "routes/oauth.google.callback.tsx"),
  route("api/providers", "routes/api.providers.tsx"),
  route("api/youtube/comments", "routes/api.youtube.comments.tsx"),
]
```

### Protected Route Pattern

```typescript
export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));

  if (!session.has("userId")) {
    return redirect("/");
  }

  const userId = session.get("userId") as number;
  return { userId };
}
```

### Component Structure

```typescript
// 1. Imports
import type { Route } from "./+types/route-name";
import { Component } from "~/components/ui/component";

// 2. Server functions
export async function loader({ request }: Route.LoaderArgs) {
  // Data fetching
}

export async function action({ request }: Route.ActionArgs) {
  // Form handling
}

// 3. Component
export default function RouteName({ loaderData }: Route.ComponentProps) {
  return <div className="flex items-center gap-4 p-6">{/* Tailwind only */}</div>;
}
```

## Database Schema

### Tables

**users** - User accounts (id, email, password)

**providers** - OAuth connections (userId, platform, accessToken, refreshToken, expiresAt, scopes, platformUserId, platformData)

**comments** - Stored comments (id, userId, youtubeCommentId, author, text, empathicText, videoTitle, videoId, platform, createdAt, fetchedAt)

### Database Workflow

1. Modify schema file in `app/db/schema/`
2. Export from `app/db/schema/index.ts`
3. Run `npm run db:push` to apply changes
4. Run `npm run typecheck` to update route types

### Usage

```typescript
import { db } from '~/db/config';
import { users, providers, comments } from '~/db/schema';

const data = await db.select().from(users).where(eq(users.id, userId));
```

## Authentication System

### Session Management

Cookie-based sessions configured in `app/sessions.server.ts`:
- Cookie name: `__session`
- Max age: 1 week
- Secrets: `process.env.SESSION_SECRET`

### Session Data Structure

```typescript
type SessionData = {
  userId: number;
  userEmail: string;
};
```

### Demo Credentials

- Email: `demo@example.com`
- Password: `password`
- User ID: 1 (seeded)

## External Integrations

### Google OAuth for YouTube

**Flow**:
1. User clicks "Connect YouTube"
2. Redirect to `/oauth/google/start`
3. Google consent screen
4. Callback to `/oauth/google/callback?code=...`
5. Exchange code for tokens
6. Fetch channel info
7. Store in `providers` table

**Scopes**:
- `youtube.readonly`
- `youtube.force-ssl`

### Token Refresh Pattern

Tokens auto-refresh before API calls:
1. Check if `expiresAt` <= current time
2. If expired: Exchange `refreshToken` for new access token
3. Update provider record
4. Use new token

Implementation in `app/utils/youtube.server.ts:getValidAccessToken()`

### YouTube Comment Fetching

Process (`app/utils/youtube.server.ts`):
1. Get YouTube provider from DB
2. Get valid access token (refresh if needed)
3. Fetch channel's uploads playlist
4. Fetch 5 recent videos
5. For each video: Fetch up to 20 comments
6. Return sorted by date (newest first)

### Claude AI Integration

**Model**: claude-3-5-haiku-20241022 (fast, cost-effective)

**Purpose**: Transform negative/critical comments into empathetic responses using NVC principles

**Usage**:
```typescript
import { generateEmpathicVersion } from '~/utils/empathy.server';
const empathicText = await generateEmpathicVersion(originalComment);
```

**Rules**:
- Positive comments: Leave unchanged
- Negative comments: Transform to empathetic compliments
- Negative with constructive feedback: Keep constructive, reframe negativity
- ALWAYS preserve original language
- NEVER add meta-commentary

## UI Components

### Custom Components (`app/components/ui/`)

All built with Tailwind + class-variance-authority:
- Button (variants: default, outline, ghost)
- Input (white bg, dark text)
- Label, Card, Avatar, Badge, Switch, Dropdown Menu, Textarea

### Helper Function

```typescript
import { cn } from "~/lib/utils";

<div className={cn("base-classes", conditional && "extra-classes")} />
```

### Main Components

**AppSidebar** (`app/components/app-sidebar.tsx`):
- Collapsible navigation
- State persisted to localStorage
- Shows provider connection status

**Header** (`app/components/header.tsx`):
- User email display
- Logout button

## Environment Variables

Required variables:

```bash
# Session (REQUIRED)
SESSION_SECRET=your-secret-key

# Database (REQUIRED)
DATABASE_URL=postgresql://user:pass@host:port/db

# Google OAuth (REQUIRED for YouTube)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:5173/oauth/google/callback

# Claude AI (REQUIRED for empathic comments)
ANTHROPIC_API_KEY=sk-ant-...

# Instagram (OPTIONAL - future)
IG_DEV_USER_TOKEN=...
IG_PAGE_ID=...
IG_BUSINESS_ID=...
```

**Note**: Only variables prefixed with `VITE_` are exposed to client-side code. All current env vars are server-only.

## Code Style

### TypeScript
- Use strict mode (enabled in tsconfig.json)
- Avoid `any` - use proper types
- Use `type` for object shapes
- Leverage route type generation: `Route.LoaderArgs`, `Route.ComponentProps`

### File Naming
- Routes: kebab-case (e.g., `dashboard-layout.tsx`)
- Components: PascalCase filename (e.g., `AppSidebar.tsx`)
- Utilities: kebab-case with `.server` suffix for server-only (e.g., `auth.server.ts`)

### Styling
- **ONLY use Tailwind CSS utility classes**
- **NEVER write raw CSS, inline styles, or CSS modules**
- Use `cn()` helper to merge classes
- Responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`

### Import Paths
- Use `~/` prefix for app directory
- Example: `import { db } from '~/db/config'`

## Data Flow Examples

### Comment Sync Flow

```
User clicks "Sync Comments" → useFetcher POST to /api/youtube/comments?action=sync
→ api.youtube.comments action() → syncYouTubeCommentsToDatabase()
→ Fetch YouTube provider from DB → Get valid token (refresh if needed)
→ Fetch channel uploads → Fetch 5 recent videos
→ For each video: Fetch 20 comments → Generate empathic versions (Claude AI)
→ Store in comments table → Return JSON response
→ Dashboard reloads data → Display updated comments
```

### OAuth Flow

```
User clicks "Connect YouTube" → GET /oauth/google/start
→ Build OAuth URL with userId as state → Redirect to Google
→ User approves → Google redirects to /oauth/google/callback?code=...
→ Validate state → Exchange code for tokens → Fetch channel info
→ Insert/update provider in DB → Redirect to /dashboard?connected=youtube
```

## Key Files

| File | Purpose |
|------|---------|
| `app/routes.ts` | Route configuration |
| `app/sessions.server.ts` | Session/cookie management |
| `app/db/config.ts` | Database connection |
| `app/db/schema/` | Database table definitions |
| `app/utils/auth.server.ts` | Password hashing, auth checks |
| `app/utils/youtube.server.ts` | YouTube API integration |
| `app/utils/empathy.server.ts` | Claude AI comment transformation |
| `app/components/ui/` | Reusable UI components |
| `app/lib/utils.ts` | Helper functions (cn()) |

## Common Tasks

### Add a New Database Table

1. Create `app/db/schema/my-table.ts`
2. Export from `app/db/schema/index.ts`
3. Run `npm run db:push`
4. Import and use: `import { myTable } from '~/db/schema'`

### Add a New Protected Route

1. Add route to `app/routes.ts`
2. Create route file with loader that checks session
3. Use `redirect("/")` if not authenticated

### Add a New API Endpoint

1. Add route to `app/routes.ts`: `route("api/my-endpoint", "routes/api.my-endpoint.tsx")`
2. Create file with loader (GET) or action (POST)
3. Return JSON: `return Response.json({ data })`

### Internal API Calls

```typescript
const response = await fetch(`${new URL(request.url).origin}/api/endpoint`, {
  headers: { Cookie: request.headers.get("Cookie") || "" }
});
const data = await response.json();
```

## Philosophy

This project follows the "motorcycle philosophy" from user preferences:
- Build fast and simple (vs over-engineered)
- Easy to pick up and keep going if something breaks
- Don't worry about edge cases initially
- Adapt complexity as needed, not upfront

Keep solutions simple and straightforward. Add complexity only when necessary.
