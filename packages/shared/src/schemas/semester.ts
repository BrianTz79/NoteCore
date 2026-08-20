import { z } from 'zod';
import { requiredString } from './common.js';
import { SEMESTER_KINDS, SEMESTER_NAME_MAX_LENGTH } from '../types/semester.js';
import { MAX_SEMESTER_WEEKS, MIN_SEMESTER_WEEKS } from '../logic/attendance.js';

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
/**
 * Tipo de periodo: semestre o cuatrimestre (Fase 18).
 *
 * Se valida contra la lista de `shared` y no contra un texto libre porque de este valor sale
 * cómo se nombra el periodo en las tres capas: un tipo desconocido dejaría a las pantallas
 * sin etiqueta que mostrar.
 */
export const semesterKindSchema = z.enum(SEMESTER_KINDS, {
  error: 'Elige si es un semestre o un cuatrimestre',
});

/**
 * Semanas de clase de un periodo, base del límite de faltas sugerido (FR-013).
 *
 * Siempre editable, sea semestre o cuatrimestre: el calendario real varía por plantel, y esa
 * es la razón por la que este número nunca fue una constante cerrada.
 */
export const semesterWeeksSchema = z
  .number({ error: 'Faltan las semanas' })
  .int('Las semanas deben ser un número entero')
  .min(MIN_SEMESTER_WEEKS, `El periodo debe tener al menos ${MIN_SEMESTER_WEEKS} semana`)
  .max(MAX_SEMESTER_WEEKS, `El periodo no puede pasar de ${MAX_SEMESTER_WEEKS} semanas`);

export const closeSemesterSchema = z.object({
  /** Nombre del que arranca. El cliente lo precarga con `suggestNextSemesterName`. */
  name: semesterNameSchema,
  /**
   * Tipo del que arranca. Opcional: si no viene, hereda el del que se cierra.
   *
   * Se puede cambiar aquí porque cerrar un periodo es justo el momento en que alguien pasa de
   * un régimen a otro —cambio de escuela o de plan—, y obligarle a corregirlo después sería
   * pedirle que arregle a mano lo que el cierre ya sabía.
   */
  kind: semesterKindSchema.optional(),
  /** Semanas del que arranca. Si no viene, las que su tipo trae por defecto. */
  weeks: semesterWeeksSchema.optional(),
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

/**
 * Editar el periodo en curso: su nombre, su tipo y sus semanas.
 *
 * Solo el activo: el archivado no se toca en nada (FR-037). Los tres campos son opcionales
 * porque las pantallas los editan por separado —el nombre en la lista, las semanas en el
 * panel de faltas— y mandar los tres en cada cambio obligaría a cada cliente a conocer el
 * valor actual de los otros dos.
 *
 * Cambiar el tipo de un periodo activo no toca sus semanas: alguien que corrige la etiqueta
 * puede tener ya sus semanas ajustadas a mano, y sobrescribirlas con el valor por defecto del
 * tipo le borraría el ajuste sin avisar.
 */
export const renameSemesterSchema = z.object({
  name: semesterNameSchema.optional(),
  kind: semesterKindSchema.optional(),
  weeks: semesterWeeksSchema.optional(),
});

export type RenameSemesterInput = z.input<typeof renameSemesterSchema>;
export type RenameSemesterParsed = z.infer<typeof renameSemesterSchema>;
