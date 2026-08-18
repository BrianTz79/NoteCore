import { z } from 'zod';
import { entityIdSchema, requiredString } from './common.js';
import { AGENDA_KINDS } from '../types/agenda.js';
import { calendarDateSchema } from './attendance.js';

/**
 * Validaciones de la agenda (FR-018 a FR-022).
 *
 * Principio II: la API valida con estos esquemas en el servidor —esa es la validación que
 * cuenta—. Web y app los reutilizan para dar feedback inmediato en los formularios.
 */

/** Título de la actividad. Es lo único obligatorio: sin él no hay nada que recordar. */
export const agendaTitleSchema = requiredString('el título')
  .trim()
  .min(1, 'El título no puede estar vacío')
  .max(120, 'El título no puede pasar de 120 caracteres');

/**
 * Descripción. Opcional y con espacio para detalles: los requisitos de un proyecto no caben
 * en un título.
 */
export const agendaDescriptionSchema = z
  .string()
  .trim()
  .max(2000, 'La descripción no puede pasar de 2000 caracteres')
  .nullish()
  // Cadena vacía y "sin descripción" son lo mismo; se guarda `null` para no tener dos formas
  // de representar la ausencia.
  .transform((value) => (value === undefined || value === '' ? null : value));

export const agendaKindSchema = z.enum(AGENDA_KINDS);

/**
 * Materia asociada. Opcional por FR-018: "renovar la credencial" no cuelga de ninguna.
 *
 * `null` y ausente significan lo mismo —sin materia—, así que se normalizan a `null`.
 */
export const agendaSubjectSchema = entityIdSchema
  .nullish()
  .transform((value) => value ?? null);

/**
 * Fecha límite. Opcional por FR-018: "leer el capítulo 4" puede no tener entrega.
 *
 * No se rechazan las fechas pasadas: el estudiante puede estar anotando algo que ya se le
 * pasó, justo para no olvidarlo. La lista lo marcará como vencido, que es la señal útil.
 */
export const agendaDueDateSchema = calendarDateSchema
  .nullish()
  .transform((value) => value ?? null);

/**
 * Alta de una actividad (FR-018).
 *
 * Solo el título es obligatorio. La alta rápida de la app —anotar la tarea durante la clase—
 * depende de que todo lo demás pueda omitirse.
 */
export const createAgendaItemSchema = z.object({
  /**
   * Identificador propuesto por el cliente (FR-049).
   *
   * Opcional: la web y cualquier alta con conexión lo omiten y el servidor genera el suyo,
   * igual que antes de la Fase 9. Lo manda la app cuando la actividad nace sin conexión,
   * porque entonces necesita un identificador **antes** de que el servidor exista para ella:
   * es lo que permite completarla o editarla acto seguido y que esas operaciones se encolen
   * ya apuntando al identificador definitivo.
   *
   * Su segundo efecto es hacer idempotente la creación: si la respuesta se pierde con la
   * fila ya escrita —la señal que cae a mitad—, el reintento manda el mismo identificador y
   * el servidor reconoce lo que ya guardó en vez de crear una actividad repetida.
   */
  id: entityIdSchema.optional(),
  title: agendaTitleSchema,
  description: agendaDescriptionSchema,
  kind: agendaKindSchema.default('tarea'),
  subjectId: agendaSubjectSchema,
  dueDate: agendaDueDateSchema,
});

/** Lo que valida el servidor: `kind` y los opcionales ya resueltos. */
export type CreateAgendaItemParsed = z.infer<typeof createAgendaItemSchema>;

/**
 * Lo que manda el cliente: solo el título es obligatorio.
 *
 * Se toma la **entrada** del esquema y no la salida por lo mismo que en el control de
 * faltas: con el tipo de salida, `kind`, `subjectId` y `dueDate` saldrían obligatorios y la
 * alta rápida tendría que mandarlos todos.
 */
export type CreateAgendaItemInput = z.input<typeof createAgendaItemSchema>;

/**
 * Edición de una actividad (FR-019: **todos** los campos son editables).
 *
 * Cada campo es opcional de verdad —sin el `.nullish()` que los vuelve `null`—, para poder
 * distinguir "no lo mandes" de "déjalo vacío". Es la misma corrección que necesitó
 * `updateAbsenceSchema` en la Fase 3: con la transformación aplicada, un `PATCH {}` habría
 * pasado el filtro de "algo que actualizar" y habría borrado la descripción, la materia y la
 * fecha límite de golpe.
 *
 * `null` en `description`, `subjectId` o `dueDate` sí los vacía: es como se desasocia una
 * materia o se quita una fecha que ya no aplica.
 */
export const updateAgendaItemSchema = z
  .object({
    title: agendaTitleSchema.optional(),
    description: z
      .string()
      .trim()
      .max(2000, 'La descripción no puede pasar de 2000 caracteres')
      .nullable()
      .optional()
      .transform((value) => (value === '' ? null : value)),
    kind: agendaKindSchema.optional(),
    subjectId: entityIdSchema.nullable().optional(),
    dueDate: calendarDateSchema.nullable().optional(),
    /** Completar y reabrir (FR-020). Se conserva el registro en ambos sentidos. */
    completed: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.kind !== undefined ||
      data.subjectId !== undefined ||
      data.dueDate !== undefined ||
      data.completed !== undefined,
    { message: 'No hay nada que actualizar' },
  );

/** Lo que **valida** el servidor: los campos ya transformados. */
export type UpdateAgendaItemParsed = z.infer<typeof updateAgendaItemSchema>;

/**
 * Lo que **manda** el cliente, antes de validar.
 *
 * Es el tipo que usan `web` y `mobile`: completar una actividad manda solo `completed`, sin
 * repetir el título ni la descripción que ya tenía.
 */
export type UpdateAgendaItemInput = z.input<typeof updateAgendaItemSchema>;

/**
 * Filtros de la lista de agenda.
 *
 * Todos opcionales: la vista por defecto es la agenda entera. `includeCompleted` está en
 * `true` por defecto porque FR-020 exige conservar el registro y la pantalla las muestra en
 * su propia sección; la app las omite cuando solo quiere pintar los pendientes.
 */
export const agendaQuerySchema = z.object({
  subjectId: entityIdSchema.optional(),
  kind: agendaKindSchema.optional(),
  includeCompleted: z.boolean().default(true),
});

export type AgendaQueryParsed = z.infer<typeof agendaQuerySchema>;
export type AgendaQuery = z.input<typeof agendaQuerySchema>;
