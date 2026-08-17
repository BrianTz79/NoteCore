/**
 * Reglas de los semestres (FR-034 a FR-038).
 *
 * Principio II: la API decide con estas mismas funciones. Los clientes las usan para
 * presentar —el resumen del cierre, el nombre propuesto, si algo es editable— nunca para
 * decidir por su cuenta si un semestre acepta escritura: eso lo verifica el servidor.
 */

import type { Semester, SemesterContents, SemesterStatus } from '../types/semester.js';
import { parseDate } from '../types/auth.js';
import type { CalendarDate } from '../types/attendance.js';

/**
 * Nombre por defecto del primer semestre de una cuenta.
 *
 * Se deriva del año y del mes porque es lo que el estudiante reconoce: en el TecNM el
 * periodo de agosto a diciembre es el "2", y el de enero a junio el "1". El corte se pone en
 * julio, que es el intersemestral.
 *
 * `month` llega de 1 a 12, no de 0 a 11: esta función recibe componentes de calendario, no
 * el resultado de `Date.getMonth()`.
 */
export function defaultSemesterName(year: number, month: number): string {
  return `${year}-${month >= 7 ? 2 : 1}`;
}

/**
 * Propone el nombre del semestre siguiente a partir del actual (FR-034).
 *
 * Reconoce la convención `AAAA-N` porque es la del TecNM y la que el estudiante habrá
 * tecleado si dejó el nombre por defecto: de "2026-1" sale "2026-2", y de "2026-2" sale
 * "2027-1" —el segundo periodo cierra el año, así que el siguiente arranca el año que viene—.
 *
 * Con cualquier otro nombre se devuelve tal cual y que el estudiante lo edite. Se prefiere
 * eso a inventar una regla: "Quinto semestre" tendría que convertirse en "Sexto", y una tabla
 * de ordinales en español fallaría en cuanto alguien escriba "5º" o "Quinto A". Es una
 * propuesta editable, no un dato que deba acertar.
 */
export function suggestNextSemesterName(current: string): string {
  const match = /^(\d{4})-([12])$/.exec(current.trim());
  if (!match) return current.trim();

  const year = Number(match[1]);
  const period = Number(match[2]);

  return period === 1 ? `${year}-2` : `${year + 1}-1`;
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
): readonly string[] {
  return [
    `«${semesterName}» se archivará íntegro: ${semesterContentsSummary(contents)}.`,
    'Podrás consultarlo siempre, en modo lectura.',
    'No podrás editarlo, ni volver a marcar faltas ni actividades en él.',
    'El semestre nuevo empieza vacío: captura tu horario o impórtalo como siempre.',
  ];
}

/** Aviso corto que acompaña al botón de cerrar, para que nadie lo pulse por inercia. */
export const SEMESTER_CLOSE_DISCLAIMER =
  'Cerrar un semestre no borra nada, pero no se puede deshacer: lo archivado queda en ' +
  'solo lectura para siempre.';

/** Mensaje que se muestra al intentar tocar algo de un semestre archivado (FR-037). */
export const SEMESTER_ARCHIVED_MESSAGE =
  'Este semestre está archivado. No se puede modificar.';

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
