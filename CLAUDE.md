# Oasify Project - Claude Code Instructions

This is a React Router v7 web application with authentication and dashboard functionality.

## Project Overview

Oasify is a modern web application built with React Router v7, featuring:
- Cookie-based authentication system
- Protected dashboard routes
- Custom UI component library
- TailwindCSS styling

## Tech Stack

- **Framework**: React Router v7
- **Language**: TypeScript
- **Database**: PostgreSQL (Supabase) with Drizzle ORM
- **Styling**: TailwindCSS v4
- **Authentication**: bcryptjs for password hashing
- **Session Management**: Cookie-based sessions (react-router)
- **UI Components**: Custom components with class-variance-authority, clsx, tailwind-merge
- **Icons**: Lucide React

## Project Structure

```
app/
├── components/
│   └── ui/                    # Reusable UI components
│       ├── button.tsx         # Button component
│       ├── input.tsx          # Input with white bg, dark text
│       ├── label.tsx          # Form label component
│       └── card.tsx           # Card container component
├── db/
│   ├── config.ts             # Database connection (Supabase PostgreSQL)
│   └── schema/
│       └── index.ts          # Schema exports
├── lib/
│   └── utils.ts              # Utility functions (cn helper)
├── routes/
│   ├── login.tsx             # Login page (index route)
│   └── dashboard.tsx         # Protected dashboard
├── utils/
│   └── auth.server.ts        # Authentication utilities (server-side)
├── sessions.server.ts        # Session management
├── root.tsx                  # Root application component
└── routes.ts                 # Route configuration
```

## Route Configuration

Routes are defined in `app/routes.ts`:

```typescript
export default [
  index("routes/login.tsx"),           // / - Login page
  route("dashboard", "routes/dashboard.tsx"),  // /dashboard - Protected
] satisfies RouteConfig;
```

## Database Setup

### Database Configuration

The app uses **Drizzle ORM** with **PostgreSQL** hosted on **Supabase**.

**Connection details:**
- Host: `db.ioulrhrglrjrjpuanpjo.supabase.co`
- Port: `5432`
- Database: `postgres`
- User: `postgres`
- Password: From `SUPABASE_PASSWORD` environment variable

### Database Files

- `app/db/config.ts` - Database connection configuration
- `app/db/schema/index.ts` - Schema exports (add new table schemas here)
- `drizzle.config.ts` - Drizzle Kit configuration for migrations

### Database Commands

```bash
# Generate migration files from schema changes
npm run db:generate

# Run migrations against the database
npm run db:migrate

# Push schema changes directly to database (development)
npm run db:push

# Seed database with test user (run after migrations)
npm run db:seed

# Open Drizzle Studio GUI to view/edit data
npm run db:studio
```

### Initial Setup

When setting up the project for the first time:

1. Copy `.env.example` to `.env` and fill in your credentials
2. Run migrations: `npm run db:migrate`
3. Seed test user: `npm run db:seed`
4. Start dev server: `npm run dev`

The seed script creates a test user:
- Email: `demo@example.com`
- Password: `password`
- User ID: `1`

The seed script is idempotent - it checks if the user exists before creating it, so it's safe to run multiple times.

### Creating Database Tables

1. Create a new schema file in `app/db/schema/` (e.g., `users.ts`, `oauth-connections.ts`)
2. Define your table using Drizzle ORM syntax
3. Export the table from `app/db/schema/index.ts`
4. Run `npm run db:push` to sync to Supabase

**Example schema structure:**

```typescript
// app/db/schema/oauth-connections.ts
import { pgTable, serial, integer, text, timestamp } from 'drizzle-orm/pg-core';

export const oauthConnections = pgTable('oauth_connections', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(), // Foreign key to users
  provider: text('provider').notNull(), // e.g., 'google'
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at'),
  scope: text('scope'), // e.g., YouTube permissions
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### Using the Database

Import the `db` instance from `app/db/config.ts`:

```typescript
import { db } from '~/db/config';
import { oauthConnections } from '~/db/schema';

