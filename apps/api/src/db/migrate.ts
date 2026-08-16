import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, closeDatabase } from './client.js';

/**
 * Aplica las migraciones pendientes.
 *
 * Principio VI: las migraciones solo añaden o modifican estructura; ninguna operación de
 * rutina destruye datos históricos.
 */
async function main(): Promise<void> {
  console.log('Aplicando migraciones…');
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  console.log('Migraciones aplicadas correctamente.');
}

main()
  .catch((error: unknown) => {
    console.error('Fallo al aplicar migraciones:', error);
    process.exitCode = 1;
  })
  .finally(() => closeDatabase());
