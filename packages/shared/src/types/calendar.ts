/**
 * Tipos del calendario y los recordatorios (FR-023 a FR-027).
 *
 * Principio VIII: definidos UNA vez aquí y consumidos por `api`, `web` y `mobile`.
 */

import type { EntityId } from './common.js';
import type { Instant } from './auth.js';
import type { CalendarDate } from './attendance.js';
import type { ClockTime } from './schedule.js';
import type { AgendaKind, AgendaUrgency } from './agenda.js';

/**
 * Una clase que toca en un día concreto del calendario (FR-023).
 *
 * Es la sesión del horario ya resuelta contra una fecha: el horario guarda "los lunes a las
 * 07:00", y el calendario necesita "el lunes 7 de septiembre a las 07:00". La resolución la
 * hace el servidor para que ambos clientes vean el mismo día con las mismas clases.
 *
 * Lleva `absenceId` porque el detalle del día muestra si se faltó a esa clase: el estudiante
 * abre un día pasado para repasar qué hizo, y la falta es parte de lo que pasó ese día.
 */
export interface CalendarClass {
  readonly blockId: EntityId;
  readonly subjectId: EntityId;
  readonly subjectName: string;
  readonly color: string;
  readonly startTime: ClockTime;
  readonly endTime: ClockTime;
  readonly room: string | null;
  /** Falta registrada en esa clase ese día, si la hay (FR-011). `null` si asistió. */
  readonly absenceId: EntityId | null;
  /** Si la falta registrada está justificada (FR-017). */
  readonly absenceJustified: boolean;
}

/**
 * Un vencimiento de la agenda situado en un día del calendario (FR-023).
 *
 * No es la actividad entera: el calendario pinta muchos días a la vez y solo necesita lo que
 * cabe en una celda. La actividad completa se pide a `/agenda/items/:id` al abrirla.
 */
export interface CalendarDue {
  readonly itemId: EntityId;
  readonly title: string;
  readonly kind: AgendaKind;
  readonly subjectId: EntityId | null;
  readonly subjectName: string | null;
  readonly subjectColor: string | null;
  readonly completed: boolean;
  /**
   * Urgencia calculada por el servidor sobre la fecha de hoy, igual que en la agenda.
   *
   * Se repite aquí en lugar de derivarla del día de la celda porque el cliente no sabe qué
   * día es hoy para el servidor: usaría el reloj del dispositivo y el mismo vencimiento
   * saldría "vencido" en un cliente y "vence hoy" en el otro.
   */
  readonly urgency: AgendaUrgency;
}

/**
 * Un día del calendario con todo lo que pasa en él (FR-023).
 *
 * Combinar clases y vencimientos en la misma estructura —y no en dos listas paralelas— es lo
 * que hace que FR-023 se cumpla de verdad: el estudiante ve "el martes tengo tres clases y
 * entrego el reporte", no dos calendarios superpuestos que tenga que cruzar mentalmente.
 */
export interface CalendarDay {
  readonly date: CalendarDate;
  /** Clases de ese día, ordenadas por hora de inicio. Vacío en domingo y en días libres. */
  readonly classes: readonly CalendarClass[];
  /** Actividades que vencen ese día, pendientes y completadas. */
  readonly dues: readonly CalendarDue[];
  /** `true` si es el día de hoy según el servidor. El cliente lo destaca sin usar su reloj. */
  readonly isToday: boolean;
}

/**
 * El calendario de un rango de fechas (FR-023).
 *
 * Se devuelve el rango entero con un día por fecha —incluidos los vacíos— para que el cliente
 * pinte la rejilla recorriendo la lista, sin tener que generar fechas ni rellenar huecos.
 * Generarlas en el cliente es justo donde reaparecería el error de huso que `CalendarDate`
 * existe para evitar.
 */
export interface CalendarRange {
  readonly from: CalendarDate;
  readonly to: CalendarDate;
  /** Un elemento por día del rango, en orden ascendente. */
  readonly days: readonly CalendarDay[];
  /** Hoy según el servidor, para situar la vista sin consultar el reloj del dispositivo. */
  readonly today: CalendarDate;
}

