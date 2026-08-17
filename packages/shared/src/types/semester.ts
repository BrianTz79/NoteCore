/**
 * Tipos de los semestres (FR-034 a FR-038).
 *
 * Principio VIII: definidos UNA vez aquí y consumidos por `api`, `web` y `mobile`.
 *
 * La idea que gobierna el módulo: un semestre es el **ámbito** de todo lo académico, no una
 * copia de ello. Las materias, las faltas y las actividades llevan `semesterId` y siguen en
 * sus tablas de siempre cuando el semestre se archiva; lo que cambia es que dejan de ser
 * escribibles.
 *
 * Se descartó archivar copiando el contenido a una tabla de instantáneas —como hace
 * `shares.payload`— por dos motivos. El primero, que FR-036 pide consultarlos "de forma
 * indefinida": si el archivo tuviera otra forma que lo vivo, cada pantalla necesitaría dos
 * caminos de pintado y las dos se desincronizarían con el tiempo. El segundo, que vaciar las
 * tablas al cerrar es justo la operación de rutina que destruye historial y que el Principio
 * VI prohíbe. Con el ámbito, cerrar un semestre no borra ni copia una sola fila: cambia una
 * bandera.
 */

import type { EntityId } from './common.js';
import type { Instant } from './auth.js';
import type { CalendarDate } from './attendance.js';

/**
 * Estado de un semestre.
 *
 * Solo hay uno `activo` por usuario, y es el único donde se puede escribir. Los `archivado`
 * se consultan indefinidamente (FR-036) y rechazan toda modificación (FR-037).
 *
 * A diferencia de la caducidad de un compartido, este estado **sí** se guarda: no se deriva
 * de ninguna fecha, sino de un acto explícito del estudiante al cerrar el semestre.
 */
export const SEMESTER_STATUSES = ['activo', 'archivado'] as const;
export type SemesterStatus = (typeof SEMESTER_STATUSES)[number];

/** Etiqueta de cada estado, igual en web y en app (Principio VIII). */
export const SEMESTER_STATUS_LABELS: Readonly<Record<SemesterStatus, string>> = {
  activo: 'Activo',
  archivado: 'Archivado',
};

/**
 * Color de cada estado.
 *
 * Vive aquí por lo mismo que el color de las faltas y el de los compartidos: si la web
 * pintara "archivado" en gris y la app en ámbar, el mismo semestre se leería distinto según
 * el dispositivo.
 */
export const SEMESTER_STATUS_COLORS: Readonly<Record<SemesterStatus, string>> = {
  activo: '#10b981',
  archivado: '#94a3b8',
};

/** Longitud máxima del nombre de un semestre. Es una etiqueta corta: "2026-2", "Quinto". */
export const SEMESTER_NAME_MAX_LENGTH = 40;

/**
 * Un semestre del estudiante.
 *
 * `startedAt` y `closedAt` son fechas de calendario y no instantes, por lo mismo que la fecha
 * de una falta: "el semestre empezó el 17 de agosto" es un día, no un momento. Con
 * `timestamp` el semestre cambiaría de día de inicio al cruzar un huso.
 */
export interface Semester {
  readonly id: EntityId;
  /** Nombre que le puso el estudiante: "2026-1", "Quinto semestre". */
  readonly name: string;
  readonly status: SemesterStatus;
  readonly startedAt: CalendarDate;
  /** Día en que se cerró. `null` mientras siga activo. */
  readonly closedAt: CalendarDate | null;
  /**
   * Qué contiene, ya contado por el servidor.
   *
   * Va en el propio semestre y no en una petición aparte porque la lista de semestres los
   * muestra siempre —"6 materias · 32 faltas · 18 actividades"— y sin ellos cada fila
   * necesitaría su propia consulta.
   */
  readonly contents: SemesterContents;
  readonly createdAt: Instant;
}

/** Cuánto guarda un semestre. Es el resumen que se lee en la lista y en el aviso de cierre. */
export interface SemesterContents {
  readonly subjects: number;
  readonly blocks: number;
  readonly absences: number;
  readonly agendaItems: number;
}

/**
 * Lo que se le explica al estudiante ANTES de pedirle que confirme el cierre (FR-038).
 *
 * Lo compone el servidor y no cada cliente: es el único sitio donde se sabe de verdad cuánto
 * se va a archivar, y que los dos clientes cuenten por su cuenta es exactamente cómo
 * acabarían diciendo cifras distintas sobre la misma operación.
 */
export interface SemesterCloseEffect {
  /** El semestre que se cerraría, con su contenido contado. */
  readonly semester: Semester;
  /**
   * Nombre propuesto para el que arranca, derivado del actual: de "2026-1" sale "2026-2".
   *
   * Es una propuesta editable, no una imposición: el estudiante nombra su semestre como
   * quiera y la convención del plantel no siempre es numérica.
   */
  readonly suggestedName: string;
}

/**
 * Resultado de cerrar un semestre y abrir el siguiente (FR-034, FR-035).
 *
 * Se devuelven los dos porque la pantalla necesita ambos: confirmar qué quedó archivado y
 * mostrar el nuevo, que arranca vacío.
 */
export interface SemesterCloseResult {
  readonly archived: Semester;
  readonly started: Semester;
}
