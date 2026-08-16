# API de NoteCore — Fastify + Drizzle
# Contexto de build: la raíz del monorepo (necesita `packages/shared`).

FROM node:20-alpine AS base
WORKDIR /app

# --- Dependencias ---
FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN npm ci

# --- Build ---
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY package.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN npm run build --workspace @notecore/shared \
 && npm run build --workspace @notecore/api

# --- Producción ---
FROM base AS runner
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/
COPY --from=build /app/apps/api/src/db/migrations ./apps/api/src/db/migrations

# No ejecutar como root.
USER node

WORKDIR /app/apps/api
EXPOSE 3101
CMD ["node", "dist/index.js"]
