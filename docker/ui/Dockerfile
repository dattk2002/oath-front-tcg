FROM node:24.20.0-bookworm-slim AS build
RUN npm install -g pnpm@11.25.0
WORKDIR /app
COPY . .
ARG API_ORIGIN=http://api:3001
ARG APP_ORIGIN=http://localhost:3000
ENV API_ORIGIN=$API_ORIGIN APP_ORIGIN=$APP_ORIGIN NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=cache,id=oathfront-pnpm,target=/root/.local/share/pnpm/store pnpm --filter @oathfront/web... --filter oathfront install --frozen-lockfile && pnpm --filter @oathfront/web build
FROM node:24.20.0-bookworm-slim AS runtime
ARG API_ORIGIN=http://api:3001
ENV API_ORIGIN=$API_ORIGIN
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_INTERNAL_PORT=3006 NEXT_SERVER=apps/web/server.js NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/scripts/ui-server.mjs ./scripts/ui-server.mjs
USER node
EXPOSE 3000
CMD ["node", "scripts/ui-server.mjs"]
