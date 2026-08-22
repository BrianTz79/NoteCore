import type { FastifyPluginAsync } from 'fastify';
import { TIPS_ROUTES } from '@notecore/shared';
import { authOf, requireAuth } from '../middleware/auth.js';
import * as tips from '../services/tips.js';

/**
 * El contexto de los consejos del inicio (Fase 29).
 *
 * Principio II: aquí no se decide **qué** consejo toca —eso lo hace `siguienteTip` en
 * `shared`, y por eso web y app coinciden—. Esta ruta solo reúne el estado de la cuenta que
 * esas reglas necesitan leer.
 * Principio III: el `userId` sale del token, nunca de la petición.
 */
export const tipsRoutes: FastifyPluginAsync = async (app) => {
  app.get(TIPS_ROUTES.context, { preHandler: requireAuth }, async (request) => {
    return tips.getTipContext(authOf(request).userId);
  });
};
