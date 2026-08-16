import { z } from 'zod';
import { requiredString, weekdaySchema } from './common.js';
import { IMPORT_MODES } from '../types/schedule.js';
import { minutesOfDay, normalizeClockTime } from '../logic/schedule.js';

/**
 * Validaciones del horario.
 *
 * Principio II: la API valida con estos esquemas en el servidor —esa es la validación que
 * cuenta—. Web y app los reutilizan para dar feedback inmediato en los formularios.
 */

/** Nombre de la materia. */
export const subjectNameSchema = requiredString('el nombre de la materia')
  .trim()
  .min(1, 'El nombre de la materia no puede estar vacío')
  .max(80, 'El nombre no puede pasar de 80 caracteres');

/** Aula. Opcional: no todo horario la indica. */
export const roomSchema = z
  .string()
  .trim()
  .max(30, 'El aula no puede pasar de 30 caracteres')
  .nullish()
  // Una cadena vacía y "sin aula" son lo mismo; se guarda `null` para no tener dos formas
  // de representar la ausencia.
  .transform((value) => (value === undefined || value === '' ? null : value));

/** Color en formato `#rrggbb`. Se acepta cualquiera, no solo los de la paleta. */
export const subjectColorSchema = requiredString('el color')
  .trim()
  .toLowerCase()
  .regex(/^#[0-9a-f]{6}$/, 'El color debe ser un valor hexadecimal como #6366f1');

/**
 * Hora de reloj `HH:MM`.
 *
 * Normaliza antes de validar, así que `7:00` se acepta y se guarda como `07:00`. Sin esto,
 * la misma hora escrita de dos formas produciría dos valores distintos en la base de datos.
 */
export const clockTimeSchema = z
  .string({ error: 'Falta la hora' })
  .transform((value, ctx) => {
    const normalized = normalizeClockTime(value);
    if (normalized === null) {
      ctx.addIssue({ code: 'custom', message: 'La hora debe tener el formato HH:MM' });
      return z.NEVER;
    }
    return normalized;
  });

/**
 * Una sesión de clase.
 *
 * La hora de fin debe ser posterior a la de inicio: una clase de 10:00 a 09:00 no existe,
 * y sin esta comprobación se pintaría como un bloque de altura negativa en la rejilla.
 */
export const scheduleBlockInputSchema = z
  .object({
    weekday: weekdaySchema,
    startTime: clockTimeSchema,
    endTime: clockTimeSchema,
    room: roomSchema,
  })
  .refine((block) => minutesOfDay(block.endTime) > minutesOfDay(block.startTime), {
    message: 'La hora de fin debe ser posterior a la de inicio',
    path: ['endTime'],
  });

export type ScheduleBlockInput = z.infer<typeof scheduleBlockInputSchema>;

/**
 * Alta de materia con sus sesiones.
 *
 * El color es opcional: si no viene, la API asigna el siguiente de la paleta para que dos
 * materias creadas seguidas no salgan iguales (FR-010).
 */
export const createSubjectSchema = z.object({
  name: subjectNameSchema,
  color: subjectColorSchema.optional(),
  blocks: z
    .array(scheduleBlockInputSchema)
    .max(20, 'Una materia no puede tener más de 20 sesiones a la semana')
    .default([]),
});

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;

/**
 * Edición de materia. Al menos un campo debe venir.
 *
 * Cuando `blocks` viene, sustituye por completo a las sesiones anteriores: es más simple de
 * razonar que un parcheo por sesión, y es lo que hace el formulario de ambos clientes.
 */
export const updateSubjectSchema = z
  .object({
    name: subjectNameSchema.optional(),
    color: subjectColorSchema.optional(),
    blocks: z
      .array(scheduleBlockInputSchema)
      .max(20, 'Una materia no puede tener más de 20 sesiones a la semana')
      .optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined || data.color !== undefined || data.blocks !== undefined,
    { message: 'No hay nada que actualizar' },
  );

export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;

/**
 * Cuerpo del análisis previo de una importación (FR-007, FR-008).
 *
 * Llega el texto en crudo, no un JSON ya parseado: así la API puede explicar con precisión
 * por qué un pegado no es válido —"esto no es JSON"— en lugar de que el cliente falle solo
 * y muestre un error genérico. El límite de tamaño evita que un pegado enorme cueste CPU.
 */
export const importPreviewSchema = z.object({
  raw: requiredString('el contenido a importar')
    .min(1, 'Pega el JSON que generó la IA')
    .max(100_000, 'El contenido es demasiado largo para ser un horario'),
});

export type ImportPreviewInput = z.infer<typeof importPreviewSchema>;

export const importModeSchema = z.enum(IMPORT_MODES);

/**
 * Confirmación de la importación.
 *
 * Vuelve a mandar el texto en crudo en lugar de un identificador de vista previa: no hace
 * falta guardar estado en el servidor entre los dos pasos, y el resultado es el mismo
 * porque el análisis es determinista.
 */
export const importConfirmSchema = importPreviewSchema.extend({
  mode: importModeSchema,
});

export type ImportConfirmInput = z.infer<typeof importConfirmSchema>;
