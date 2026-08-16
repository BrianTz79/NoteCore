import { buildApp } from './app.js';
import { config } from './config.js';
import { closeDatabase } from './db/client.js';

async function start(): Promise<void> {
  const app = await buildApp();

  // Apagado ordenado: deja de aceptar conexiones y cierra la base de datos.
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      app.log.info(`Recibido ${signal}, apagando…`);
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
