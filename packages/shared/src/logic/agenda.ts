/**
 * Reglas de la agenda (FR-018 a FR-022).
 *
 * Principio II: el orden de FR-022 y la urgencia se calculan aquí y en la API — nunca se
 * reimplementan en web ni en mobile.
 */

import type { AgendaItem, AgendaUrgency } from '../types/agenda.js';
import type { CalendarDate } from '../types/attendance.js';
import { calendarDateToLocal } from './dates.js';

/**
 * Días de margen a partir de los cuales una entrega deja de considerarse próxima.
 *
 * Una semana: es el horizonte con el que el estudiante planifica —lo que entra en "esta
 * semana"— y deja tiempo real de reacción para un proyecto, no solo para una tarea.
 */
export const AGENDA_SOON_DAYS = 7;

/**
 * Días entre dos fechas de calendario. Positivo si `to` es posterior a `from`.
 *
 * Se cuenta sobre fechas construidas a medianoche **local** y se redondea, en lugar de
 * dividir milisegundos a secas: entre dos fechas puede haber un cambio de horario de verano
 * que mete o quita una hora, y la división daría 6.958 días donde hay 7.
 */
export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  const desde = calendarDateToLocal(from).getTime();
  const hasta = calendarDateToLocal(to).getTime();
  return Math.round((hasta - desde) / 86_400_000);
}

/**
 * Urgencia de una actividad según su fecha límite y el día de hoy.
 *
 * Una actividad completada nunca urge, aunque su fecha haya pasado: marcarla como vencida
 * sería una alarma falsa sobre algo que el estudiante ya entregó (FR-020).
 */
export function agendaUrgency(
  dueDate: CalendarDate | null,
  today: CalendarDate,
  completed = false,
): AgendaUrgency {
  if (completed || dueDate === null) return 'sin_fecha';

  const days = daysBetween(today, dueDate);
  if (days < 0) return 'vencida';
  if (days === 0) return 'hoy';
  return days <= AGENDA_SOON_DAYS ? 'proxima' : 'lejana';
}

/** Texto del estado, igual en web y en app (Principio VIII). */
export const AGENDA_URGENCY_LABELS: Readonly<Record<AgendaUrgency, string>> = {
  vencida: 'Vencida',
  hoy: 'Vence hoy',
  proxima: 'Próxima',
  lejana: 'Con tiempo',
  sin_fecha: 'Sin fecha',
};

/**
 * Color de cada urgencia, para que la señal visual sea la misma en web y en app.
 *
 * Se define aquí por la misma razón que `ABSENCE_STATUS_COLORS`: el color es la señal. Se
 * reutilizan los mismos tonos del control de faltas —rojo, ámbar, verde— para que la alerta
 * signifique lo mismo en toda la aplicación.
 */
export const AGENDA_URGENCY_COLORS: Readonly<Record<AgendaUrgency, string>> = {
  vencida: '#ef4444',
  hoy: '#f59e0b',
  proxima: '#38bdf8',
  lejana: '#10b981',
  sin_fecha: '#94a3b8',
};

/**
 * Cuánto falta, en palabras: "vence hoy", "en 3 días", "hace 2 días".
 *
 * Vive aquí para que ambos clientes digan exactamente lo mismo ante la misma situación.
 */
export function dueDateMessage(daysUntilDue: number | null): string {
  if (daysUntilDue === null) return 'Sin fecha límite';
  if (daysUntilDue === 0) return 'Vence hoy';
  if (daysUntilDue === 1) return 'Vence mañana';
  if (daysUntilDue === -1) return 'Venció ayer';
  if (daysUntilDue > 1) return `Vence en ${daysUntilDue} días`;
  return `Venció hace ${Math.abs(daysUntilDue)} días`;
}

/**
 * La línea de vencimiento completa, tal como se pinta en la lista.
 *
 * Compone la etiqueta de urgencia con los días que faltan, **omitiendo la etiqueta cuando
 * no añade nada**: para una entrega de hoy, `AGENDA_URGENCY_LABELS.hoy` y `dueDateMessage`
 * dicen los dos "Vence hoy", y concatenarlos daba el "Vence hoy · Vence hoy" que salía en
 * la app y en la web.
 *
 * Vive aquí y no en cada cliente porque es exactamente el tipo de detalle que se corrige en
 * uno y se olvida en el otro, y entonces la misma actividad se lee distinto según el
 * dispositivo (Principio VIII).
 */
export function dueDateLine(
  urgency: AgendaUrgency,
  daysUntilDue: number | null,
): string {
  const detalle = dueDateMessage(daysUntilDue);
  const etiqueta = AGENDA_URGENCY_LABELS[urgency];

  // Sin fecha límite no hay dos mitades que unir.
  if (daysUntilDue === null) return detalle;

  // La etiqueta solo se antepone cuando dice algo que el detalle no dice ya.
  return etiqueta === detalle ? detalle : `${etiqueta} · ${detalle}`;
}

/**
 * Ordena las pendientes por proximidad de vencimiento (FR-022).
 *
 * Lo que vence antes va primero, y **lo vencido va antes que todo**: una entrega que ya pasó
 * es lo más urgente que hay en la lista, no algo a esconder al final.
 *
 * Las que no tienen fecha límite van al final: no compiten por urgencia con las que sí la
 * tienen, pero siguen visibles —FR-018 las permite, así que esconderlas las perdería—. Entre
 * ellas manda la más recientemente creada, que es la que el estudiante acaba de anotar.
 *
 * Devuelve un array nuevo; no muta el que recibe.
 */
export function sortByDueDate<T extends Pick<AgendaItem, 'dueDate' | 'createdAt'>>(
  items: readonly T[],
): readonly T[] {
  return [...items].sort((a, b) => {
    // Sin fecha al final, sin importar cuándo se creó lo que sí la tiene.
    if (a.dueDate === null && b.dueDate === null) {
      return String(b.createdAt).localeCompare(String(a.createdAt));
    }
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;

    // Las fechas `YYYY-MM-DD` se ordenan bien como texto: los componentes van de mayor a
    // menor y todos llevan ceros a la izquierda.
    if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);

    // Mismo día: primero lo que se anotó antes, que es el orden en que se fue enterando.
    return String(a.createdAt).localeCompare(String(b.createdAt));
  });
}
