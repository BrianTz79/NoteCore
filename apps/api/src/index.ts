import { buildApp } from './app.js';
import { config } from './config.js';
import { closeDatabase } from './db/client.js';
import { purgeExpiredSessions } from './services/auth.js';

/** Cada cuánto se barren las sesiones caducadas: una vez al día. */
const PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function start(): Promise<void> {
  const app = await buildApp();

  /**
   * Limpieza de sesiones caducadas.
   *
   * No es crítica —una sesión vencida se rechaza igualmente al verificarla—, solo evita
   * que la tabla crezca sin fin. Por eso un fallo se registra y no tumba el servidor.
   */
  const purge = (): void => {
    void purgeExpiredSessions()
      .then((count) => {
        if (count > 0) app.log.info(`Sesiones caducadas eliminadas: ${count}`);
      })
      .catch((error: unknown) => app.log.error(error, 'Fallo al limpiar sesiones caducadas'));
  };

  purge();
  const purgeTimer = setInterval(purge, PURGE_INTERVAL_MS);
  // Sin `unref`, el temporizador mantendría vivo el proceso al cerrar.
  purgeTimer.unref();

  // Apagado ordenado: deja de aceptar conexiones y cierra la base de datos.
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      app.log.info(`Recibido ${signal}, apagando…`);
      clearInterval(purgeTimer);
      void app
        .close()
        .then(() => closeDatabase())
        .then(() => process.exit(0))
        .catch((error: unknown) => {
          app.log.error(error, 'Fallo al apagar');
          process.exit(1);
        });
    });
  }

  try {
    // 0.0.0.0 para que sea alcanzable desde el contenedor y desde el dispositivo Android.
    await app.listen({ port: config.port, host: '0.0.0.0' });
  } catch (error) {
    app.log.error(error, 'Fallo al arrancar el servidor');
    process.exit(1);
  }
}

void start();
