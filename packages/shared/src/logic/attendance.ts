/**
 * Reglas del control de faltas (FR-011 a FR-017).
 *
 * Principio II: estas reglas viven aquí y en la API — nunca se reimplementan en web ni en
 * mobile.
 * Principio VII: el límite es SIEMPRE una sugerencia editable por el estudiante.
 */

import type { AbsenceStatus } from '../types/attendance.js';
import type { SemesterKind } from '../types/semester.js';
import { COLOR } from '../design/tokens.js';

/**
 * Asistencia mínima exigida por la norma TecNM. Por debajo de este porcentaje el profesor
 * registra NP (No Presentó).
 */
export const MIN_ATTENDANCE_RATE = 0.8;

/**
 * Proporción de sesiones que pueden faltarse antes de caer bajo el mínimo.
 *
 * Se escribe como literal en vez de calcularlo con `1 - MIN_ATTENDANCE_RATE`: esa resta
 * en coma flotante da 0.19999999999999996, y al multiplicarla por 80 sesiones el
 * `Math.floor` devolvía 15 faltas en lugar de 16.
 */
export const MAX_ABSENCE_RATE = 0.2;

export interface AbsenceLimit {
  /** Faltas sugeridas como límite. Redondeado hacia abajo: no se puede faltar "media" clase. */
  readonly suggested: number;
  /** Total de sesiones sobre el que se calculó. */
  readonly totalSessions: number;
  /** Siempre `true`: el límite se confirma con el profesor (Principio VII). */
  readonly isSuggestion: true;
}

/**
 * Calcula el límite de faltas sugerido: 20% de las sesiones del semestre.
 *
 * Se redondea hacia abajo porque superar el umbral, aunque sea por una fracción, ya incumple
 * el 80% de asistencia.
 *
 * @param totalSessions Sesiones totales de la materia en el semestre. Debe ser >= 0.
 */
export function calculateAbsenceLimit(totalSessions: number): AbsenceLimit {
  if (!Number.isFinite(totalSessions) || totalSessions < 0) {
    throw new RangeError(
      `totalSessions debe ser un número finito no negativo, se recibió: ${totalSessions}`,
    );
  }

  const sessions = Math.floor(totalSessions);

  // Se calcula con enteros (sessions * 20 / 100) en lugar de `sessions * 0.2`:
  // 0.2 no es representable de forma exacta en binario, y para 80 sesiones el
  // producto daba 15.999… que `Math.floor` truncaba a 15 en vez de 16.
  return {
    suggested: Math.floor((sessions * 20) / 100),
    totalSessions: sessions,
    isSuggestion: true,
  };
}

/** Texto que acompaña siempre al límite mostrado en la interfaz (Principio VII). */
export const ABSENCE_LIMIT_DISCLAIMER =
  'Este límite es una sugerencia basada en el 80% de asistencia mínima. ' +
  'Confírmalo con tu profesor: cada materia puede tener criterios distintos.';

/**
 * Semanas de clase de un semestre, por defecto.
 *
 * 16 semanas es la duración habitual de un semestre en el TecNM. Es un ajuste editable por
 * el usuario: el calendario real varía por plantel y por periodo.
 *
 * El total de sesiones se estima multiplicando las sesiones semanales del horario por este
 * número.
 */
export const DEFAULT_SEMESTER_WEEKS = 16;

/**
 * Semanas de clase de un cuatrimestre, por defecto (Fase 18).
 *
 * Doce son los cuatro meses de clase efectivos del régimen cuatrimestral. Como las del
 * semestre, es una propuesta **editable**: hay planteles que cursan cuatrimestres de quince
 * semanas, y esa variación es justo el motivo por el que este número nunca fue fijo.
 */
export const DEFAULT_QUARTER_WEEKS = 12;

/** Mínimo y máximo aceptados para las semanas del periodo, sea del tipo que sea. */
export const MIN_SEMESTER_WEEKS = 1;
export const MAX_SEMESTER_WEEKS = 52;

/**
 * Semanas que se proponen para un periodo nuevo, según su tipo.
 *
 * Vive junto al resto del cálculo de faltas y no en cada cliente porque es lo que decide el
 * límite sugerido: si la web propusiera 12 y la app 15, el mismo cuatrimestre arrancaría con
 * dos límites distintos según dónde se creara.
 */
export function defaultWeeksForKind(kind: SemesterKind): number {
  return kind === 'cuatrimestre' ? DEFAULT_QUARTER_WEEKS : DEFAULT_SEMESTER_WEEKS;
}

