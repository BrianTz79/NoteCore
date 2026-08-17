/**
 * Reglas del calendario y los recordatorios (FR-023 a FR-027).
 *
 * Principio II: el rango de fechas, el momento del aviso y su vigencia se calculan aquí y en
 * la API — nunca se reimplementan en web ni en mobile.
 */

import type { CalendarDate } from '../types/attendance.js';
import type { ClockTime } from '../types/schedule.js';
import type { ReminderLeadDays } from '../types/calendar.js';
import { addDays, calendarDateToLocal, toCalendarDate } from './dates.js';

/** Hora por defecto del aviso: la tarde, cuando el estudiante ya está fuera de clase. */
export const DEFAULT_REMINDER_TIME: ClockTime = '20:00';

/** Anticipación por defecto: la víspera, que es cuando aún da tiempo de hacer algo. */
export const DEFAULT_REMINDER_LEAD_DAYS: ReminderLeadDays = 1;

/**
 * Cuántos días puede abarcar una consulta del calendario.
 *
 * Un año y pico: cubre el mes que pinta la vista y cualquier salto razonable, pero impide que
 * una petición pida diez años y obligue al servidor a construir miles de días.
 */
export const MAX_CALENDAR_RANGE_DAYS = 400;

/**
 * Todas las fechas de un rango, ambos extremos incluidos.
 *
 * Se genera aquí —y no en cada cliente— porque avanzar día a día es exactamente donde
 * reaparecen los errores de huso y de horario de verano: sumar 86.400.000 milisegundos falla
 * el día en que el reloj cambia. `addDays` trabaja sobre componentes locales, que no.
 */
export function calendarDateRange(
  from: CalendarDate,
  to: CalendarDate,
): readonly CalendarDate[] {
  const dates: CalendarDate[] = [];

  let current = from;
  // La comparación textual sirve porque `YYYY-MM-DD` ordena igual como texto que como fecha.
  while (current <= to) {
    dates.push(current);
    current = addDays(current, 1);
  }

  return dates;
}

/**
 * El primer día de la rejilla mensual: el lunes de la semana en que cae el día 1.
 *
 * La vista de mes se pinta como una rejilla de semanas completas, así que empieza antes del
 * día 1 siempre que ese día no sea lunes. Sin esto, el mes arrancaría en una columna
 * arbitraria y los días no quedarían alineados bajo su día de la semana.
 */
export function monthGridStart(anyDayOfMonth: CalendarDate): CalendarDate {
  const date = calendarDateToLocal(anyDayOfMonth);
  const first = new Date(date.getFullYear(), date.getMonth(), 1);

  // `getDay()` da 0 para domingo; la semana del proyecto empieza en lunes (`WEEKDAYS`).
  const weekday = first.getDay();
  const backtrack = weekday === 0 ? 6 : weekday - 1;

  return addDays(toCalendarDate(first), -backtrack);
}

/**
 * El último día de la rejilla mensual: el domingo de la semana en que cae el último día.
 *
 * Cierra la rejilla en semanas completas, igual que `monthGridStart` la abre.
 */
export function monthGridEnd(anyDayOfMonth: CalendarDate): CalendarDate {
  const date = calendarDateToLocal(anyDayOfMonth);
  // El día 0 del mes siguiente es el último del actual, sin tener que saber si tiene 28 o 31.
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  const weekday = last.getDay();
  const forward = weekday === 0 ? 0 : 7 - weekday;

  return addDays(toCalendarDate(last), forward);
}

/** Mes anterior al del día dado, situado en su día 1. */
export function previousMonth(anyDayOfMonth: CalendarDate): CalendarDate {
  const date = calendarDateToLocal(anyDayOfMonth);
  return toCalendarDate(new Date(date.getFullYear(), date.getMonth() - 1, 1));
}

/** Mes siguiente al del día dado, situado en su día 1. */
export function nextMonth(anyDayOfMonth: CalendarDate): CalendarDate {
  const date = calendarDateToLocal(anyDayOfMonth);
  return toCalendarDate(new Date(date.getFullYear(), date.getMonth() + 1, 1));
}

/** El día 1 del mes del día dado. */
export function startOfMonth(anyDayOfMonth: CalendarDate): CalendarDate {
  const date = calendarDateToLocal(anyDayOfMonth);
  return toCalendarDate(new Date(date.getFullYear(), date.getMonth(), 1));
}

/**
 * Nombre del mes con su año, ya con la inicial en mayúscula: "Septiembre de 2026".
 *
 * Se capitaliza aquí y no en cada cliente porque las dos formas de hacerlo en la interfaz
 * fallan igual: `text-transform: capitalize` en la web y `textTransform: 'capitalize'` en
 * React Native ponen mayúscula en **cada palabra**, y el resultado es "Septiembre De 2026".
 * En español solo la primera lleva mayúscula, y `Intl` la devuelve toda en minúscula.
 */
