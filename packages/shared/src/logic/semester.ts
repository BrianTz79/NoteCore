/**
 * Reglas de los semestres (FR-034 a FR-038).
 *
 * Principio II: la API decide con estas mismas funciones. Los clientes las usan para
 * presentar —el resumen del cierre, el nombre propuesto, si algo es editable— nunca para
 * decidir por su cuenta si un semestre acepta escritura: eso lo verifica el servidor.
 */

import type {
  Semester,
  SemesterContents,
  SemesterKind,
  SemesterStatus,
} from '../types/semester.js';
import { SEMESTER_KIND_LABELS } from '../types/semester.js';
import type { SemesterKindLabel } from '../types/semester.js';
import { parseDate } from '../types/auth.js';
import type { CalendarDate } from '../types/attendance.js';

/**
 * Cómo se nombra un periodo en la interfaz: "semestre" o "cuatrimestre".
 *
 * Es el atajo que usan las pantallas en lugar de indexar `SEMESTER_KIND_LABELS` a mano, y el
 * motivo de que exista es que las dos lo llamen igual. Con `undefined` cae en semestre, que
 * es el tipo por defecto: sirve para las pantallas que pintan antes de tener el periodo
 * cargado.
 */
export function semesterKindLabel(kind: SemesterKind | undefined): SemesterKindLabel {
  return SEMESTER_KIND_LABELS[kind ?? 'semestre'];
}

/**
 * Cuántos periodos entran en un año según el tipo.
 *
 * Dos semestres o tres cuatrimestres. Es lo que decide en qué punto la numeración `AAAA-N`
 * da la vuelta al año.
 */
export function periodsPerYear(kind: SemesterKind): number {
  return kind === 'cuatrimestre' ? 3 : 2;
}

/**
 * Nombre por defecto del primer periodo de una cuenta.
 *
 * Se deriva del año y del mes porque es lo que el estudiante reconoce: en el TecNM el
 * periodo de agosto a diciembre es el "2", y el de enero a junio el "1". El corte se pone en
 * julio, que es el intersemestral.
 *
 * En un régimen cuatrimestral el año se parte en tres —enero-abril, mayo-agosto,
 * septiembre-diciembre—, así que el mes se reparte en tercios en lugar de mitades.
 *
 * `month` llega de 1 a 12, no de 0 a 11: esta función recibe componentes de calendario, no
 * el resultado de `Date.getMonth()`.
 */
export function defaultSemesterName(
  year: number,
  month: number,
  kind: SemesterKind = 'semestre',
): string {
  if (kind === 'cuatrimestre') {
    // 1-4 → "1", 5-8 → "2", 9-12 → "3".
    return `${year}-${Math.min(3, Math.floor((month - 1) / 4) + 1)}`;
  }
  return `${year}-${month >= 7 ? 2 : 1}`;
}

/**
 * Propone el nombre del periodo siguiente a partir del actual (FR-034).
 *
 * Reconoce la convención `AAAA-N` porque es la del TecNM y la que el estudiante habrá
 * tecleado si dejó el nombre por defecto: de "2026-1" sale "2026-2", y del último periodo del
 * año sale "AAAA+1-1" —cierra el año, así que el siguiente arranca el año que viene—. Cuántos
 * periodos tiene el año lo decide el tipo: dos si es semestral, tres si es cuatrimestral, y
 * por eso la propuesta sale del periodo que se cierra y no de una regla única.
 *
 * Con cualquier otro nombre se devuelve tal cual y que el estudiante lo edite. Se prefiere
 * eso a inventar una regla: "Quinto semestre" tendría que convertirse en "Sexto", y una tabla
 * de ordinales en español fallaría en cuanto alguien escriba "5º" o "Quinto A". Es una
 * propuesta editable, no un dato que deba acertar.
 */
export function suggestNextSemesterName(
  current: string,
  kind: SemesterKind = 'semestre',
): string {
  const total = periodsPerYear(kind);
  const match = /^(\d{4})-(\d)$/.exec(current.trim());
  if (!match) return current.trim();

  const year = Number(match[1]);
  const period = Number(match[2]);

  // Un número fuera del rango del tipo —un "2026-3" en un semestre— no es la convención que
  // esta función reconoce: se devuelve tal cual, como cualquier otro nombre libre.
  if (period < 1 || period > total) return current.trim();

  return period === total ? `${year + 1}-1` : `${year}-${period + 1}`;
}

/**
 * `true` si el semestre acepta modificaciones (FR-037).
 *
 * Los clientes la usan para no ofrecer botones que el servidor va a rechazar; la protección
 * de verdad está en la API, que la comprueba en cada escritura (Principio II). Ofrecer el
 * botón y fallar después sería peor que no ofrecerlo: el estudiante creería haber editado su
 * historial.
 */
export function isSemesterEditable(semester: { readonly status: SemesterStatus }): boolean {
  return semester.status === 'activo';
}

/** Total de elementos de un semestre. Cero significa que no llegó a usarse. */
export function semesterContentsTotal(contents: SemesterContents): number {
  return (
    contents.subjects + contents.blocks + contents.absences + contents.agendaItems
  );
}

