import type { FastifyPluginAsync } from 'fastify';
// Principio VIII: el tipo de la respuesta viene de `shared`, no se redefine aquí.
import type { HealthStatus } from '@notecore/shared';
import { isDatabaseReachable } from '../db/client.js';

const API_VERSION = '0.1.0';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async (_request, reply) => {
    const databaseUp = await isDatabaseReachable();

    const body: HealthStatus = {
      status: databaseUp ? 'ok' : 'degraded',
      service: 'notecore-api',
      version: API_VERSION,
      database: databaseUp ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    };

    // 503 si la base de datos no responde, para que Docker y los monitores lo detecten.
    return reply.code(databaseUp ? 200 : 503).send(body);
  });
};
