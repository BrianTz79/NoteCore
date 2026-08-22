import type { FastifyPluginAsync } from 'fastify';
import {
  CALENDAR_ROUTES,
  calendarDateSchema,
  calendarRangeQuerySchema,
  updateClassAlertSettingsSchema,
  updateReminderSettingsSchema,
} from '@notecore/shared';
import { authOf, requireAuth } from '../middleware/auth.js';
import { errors } from '../lib/errors.js';
import { parseBody } from '../lib/validate.js';
import * as calendar from '../services/calendar.js';

/**
 * Rutas del calendario y los recordatorios (FR-023 a FR-027).
 *
 * Principio II: aquí no hay reglas de negocio, solo traducción entre HTTP y el servicio.
 * Principio III: todas exigen sesión y el `userId` sale del token, nunca de la petición.
 */
export const calendarRoutes: FastifyPluginAsync = async (app) => {
  /** El calendario de un rango: clases y vencimientos por día (FR-023). */
  app.get<{ Querystring: { from?: string; to?: string } }>(
    CALENDAR_ROUTES.range,
    { preHandler: requireAuth },
    async (request) => {
      const parsed = calendarRangeQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        // El mensaje del esquema es el útil: distingue "el rango está invertido" de "es
        // demasiado largo", y el genérico perdería esa diferencia.
        const issue = parsed.error.issues[0];
        throw errors.validacion(issue?.message ?? 'El rango del calendario no es válido.', [
          { field: issue?.path.join('.') || 'from', message: issue?.message ?? 'Revisa el rango' },
        ]);
      }

      return calendar.getRange(authOf(request).userId, parsed.data.from, parsed.data.to);
    },
  );

  /** El detalle de un día concreto (FR-024). */
  app.get<{ Querystring: { date?: string } }>(
    CALENDAR_ROUTES.day,
    { preHandler: requireAuth },
    async (request) => {
      const parsed = calendarDateSchema.safeParse(request.query.date);
      if (!parsed.success) {
        throw errors.validacion('La fecha debe tener el formato AAAA-MM-DD.', [
          { field: 'date', message: 'La fecha debe tener el formato AAAA-MM-DD' },
        ]);
      }

      return calendar.getDay(authOf(request).userId, parsed.data);
    },
  );

  /** Ajustes de recordatorios del usuario (FR-025). */
  app.get(CALENDAR_ROUTES.reminderSettings, { preHandler: requireAuth }, async (request) => {
    return calendar.getReminderSettings(authOf(request).userId);
  });

  /** Activa los recordatorios, o cambia su anticipación y su hora (FR-025). */
  app.patch(CALENDAR_ROUTES.reminderSettings, { preHandler: requireAuth }, async (request) => {
    const input = parseBody(updateReminderSettingsSchema, request.body);
    return calendar.updateReminderSettings(authOf(request).userId, input);
  });

  /**
   * Los recordatorios vigentes, con su momento resuelto (FR-026, FR-027).
   *
   * La app la consulta al abrir y tras cada cambio en la agenda: cancela lo que tenía
   * programado y reprograma esta lista entera.
   */
  app.get(CALENDAR_ROUTES.reminderPlan, { preHandler: requireAuth }, async (request) => {
    return calendar.getReminderPlan(authOf(request).userId);
  });

  /** Ajustes del aviso de la siguiente clase (Fase 27). */
  app.get(CALENDAR_ROUTES.classAlertSettings, { preHandler: requireAuth }, async (request) => {
    return calendar.getClassAlertSettings(authOf(request).userId);
  });

  /** Enciende el aviso de clase, o cambia su antelación (Fase 27). */
  app.patch(
    CALENDAR_ROUTES.classAlertSettings,
    { preHandler: requireAuth },
    async (request) => {
      const input = parseBody(updateClassAlertSettingsSchema, request.body);
      return calendar.updateClassAlertSettings(authOf(request).userId, input);
    },
  );

  /**
   * Los avisos de clase vigentes, con su hora resuelta (Fase 27).
   *
   * La app la consulta al abrir y tras cada cambio del horario: cancela lo que tenía y
   * programa esta lista entera, igual que con los recordatorios de entrega.
   */
  app.get(CALENDAR_ROUTES.classAlertPlan, { preHandler: requireAuth }, async (request) => {
    return calendar.getClassAlertPlan(authOf(request).userId);
  });
};
