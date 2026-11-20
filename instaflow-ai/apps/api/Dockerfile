# syntax=docker/dockerfile:1
# Build context: repository root (instaflow-ai/)
# One image runs both the API (default CMD) and the worker (override CMD).
#
# Behind a TLS-intercepting corporate proxy, pass its CA as a build secret:
#   docker build --secret id=extra_ca,src=/path/ca.crt --build-arg HTTPS_PROXY=... .

# ---- build + migrations: full image (ships OpenSSL, needed by Prisma's schema engine)
FROM node:22-bookworm AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -f /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi; \
    npm ci --workspace @instaflow/api --workspace @instaflow/shared --include-workspace-root
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -f /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi; \
    npm run build -w @instaflow/shared && npm run build -w @instaflow/api
# This stage doubles as the one-shot migration image (`npx prisma migrate deploy`).
WORKDIR /app/apps/api

# ---- production dependencies only
FROM node:22-bookworm-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -f /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi; \
    npm ci --omit=dev --workspace @instaflow/api --workspace @instaflow/shared --ignore-scripts && \
    # @prisma/client declares the Prisma CLI as an *optional peer*, and npm keeps present
    # optional peers even with --omit=dev (prune/uninstall don't drop it either). The
    # server only needs @prisma/client + adapter-pg, so delete the CLI-only subtree
    # (Studio, PGlite, Effect, React...). Each was verified to be reachable only via the
    # CLI; the compose e2e run is the regression check.
    rm -rf node_modules/prisma node_modules/@prisma/studio-core node_modules/@prisma/dev \
           node_modules/@prisma/engines node_modules/@prisma/fetch-engine node_modules/@prisma/streams-local \
           node_modules/effect node_modules/@electric-sql node_modules/typescript node_modules/react \
           node_modules/react-dom node_modules/elkjs node_modules/remeda node_modules/lodash node_modules/valibot

# ---- runtime: slim, non-root. Prisma 7's query client is WebAssembly — no native engine needed.
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/package.json packages/shared/package.json
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/api/package.json apps/api/package.json
COPY --from=build /app/apps/api/dist apps/api/dist
WORKDIR /app/apps/api
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
