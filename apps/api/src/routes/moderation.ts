import type { FastifyPluginAsync } from 'fastify';
import {
  MODERATION_ROUTES,
  createReportSchema,
  entityIdSchema,
  reportQuerySchema,
  reviewReportSchema,
} from '@notecore/shared';
import { authOf, requireAdmin, requireAuth } from '../middleware/auth.js';
import { errors } from '../lib/errors.js';
import { parseBody } from '../lib/validate.js';
import * as moderation from '../services/moderation.js';

/**
 * Reportes de contenido (Fase 21).
 *
 * Principio II: aquí no hay reglas, solo la traducción a HTTP. Que quien reporta pudiera ver
 * lo que reporta, y a quién se le atribuye, lo decide el servicio.
 *
 * **Dos públicos en un solo archivo, y se ve en los `preHandler`**: reportar lo hace
 * cualquiera con sesión; leer y revisar, solo quien opera el servicio. Las segundas llevan
 * `requireAdmin` y responden **404** —no 403— a todos los demás, con el mismo criterio que el
 * panel de la Fase 25: un 403 confirmaría que la ruta existe.
 */
export const moderationRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Reporta una publicación o un mensaje.
   *
   * Responde **201 con un acuse**, no con el reporte: quien reporta no consulta después el
   * estado de su denuncia, porque eso sería información sobre lo que se hizo con un tercero.
   */
  app.post(MODERATION_ROUTES.reports, { preHandler: requireAuth }, async (request, reply) => {
    const input = parseBody(createReportSchema, request.body);
    const receipt = await moderation.createReport(authOf(request).userId, input);
    return reply.code(201).send(receipt);
  });

  /* ─────────────────── Solo para quien opera el servicio ─────────────────── */

  /** Los reportes recibidos, con el conteo de los pendientes. */
  app.get<{ Querystring: { status?: string; limit?: string } }>(
    MODERATION_ROUTES.panelReports,
    { preHandler: [requireAuth, requireAdmin] },
    async (request) => {
      const query = parseBody(reportQuerySchema, request.query);
      return moderation.listReports(query);
    },
  );

  /** Marca un reporte como revisado o descartado. */
  app.patch<{ Params: { id: string } }>(
    MODERATION_ROUTES.panelReportById(':id'),
    { preHandler: [requireAuth, requireAdmin] },
    async (request) => {
      const parsed = entityIdSchema.safeParse(request.params.id);
      if (!parsed.success) throw errors.noEncontrado('Ese reporte no existe.');

      const input = parseBody(reviewReportSchema, request.body);
      return moderation.reviewReport(authOf(request).userId, parsed.data, input);
    },
  );
};
