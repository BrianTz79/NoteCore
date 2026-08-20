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
import { COLOR } from '../design/tokens.js';

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
  activo: COLOR.exito,
  archivado: COLOR.tinta3,
};

/**
 * Tipo de periodo académico (Fase 18).
 *
 * El semestre es el principal y el que viene por defecto; el cuatrimestre es la alternativa
 * para quien cursa periodos de cuatro meses.
 *
 * El tipo vive en el **periodo** y no en la cuenta, y esa es la decisión que sostiene el
 * resto: si fuera un ajuste del usuario —"yo estudio por cuatrimestres"—, cambiarlo
 * reetiquetaría también el historial ya cerrado, y un periodo archivado se cerró bajo el
 * régimen que tenía. Con el tipo en el periodo, quien cambia de plan o de escuela conserva
 * sus semestres antiguos como semestres (Principio VI).
 */
export const SEMESTER_KINDS = ['semestre', 'cuatrimestre'] as const;
export type SemesterKind = (typeof SEMESTER_KINDS)[number];

/** El tipo que se propone al crear un periodo si nadie elige otro. */
export const DEFAULT_SEMESTER_KIND: SemesterKind = 'semestre';

/**
 * Cómo se nombra cada tipo de periodo en la interfaz.
 *
 * Sale de aquí por lo mismo que `SEMESTER_STATUS_LABELS`: si «semestre» y «cuatrimestre» se
 * escribieran sueltas en cada pantalla, la web y la app acabarían diciendo cosas distintas
 * del mismo periodo. En singular, en plural, y con artículo para las frases que lo piden.
 *
 * El modelo sigue diciendo `semester` —la base de datos, las rutas y los tipos—: el
 * vocabulario cambia en la interfaz, no en el esquema. Renombrar a un término neutro sería
 * más coherente sobre el papel, pero es una migración sobre datos que ya están en producción
 * y que toca los tres clientes, a cambio de cero diferencia para quien usa el producto.
 */
export interface SemesterKindLabel {
  /** "semestre" / "cuatrimestre". Para frases: "Semanas del {singular}". */
  readonly singular: string;
  /** "semestres" / "cuatrimestres". */
  readonly plural: string;
  /** "el semestre" / "el cuatrimestre". */
  readonly conArticulo: string;
  /** Con la inicial en mayúscula, para títulos: "Semestre en curso". */
  readonly titulo: string;
}

export const SEMESTER_KIND_LABELS: Readonly<Record<SemesterKind, SemesterKindLabel>> = {
  semestre: {
    singular: 'semestre',
    plural: 'semestres',
    conArticulo: 'el semestre',
    titulo: 'Semestre',
  },
  cuatrimestre: {
    singular: 'cuatrimestre',
    plural: 'cuatrimestres',
    conArticulo: 'el cuatrimestre',
    titulo: 'Cuatrimestre',
  },
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
  /**
   * Semestre o cuatrimestre (Fase 18). Decide cómo lo nombran las pantallas.
   *
   * Los periodos creados antes de la Fase 18 son `semestre`, y siguen siéndolo: la migración
   * que añadió el campo no los dejó en un valor vacío que las pantallas tuvieran que
   * adivinar (Principio VI).
   */
  readonly kind: SemesterKind;
  readonly status: SemesterStatus;
  /**
   * Semanas de clase de este periodo, base del límite de faltas sugerido (FR-013).
   *
   * Va en el periodo y no en la cuenta desde la Fase 18: con dos tipos conviviendo, un ajuste
   * global significaría que poner 12 semanas en el cuatrimestre nuevo recalcularía también el
   * límite del semestre archivado, y un periodo cerrado se cursó con las semanas que tenía.
   *
   * Es **editable** y lo sigue siendo, sea cual sea el tipo: el calendario real varía por
   * plantel, que es justo el motivo por el que las semanas fueron editables desde la Fase 3.
   */
  readonly weeks: number;
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
  /**
   * Tipo propuesto para el que arranca: el mismo que el que se cierra.
   *
   * Es una propuesta y no una herencia forzada —quien cambia de escuela puede pasar de
   * semestres a cuatrimestres—, pero lo habitual es seguir en el mismo régimen, y proponer
   * lo contrario obligaría a corregirlo en cada cierre.
   */
  readonly suggestedKind: SemesterKind;
  /** Semanas propuestas para el que arranca: las del tipo propuesto, editables. */
  readonly suggestedWeeks: number;
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
