import type { FastifyPluginAsync } from 'fastify';
import {
  SEMESTER_ROUTES,
  closeSemesterSchema,
  entityIdSchema,
  renameSemesterSchema,
} from '@notecore/shared';
import { authOf, requireAuth } from '../middleware/auth.js';
import { errors } from '../lib/errors.js';
import { parseBody } from '../lib/validate.js';
import * as semester from '../services/semester.js';

/**
 * Rutas de los semestres (FR-034 a FR-038).
 *
 * Principio II: aquí no hay reglas de negocio, solo traducción entre HTTP y el servicio.
 * Principio III: todas exigen sesión y el `userId` sale del token, nunca de la petición.
 */

export const semesterRoutes: FastifyPluginAsync = async (app) => {
  /** El activo y todos los archivados (FR-036). */
  app.get(SEMESTER_ROUTES.root, { preHandler: requireAuth }, async (request) => {
    return semester.listSemesters(authOf(request).userId);
  });

  /** El semestre en curso. Se crea al vuelo si la cuenta aún no tenía ninguno. */
  app.get(SEMESTER_ROUTES.current, { preHandler: requireAuth }, async (request) => {
    return semester.getCurrentSemester(authOf(request).userId);
  });

  /**
   * Qué se archivaría al cerrar y con qué nombre arrancaría el siguiente (FR-038).
   *
   * Es `GET` y no parte del `POST` de cierre a propósito: consultarlo no compromete a nada,
   * que es justo lo que lo convierte en una explicación previa.
   */
  app.get(SEMESTER_ROUTES.closeEffect, { preHandler: requireAuth }, async (request) => {
    return semester.getCloseEffect(authOf(request).userId);
  });

  /**
   * Cierra el semestre en curso y abre el siguiente (FR-034, FR-035).
   *
   * El cuerpo exige `confirmed: true`. Es una condición del servidor y no solo un diálogo del
   * cliente porque la explicación previa de FR-038 es un requisito, no una cortesía de la
   * interfaz: sin ella, una petición suelta archivaría un semestre entero.
   */
  app.post(SEMESTER_ROUTES.close, { preHandler: requireAuth }, async (request, reply) => {
    const input = parseBody(closeSemesterSchema, request.body);
    const result = await semester.closeSemester(authOf(request).userId, input);
    return reply.code(201).send(result);
  });

  /** Renombra el semestre activo. Los archivados no se modifican (FR-037). */
  app.patch<{ Params: { id: string } }>(
    SEMESTER_ROUTES.byId(':id'),
    { preHandler: requireAuth },
    async (request) => {
      const parsed = entityIdSchema.safeParse(request.params.id);
      if (!parsed.success) throw errors.noEncontrado('Ese semestre no existe.');

      const input = parseBody(renameSemesterSchema, request.body);
      return semester.renameSemester(authOf(request).userId, parsed.data, input);
    },
  );
};
