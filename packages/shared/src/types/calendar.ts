/**
 * Tipos del calendario y los recordatorios (FR-023 a FR-027).
 *
 * Principio VIII: definidos UNA vez aquí y consumidos por `api`, `web` y `mobile`.
 */

import type { EntityId, Weekday } from './common.js';
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

/**
 * Minutos de antelación admitidos para el aviso de la siguiente clase (Fase 27).
 *
 * Conjunto cerrado por lo mismo que `REMINDER_LEAD_DAYS`: son las antelaciones que sirven de
 * verdad para levantarse e ir al aula, y así elegir es un toque en lugar de escribir un
 * número. El techo son 30 minutos porque más allá el aviso deja de ser «voy saliendo» y se
 * convierte en ruido a media clase anterior.
 */
export const CLASS_ALERT_LEAD_MINUTES = [5, 10, 15, 30] as const;
export type ClassAlertLeadMinutes = (typeof CLASS_ALERT_LEAD_MINUTES)[number];

/** Cómo se lee cada antelación, igual en web y en app (Principio VIII). */
export const CLASS_ALERT_LEAD_LABELS: Readonly<Record<ClassAlertLeadMinutes, string>> = {
  5: '5 minutos antes',
  10: '10 minutos antes',
  15: '15 minutos antes',
  30: '30 minutos antes',
};

/**
 * Ajustes del aviso de la siguiente clase (Fase 27).
 *
 * ## Por qué arranca apagado
 *
 * Por la misma razón que los recordatorios de la Fase 5, y con más motivo: un horario normal
 * son cinco o seis clases al día, así que encenderlo por defecto significaría veinticinco
 * notificaciones a la semana que nadie pidió. Ese es exactamente el volumen que hace que
 * alguien desactive los avisos de una app **para siempre**, incluidos los que sí quería. Se
 * ofrece visible en ajustes y lo enciende quien lo quiera.
 */
export interface ClassAlertSettings {
  /** Si el usuario quiere que se le avise antes de cada clase. */
  readonly enabled: boolean;
  /** Con cuántos minutos de antelación avisar. */
  readonly leadMinutes: ClassAlertLeadMinutes;
  readonly updatedAt: Instant;
}

/**
 * Un aviso de clase ya resuelto: qué clase, y a qué hora avisar (Fase 27).
 *
 * ## Por qué es semanal y no una fecha
 *
 * Un `ScheduledReminder` de la Fase 5 apunta a un instante único —una entrega vence una vez—.
 * Una clase, en cambio, **se repite todas las semanas** mientras el semestre siga abierto. Por
 * eso esto lleva día de la semana y hora de reloj en lugar de fecha: es el mismo tipo de dato
 * que `ScheduleBlock`, y por la misma razón que allí (un instante arrastraría huso y se
 * desplazaría con el horario de verano).
 *
 * La consecuencia práctica es que el cliente lo programa con un disparador **semanal** del
 * sistema, que se repite solo, en vez de reprogramar algo cada vez que pasa.
 */
export interface ClassAlert {
  readonly blockId: EntityId;
  readonly subjectId: EntityId;
  readonly subjectName: string;
  readonly weekday: Weekday;
  /** Hora a la que empieza la clase. Es lo que dice el aviso, no cuándo se emite. */
  readonly startTime: ClockTime;
  readonly endTime: ClockTime;
  readonly room: string | null;
  /**
   * Hora a la que se emite el aviso: `startTime` menos la antelación.
   *
   * Lo calcula el servidor, como `remindOn` en la Fase 5 y por el mismo motivo: si cada
   * cliente restara los minutos por su cuenta, app y web discreparían sobre cuándo toca
   * avisar y el fallo no se vería hasta que la notificación llegara tarde.
   */
  readonly alertAt: ClockTime;
  /**
   * `true` si restar la antelación cruzó la medianoche hacia el día anterior.
   *
   * Solo puede pasar con una clase que empiece antes de las 00:30, que no es un horario real
   * pero sí un dato que alguien puede teclear. El cliente no programa estos: avisar el
   * domingo a las 23:50 de la clase del lunes es correcto en aritmética y absurdo en la
   * práctica, y el día de la semana del aviso ya no sería el de la clase.
   */
  readonly crossesMidnight: boolean;
}

/**
 * Lo que el cliente necesita para programar los avisos de clase (Fase 27).
 *
 * Se devuelven **todos** los vigentes en cada consulta, igual que `ReminderPlan`: el cliente
 * cancela lo que tenía y programa esta lista entera. Una clase que se borró del horario, o
 * cuyo semestre se archivó, simplemente ya no viene, y su aviso desaparece con ella.
 */
export interface ClassAlertPlan {
  readonly settings: ClassAlertSettings;
  /** Avisos vigentes, ordenados por día de la semana y hora. */
  readonly alerts: readonly ClassAlert[];
}

/**
 * Cuánto se puede aplazar un recordatorio desde la propia notificación (Fase 28).
 *
 * Conjunto cerrado y corto, como todo lo demás: el aplazamiento se elige con el teléfono en
 * la mano y la notificación desplegada, donde no cabe un selector. Cuatro horas es el techo
 * porque más allá lo que se quiere no es aplazar sino cambiar la fecha de entrega, que es
 * otra acción y vive en la agenda.
 */
export const SNOOZE_MINUTES = [30, 60, 180, 240] as const;
export type SnoozeMinutes = (typeof SNOOZE_MINUTES)[number];

/** Cómo se lee cada aplazamiento, igual en web y en app (Principio VIII). */
export const SNOOZE_LABELS: Readonly<Record<SnoozeMinutes, string>> = {
  30: 'En 30 minutos',
  60: 'En 1 hora',
  180: 'En 3 horas',
  240: 'En 4 horas',
};

/**
 * El aplazamiento que ofrece el botón de la notificación (Fase 28).
 *
 * Uno solo, no cuatro: una notificación de Android admite dos o tres botones antes de que el
 * sistema los esconda tras «expandir», y gastar tres en aplazamientos dejaría fuera el de
 * «Cumplida», que es el que más se usa. La lista completa sigue disponible dentro de la app.
 */
export const DEFAULT_SNOOZE_MINUTES: SnoozeMinutes = 60;
