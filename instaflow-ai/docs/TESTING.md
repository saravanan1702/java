# Testing

| Suite | Tool | Command | Needs |
|---|---|---|---|
| Shared unit | Vitest | `npm test -w @instaflow/shared` | — |
| API unit + integration | Vitest + Supertest | `npm test -w @instaflow/api` | PostgreSQL |
| Web unit | Vitest + Testing Library (jsdom) | `npm test -w @instaflow/web` | — |
| End-to-end | Playwright | `npm run test:e2e` | A running stack |

`npm test` at the root runs the first three.

## API integration tests
They run against a **real PostgreSQL database**, not mocks, because tenant isolation depends on real constraints and transactions.

```bash
# default: postgresql://instaflow:instaflow_dev@localhost:5432/instaflow_test
export TEST_DATABASE_URL=postgresql://USER:PASS@localhost:5432/instaflow_test
npm test -w @instaflow/api
```
The global setup runs `prisma migrate deploy`; each test starts from truncated tables. Mail uses the in-memory transport and jobs run inline, so Redis is not needed.

## End-to-end tests
Against Docker Compose (emails read from Mailpit's API):
```bash
docker compose up -d --build
E2E_BASE_URL=http://localhost:8080 E2E_MAILPIT_URL=http://localhost:8025 npm run test:e2e
```
Against a local dev stack using `MAIL_TRANSPORT=file`:
```bash
E2E_BASE_URL=http://localhost:5173 E2E_OUTBOX_DIR=apps/api/.mail-outbox npm run test:e2e
```
Set `E2E_SCREENSHOT_DIR=/some/dir` to save screenshots of key screens.

## What is covered
- **Isolation:** cross-tenant header use, ID guessing on members and invitations, workspace update/delete, scoped-client reads and writes, composite-FK rejection, no Super Admin bypass.
- **Auth:** registration, duplicate and case-folded email, cookie flags, hashed sessions, logout and stolen-cookie replay, logout-all, lockout, verification (single-use, expiry, resend invalidation), reset (no enumeration, revokes sessions, single-use), password change.
- **RBAC:** invite matrix, role-change rules, last-owner protection, removal, leave.
- **Security:** CSRF (missing, forged, cross-browser, rotation), headers, CORS allow-list, error envelope, rate limiting (including independent budgets), health.
- **Idempotency groundwork:** unique `AutomationExecution.idempotencyKey`.
- **UI:** API client (CSRF retry, errors, headers), open-redirect guard, role-gated rendering, form validation, timezone regression.
- **E2E journey:** register → verify via a real queued email → onboard → invite → teammate accepts as Agent (restricted UI) → owner renames workspace, sees audit log → sign out → generic login error.
