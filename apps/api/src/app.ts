import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { config } from './config.js';
import { healthRoutes } from './routes/health.js';

/**
 * Construye la instancia de Fastify.
 *
 * Se separa de `index.ts` para poder montar la app en pruebas sin abrir un puerto.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.isProduction ? 'info' : 'debug',
      ...(config.isProduction
        ? {}
        : { transport: { target: 'pino-pretty', options: { colorize: true } } }),
    },
  });

  await app.register(helmet);

  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
  });

  await app.register(healthRoutes);

  return app;
}
