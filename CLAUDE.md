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
```

Use `.env.example` as a template.

## Development Workflow

### Starting the Dev Server

```bash
npm run dev
# Available at http://localhost:5173
```

### Testing

**Demo Account**:
- Email: demo@example.com
- Password: password

The login page pre-fills the email field with the demo account.

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
- Database integration (consider SQLite + Drizzle ORM)
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

- The authentication is currently using mock validation
- Passwords are not yet hashed (bcryptjs is installed but not yet implemented)
- No database - sessions are cookie-only
- Dashboard is minimal - ready for expansion