/**
 * Resumen legible de lo que guarda un semestre.
 *
 * Vive aquí y no en cada cliente porque es el texto del aviso de cierre (FR-038) y el de la
 * lista de archivados: justo el detalle que se corregiría en la web y se olvidaría en la app,
 * y entonces la misma operación se explicaría distinto según el dispositivo.
 *
 * Se omite lo que está a cero en lugar de escribir "0 faltas": un semestre sin faltas es una
 * buena noticia y enumerarla como si faltara algo confunde.
 */
export function semesterContentsSummary(contents: SemesterContents): string {
  const parts: string[] = [];

  if (contents.subjects > 0) {
    parts.push(contents.subjects === 1 ? '1 materia' : `${contents.subjects} materias`);
  }
  if (contents.absences > 0) {
    parts.push(contents.absences === 1 ? '1 falta' : `${contents.absences} faltas`);
  }
  if (contents.agendaItems > 0) {
    parts.push(
      contents.agendaItems === 1 ? '1 actividad' : `${contents.agendaItems} actividades`,
    );
  }

  return parts.length === 0 ? 'Sin contenido' : parts.join(' · ');
}

/**
 * Lo que se le explica al estudiante antes de confirmar el cierre (FR-038).
 *
 * Es una lista y no un párrafo porque cada línea es una consecuencia distinta, y la tercera
 * —que no podrá editarlo— es la que de verdad tiene que leer antes de pulsar. Escribirlo aquí
 * garantiza que la app y la web adviertan exactamente lo mismo: una advertencia que difiera
 * entre clientes es una advertencia en la que no se puede confiar.
 */
export function semesterCloseWarnings(
  semesterName: string,
  contents: SemesterContents,
  /**
   * Tipo del periodo que **arranca**, que es el único que aparece en el texto.
   *
   * Los tres primeros avisos hablan del que se archiva sin nombrar su tipo —el nombre propio
   * ya está entre comillas y decir «el cuatrimestre «2026-2»» sobra—; el cuarto sí, porque
   * anuncia lo que viene, y al cerrar se puede cambiar de régimen.
   */
  nextKind: SemesterKind = 'semestre',
): readonly string[] {
  return [
    `«${semesterName}» se archivará íntegro: ${semesterContentsSummary(contents)}.`,
    'Podrás consultarlo siempre, en modo lectura.',
    'No podrás editarlo, ni volver a marcar faltas ni actividades en él.',
    `${SEMESTER_KIND_LABELS[nextKind].titulo} nuevo: empieza vacío, captura tu horario o ` +
      'impórtalo como siempre.',
  ];
}

/**
 * Aviso corto que acompaña al botón de cerrar, para que nadie lo pulse por inercia.
 *
 * Se nombra el tipo del periodo que se cierra: a quien cursa un cuatrimestre, advertirle
 * sobre "cerrar un semestre" le habla de algo que no está cursando.
 */
export function semesterCloseDisclaimer(kind: SemesterKind = 'semestre'): string {
  return (
    `Cerrar ${SEMESTER_KIND_LABELS[kind].conArticulo} no borra nada, pero no se puede ` +
    'deshacer: lo archivado queda en solo lectura para siempre.'
  );
}

/**
 * Aviso corto de cierre para un semestre.
 *
 * Se mantiene como constante además de la función porque hay pantallas que lo muestran sin
 * un periodo concreto delante, y porque el semestre sigue siendo el tipo por defecto.
 */
export const SEMESTER_CLOSE_DISCLAIMER = semesterCloseDisclaimer('semestre');

/** Mensaje que se muestra al intentar tocar algo de un periodo archivado (FR-037). */
export function semesterArchivedMessage(kind: SemesterKind = 'semestre'): string {
  return `Este ${SEMESTER_KIND_LABELS[kind].singular} está archivado. No se puede modificar.`;
}

/** El mismo mensaje para un semestre, que es el caso por defecto. */
export const SEMESTER_ARCHIVED_MESSAGE = semesterArchivedMessage('semestre');

/**
 * Ordena los semestres para la lista: el activo primero, y los archivados del más reciente
 * al más antiguo.
 *
 * El activo va arriba porque es donde el estudiante trabaja; entre los archivados, el último
 * cerrado es el que más se consulta.
 */
export function sortSemesters(semesters: readonly Semester[]): readonly Semester[] {
  return [...semesters].sort((a, b) => {
    const rank = (semester: Semester) => (semester.status === 'activo' ? 0 : 1);
    const byStatus = rank(a) - rank(b);
    if (byStatus !== 0) return byStatus;
    return parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime();
  });
}

/**
 * Periodo que cubrió un semestre, para la cabecera del archivado: "17 ago 2026 — 15 dic 2026".
 *
 * El activo no tiene cierre, así que se marca como en curso en lugar de dejar el guion
 * colgando.
 */
export function semesterPeriod(
  startedAt: CalendarDate,
  closedAt: CalendarDate | null,
): string {
  const format = (value: CalendarDate) => {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  };

  return closedAt === null
    ? `Desde el ${format(startedAt)}`
    : `${format(startedAt)} — ${format(closedAt)}`;
}
