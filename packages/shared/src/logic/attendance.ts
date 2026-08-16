/**
 * Regla del límite de faltas.
 *
 * Principio II: esta regla vive aquí y en la API — nunca se reimplementa en web ni en mobile.
 * Principio VII: el resultado es SIEMPRE una sugerencia editable por el estudiante.
 */

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
