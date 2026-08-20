# API de NoteCore — Fastify + Drizzle
# Contexto de build: la raíz del monorepo (necesita `packages/shared`).

FROM node:24-alpine AS base
WORKDIR /app

# --- Dependencias ---
FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN npm ci

# --- Build ---
FROM base AS build
# npm iza casi todo a la raíz, pero deja en cada workspace lo que no puede subir
# (una versión en conflicto, o los `.bin` del propio paquete). Copiar el árbol entero
# con `/app/` en lugar de directorio por directorio evita depender de qué quedó dónde:
# un `COPY` de una ruta que npm no creó aborta la construcción.
COPY --from=deps /app/ ./
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
