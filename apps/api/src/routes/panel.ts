import type { FastifyPluginAsync } from 'fastify';
import { PANEL_ROUTES } from '@notecore/shared';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import * as panel from '../services/panel.js';

/**
 * El panel de operación (Fase 25).
 *
 * Principio II: aquí no hay reglas, solo la traducción a HTTP. Lo único propio de esta capa
 * son los dos `preHandler`, y su **orden importa**: `requireAuth` establece quién pregunta y
 * `requireAdmin` mira si esa persona puede. Al revés, el segundo no tendría a quién mirar.
 *
 * A quien no sea administrador —que es todo el mundo salvo una cuenta— esta ruta le responde
 * exactamente lo mismo que una dirección inventada: 404 «Esa ruta no existe». No 403, que
 * confirmaría que el panel existe. Está razonado en `requireAdmin`.
 */
export const panelRoutes: FastifyPluginAsync = async (app) => {
  app.get(PANEL_ROUTES.resumen, { preHandler: [requireAuth, requireAdmin] }, async () => {
    return panel.resumen();
  });
};
