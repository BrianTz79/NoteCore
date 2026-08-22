/**
 * Tipos de la agenda (FR-018 a FR-022).
 *
 * Principio VIII: definidos UNA vez aquí y consumidos por `api`, `web` y `mobile`.
 */

import type { EntityId } from './common.js';
import type { Instant } from './auth.js';
import type { CalendarDate } from './attendance.js';

/**
 * Qué clase de actividad es.
 *
 * El spec habla de "tareas, proyectos y actividades" (US-3), y son cosas que el estudiante
 * distingue de un vistazo: una tarea se entrega mañana, un proyecto lleva semanas, un examen
 * se estudia. No cambian ninguna regla —todas se crean, editan, completan y borran igual—,
 * solo cómo se etiquetan y se filtran en la lista.
 */
export const AGENDA_KINDS = ['tarea', 'proyecto', 'examen', 'actividad'] as const;
export type AgendaKind = (typeof AGENDA_KINDS)[number];

/** Etiqueta de cada tipo, igual en web y en app (Principio VIII). */
export const AGENDA_KIND_LABELS: Readonly<Record<AgendaKind, string>> = {
  tarea: 'Tarea',
  proyecto: 'Proyecto',
  examen: 'Examen',
  actividad: 'Actividad',
};

/**
 * Urgencia de una actividad pendiente según lo que falta para su fecha límite.
 *
 * - `vencida`: la fecha límite ya pasó y sigue sin completarse.
 * - `hoy`: vence hoy.
 * - `proxima`: vence dentro de los próximos días.
 * - `lejana`: queda tiempo de sobra.
 * - `sin_fecha`: no tiene fecha límite (FR-018 la hace opcional).
 *
 * Lo calcula el servidor, como el estado de las faltas: si web pintara "vencida" en ámbar y
 * la app en rojo, la misma situación se leería distinto según el dispositivo.
 */
export const AGENDA_URGENCIES = ['vencida', 'hoy', 'proxima', 'lejana', 'sin_fecha'] as const;
export type AgendaUrgency = (typeof AGENDA_URGENCIES)[number];

/**
 * Una actividad de la agenda (FR-018).
 *
 * `subjectId` y `dueDate` son opcionales por requisito: "lavar el uniforme del laboratorio"
 * no cuelga de ninguna materia, y "leer el capítulo 4" puede no tener fecha de entrega.
 */
export interface AgendaItem {
  readonly id: EntityId;
  readonly title: string;
  readonly description: string | null;
  readonly kind: AgendaKind;
  /** Materia asociada, si la tiene (FR-018). */
  readonly subjectId: EntityId | null;
  /** Nombre de la materia, resuelto por el servidor para no pedirla aparte al pintar. */
  readonly subjectName: string | null;
  /** Color de la materia, para que la lista use el mismo código que el horario (FR-010). */
  readonly subjectColor: string | null;
  /** Fecha límite, si la tiene (FR-018). */
  readonly dueDate: CalendarDate | null;
  /** Completada (FR-020). Se conserva el registro: completar no borra. */
  readonly completed: boolean;
  /** Cuándo se completó. `null` mientras siga pendiente. */
  readonly completedAt: Instant | null;
  /**
   * Hasta cuándo se aplazó su recordatorio (Fase 28). `null` si no se aplazó.
   *
   * Es el único dato del aviso que se guarda en lugar de calcularse: nace de que alguien
   * pulsó «Recordar más tarde» en la notificación, y eso no se deduce de la fecha de entrega
   * ni de los ajustes.
   */
  readonly reminderSnoozedUntil: Instant | null;
  /**
   * Urgencia calculada por el servidor sobre `dueDate` y la fecha de hoy.
   *
   * Las completadas siempre valen `sin_fecha`: una tarea entregada no urge aunque su fecha
   * haya pasado, y marcarla como "vencida" sería una alarma falsa.
   */
  readonly urgency: AgendaUrgency;
  /**
   * Días que faltan para el vencimiento. Negativo si ya pasó, `null` sin fecha límite.
   *
   * Se manda resuelto porque el cliente no puede calcularlo bien: usaría el reloj del
   * dispositivo, que puede ir en otro huso o simplemente mal.
   */
  readonly daysUntilDue: number | null;
  readonly createdAt: Instant;
  readonly updatedAt: Instant;
}

/**
 * La agenda completa: pendientes y completadas por separado.
 *
 * Se separan en el servidor en vez de mandar una lista sola y que cada cliente la parta:
 * FR-022 exige que las pendientes salgan ordenadas por proximidad de vencimiento, mientras
 * que las completadas interesan por lo más recientemente terminado. Son dos ordenaciones
 * distintas, así que son dos listas.
 */
export interface AgendaList {
  /** Pendientes, ordenadas por proximidad de vencimiento (FR-022). */
  readonly pending: readonly AgendaItem[];
  /** Completadas, lo más reciente primero (FR-020: se conservan). */
  readonly completed: readonly AgendaItem[];
  /** Cuántas pendientes tienen la fecha límite pasada. Lo que la pantalla destaca arriba. */
  readonly overdueCount: number;
  /** Cuántas pendientes vencen hoy. */
  readonly dueTodayCount: number;
}
