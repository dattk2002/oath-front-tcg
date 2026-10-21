FROM node:24.20.0-bookworm-slim AS build
RUN npm install -g pnpm@11.25.0
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=oathfront-pnpm,target=/root/.local/share/pnpm/store pnpm --filter @oathfront/api... --filter oathfront install --frozen-lockfile && pnpm build:api
# Bundle runtime dependencies without development aliases or source artwork.
RUN node scripts/package-api-runtime.mjs /runtime
FROM node:24.20.0-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3001 HOST=0.0.0.0
WORKDIR /app
COPY --from=build /runtime/node_modules ./node_modules
COPY --from=build /runtime/runtime-dependencies.json ./runtime-dependencies.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/db/migrations ./packages/db/migrations
USER node
EXPOSE 3001
CMD ["node", "apps/api/dist/server.mjs"]
