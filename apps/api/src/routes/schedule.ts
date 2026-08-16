import type { FastifyPluginAsync } from 'fastify';
import {
  SCHEDULE_ROUTES,
  createSubjectSchema,
  entityIdSchema,
  importConfirmSchema,
  importPreviewSchema,
  updateSubjectSchema,
} from '@notecore/shared';
import { authOf, requireAuth } from '../middleware/auth.js';
import { errors } from '../lib/errors.js';
import { parseBody } from '../lib/validate.js';
import * as schedule from '../services/schedule.js';

/**
 * Rutas del horario (FR-005 a FR-010).
 *
 * Principio II: aquí no hay reglas de negocio, solo traducción entre HTTP y el servicio.
 * Principio III: todas exigen sesión y el `userId` sale del token, nunca de la petición.
 */

/** Identificador de materia de la ruta, ya validado. */
function subjectIdOf(raw: string): string {
  const parsed = entityIdSchema.safeParse(raw);
  if (!parsed.success) throw errors.noEncontrado('Esa materia no existe.');
  return parsed.data;
}

export const scheduleRoutes: FastifyPluginAsync = async (app) => {
  app.get(SCHEDULE_ROUTES.subjects, { preHandler: requireAuth }, async (request) => {
    return schedule.listSubjects(authOf(request).userId);
  });

  app.post(SCHEDULE_ROUTES.subjects, { preHandler: requireAuth }, async (request, reply) => {
    const input = parseBody(createSubjectSchema, request.body);
    const created = await schedule.createSubject(authOf(request).userId, input);
    return reply.code(201).send(created);
  });

  app.get<{ Params: { id: string } }>(
    `${SCHEDULE_ROUTES.subjects}/:id`,
    { preHandler: requireAuth },
    async (request) => {
      return schedule.getSubject(authOf(request).userId, subjectIdOf(request.params.id));
    },
  );

  app.patch<{ Params: { id: string } }>(
    `${SCHEDULE_ROUTES.subjects}/:id`,
    { preHandler: requireAuth },
    async (request) => {
      const input = parseBody(updateSubjectSchema, request.body);
      return schedule.updateSubject(
        authOf(request).userId,
        subjectIdOf(request.params.id),
        input,
      );
    },
  );

  app.delete<{ Params: { id: string } }>(
    `${SCHEDULE_ROUTES.subjects}/:id`,
    { preHandler: requireAuth },
    async (request, reply) => {
      await schedule.deleteSubject(authOf(request).userId, subjectIdOf(request.params.id));
      return reply.code(204).send();
    },
  );

  /**
   * Vista previa de la importación (FR-008).
   *
   * No escribe nada: devuelve qué entraría, qué choca con lo existente y qué se descartó,
   * para que el usuario elija con la información delante.
   */
  app.post(SCHEDULE_ROUTES.importPreview, { preHandler: requireAuth }, async (request) => {
    const input = parseBody(importPreviewSchema, request.body);
    return schedule.previewImport(authOf(request).userId, input.raw);
  });

  /** Confirmación de la importación con el modo elegido: añadir o reemplazar (FR-007). */
  app.post(SCHEDULE_ROUTES.importConfirm, { preHandler: requireAuth }, async (request, reply) => {
    const input = parseBody(importConfirmSchema, request.body);
    const result = await schedule.confirmImport(authOf(request).userId, input);
    return reply.code(201).send(result);
  });
};
