# Project: Call a Nanny (callanannycare.vercel.app)

## Git Workflow
- **Always push directly to `main`** — do not use feature branches
- After any code change, commit and push to `main` immediately
- Deployment is automatic via Vercel from the `main` branch on GitHub (origin)
- Remote: `origin` = https://github.com/mazelpouch-tech/callanannycare-v2.git

## Tech Stack
- Frontend: React + TypeScript + Vite (with vite-plugin-pwa)
- Backend: Vercel serverless functions (api/ directory)
- Database: Neon PostgreSQL (tagged template SQL via `@neondatabase/serverless`)
- Deployment: Vercel (auto-deploys from main)

## Key Paths
- `api/` — Vercel serverless API endpoints
- `src/types/index.ts` — All TypeScript types (DB snake_case + frontend camelCase)
- `src/context/DataContext.tsx` — Central data context (4 booking normalization points)
- `src/pages/admin/` — Admin dashboard pages
- `src/pages/nanny/` — Nanny portal pages
- `src/pages/Book.tsx` — Parent booking form

## Important Notes
- Vercel has a 12 serverless function limit — be careful adding new API endpoints
- The seed endpoint (`POST /api/seed`) handles DB migrations via ALTER TABLE
- Always run `npm run build` before pushing to catch TypeScript errors
- Never lose existing features when merging or rebasing
