# Phase 1 Report: Foundation

**Scope:** project setup, database, authentication, workspace management, team and RBAC, React dashboard, Docker.
**Result:** complete. All tests pass. Awaiting approval before Phase 2.

## 1. What was built

| Area | Delivered |
|---|---|
| Monorepo | npm workspaces: `packages/shared` (RBAC, Zod schemas, DTOs), `apps/api`, `apps/web` |
| Database | Prisma schema for **all 7 phases**: 23 models (the 18 required plus `Session`, `VerificationToken`, `WorkspaceInvitation`, `AutomationRuleMedia`, `ConversationNote`), UUID keys, indexes, unique constraints, composite tenant FKs, soft deletes, encrypted-token columns. One initial migration. |
| Auth | Register, login, logout, logout-all, email verification, forgot/reset, change password, lockout, rate limits, CSRF |
| Tenancy | Workspace create/list/switch/update/soft-delete; 4-layer isolation |
| Team | Invitations (create/preview/accept/resend/revoke), role changes, removal, leave, audit log |
| Platform | Super Admin aggregate API (no tenant access) |
| Queue | BullMQ email queue, retries with backoff, dead-letter queue, worker health and graceful shutdown |
| Frontend | Design system; auth pages; onboarding wizard; app shell with the 11-item sidebar; Overview, Team, Settings; honest roadmap pages; light/dark; responsive |
| Infra | Dockerfiles (API/worker runtime, migrate, nginx web), `docker-compose.yml`, `.env.example`, Cloudflare Pages `_headers`/`_redirects` |
| Docs | Architecture, checklist, API, security, testing, deployment |

The existing repository content (a Java course, `section*/`) was inspected and left untouched; InstaFlow lives in `instaflow-ai/`.

## 2. Important decisions
1. **Opaque server sessions over JWTs.** Real logout, sign-out-everywhere, and revocation on password reset. The DB holds only token hashes.
2. **Tenant isolation in depth.** Membership middleware (404 for non-members), then a shared permission matrix, then a tenant-scoped Prisma client, then **composite foreign keys** in Postgres. Tests prove each layer independently.
3. **Schema designed for all phases now.** Comment/DM pipeline idempotency (`AutomationExecution.idempotencyKey` unique), webhook de-duplication (`WebhookEvent.dedupeKey` unique), versioned flows, usage records. Later phases avoid disruptive migrations.
4. **Raw Meta values stored as text.** `mediaType` / `mediaProductType` are not invented enums, and capability detection has dedicated columns.
5. **Honest UI.** No sample metrics. Unbuilt sections are labelled with their phase, and the onboarding Instagram step is visibly disabled.
6. **Proven dependency majors** (TS 5.9, Vite 7, Vitest 3, React Router 7, BullMQ 5) rather than very recent ones. Prisma 7 and Express 5 are current.
7. **Slim runtime image.** Prisma 7's WebAssembly client means no native engine at runtime. The build/migrate stage uses the full Node image (for OpenSSL), the runtime uses slim and runs as non-root.

## 3. Test results (final run)

| Suite | Result |
|---|---|
| Shared (RBAC) | **7 / 7** passed |
| API unit + integration (real PostgreSQL) | **77 / 77** passed |
| Web unit | **14 / 14** passed |
| E2E (Playwright), production build + Redis/BullMQ worker + SMTP | **5 / 5** passed (twice back-to-back) |
| E2E (Playwright) against `docker compose` (nginx + containers + Mailpit) | **5 / 5** passed |
| Typecheck (all packages) / production builds | clean |
| Browser console under strict nginx CSP | no CSP violations or page errors (only the expected 401 from `/auth/me` when signed out) |

## 4. Failures found and fixed during the phase
| Issue | Found by | Fix |
|---|---|---|
| All "sensitive" endpoints shared **one** rate-limit bucket. Verifying an email plus accepting an invite could lock out everyone behind the same IP (common with mobile-carrier NAT) | E2E second run (429s in API log) | Independent per-endpoint budgets plus a regression test |
| **nginx dropped all security headers** (CSP etc.) on SPA routes: `add_header` in a `location` disables inheritance | Header check against compose | Shared `security-headers.conf` included in each location |
| Timezone select rendered **blank** when the zone wasn't in the browser's list (Chromium omits `UTC`, lists `Asia/Calcutta`), affecting Indian users | Screenshot review | Options always include the selected and common zones; regression test |
| Logo gradient disappeared on mobile (duplicate SVG gradient id inside a `display:none` sidebar) | Mobile screenshot | Per-instance `useId()` gradient ids |
| Sidebar's last item (Settings) below the fold at 720 px height | Screenshot review | Tightened nav spacing |
| API image was 799 MB because npm keeps the Prisma CLI (optional peer) | Image inspection | Removed the verified CLI-only subtree → 515 MB; compose e2e confirms it still works |
| Inline theme script incompatible with a strict CSP | CSP design | Moved to `/theme-init.js`; `script-src 'self'` |
| Test-only issues (workspace name below the 2-char minimum, ambiguous Playwright label, missing RTL cleanup) | Test runs | Fixed in tests; the app behaved correctly |

## 5. Known limitations (carried forward)
- No CI pipeline yet (Phase 7). Run tests locally as in `docs/TESTING.md`.
- Workspace purge after soft delete, and user account deletion/export, are planned (Phase 7). A Meta data-deletion callback comes in Phase 2.
- Usage limits per plan are not enforced yet, apart from a 10-owned-workspaces abuse guard (Phase 6).
- The JS bundle is ~100 kB gzipped for the entry chunk; further splitting is possible later.

## 6. Proposed Phase 2 plan (needs approval)
1. Review **current** Meta documentation for the Instagram API with Instagram Login (OAuth, scopes, token lifetimes, media fields, webhook fields, private replies). Record the verified endpoints in `docs/META_INTEGRATION.md` before coding.
2. `InstagramAdapter` interface + Meta implementation + clearly-labelled mock adapter.
3. OAuth connect/callback with signed, single-use `state`; encrypted token storage; `token-health` job.
4. Connected Accounts page; account status; disconnect; data-deletion callback.
5. Media sync + capability detection; Reels Manager UI (list/search/filter/select/enable/pause/exclude).
6. Webhook endpoint: verify handshake, raw-body HMAC signature check, persist with `dedupeKey`, enqueue.
7. Tests: OAuth state tampering, signature verification, webhook de-duplication, token encryption at rest, isolation for accounts and media.

**To use a real Instagram account in Phase 2 you will need:** a Meta developer app (Instagram API with Instagram Login), its App ID and App Secret, a public HTTPS callback/webhook URL, and an Instagram Professional (Business or Creator) test account. Without these, development proceeds against the labelled mock adapter.
