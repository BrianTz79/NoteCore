import type { FastifyPluginAsync } from 'fastify';
import {
  ATTENDANCE_ROUTES,
  absenceHistoryQuerySchema,
  calendarDateSchema,
  entityIdSchema,
  markAbsencesSchema,
  setAbsenceLimitSchema,
  setSemesterWeeksSchema,
  updateAbsenceSchema,
} from '@notecore/shared';
import { authOf, requireAuth } from '../middleware/auth.js';
import { errors } from '../lib/errors.js';
import { parseBody } from '../lib/validate.js';
import * as attendance from '../services/attendance.js';

/**
 * Rutas del control de faltas (FR-011 a FR-017).
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

export const attendanceRoutes: FastifyPluginAsync = async (app) => {
  /** Panel de faltas: conteo, límite y estado por materia (FR-012 a FR-016). */
  app.get(ATTENDANCE_ROUTES.summary, { preHandler: requireAuth }, async (request) => {
    return attendance.getSummary(authOf(request).userId);
  });

  /** Clases de una fecha y cuáles están ya marcadas (FR-011). */
  app.get<{ Querystring: { date?: string } }>(
    ATTENDANCE_ROUTES.day,
    { preHandler: requireAuth },
    async (request) => {
      const parsed = calendarDateSchema.safeParse(request.query.date);
      if (!parsed.success) {
        throw errors.validacion('La fecha debe tener el formato AAAA-MM-DD.', [
          { field: 'date', message: 'La fecha debe tener el formato AAAA-MM-DD' },
        ]);
      }
      return attendance.getDay(authOf(request).userId, parsed.data);
    },
  );

  /** Historial de faltas, acotado por fechas o materia si se piden. */
  app.get<{ Querystring: { from?: string; to?: string; subjectId?: string } }>(
    ATTENDANCE_ROUTES.absences,
    { preHandler: requireAuth },
    async (request) => {
      const parsed = absenceHistoryQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        throw errors.validacion('Los filtros del historial no son válidos.', [
          { field: 'from', message: 'Revisa el rango de fechas' },
        ]);
      }
      return attendance.listAbsences(authOf(request).userId, parsed.data);
    },
  );

  /** Registra faltas en una fecha: una sesión, varias, o el día completo (FR-011). */
  app.post(ATTENDANCE_ROUTES.absences, { preHandler: requireAuth }, async (request, reply) => {
    const input = parseBody(markAbsencesSchema, request.body);
    const created = await attendance.markAbsences(authOf(request).userId, input);
    return reply.code(201).send(created);
  });

  /** Justifica una falta o cambia su nota, recalculando el conteo (FR-017). */
  app.patch<{ Params: { id: string } }>(
    `${ATTENDANCE_ROUTES.absences}/:id`,
    { preHandler: requireAuth },
    async (request) => {
      const input = parseBody(updateAbsenceSchema, request.body);
      return attendance.updateAbsence(
        authOf(request).userId,
        idOf(request.params.id, 'Esa falta no existe.'),
        input,
      );
    },
  );

  /** Elimina una falta registrada por error, recalculando el conteo (FR-017). */
  app.delete<{ Params: { id: string } }>(
    `${ATTENDANCE_ROUTES.absences}/:id`,
    { preHandler: requireAuth },
    async (request, reply) => {
      await attendance.deleteAbsence(
        authOf(request).userId,
        idOf(request.params.id, 'Esa falta no existe.'),
      );
      return reply.code(204).send();
    },
  );

  /** Fija el límite de una materia, o lo devuelve a la sugerencia con `null` (FR-015). */
  app.patch<{ Params: { id: string } }>(
    '/attendance/subjects/:id/limit',
    { preHandler: requireAuth },
    async (request) => {
      const input = parseBody(setAbsenceLimitSchema, request.body);
      return attendance.setAbsenceLimit(
        authOf(request).userId,
        idOf(request.params.id, 'Esa materia no existe.'),
        input,
      );
    },
  );

  /** Ajusta las semanas del semestre sobre las que se estiman los totales (FR-013). */
  app.patch(ATTENDANCE_ROUTES.semesterWeeks, { preHandler: requireAuth }, async (request) => {
    const input = parseBody(setSemesterWeeksSchema, request.body);
    const userId = authOf(request).userId;
    await attendance.setSemesterWeeks(userId, input.weeks);
    // Cambiar las semanas mueve el límite sugerido de todas las materias: se devuelve el
    // panel recalculado para que el cliente lo repinte sin otra petición.
    return attendance.getSummary(userId);
  });
};