/**
 * Proporción del límite a partir de la cual se avisa al estudiante (FR-016).
 *
 * Al 80% del límite quedan aún faltas de margen, que es lo que hace útil el aviso: llegar
 * justo al límite ya no deja margen de reacción.
 *
 * No es el único disparador del aviso: `absenceStatus` avisa además cuando queda una sola
 * falta, porque con límites bajos el 80% cae entre dos enteros y no llegaría a activarse.
 */
export const ABSENCE_WARNING_RATE = 0.8;

/**
 * Sesiones totales de una materia en el semestre.
 *
 * Estimación: sesiones de una semana × semanas del semestre. Cuando la Fase 7 introduzca
 * las fechas reales, esta función se sustituye por el conteo del calendario y todo lo que
 * la consume sigue igual.
 */
export function estimateTotalSessions(
  sessionsPerWeek: number,
  semesterWeeks: number = DEFAULT_SEMESTER_WEEKS,
): number {
  if (!Number.isFinite(sessionsPerWeek) || sessionsPerWeek < 0) {
    throw new RangeError(
      `sessionsPerWeek debe ser un número finito no negativo, se recibió: ${sessionsPerWeek}`,
    );
  }
  if (!Number.isFinite(semesterWeeks) || semesterWeeks < 0) {
    throw new RangeError(
      `semesterWeeks debe ser un número finito no negativo, se recibió: ${semesterWeeks}`,
    );
  }

  return Math.floor(sessionsPerWeek) * Math.floor(semesterWeeks);
}

/**
 * Nivel de aviso de una materia según sus faltas y su límite (FR-016).
 *
 * Avisa al llegar al 80% del límite **o** cuando queda una sola falta de margen, lo que
 * ocurra antes. La segunda condición no es redundante: con el 80% a secas, un límite de 3
 * avisaría a las 2.4 faltas —es decir, nunca, porque las faltas son enteras— y el
 * estudiante pasaría de "vas bien" a "alcanzaste el límite" sin aviso intermedio. Eso
 * ocurre en todos los límites de 1 a 4, justo los de las materias de una sesión por semana,
 * donde cada falta pesa más.
 *
 * Con límite 0 —una materia sin sesiones, o un límite puesto a mano en cero— cualquier
 * falta se considera alcanzada y sin faltas se está en `bien`: no hay margen que avisar.
 */
export function absenceStatus(absences: number, limit: number): AbsenceStatus {
  if (absences >= limit) return limit === 0 && absences === 0 ? 'bien' : 'alcanzado';

  // Queda una sola falta antes del límite: se avisa siempre, sea cual sea el límite.
  if (limit - absences <= 1) return 'cerca';

  // Se compara con productos enteros en vez de `limit * 0.8`: el 0.8 en coma flotante
  // desplaza el umbral en los límites donde el 80% cae justo en un entero.
  return absences * 100 >= limit * ABSENCE_WARNING_RATE * 100 ? 'cerca' : 'bien';
}

/** Faltas que quedan antes de alcanzar el límite. Nunca negativo. */
export function remainingAbsences(absences: number, limit: number): number {
  return Math.max(0, limit - absences);
}

/** Texto del estado, igual en web y en app (Principio VIII). */
export const ABSENCE_STATUS_LABELS: Readonly<Record<AbsenceStatus, string>> = {
  bien: 'Vas bien',
  cerca: 'Te acercas al límite',
  alcanzado: 'Alcanzaste el límite',
};

/**
 * Color de cada estado, para que la señal visual sea la misma en web y en app.
 *
 * Se define aquí en vez de en cada cliente porque el color ES la alerta de FR-016: si web
 * pintara el aviso en ámbar y la app en rojo, la misma situación se leería distinto según
 * el dispositivo.
 */
export const ABSENCE_STATUS_COLORS: Readonly<Record<AbsenceStatus, string>> = {
  bien: COLOR.exito,
  cerca: COLOR.aviso,
  alcanzado: COLOR.error,
};

/**
 * Explicación del estado, con los números concretos delante.
 *
 * Vive aquí para que ambos clientes digan exactamente lo mismo ante la misma situación.
 */
export function absenceStatusMessage(status: AbsenceStatus, remaining: number): string {
  switch (status) {
    case 'alcanzado':
      return 'Llegaste al límite sugerido. Habla con tu profesor sobre tu situación.';
    case 'cerca':
      return remaining === 1
        ? 'Te queda 1 falta antes del límite sugerido.'
        : `Te quedan ${remaining} faltas antes del límite sugerido.`;
    case 'bien':
      return remaining === 1
        ? 'Te queda 1 falta de margen.'
        : `Te quedan ${remaining} faltas de margen.`;
  }
}
