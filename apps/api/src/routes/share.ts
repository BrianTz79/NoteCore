import type { FastifyPluginAsync } from 'fastify';
import {
  SHARE_ROUTES,
  acceptShareSchema,
  createShareSchema,
  entityIdSchema,
  shareCodeSchema,
} from '@notecore/shared';
import { authOf, requireAuth } from '../middleware/auth.js';
import { errors } from '../lib/errors.js';
import { parseBody } from '../lib/validate.js';
import * as share from '../services/share.js';

/**
 * Rutas de la compartición (FR-028 a FR-033).
 *
 * Principio II: aquí no hay reglas de negocio, solo traducción entre HTTP y el servicio.
 * Principio III: todas exigen sesión y el `userId` sale del token, nunca de la petición.
 * También la vista previa: el código es la credencial que da acceso al contenido, pero
 * dejarla abierta convertiría cada enlace en una página pública indexable.
 */

/** El código de la ruta, normalizado y validado. */
function codeOf(raw: string): string {
  const parsed = shareCodeSchema.safeParse(raw);
  // Un código con forma inválida no puede existir en la base de datos, así que se responde
  // lo mismo que si no existiera: el receptor tecleó mal en ambos casos.
  if (!parsed.success) throw errors.compartidoNoDisponible('no_encontrado');
  return parsed.data;
}

export const shareRoutes: FastifyPluginAsync = async (app) => {
  /** Los compartidos que el usuario ha generado, con su estado resuelto (FR-033). */
  app.get(SHARE_ROUTES.root, { preHandler: requireAuth }, async (request) => {
    return share.listShares(authOf(request).userId);
  });

  /** Genera un compartido con el contenido seleccionado (FR-028, FR-029). */
  app.post(SHARE_ROUTES.root, { preHandler: requireAuth }, async (request, reply) => {
    const input = parseBody(createShareSchema, request.body);
    const created = await share.createShare(authOf(request).userId, input);
    return reply.code(201).send(created);
  });

  /**
   * Vista previa por código, sin copiar nada (FR-030).
   *
   * Las tres modalidades llegan aquí: el código corto se teclea, el enlace abre la página que
   * llama a esta ruta, y el QR codifica ese mismo enlace. Un solo camino es lo que garantiza
   * que las tres entreguen exactamente el mismo contenido (FR-032).
   */
  app.get<{ Params: { code: string } }>(
    SHARE_ROUTES.preview(':code'),
    { preHandler: requireAuth },
    async (request) => {
      return share.previewShare(authOf(request).userId, codeOf(request.params.code));
    },
  );

  /** Acepta un compartido y obtiene una copia independiente (FR-031). */
  app.post<{ Params: { code: string } }>(
    SHARE_ROUTES.accept(':code'),
    { preHandler: requireAuth },
    async (request) => {
      // Sin cuerpo se acepta en modo `añadir`: `parseBody` traduce la ausencia a `{}` y el
      // esquema aplica su valor por defecto. La agenda no manda modo nunca.
      const input = parseBody(acceptShareSchema, request.body);
      return share.acceptShare(authOf(request).userId, codeOf(request.params.code), input);
    },
  );

  /**
   * Revoca un compartido (FR-033).
   *
   * Es `PATCH` y no `DELETE` porque la fila se conserva: quien abra el enlace después debe
   * recibir "lo retiraron" y no "no existe".
   */
  app.patch<{ Params: { id: string } }>(
    SHARE_ROUTES.byId(':id'),
    { preHandler: requireAuth },
    async (request) => {
      const parsed = entityIdSchema.safeParse(request.params.id);
      if (!parsed.success) throw errors.noEncontrado('Ese compartido no existe.');

      return share.revokeShare(authOf(request).userId, parsed.data);
    },
  );
};
