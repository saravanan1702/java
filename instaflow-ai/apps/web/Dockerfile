# syntax=docker/dockerfile:1
# Build context: repository root (instaflow-ai/)

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -f /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi; \
    npm ci --workspace @instaflow/web --workspace @instaflow/shared --include-workspace-root --ignore-scripts
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
# Empty = same-origin /api (nginx proxy). Set for a cross-origin API deployment.
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build -w @instaflow/shared && npm run build -w @instaflow/web

FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/web/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