// Query example
const connections = await db.select().from(oauthConnections).where(...);

// Insert example
await db.insert(oauthConnections).values({
  userId: 1,
  provider: 'google',
  accessToken: 'token',
  // ...
});
```

## Authentication System

### Session Management (`app/sessions.server.ts`)

Cookie-based sessions with the following configuration:
- Cookie name: `oasify_session`
- HttpOnly: true
- MaxAge: 1 week
- Secure: true (production only)
- Secret: From `SESSION_SECRET` environment variable

Session data structure:
```typescript
type SessionData = {
  userId: number;
  userEmail: string;
};
```

### Authentication Flow

1. **Login** (`app/routes/login.tsx`):
   - Form submits to action function
   - Mock validation checks email against "demo@example.com"
   - Sets userId and userEmail in session
   - Redirects to dashboard on success

2. **Protected Routes** (`app/routes/dashboard.tsx`):
   - Loader checks for valid session
   - Redirects to login if not authenticated
   - Returns user data if authenticated

3. **Demo Credentials**:
   - Email: `demo@example.com`
   - Password: `password` (currently mock validation)

## UI Components

### Input Component (`app/components/ui/input.tsx`)

Features:
- White background (`bg-white`)
- Dark text (`text-gray-900`)
- Light gray placeholder (`placeholder:text-gray-400`)
- Blue focus ring
- Full width, rounded corners
- Accessible with proper focus states

### Button Component

Variants for different states and styles using class-variance-authority.

### Card Component

Container component with header, title, description, and content sections.

## Environment Variables

Required variables in `.env`:

```bash
# Session security - REQUIRED
SESSION_SECRET=your-secret-key-here

# Database - Supabase PostgreSQL - REQUIRED
SUPABASE_PASSWORD=your-supabase-password-here
```

Use `.env.example` as a template.

## Development Workflow

### Starting the Dev Server

```bash
npm run dev
# Available at http://localhost:5173
```

### Testing

**Test Account** (created by `npm run db:seed`):
- Email: demo@example.com
- Password: password
- User ID: 1

This test user is automatically created when you run the seed script and is used for:
- Testing authentication flow
- Testing YouTube OAuth integration
- Development and testing of all features

## Code Style Guidelines

1. **Components**: Use functional components with TypeScript
2. **File Naming**: Use kebab-case for files, PascalCase for components
3. **Imports**: Use `~` prefix for app directory imports
4. **Styling**: Use Tailwind utility classes
5. **Forms**: Use Form component from react-router
6. **Loading States**: Use Loader2 icon with animation

## Common Patterns

### Protected Route

```typescript
export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));

  if (!session.has("userId")) {
    return redirect("/");
  }

  return data({ user: session.get("userEmail") });
}
```

### Form Action

```typescript
export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const formData = await request.formData();

  // Process form data

  return redirect("/somewhere", {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}
```

## Next Steps / TODO

Potential features to implement:
- Create users table in database
- Migrate authentication to use database instead of mock validation
- Create Google OAuth connections table for YouTube comment access
- User registration flow
- Password reset functionality
- User profile management
- Additional protected routes
- Role-based access control
- Remember me functionality
- Multi-factor authentication

## Design Principles

Following the "motorcycle vs car" philosophy:
- Keep things simple and fast
- Don't over-engineer for edge cases
- Easy to pick up and modify
- Adapt complexity as needed, not upfront

## Important Notes

- Database is fully configured with Drizzle ORM + PostgreSQL (Supabase)
- `users` and `providers` tables are created and working
- Test user is automatically seeded with `npm run db:seed`
- Authentication uses real database with bcrypt-hashed passwords
- YouTube OAuth integration stores tokens in `providers` table
- Comments are fetched fresh from YouTube API (not stored in database)
- Run `npm run db:seed` after migrations to ensure test user exists
