import { z } from 'zod';
import { requiredString } from './common.js';
import { SEMESTER_NAME_MAX_LENGTH } from '../types/semester.js';

/**
 * Validaciones de los semestres (FR-034 a FR-038).
 *
 * Principio II: la API valida con estos esquemas en el servidor —esa es la validación que
 * cuenta—. Web y app los reutilizan para dar feedback inmediato.
 */

/**
 * Nombre de un semestre.
 *
 * No se restringe a `AAAA-N` aunque sea la convención del TecNM: el estudiante etiqueta su
 * semestre como le sirva —"Quinto", "2026-2 verano"— y rechazar eso solo estorbaría. Lo único
 * que importa es que no esté vacío y quepa en pantalla.
 */
export const semesterNameSchema = requiredString('el nombre del semestre')
  .trim()
  .min(1, 'El nombre no puede estar vacío')
  .max(
    SEMESTER_NAME_MAX_LENGTH,
    `El nombre no puede pasar de ${SEMESTER_NAME_MAX_LENGTH} caracteres`,
  );

/**
 * Cierre del semestre en curso y apertura del siguiente (FR-034).
 *
 * Es una sola operación y no dos porque siempre hay exactamente un semestre activo: cerrar
 * sin abrir dejaría la cuenta sin sitio donde escribir, y el estudiante se encontraría con
 * que no puede capturar nada.
 *
 * No hay opción de copiar el horario: el semestre nuevo arranca vacío y se captura o se
 * importa con el flujo de la Fase 2.
 */
export const closeSemesterSchema = z.object({
  /** Nombre del que arranca. El cliente lo precarga con `suggestNextSemesterName`. */
  name: semesterNameSchema,
  /**
   * Confirmación explícita de que se leyó el efecto del cierre (FR-038).
   *
   * Es un campo del cuerpo y no solo un diálogo del cliente porque la explicación previa es
   * un requisito, no una cortesía de la interfaz: sin esto, cualquier cliente —o un `curl`
   * mal copiado— archivaría un semestre entero con una petición suelta.
   */
  confirmed: z.literal(true, {
    error: 'Confirma que entiendes lo que pasa al cerrar el semestre',
  }),
});

export type CloseSemesterInput = z.input<typeof closeSemesterSchema>;
export type CloseSemesterParsed = z.infer<typeof closeSemesterSchema>;

/** Renombrar el semestre en curso. Solo el activo: el archivado no se toca (FR-037). */
export const renameSemesterSchema = z.object({
  name: semesterNameSchema,
});

export type RenameSemesterInput = z.input<typeof renameSemesterSchema>;
