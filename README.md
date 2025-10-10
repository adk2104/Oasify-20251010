# Oasify

A modern web application built with React Router v7, featuring authentication, dashboard functionality, and a clean UI built with TailwindCSS.

## Features

- 🔐 Cookie-based authentication with bcrypt password hashing
- 🎨 Modern UI components (Button, Input, Card, Label)
- 🚀 Server-side rendering with React Router v7
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Environment Setup

Create a `.env` file in the root directory (see `.env.example`):

```bash
# Session security
SESSION_SECRET=your-secret-key-here
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

### Demo Credentials

For testing, use these credentials on the login page:
- **Email**: demo@example.com
- **Password**: password

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Project Structure

```
oasify-app/
├── app/
│   ├── components/
│   │   └── ui/           # Reusable UI components
│   ├── lib/              # Utility functions
│   ├── routes/           # Route modules
│   │   ├── login.tsx     # Login page
│   │   └── dashboard.tsx # Protected dashboard
│   ├── utils/            # Server utilities
│   │   └── auth.server.ts # Authentication helpers
│   ├── sessions.server.ts # Session management
│   ├── root.tsx          # Root component
│   └── routes.ts         # Route configuration
├── public/               # Static assets
└── .env.example          # Environment variables template
```

## Authentication

This application uses cookie-based session authentication:

- Sessions are stored in encrypted HTTP-only cookies
- Passwords are hashed using bcrypt
- Protected routes automatically redirect to login if not authenticated
- Session management utilities in `app/sessions.server.ts`
- Authentication helpers in `app/utils/auth.server.ts`

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) with custom UI components. Components follow a consistent design system with:

- White backgrounds with dark text for inputs
- Blue accent colors for focus states
- Responsive layouts
- Accessible form controls

## Tech Stack

- **Framework**: React Router v7
- **Styling**: TailwindCSS v4
- **Authentication**: bcryptjs
- **UI Components**: Custom components with class-variance-authority
- **Icons**: Lucide React
- **Language**: TypeScript

---

Built with React Router v7.
