/**
 * Formato de fechas.
 *
 * Principio VIII: web y app muestran las fechas igual porque ambas usan estas funciones.
 */

import { parseDate, type Instant } from '../types/auth.js';
import type { CalendarDate } from '../types/attendance.js';
import type { Weekday } from '../types/common.js';

const LOCALE = 'es-MX';

/** Fecha y hora legibles: "16 ago 2026, 14:30". */
export function formatDateTime(value: Instant): string {
  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parseDate(value));
}

/** Solo la fecha: "16 de agosto de 2026". */
export function formatDate(value: Instant): string {
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: 'long' }).format(parseDate(value));
}

/**
 * Fechas de calendario `YYYY-MM-DD` (FR-011).
 *
 * Todas estas funciones trabajan sobre el texto o sobre componentes locales, y ninguna pasa
 * por `new Date('2026-09-03')`: esa forma se interpreta como medianoche UTC, que en México
 * (UTC-6) es el día ANTERIOR a las 18:00. Una falta registrada así aparecería en el día
 * equivocado, y el día de la semana derivado sería el de la víspera.
 */

/** Descompone `YYYY-MM-DD` en sus tres números. `null` si no tiene esa forma o no existe. */
function calendarParts(
  value: CalendarDate,
): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  // Se construye la fecha en hora local y se comprueba que no haya rodado: el 31 de
  // febrero se normalizaría al 2 o 3 de marzo en lugar de rechazarse.
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

/** `true` si el texto es una fecha de calendario válida. */
export function isCalendarDate(value: unknown): value is CalendarDate {
  return typeof value === 'string' && calendarParts(value) !== null;
}

/** Convierte una fecha de calendario a `Date` en hora **local**, a medianoche. */
export function calendarDateToLocal(value: CalendarDate): Date {
  const parts = calendarParts(value);
  if (!parts) {
    throw new RangeError(`Fecha de calendario inválida: ${value}`);
  }
  return new Date(parts.year, parts.month - 1, parts.day);
}

/** Formatea un `Date` local como `YYYY-MM-DD`, sin pasar por UTC. */
export function toCalendarDate(date: Date): CalendarDate {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** La fecha de hoy, según el reloj del dispositivo. */
export function todayCalendarDate(): CalendarDate {
  return toCalendarDate(new Date());
}

/**
 * Día de la semana de una fecha de calendario.
 *
 * Devuelve `null` para el domingo: no es día de clase, así que no admite faltas. Los
 * clientes lo usan para avisar de que ese día no había nada que marcar.
 */
export function weekdayOf(value: CalendarDate): Weekday | null {
  const day = calendarDateToLocal(value).getDay();
  // `getDay()` da 0 para domingo y 1 para lunes; `WEEKDAYS` empieza en lunes.
  if (day === 0) return null;
  return (['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const)[
    day - 1
  ] as Weekday;
}

/** Suma (o resta, con negativos) días a una fecha de calendario. */
export function addDays(value: CalendarDate, days: number): CalendarDate {
  const date = calendarDateToLocal(value);
  date.setDate(date.getDate() + days);
  return toCalendarDate(date);
}

/** Fecha de calendario legible: "jueves, 3 de septiembre". */
export function formatCalendarDate(value: CalendarDate): string {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(calendarDateToLocal(value));
}

/** Versión corta para listas apretadas: "3 sep 2026". */
export function formatCalendarDateShort(value: CalendarDate): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(calendarDateToLocal(value));
}