/**
 * Días de anticipación admitidos para un recordatorio (FR-025).
 *
 * Un conjunto cerrado en vez de un número libre: son las anticipaciones que un estudiante
 * usa de verdad —el mismo día, la víspera, con margen de días, con una semana— y así la
 * elección se resuelve en un toque en la app en lugar de escribir un número.
 */
export const REMINDER_LEAD_DAYS = [0, 1, 2, 3, 7] as const;
export type ReminderLeadDays = (typeof REMINDER_LEAD_DAYS)[number];

/** Cómo se lee cada anticipación, igual en web y en app (Principio VIII). */
export const REMINDER_LEAD_LABELS: Readonly<Record<ReminderLeadDays, string>> = {
  0: 'El mismo día',
  1: 'Un día antes',
  2: 'Dos días antes',
  3: 'Tres días antes',
  7: 'Una semana antes',
};

/**
 * Ajustes de recordatorios del usuario (FR-025).
 *
 * La hora es del usuario y no de cada actividad porque las actividades guardan `dueDate` como
 * día de calendario, sin hora (decisión de la Fase 4: "se entrega el 3 de septiembre" es un
 * día). Añadir una hora por actividad obligaría a convertirla en instante y reabriría el
 * problema de husos que esa decisión cerró. Una hora fija —"avísame a las 20:00"— da el
 * momento concreto que la notificación necesita sin tocar el modelo de la agenda.
 */
export interface ReminderSettings {
  /** Si el usuario quiere recibir recordatorios (FR-025). */
  readonly enabled: boolean;
  /** Con cuánta anticipación avisar (FR-025). */
  readonly leadDays: ReminderLeadDays;
  /** A qué hora del día se emite el aviso. Hora de reloj local del dispositivo. */
  readonly timeOfDay: ClockTime;
  readonly updatedAt: Instant;
}

/**
 * Un recordatorio ya resuelto: qué actividad, y cuándo avisar (FR-025, FR-026).
 *
 * El servidor calcula el momento y el cliente solo lo programa. Es la misma decisión que la
 * urgencia de la agenda: si cada cliente restara los días de anticipación por su cuenta, la
 * app y la web discreparían sobre cuándo toca avisar, y el bug sería invisible hasta que la
 * notificación llegara tarde.
 */
export interface ScheduledReminder {
  readonly itemId: EntityId;
  readonly title: string;
  readonly kind: AgendaKind;
  readonly subjectName: string | null;
  /** Fecha límite de la actividad. */
  readonly dueDate: CalendarDate;
  /** Día en que se avisa: `dueDate` menos los días de anticipación. */
  readonly remindOn: CalendarDate;
  /** Hora del aviso, de los ajustes del usuario. */
  readonly remindAt: ClockTime;
  /**
   * `true` si el momento del aviso ya pasó respecto de hoy.
   *
   * La app no programa lo que ya pasó —Android descarta las notificaciones con fecha
   * pasada—, y la web lo usa para destacar en pantalla lo que ya debería haber avisado.
   */
  readonly overdue: boolean;
}

/**
 * Lo que el cliente necesita para programar los recordatorios (FR-026, FR-027).
 *
 * Se devuelven **todos** los recordatorios vigentes en cada consulta, y no solo los nuevos,
 * porque así FR-027 se cumple sin llevar registro de qué se programó antes: la app cancela
 * todo lo que tenía y reprograma esta lista. Una actividad que cambió de fecha, se completó
 * o se borró simplemente ya no aparece, y su notificación desaparece con ella.
 */
export interface ReminderPlan {
  readonly settings: ReminderSettings;
  /** Recordatorios vigentes, ordenados por momento de aviso. */
  readonly reminders: readonly ScheduledReminder[];
  /** Hoy según el servidor, contra el que se resolvió `overdue`. */
  readonly today: CalendarDate;
}
