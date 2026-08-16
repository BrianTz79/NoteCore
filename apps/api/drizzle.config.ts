import { defineConfig } from 'drizzle-kit';

/**
 * Configuración de drizzle-kit (generación y aplicación de migraciones).
 *
 * Lee el entorno directamente en vez de importar `src/config.ts`: drizzle-kit carga este
 * archivo en CommonJS, donde los imports ESM con extensión `.js` no resuelven.
 */

const {
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_DB,
  POSTGRES_HOST = 'localhost',
  POSTGRES_PORT = '5432',
} = process.env;

if (!POSTGRES_USER || !POSTGRES_PASSWORD || !POSTGRES_DB) {
  throw new Error(
    'Faltan variables de PostgreSQL. Copia `.env.example` a `.env` y cárgalo antes de ejecutar drizzle-kit.',
  );
}

const url =
  `postgres://${encodeURIComponent(POSTGRES_USER)}:` +
  `${encodeURIComponent(POSTGRES_PASSWORD)}@` +
  `${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
