# Deployment

## Local development

**Option A: infrastructure in Docker, apps with hot reload**
```bash
cp .env.example .env        # fill in CSRF_SECRET and TOKEN_ENCRYPTION_KEYS (commands are in the file)
docker compose up -d postgres redis mailpit
npm install
npm run db:migrate          # creates/updates the schema
npm run dev                 # api :4000, worker, web :5173 (proxies /api)
```
Emails appear in Mailpit at http://localhost:8025 (set `MAIL_TRANSPORT=smtp`, `SMTP_PORT=1025`).

**Option B: no Docker at all.** Use a local Postgres, omit `REDIS_URL` (jobs run inline, in-memory rate limits) and set `MAIL_TRANSPORT=file`. Emails are then written to `apps/api/.mail-outbox/`.

**Option C: the full stack in Docker**
```bash
docker compose up --build   # web http://localhost:8080 · mail http://localhost:8025
```

## Production topology (free-tier-first)

| Component | Suggested hosts | Notes |
|---|---|---|
| Web (static SPA) | Cloudflare Pages | `npm run build -w @instaflow/web` → `apps/web/dist`. `_headers` and `_redirects` are included |
| API | Any always-on container host (Render, Fly.io, Railway, Koyeb, a small VM) | `apps/api/Dockerfile`, target `runtime` |
| Worker | Same image, command `node dist/worker.js` | Must be **always on**. Sleeping free tiers pause automation |
| PostgreSQL | Neon, Supabase, or the host's managed Postgres | Run `prisma migrate deploy` on release (image target `build`) |
| Redis | Any Redis 6.2+ reachable only from your services | BullMQ polls Redis continuously. On per-command-billed tiers (e.g. some serverless Redis plans) idle polling can use up a free quota, so prefer a flat-rate small instance |
| SMTP | Any transactional email provider with SMTP | Set the `SMTP_*` variables |

### Cookies across domains
The session cookie is first-party to the **API host**. Choose one:
1. **Recommended:** serve web and API under one site, e.g. `app.example.com` and `api.example.com`. Keep `COOKIE_SAMESITE=lax`, set `VITE_API_URL=https://api.example.com`, `CORS_ORIGINS=https://app.example.com`, and add the API origin to `connect-src` in `apps/web/public/_headers`.
2. Reverse-proxy `/api` from the web host to the API (as nginx does in compose). Then no CORS is needed and `VITE_API_URL` stays empty.
3. Different sites (e.g. `*.pages.dev` + `*.onrender.com`): requires `COOKIE_SAMESITE=none` + `COOKIE_SECURE=true`. It works (CSRF tokens protect it) but third-party-cookie restrictions in browsers make this fragile. Avoid it.

### Required production settings
`NODE_ENV=production` makes the API refuse to start unless all of these hold:
- `COOKIE_SECURE=true`
- `REDIS_URL` is set
- `MAIL_TRANSPORT=smtp`
- secrets contain no placeholder values

Also set `TRUST_PROXY=1` behind one load balancer, so rate limits see real client IPs.

### Release steps
1. Build the images: `docker build -f apps/api/Dockerfile --target runtime .` and `--target build` (migrate).
2. Run migrations once: `npx prisma migrate deploy` (migrate image, `DATABASE_URL` set).
3. Deploy the API, then the worker (`stop_grace_period` ≥ 30 s so jobs finish).
4. Deploy the web app.
5. Check `GET /api/health/ready` and the worker's `GET :4001/health`.

### Building behind a TLS-intercepting proxy
Pass the proxy CA as a build secret, used only during `npm ci`:
```bash
docker build --secret id=extra_ca,src=/path/to/ca.crt --build-arg HTTPS_PROXY=http://proxy:port -f apps/api/Dockerfile .
```

## Operations
- **Logs:** JSON on stdout (pino). Every response carries `X-Request-Id`, which matches the log line.
- **Failed jobs:** kept 14 days in their queue, and copied to the `dead-letter` queue after the final attempt.
- **Backups:** use the Postgres provider's point-in-time recovery. Redis holds only transient queue state and rate-limit counters.
