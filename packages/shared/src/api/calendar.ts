/**
 * Llamadas del calendario y los recordatorios, tipadas.
 *
 * Principio VIII: web y app llaman a estas funciones en lugar de escribir cada una sus
 * rutas y sus tipos de respuesta.
 */

import type { UpdateReminderSettingsInput } from '../schemas/calendar.js';
import type { CalendarDate } from '../types/attendance.js';
import type {
  CalendarDay,
  CalendarRange,
  ReminderPlan,
  ReminderSettings,
} from '../types/calendar.js';
import type { ApiClient } from './client.js';

export const CALENDAR_ROUTES = {
  range: '/calendar',
  day: '/calendar/day',
  reminderSettings: '/calendar/reminders/settings',
  reminderPlan: '/calendar/reminders/plan',
} as const;

export function createCalendarApi(client: ApiClient) {
  return {
    /**
     * El calendario de un rango, con clases y vencimientos por día (FR-023).
     *
     * Devuelve un día por fecha del rango, incluidos los vacíos: el cliente pinta la rejilla
     * recorriendo la lista, sin generar fechas por su cuenta —que es donde reaparecerían los
     * errores de huso—.
     */
    range(from: CalendarDate, to: CalendarDate): Promise<CalendarRange> {
      const params = new URLSearchParams({ from, to });
      return client.get<CalendarRange>(`${CALENDAR_ROUTES.range}?${params.toString()}`);
    },

    /**
     * El detalle de un día concreto (FR-024).
     *
     * Va aparte del rango porque el detalle se abre al tocar un día y solo necesita ese: pedir
     * el mes entero para pintar una jornada sería traer treinta veces más de lo necesario.
     */
    day(date: CalendarDate): Promise<CalendarDay> {
      return client.get<CalendarDay>(`${CALENDAR_ROUTES.day}?date=${date}`);
    },

    /** Ajustes de recordatorios del usuario (FR-025). */
    reminderSettings(): Promise<ReminderSettings> {
      return client.get<ReminderSettings>(CALENDAR_ROUTES.reminderSettings);
    },

    /** Cambia los ajustes de recordatorios (FR-025). */
    updateReminderSettings(input: UpdateReminderSettingsInput): Promise<ReminderSettings> {
      return client.patch<ReminderSettings>(CALENDAR_ROUTES.reminderSettings, input);
    },

    /**
     * Los recordatorios vigentes, con su momento ya resuelto (FR-026, FR-027).
     *
     * Se devuelven todos en cada consulta, no solo los nuevos: la app cancela lo que tenía
     * programado y reprograma esta lista entera. Así FR-027 se cumple sin llevar registro de
     * lo anterior —lo que cambió de fecha, se completó o se borró simplemente ya no está—.
     */
    reminderPlan(): Promise<ReminderPlan> {
      return client.get<ReminderPlan>(CALENDAR_ROUTES.reminderPlan);
    },
  };
}

export type CalendarApi = ReturnType<typeof createCalendarApi>;
