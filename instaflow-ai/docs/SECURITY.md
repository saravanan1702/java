# Security

## Implemented controls (Phase 1)

| Control | Implementation | Verified by |
|---|---|---|
| Password hashing | Argon2id, OWASP params; dummy-hash timing equalisation | `unit/password-and-slug.test.ts` |
| Sessions | Opaque 256-bit token, SHA-256 at rest, httpOnly/Secure/SameSite, `__Host-` prefix in prod, sliding expiry, revocation | `auth.test.ts` |
| CSRF | HMAC double-submit token, header-only, seed rotated on login/logout | `security.test.ts` |
| Brute force | Per-endpoint Redis-backed rate limits; account lockout (10 failures / 15 min) | `auth.test.ts`, `security.test.ts` |
| User enumeration | Generic login errors; forgot-password always returns the same response | `auth.test.ts` |
| One-time tokens | Hashed at rest, atomic single-use, short TTLs, old tokens invalidated on reissue | `auth.test.ts`, `members.test.ts` |
| Tenant isolation | 4 layers (see ARCHITECTURE §5); 404 for non-members | `isolation.test.ts`, `tenant-scope.test.ts` |
| RBAC | Shared matrix enforced server-side; last-owner protection in serializable transactions | `members.test.ts`, `workspaces.test.ts` |
| Input validation | Zod on every body/query/param; 100 kB JSON limit; UUID-validated IDs | all integration tests |
| Output safety | DTO allow-list serializers; hashes/tokens never returned | `auth.test.ts`, `members.test.ts` |
| XSS | React escaping; no `dangerouslySetInnerHTML`; email templates HTML-escaped; strict CSP on SPA (`script-src 'self'`, no inline scripts) and API (`default-src 'none'`) | CSP check against compose |
| Secure headers | helmet (API); nginx and Cloudflare `_headers` (SPA): CSP, nosniff, frame-deny, referrer, permissions | `security.test.ts`, compose check |
| CORS | Explicit origin allow-list with credentials | `security.test.ts` |
| Open redirects | `?next=` restricted to same-site relative paths | `components.test.tsx` |
| Token encryption | AES-256-GCM `TokenCipher` with key versions and rotation support (used from Phase 2) | `unit/crypto.test.ts` |
| Secrets | Env-only; `.env` git-ignored; production refuses placeholder secrets, insecure cookies, missing Redis | `config/env.ts` |
| Logging | pino with redaction of cookies, auth headers, passwords and tokens; client request IDs ignored | — |
| Audit log | Logins, failures, lockouts, password events, workspace and member changes, admin views | `members.test.ts` |
| Data deletion | Workspace soft-delete with immediate access loss (purge job: Phase 7) | `workspaces.test.ts` |
| Containers | Non-root runtime user; slim image without build tooling or Prisma CLI | compose e2e |

## Rotating the token-encryption key
1. Generate a key: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
2. Append it as a new version: `TOKEN_ENCRYPTION_KEYS=1:<old>,2:<new>` and set `TOKEN_ENCRYPTION_ACTIVE_VERSION=2`.
3. New encryptions use v2; v1 ciphertexts remain readable. Tokens are re-encrypted on refresh (`needsRotation()`).
4. Remove v1 only after no `OAuthToken.encKeyVersion = 1` rows remain.

## Known gaps / next steps
- **Account deletion / data export** (user-level) is planned for Phase 7. A Meta data-deletion callback is required in Phase 2.
- **Email job payloads** briefly hold one-time links in Redis. They are short-lived and removed on completion; keep Redis private (no public port) in production.
- **Lockout as a signal:** a locked account returns a distinct message. This is an accepted usability trade-off, mitigated by per-IP+email rate limits.
- **No CI yet:** tests run locally; the CI pipeline is a Phase 7 item.
- **Dependency scanning** (e.g. `npm audit` in CI, Dependabot) is to be added with CI.
