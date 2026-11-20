# InstaFlow AI

Multi-tenant Instagram automation SaaS: comment-to-DM automation, keyword rules, AI-assisted customer support in **English, Tamil and Tanglish**, a smart inbox and a visual flow builder. Built **only on official Meta APIs**: no passwords, scraping or browser bots.

> **Status: Phase 1 of 7 complete.** Accounts, workspaces, team roles, and the security and infrastructure foundation are built and tested. Instagram connection arrives in Phase 2. Sections not yet built are clearly labelled "Planned for Phase N" in the app; nothing is faked.

## Stack
React 19 · TypeScript · Vite · Tailwind CSS v4 · shadcn/ui-pattern (Radix) · TanStack Query · React Router — Node.js 22 · Express 5 · Prisma 7 · PostgreSQL · Redis · BullMQ · Zod 4 — Vitest · Supertest · Playwright — Docker Compose.

## Quick start
```bash
cp .env.example .env     # set CSRF_SECRET and TOKEN_ENCRYPTION_KEYS (generator commands inside)
docker compose up --build
```
Open http://localhost:8080. Emails (verification, invitations) land in Mailpit at http://localhost:8025.

For hot-reload development, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#local-development).

## Scripts (repository root)
| Command | What it does |
|---|---|
| `npm run dev` | API + worker + web with hot reload |
| `npm test` | Shared, API (needs PostgreSQL) and web unit/integration tests |
| `npm run test:e2e` | Playwright journeys against a running stack |
| `npm run typecheck` | Type-check every package |
| `npm run build` | Production builds |
| `npm run db:migrate` / `db:deploy` / `db:seed` | Prisma migrations / seeding |

## Documentation
- [Architecture](docs/ARCHITECTURE.md): system design, tenancy model, queues, plans for later phases
- [Implementation checklist](docs/IMPLEMENTATION_CHECKLIST.md): what's done and what's next, by phase
- [API reference](docs/API.md)
- [Security](docs/SECURITY.md): controls, key rotation, known gaps
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md): local, Docker, free-tier production
- [Phase 1 report](docs/phases/PHASE-1-REPORT.md)

## Layout
```
packages/shared   RBAC matrix, Zod schemas, DTOs (used by API and web)
apps/api          Express API + BullMQ worker, Prisma schema & migrations
apps/web          React dashboard, design system, Playwright e2e
docs/             Architecture, security, API, deployment, phase reports
```

Instagram is a trademark of Meta Platforms, Inc. InstaFlow AI is not affiliated with Meta.
