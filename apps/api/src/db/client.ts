import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../config.js';
import * as schema from './schema.js';

/**
 * Conexión a PostgreSQL compartida por toda la API.
 */
const queryClient = postgres(config.databaseUrl, {
  max: 10,
  // En producción se silencian los avisos de PostgreSQL; en desarrollo se dejan pasar
  // al logger por defecto. La propiedad se omite en vez de pasarse como `undefined`
  // (`exactOptionalPropertyTypes`).
  ...(config.isProduction ? { onnotice: () => {} } : {}),
});

export const db = drizzle(queryClient, { schema });

/** Comprueba que la base de datos responde. Usado por el endpoint de salud. */
export async function isDatabaseReachable(): Promise<boolean> {
  try {
    await queryClient`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/** Cierra la conexión de forma ordenada al apagar el servidor. */
export async function closeDatabase(): Promise<void> {
  await queryClient.end();
}
