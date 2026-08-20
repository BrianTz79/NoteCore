# Web de NoteCore — Next.js
# Contexto de build: la raíz del monorepo (necesita `packages/shared`).

FROM node:24-alpine AS base
WORKDIR /app

# --- Dependencias ---
FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
RUN npm ci

# --- Build ---
FROM base AS build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

# npm iza casi todo a la raíz, pero deja en cada workspace lo que no puede subir
# (una versión en conflicto, o los `.bin` del propio paquete). Copiar el árbol entero
# con `/app/` en lugar de directorio por directorio evita depender de qué quedó dónde:
# un `COPY` de una ruta que npm no creó aborta la construcción.
COPY --from=deps /app/ ./
COPY package.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN npm run build --workspace @notecore/shared \
 && npm run build --workspace @notecore/web

# --- Producción ---
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# La salida `standalone` de Next incluye solo lo necesario para arrancar.
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

USER node

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
