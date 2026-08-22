import type { FastifyPluginAsync } from 'fastify';
import {
  AGENDA_ROUTES,
  agendaQuerySchema,
  createAgendaItemSchema,
  entityIdSchema,
  snoozeReminderSchema,
  updateAgendaItemSchema,
} from '@notecore/shared';
import { authOf, requireAuth } from '../middleware/auth.js';
import { errors } from '../lib/errors.js';
import { parseBody } from '../lib/validate.js';
import * as agenda from '../services/agenda.js';

/**
 * Rutas de la agenda (FR-018 a FR-022).
 *
 * Principio II: aquí no hay reglas de negocio, solo traducción entre HTTP y el servicio.
 * Principio III: todas exigen sesión y el `userId` sale del token, nunca de la petición.
 */

/** Identificador de la ruta, ya validado. */
function idOf(raw: string, notFound: string): string {
  const parsed = entityIdSchema.safeParse(raw);
  if (!parsed.success) throw errors.noEncontrado(notFound);
  return parsed.data;
}

export const agendaRoutes: FastifyPluginAsync = async (app) => {
  /** La agenda: pendientes por vencimiento y completadas aparte (FR-020, FR-022). */
  app.get<{ Querystring: { subjectId?: string; kind?: string; includeCompleted?: string } }>(
    AGENDA_ROUTES.items,
    { preHandler: requireAuth },
    async (request) => {
      const parsed = agendaQuerySchema.safeParse({
        ...(request.query.subjectId !== undefined && { subjectId: request.query.subjectId }),
        ...(request.query.kind !== undefined && { kind: request.query.kind }),
        // La query llega siempre como texto; el esquema espera un booleano.
        ...(request.query.includeCompleted !== undefined && {
          includeCompleted: request.query.includeCompleted !== 'false',
        }),
      });

      if (!parsed.success) {
        throw errors.validacion('Los filtros de la agenda no son válidos.', [
          { field: 'subjectId', message: 'Revisa los filtros' },
        ]);
      }

      return agenda.listAgenda(authOf(request).userId, parsed.data);
    },
  );

  /** Una actividad concreta, para la pantalla de detalle o edición. */
  app.get<{ Params: { id: string } }>(
    `${AGENDA_ROUTES.items}/:id`,
    { preHandler: requireAuth },
    async (request) => {
      return agenda.getAgendaItem(
        authOf(request).userId,
        idOf(request.params.id, 'Esa actividad no existe.'),
      );
    },
  );

  /** Crea una actividad; solo el título es obligatorio (FR-018). */
  app.post(AGENDA_ROUTES.items, { preHandler: requireAuth }, async (request, reply) => {
    const input = parseBody(createAgendaItemSchema, request.body);
    const created = await agenda.createAgendaItem(authOf(request).userId, input);
    return reply.code(201).send(created);
  });

  /** Edita cualquier campo (FR-019), o completa y reabre la actividad (FR-020). */
  app.patch<{ Params: { id: string } }>(
    `${AGENDA_ROUTES.items}/:id`,
    { preHandler: requireAuth },
    async (request) => {
      const input = parseBody(updateAgendaItemSchema, request.body);
      return agenda.updateAgendaItem(
        authOf(request).userId,
        idOf(request.params.id, 'Esa actividad no existe.'),
        input,
      );
    },
  );

  /**
   * Aplaza el recordatorio de una actividad (Fase 28).
   *
   * `POST` y no `PATCH` sobre la actividad porque es una acción y no una edición: mueve
   * cuándo suena el aviso, no lo que la actividad es. El cuerpo lleva los **minutos** y el
   * instante lo calcula el servidor, para que el reloj del teléfono no desplace el aviso.
   */
  app.post<{ Params: { id: string } }>(
    `${AGENDA_ROUTES.items}/:id/aplazar`,
    { preHandler: requireAuth },
    async (request) => {
      const input = parseBody(snoozeReminderSchema, request.body);
      return agenda.snoozeAgendaReminder(
        authOf(request).userId,
        idOf(request.params.id, 'Esa actividad no existe.'),
        input,
      );
    },
  );

  /** Elimina una actividad por acción explícita del usuario (FR-021). */
  app.delete<{ Params: { id: string } }>(
    `${AGENDA_ROUTES.items}/:id`,
    { preHandler: requireAuth },
    async (request, reply) => {
      await agenda.deleteAgendaItem(
        authOf(request).userId,
        idOf(request.params.id, 'Esa actividad no existe.'),
      );
      return reply.code(204).send();
    },
  );
};