export function formatMonthName(anyDayOfMonth: CalendarDate): string {
  const nombre = new Intl.DateTimeFormat('es-MX', {
    month: 'long',
    year: 'numeric',
  }).format(calendarDateToLocal(anyDayOfMonth));

  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

/** `true` si dos fechas caen en el mismo mes del mismo año. */
export function isSameMonth(a: CalendarDate, b: CalendarDate): boolean {
  // `YYYY-MM` identifica el mes sin ambigüedad y sin construir fechas.
  return a.slice(0, 7) === b.slice(0, 7);
}

/**
 * El día en que toca avisar de una entrega (FR-025).
 *
 * Es la fecha límite menos la anticipación configurada. Se calcula aquí —y el servidor lo
 * manda resuelto— para que app y web nunca discrepen sobre cuándo toca el aviso: si cada
 * cliente restara los días por su cuenta, la discrepancia no se vería hasta que una
 * notificación llegara un día tarde.
 */
export function reminderDate(
  dueDate: CalendarDate,
  leadDays: ReminderLeadDays,
): CalendarDate {
  return addDays(dueDate, -leadDays);
}

/**
 * `true` si el momento del aviso ya pasó respecto de la fecha y hora actuales.
 *
 * Compara primero el día y solo mira la hora cuando el aviso es hoy: un recordatorio de las
 * 20:00 sigue vigente a las 15:00 del mismo día, pero no a las 21:00.
 *
 * Importa porque Android descarta las notificaciones programadas para un instante pasado. Sin
 * esta comprobación, la app intentaría programarlas igual y el usuario no recibiría nada
 * —fallando en silencio, que es la peor forma de fallar para un recordatorio—.
 */
export function reminderHasPassed(
  remindOn: CalendarDate,
  remindAt: ClockTime,
  today: CalendarDate,
  nowTime: ClockTime,
): boolean {
  if (remindOn < today) return true;
  if (remindOn > today) return false;
  // Mismo día: `HH:MM` se compara bien como texto porque lleva ceros a la izquierda.
  return remindAt <= nowTime;
}

/**
 * El instante local en que debe saltar una notificación.
 *
 * Devuelve un `Date` construido con componentes locales, que es lo que espera el programador
 * de notificaciones del dispositivo. Nunca pasa por `new Date('2026-09-03T20:00')` sin zona
 * ni por `toISOString()`: ambas rutas reinterpretan la hora en UTC y el aviso saldría
 * desplazado seis horas en México.
 */
export function reminderInstant(remindOn: CalendarDate, remindAt: ClockTime): Date {
  const day = calendarDateToLocal(remindOn);
  const [hours, minutes] = remindAt.split(':').map(Number);

  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    hours ?? 0,
    minutes ?? 0,
    0,
    0,
  );
}

/** Cómo se nombra un plazo en días: "hoy", "mañana", "en 5 días". */
function plazoEnPalabras(dias: number): string {
  if (dias <= 0) return 'Vence hoy';
  if (dias === 1) return 'Vence mañana';
  return `Vence en ${dias} días`;
}

/**
 * Texto de la **notificación**, igual en cualquier dispositivo (Principio VIII).
 *
 * El plazo se cuenta desde el día en que el aviso salta, no desde hoy: la notificación se lee
 * cuando llega, y con una anticipación de un día siempre dirá "Vence mañana" —que es cierto en
 * ese momento—. Por eso basta `leadDays`, que es exactamente esa distancia.
 *
 * Se compone aquí en lugar de en la app porque el texto debe ser el mismo en cualquier
 * dispositivo, y es justo el detalle que se corrige en un cliente y se olvida en el otro.
 */
export function reminderMessage(
  title: string,
  subjectName: string | null,
  leadDays: ReminderLeadDays,
): string {
  const cuando = plazoEnPalabras(leadDays);
  return subjectName ? `${cuando} · ${title} (${subjectName})` : `${cuando} · ${title}`;
}

/**
 * Texto del recordatorio **en la lista de próximos avisos**, contado desde hoy.
 *
 * No sirve `reminderMessage` para esto: su plazo se mide desde el día del aviso, así que un
 * examen a nueve días con anticipación de uno saldría como "Vence mañana" en una lista que se
 * está leyendo hoy. Es el error que apareció en el emulador —dos entregas muy distintas
 * anunciadas las dos como "mañana"—, y desorienta justo sobre lo que la pantalla debe aclarar:
 * qué urge y qué no.
 *
 * La distancia la calcula quien llama con `daysBetween(hoy, dueDate)`, porque solo el servidor
 * sabe qué día es hoy sin depender del reloj del dispositivo.
 */
export function reminderListMessage(
  title: string,
  subjectName: string | null,
  daysUntilDue: number,
): string {
  const cuando = plazoEnPalabras(daysUntilDue);
  return subjectName ? `${cuando} · ${title} (${subjectName})` : `${cuando} · ${title}`;
}

/** La hora actual del dispositivo como `HH:MM`, para comparar con la hora del aviso. */
export function currentClockTime(now: Date = new Date()): ClockTime {
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
