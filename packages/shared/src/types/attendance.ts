/**
 * Tipos del control de faltas (FR-011 a FR-017).
 *
 * Principio VIII: definidos UNA vez aquí y consumidos por `api`, `web` y `mobile`.
 */

import type { EntityId, Weekday } from './common.js';
import type { Instant } from './auth.js';
import type { ClockTime } from './schedule.js';
import type { SemesterKind } from './semester.js';

/**
 * Fecha de calendario en formato `YYYY-MM-DD`.
 *
 * Se transporta como texto y no como `Date` por la misma razón que `ClockTime`: "falté el
 * 3 de septiembre" es un día del calendario del estudiante, no un instante. Un `Date` se
 * desplazaría un día al cruzar husos —justo el error que hace que una falta aparezca en la
 * casilla equivocada—.
 */
export type CalendarDate = string;

/**
 * Una inasistencia registrada, siempre atada a una sesión concreta del horario (FR-011).
 *
 * Se guarda por sesión y no por materia y día porque una materia puede tener dos clases el
 * mismo día: sin el bloque no se podría distinguir si el estudiante faltó a una o a las dos,
 * y el conteo de FR-012 quedaría mal.
 */
export interface AbsenceRecord {
  readonly id: EntityId;
  readonly subjectId: EntityId;
  /** Sesión del horario a la que se faltó. */
  readonly blockId: EntityId;
  readonly date: CalendarDate;
  /** Día de la semana de `date`, derivado por el servidor. Redundante pero cómodo de pintar. */
  readonly weekday: Weekday;
  readonly startTime: ClockTime;
  readonly endTime: ClockTime;
  /**
   * Falta justificada (FR-017).
   *
   * Justificar no borra: el registro se conserva y deja de contar para el límite. Borrarlo
   * perdería el historial de que ese día no se asistió.
   */
  readonly justified: boolean;
  /** Nota opcional del estudiante: "cita médica", "paro de camiones". */
  readonly note: string | null;
  readonly createdAt: Instant;
}

/**
 * Una sesión candidata a marcarse como falta en una fecha concreta.
 *
 * La API resuelve qué clases tocaban ese día y si ya están marcadas, para que el cliente
 * solo tenga que pintar la lista (Principio II).
 */
export interface AbsenceCandidate {
  readonly blockId: EntityId;
  readonly subjectId: EntityId;
  readonly subjectName: string;
  readonly color: string;
  readonly startTime: ClockTime;
  readonly endTime: ClockTime;
  readonly room: string | null;
  /** `true` si ya hay una falta registrada para esta sesión en esa fecha. */
  readonly alreadyAbsent: boolean;
  /** Identificador de la falta existente, si `alreadyAbsent`. Sirve para quitarla. */
  readonly absenceId: EntityId | null;
  /** Si la falta existente está justificada. `false` cuando no hay falta. */
  readonly justified: boolean;
}

/**
 * Qué clases había un día concreto y cuáles están ya marcadas (FR-011).
 *
 * Es lo que necesita la pantalla de "marcar falta": elegida la fecha, el usuario ve sus
 * clases de ese día y marca el día completo o solo algunas.
 */
export interface DayAttendance {
  readonly date: CalendarDate;
  readonly weekday: Weekday;
  readonly sessions: readonly AbsenceCandidate[];
}

/**
 * Nivel de aviso de una materia respecto a su límite (FR-016).
 *
 * - `bien`: por debajo del umbral de aviso.
 * - `cerca`: ha llegado al 80% del límite; aún no lo supera.
 * - `alcanzado`: igualó o pasó el límite.
 */
export const ABSENCE_STATUSES = ['bien', 'cerca', 'alcanzado'] as const;
export type AbsenceStatus = (typeof ABSENCE_STATUSES)[number];

/**
 * Resumen de faltas de una materia (FR-012 a FR-016).
 *
 * Lo calcula la API entero: los clientes no derivan ni el límite ni el estado, solo los
 * pintan (Principio II).
 */
export interface SubjectAttendance {
  readonly subjectId: EntityId;
  readonly subjectName: string;
  readonly color: string;
  /** Sesiones de esta materia por semana, según el horario. */
  readonly sessionsPerWeek: number;
  /** Sesiones totales estimadas en el semestre: `sessionsPerWeek × semanas`. */
  readonly totalSessions: number;
  /** Faltas que cuentan para el límite: las no justificadas (FR-017). */
  readonly absences: number;
  /** Faltas justificadas, que no cuentan pero sí se conservan. */
  readonly justifiedAbsences: number;
  /** Límite en vigor: el que fijó el usuario, o la sugerencia si no lo tocó (FR-015). */
  readonly limit: number;
  /** Límite calculado como 20% de `totalSessions` (FR-013). */
  readonly suggestedLimit: number;
  /** `true` si el usuario sobrescribió el límite sugerido. */
  readonly limitIsCustom: boolean;
  /** Faltas que quedan antes de alcanzar el límite. Nunca negativo. */
  readonly remaining: number;
  readonly status: AbsenceStatus;
}

/**
 * Panel de faltas completo: una fila por materia más el ajuste de semanas.
 *
 * Se devuelve junto el número de semanas porque la pantalla lo muestra y lo edita, y así no
 * hace falta una segunda petición para pintar el panel.
 */
export interface AttendanceSummary {
  readonly subjects: readonly SubjectAttendance[];
  /** Semanas del periodo con las que se calcularon los totales. */
  readonly semesterWeeks: number;
  /**
   * Si el periodo es semestre o cuatrimestre (Fase 18).
   *
   * Viaja con el panel porque es lo que decide cómo se nombra en pantalla: "Semanas del
   * cuatrimestre", "18 en el cuatrimestre". Sin él, el panel de faltas tendría que pedir el
   * periodo por separado solo para saber cómo llamarlo.
   */
  readonly semesterKind: SemesterKind;
}
