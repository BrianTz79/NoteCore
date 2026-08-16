/**
 * Tipos del horario: materias y sus sesiones semanales (FR-005 a FR-010).
 *
 * Principio VIII: definidos UNA vez aquí y consumidos por `api`, `web` y `mobile`.
 */

import type { EntityId, Weekday } from './common.js';
import type { Instant } from './auth.js';

/**
 * Hora del día en formato `HH:MM`, 24 horas.
 *
 * Se guarda y se transporta como texto, no como `Date`: una clase de los lunes a las 07:00
 * es una hora de reloj recurrente, no un instante concreto. Un `Date` arrastraría fecha y
 * zona horaria, y el horario se desplazaría al cambiar de huso o con el horario de verano.
 */
export type ClockTime = string;

/**
 * Colores con los que se distingue cada materia (FR-010).
 *
 * Se asignan por rotación al crear materias, así que dos consecutivas nunca coinciden.
 * Elegidos con contraste suficiente sobre el fondo oscuro de ambos clientes.
 */
export const SUBJECT_COLORS = [
  '#6366f1',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ef4444',
  '#14b8a6',
  '#f97316',
  '#84cc16',
] as const;

export type SubjectColor = (typeof SUBJECT_COLORS)[number];

/** Una sesión de clase: un día de la semana, con hora de inicio, fin y aula. */
export interface ScheduleBlock {
  readonly id: EntityId;
  readonly subjectId: EntityId;
  readonly weekday: Weekday;
  readonly startTime: ClockTime;
  readonly endTime: ClockTime;
  /** Aula o laboratorio. Opcional: no todo horario la trae. */
  readonly room: string | null;
}

/** Una materia con todas sus sesiones de la semana. */
export interface Subject {
  readonly id: EntityId;
  readonly name: string;
  /** Color con el que se distingue en la vista semanal (FR-010). */
  readonly color: string;
  readonly blocks: readonly ScheduleBlock[];
  readonly createdAt: Instant;
  readonly updatedAt: Instant;
}

/**
 * Sesión ya resuelta para pintarla en la rejilla semanal.
 *
 * Lleva el nombre y el color de su materia para que la vista no tenga que cruzar dos
 * listas por cada celda.
 */
export interface ScheduleEntry {
  readonly blockId: EntityId;
  readonly subjectId: EntityId;
  readonly subjectName: string;
  readonly color: string;
  readonly weekday: Weekday;
  readonly startTime: ClockTime;
  readonly endTime: ClockTime;
  readonly room: string | null;
}

/**
 * Resultado de analizar el JSON de la IA, antes de escribir nada (FR-008).
 *
 * La v1 importaba a ciegas: lo que la IA generase entraba tal cual en la base de datos, y
 * volver a importar duplicaba el horario entero sin avisar. Aquí la API primero devuelve
 * esta vista previa —qué entra, qué choca y qué se descartó— y el usuario decide.
 */
export interface ImportPreview {
  /** Materias válidas listas para importarse, en el orden en que llegaron. */
  readonly subjects: readonly ImportPreviewSubject[];
  /** Filas que no pasaron la validación, con el motivo exacto (FR-008). */
  readonly rejected: readonly ImportRejection[];
  /** Total de sesiones válidas entre todas las materias. */
  readonly totalBlocks: number;
}

export interface ImportPreviewSubject {
  readonly name: string;
  readonly blocks: readonly ImportPreviewBlock[];
  /**
   * `true` si el usuario ya tiene una materia con ese nombre.
   *
   * Al añadir se crearía duplicada; al reemplazar se sustituye. El cliente lo señala para
   * que la elección sea informada.
   */
  readonly conflictsWithExisting: boolean;
}

export interface ImportPreviewBlock {
  readonly weekday: Weekday;
  readonly startTime: ClockTime;
  readonly endTime: ClockTime;
  readonly room: string | null;
}

/** Un elemento descartado durante la importación, con el motivo en español. */
export interface ImportRejection {
  /** Dónde estaba, para que el usuario lo localice en su JSON: "materia 3, sesión 2". */
  readonly location: string;
  readonly reason: string;
}

/**
 * Qué hacer con el horario existente al confirmar una importación.
 *
 * - `añadir`: lo importado se suma a lo que ya hay.
 * - `reemplazar`: se borra el horario anterior y queda solo lo importado.
 */
export const IMPORT_MODES = ['añadir', 'reemplazar'] as const;
export type ImportMode = (typeof IMPORT_MODES)[number];

/** Lo que devuelve una importación confirmada. */
export interface ImportResult {
  readonly mode: ImportMode;
  readonly subjectsCreated: number;
  readonly blocksCreated: number;
  /** Materias borradas por haber elegido `reemplazar`. Cero si se añadió. */
  readonly subjectsRemoved: number;
  /** El horario completo tras la importación, para refrescar la vista sin otra petición. */
  readonly subjects: readonly Subject[];
}
