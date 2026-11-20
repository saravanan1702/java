# Implementation Checklist

Legend: ✅ done and tested · ⬜ planned · 🔶 partially done (see note)

## Phase 1: Foundation ✅

### Project & infrastructure
- ✅ Monorepo (npm workspaces): `packages/shared`, `apps/api`, `apps/web`
- ✅ TypeScript throughout (strict, `noUncheckedIndexedAccess`)
- ✅ Zod-validated environment config with production-only safety rules
- ✅ Prisma schema for **all** phases (23 models) plus the initial migration
- ✅ Docker images (API/worker, migrate, nginx web) and `docker-compose.yml` (Postgres, Redis, Mailpit)
- ✅ `.env.example` with placeholders only; `.env` is git-ignored
- ✅ Structured logging with secret redaction and request IDs
- ✅ Health endpoints: API liveness/readiness, worker health

### Authentication
- ✅ Register, login, logout, logout-all-other-sessions
- ✅ Argon2id password hashing and a timing-equalised unknown-user path
- ✅ Opaque, hashed, revocable server sessions; hardened cookies (`__Host-` in prod)
- ✅ Email verification (single-use, 24 h, resend invalidates the old link)
- ✅ Forgot / reset password (no user enumeration, 1 h, single-use, revokes all sessions)
- ✅ Change password (requires current password, revokes other sessions)
- ✅ Account lockout after 10 failures; per-endpoint rate limits

### Workspaces & tenancy
- ✅ Create workspace (creator becomes OWNER), list, switch (server-remembered)
- ✅ Update settings (name, timezone, language: English / Tamil / Tanglish)
- ✅ Soft-delete workspace (owner only, typed-name confirmation, immediate loss of access)
- ✅ Four-layer isolation: membership → permission → scoped client → composite FKs

### Team & RBAC
- ✅ Roles: Super Admin (platform), Owner, Admin, Agent
- ✅ Invitations: email, preview, accept (email must match), resend (rotates token), revoke, expiry
- ✅ Role changes and removal with rules (admins manage agents only; always ≥1 owner; serializable transactions)
- ✅ Leave workspace
- ✅ Audit log (security events), visible to Owners and Admins
- ✅ Super Admin aggregate API with no implicit tenant access

### Background processing
- ✅ BullMQ email queue with retries and exponential backoff
- ✅ Dead-letter queue on final failure
- ✅ Worker graceful shutdown and health endpoint
- ✅ Inline mode for tests and Redis-less development

### Frontend
- ✅ Design system: tokens (dark-first + light), typography, spacing, buttons, cards, tables, forms, dialogs, dropdowns, selects, tabs, tooltips, toasts, skeletons, empty and error states
- ✅ Login, registration, forgot/reset password, verify email, accept invitation
- ✅ Onboarding wizard (workspace → team → Instagram, honestly disabled until Phase 2 → done)
- ✅ App shell: sidebar (11 items in spec order), workspace switcher, user menu, mobile drawer, verify-email banner
- ✅ Overview (real counts plus a setup checklist; **no fake metrics**)
- ✅ Team Members, Settings (workspace / profile / security + audit log / danger zone)
- ✅ Roadmap pages for later-phase sections, clearly labelled "Planned for Phase N"
- ✅ Responsive (desktop, tablet, mobile); route-level code splitting

### Tests (all passing; see `docs/TESTING.md`)
- ✅ Shared: 7 RBAC unit tests
- ✅ API: 77 tests (unit + integration on real PostgreSQL), covering isolation, CSRF, sessions, lockout, tokens, RBAC, invitations, rate limits, headers, health
- ✅ Web: 14 tests (API client, open-redirect guard, role gating, form validation, timezone regression)
- ✅ E2E: 5 Playwright journeys, passing against both the local production build and the Docker Compose stack

## Phase 2: Instagram integration ⬜
- ⬜ Re-check current Meta docs for Instagram API with Instagram Login (scopes, endpoints, webhook fields)
- ⬜ `InstagramAdapter` interface; real Meta adapter; clearly-labelled mock adapter
- ⬜ OAuth connect + callback with `state` validation (signed, single-use, bound to session and workspace)
- ⬜ Encrypted token storage (`TokenCipher` ready), token expiry monitoring and refresh (`token-health` queue)
- ⬜ Fetch account info and media; capability detection per media type
- ⬜ Connected Accounts page; Reels Manager (list, filter, select, enable/pause/exclude)
- ⬜ Webhook verify handshake + `X-Hub-Signature-256` verification on raw body; persist with `dedupeKey`
- ⬜ Disconnect account; Meta data-deletion callback
- ⬜ Prevent one IG account being actively connected to two workspaces

## Phase 3: Keyword automation ⬜
- ⬜ Rule CRUD (`/api/automations`), keywords, media scope (selected / global), priority
- ⬜ Matcher: exact / contains / starts-with, case-insensitive, NFKC + Tamil/Tanglish normalization
- ⬜ Comment pipeline (see ARCHITECTURE §8) with idempotency key per comment
- ⬜ Private reply sending with rate-limit-aware scheduling; execution log UI
- ⬜ Global rules auto-apply to newly detected eligible media; per-media exclusion
- ⬜ `POST /api/automations/:id/test` (dry run, no Meta call)

## Phase 4: Inbox, AI, product knowledge ⬜
- ⬜ Incoming DM processing within the messaging window; conversation + message storage
- ⬜ Smart Inbox: list, history, search, unread, manual reply, tags, notes, realtime (Socket.IO)
- ⬜ AI provider abstraction, retrieval, guardrails, confidence threshold, fallback, usage tracking
- ⬜ Human takeover, AI pause/resume
- ⬜ Product knowledge CRUD (+ CSV import later)

## Phase 5: Flow builder ⬜
- ⬜ React Flow builder with the 11 node types; versioned JSON; server-side validation; test runs

## Phase 6: Analytics & scale ⬜
- ⬜ Analytics (date ranges; messages vs. leads vs. sales kept distinct); aggregation job
- ⬜ Multi-account management; usage limits per plan; dead-letter inspection and retry UI
- ⬜ Time-boxed, audited support access for Super Admins

## Phase 7: Hardening & deployment ⬜
- ⬜ CI pipeline (typecheck, tests, e2e, image build)
- ⬜ Workspace purge job after the retention window; account deletion/export
- ⬜ Monitoring/alerting (error tracking, queue depth, token expiry)
- ⬜ Independent security review; load test the webhook path
