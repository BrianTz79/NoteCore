/**
 * Formato de fechas.
 *
 * Principio VIII: web y app muestran las fechas igual porque ambas usan estas funciones.
 */

import { parseDate, type Instant } from '../types/auth.js';

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
