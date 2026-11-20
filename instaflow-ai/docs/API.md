# API Reference (Phase 1)

Base path: `/api`. JSON only.

**Envelope**
- Success: `{ "data": <payload>, "meta"?: { "pagination": { page, pageSize, total, totalPages } } }`
- Error: `{ "error": { "code", "message", "details"?: [{ "path", "message" }], "requestId" } }`

Error codes: `VALIDATION_ERROR` (400) · `UNAUTHENTICATED` (401) · `FORBIDDEN` (403) · `CSRF_INVALID` (403) · `EMAIL_NOT_VERIFIED` (403) · `NOT_FOUND` (404) · `CONFLICT` (409) · `ACCOUNT_LOCKED` (423) · `RATE_LIMITED` (429) · `TOKEN_INVALID` (400) · `WORKSPACE_REQUIRED` (400) · `INTERNAL_ERROR` (500).

**Conventions**
- Every `POST/PATCH/PUT/DELETE` requires `X-CSRF-Token` (from `GET /api/auth/csrf` or the login/register/logout response).
- Workspace-scoped routes require `X-Workspace-Id: <uuid>`. Non-members receive **404**.
- Requests are authenticated by the httpOnly session cookie (`if_session`, or `__Host-if_session` in production).

## Auth
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/auth/csrf` | — | Returns `{ csrfToken }` |
| POST | `/auth/register` | — | `{ name, email, password }` → 201 profile + `csrfToken`; sends verification email |
| POST | `/auth/login` | — | `{ email, password }` → profile + `csrfToken` |
| POST | `/auth/logout` | optional | Revokes session; returns rotated `csrfToken` |
| POST | `/auth/logout-all` | session | Revokes all *other* sessions |
| GET | `/auth/me` | session | `{ user, memberships[] }` |
| PATCH | `/auth/me` | session | `{ name }` |
| POST | `/auth/change-password` | session | `{ currentPassword, newPassword }` |
| POST | `/auth/verify-email` | — | `{ token }` |
| POST | `/auth/resend-verification` | session | |
| POST | `/auth/forgot-password` | — | `{ email }`; same response whether or not the account exists |
| POST | `/auth/reset-password` | — | `{ token, password }`; revokes all sessions |

## Workspaces
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/workspaces` | session | Caller's memberships |
| POST | `/workspaces` | session | `{ name, timezone?, defaultLanguage? }` → creator is OWNER |
| POST | `/workspaces/:id/select` | member | Remembers the active workspace |
| GET | `/workspaces/current` | `workspace:read` | Summary with counts |
| PATCH | `/workspaces/current` | `workspace:update` | `{ name?, timezone?, defaultLanguage? }` |
| DELETE | `/workspaces/current` | `workspace:delete` | `{ confirmName }`, soft delete |
| POST | `/workspaces/current/leave` | member | Last owner cannot leave |

## Members & invitations
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/members` | `members:read` | |
| PATCH | `/members/:memberId` | `members:manage` | `{ role }`; admins manage agents only; ≥1 owner |
| DELETE | `/members/:memberId` | `members:manage` | |
| GET | `/invitations` | `members:invite` | Pending (incl. expired) |
| POST | `/invitations` | `members:invite` + verified email | `{ email, role }` |
| POST | `/invitations/:id/resend` | `members:invite` + verified email | Rotates token |
| DELETE | `/invitations/:id` | `members:invite` | Revoke |
| GET | `/invitations/lookup?token=` | — | Preview for the accept page |
| POST | `/invitations/accept` | session | `{ token }`; account email must match |

## Other
| Method | Path | Permission |
|---|---|---|
| GET | `/audit-logs?page&pageSize` | `audit:read` |
| GET | `/admin/overview` | Super Admin |
| GET | `/health`, `/health/ready` | — |

The spec's Instagram, automation, webhook, inbox, product and analytics routes arrive in Phases 2–6.
