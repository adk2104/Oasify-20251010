# Repository Guidelines

## Communication Style

- The user is a newbie programmer; respond with patient, empathic explanations and encouragement.

## CRITICAL: Minimum Viable Code Only

- **Always code the minimum viable solution** — no bells and whistles
- Keep implementations simple and focused on the immediate need
- Avoid premature optimization, over-engineering, or "nice to haves"
- If a feature isn't explicitly requested, don't add it
- Simpler code = easier to debug, maintain, and understand


## Project Structure & Module Organization

- `app/` holds the React Router v7 app: route modules in `app/routes/`, shared UI in `app/components/`, server utilities in `app/utils/`, and session logic in `app/sessions.server.ts`.
- `app/db/` contains Drizzle schema and seed logic; database config lives in `drizzle.config.ts`, with generated migrations under `drizzle/`.
- `public/` stores static assets; global styles are in `app/app.css`.
- Entry points are `app/root.tsx` and `app/routes.ts`.

## Build, Test, and Development Commands

- `npm run dev` starts the local dev server with HMR at `http://localhost:5173`.
- `npm run build` compiles the production build to `build/`.
- `npm run start` serves the production build from `build/server/index.js`.
- `npm run typecheck` runs React Router typegen then TypeScript.
- `npm run db:generate`, `npm run db:migrate`, `npm run db:push` manage Drizzle migrations; `npm run db:seed` seeds data.

## Coding Style & Naming Conventions

- Use TypeScript with React Router v7 patterns and double quotes as seen in `app/`.
- Keep indentation at two spaces and follow existing file organization (route modules map to URL paths).
- TailwindCSS is the styling system; prefer utility classes over bespoke CSS.
- Server-side helpers are named `*.server.ts` and live under `app/utils/`.

## Testing Guidelines

- No automated test framework is configured in this repo.
- Use `npm run typecheck` as the minimum verification step.
- If you add tests, place them near related code (for example `app/routes/__tests__/`) and document the runner in this file.

## Commit & Pull Request Guidelines

- Recent commits use short, imperative messages like “Fix …” or “Add …”; follow that style.
- PRs should include a concise summary, testing notes (even if “not run”), and screenshots for UI changes.
- Link relevant issues or docs when introducing new integrations (for example `GOOGLE_OAUTH_SETUP.md`).

## Configuration & Secrets

- Define `SESSION_SECRET` in `.env` (see `.env.example`); do not commit secrets.
- OAuth setup guidance lives in `GOOGLE_OAUTH_SETUP.md` and related integration docs in the repo root.
