import { z } from 'zod';
import { entityIdSchema } from './common.js';
import {
  MAX_SEMESTER_WEEKS,
  MIN_SEMESTER_WEEKS,
} from '../logic/attendance.js';
import { isCalendarDate } from '../logic/dates.js';

/**
 * Validaciones del control de faltas (FR-011 a FR-017).
 *
 * Principio II: la API valida con estos esquemas en el servidor —esa es la validación que
 * cuenta—. Web y app los reutilizan para dar feedback inmediato.
 */

/**
 * Fecha de calendario `YYYY-MM-DD`.
 *
 * Se valida con `isCalendarDate` y no con una expresión regular suelta porque esta además
 * descarta días que no existen: el 2026-02-31 tiene la forma correcta pero no es una fecha.
 */
export const calendarDateSchema = z
  .string({ error: 'Falta la fecha' })
  .trim()
  .refine(isCalendarDate, { message: 'La fecha debe tener el formato AAAA-MM-DD' });

/** Nota que acompaña a una falta. Opcional y corta: es un recordatorio, no un ensayo. */
export const absenceNoteSchema = z
  .string()
  .trim()
  .max(200, 'La nota no puede pasar de 200 caracteres')
  .nullish()
  // Cadena vacía y "sin nota" son lo mismo; se guarda `null` para no tener dos formas de
  // representar la ausencia.
  .transform((value) => (value === undefined || value === '' ? null : value));

/**
 * Registro de faltas de una fecha (FR-011).
 *
 * Llegan los identificadores de las sesiones a las que se faltó. El "día completo" no es un
 * modo aparte: el cliente manda todas las sesiones de ese día. Así el servidor guarda
 * siempre lo mismo —una falta por sesión— y el conteo de FR-012 no depende de cómo se
 * registró.
 */
export const markAbsencesSchema = z.object({
  date: calendarDateSchema,
  blockIds: z
    .array(entityIdSchema)
    .min(1, 'Selecciona al menos una clase')
    .max(20, 'Demasiadas clases en un solo día'),
  justified: z.boolean().default(false),
  note: absenceNoteSchema,
});

/** Lo que valida el servidor: `justified` y `note` ya resueltos por sus valores por defecto. */
export type MarkAbsencesParsed = z.infer<typeof markAbsencesSchema>;

/**
 * Lo que manda el cliente: `justified` y `note` son opcionales.
 *
 * Marcar una falta corriente es solo fecha y clases; el resto lo pone el esquema.
 */
export type MarkAbsencesInput = z.input<typeof markAbsencesSchema>;

/**
 * Edición de una falta ya registrada (FR-017).
 *
 * Sirve para justificarla o para cambiar su nota. Justificar no borra: el registro se
 * conserva y deja de contar para el límite.
 *
 * La comprobación de "algo que actualizar" mira las claves presentes en el cuerpo y no los
 * valores ya transformados: `absenceNoteSchema` convierte el `undefined` de una nota
 * ausente en `null` —para no tener dos formas de decir "sin nota"—, así que después de
 * transformar `note` nunca vale `undefined` y un cuerpo vacío pasaría el filtro. Sin esto,
 * un `PATCH {}` borraría la nota en lugar de rechazarse.
 */
export const updateAbsenceSchema = z
  .object({
    justified: z.boolean().optional(),
    /**
     * Aquí `note` es opcional de verdad —sin el `.nullish()` que la vuelve `null`—, para
     * poder distinguir "no la mandes" de "déjala vacía". `null` y `''` borran la nota;
     * ausente la deja como estaba.
     */
    note: z
      .string()
      .trim()
      .max(200, 'La nota no puede pasar de 200 caracteres')
      .nullable()
      .optional()
      .transform((value) => (value === '' ? null : value)),
  })
  .refine((data) => data.justified !== undefined || data.note !== undefined, {
    message: 'No hay nada que actualizar',
  });

/**
 * Lo que **valida** el servidor: los campos ya transformados.
 *
 * `z.infer` da la salida del esquema, donde `note` ya pasó por su `transform`.
 */
export type UpdateAbsenceParsed = z.infer<typeof updateAbsenceSchema>;

/**
 * Lo que **manda** el cliente, antes de validar.
 *
 * Es el tipo que usan `web` y `mobile` al llamar a la API: aquí `note` sigue siendo
 * opcional, así que justificar una falta no obliga a repetir la nota que ya tenía.
 */
export type UpdateAbsenceInput = z.input<typeof updateAbsenceSchema>;

/**
 * Límite de faltas de una materia (FR-015).
 *
 * `null` devuelve la materia a la sugerencia calculada: el usuario puede deshacer su
 * ajuste sin tener que recordar cuál era el número original.
 */
export const setAbsenceLimitSchema = z.object({
  limit: z
    .number({ error: 'Falta el límite' })
    .int('El límite debe ser un número entero')
    .min(0, 'El límite no puede ser negativo')
    .max(365, 'El límite es demasiado alto')
    .nullable(),
});

export type SetAbsenceLimitInput = z.infer<typeof setAbsenceLimitSchema>;

/**
 * Semanas del semestre, sobre las que se estiman las sesiones totales (FR-013).
 *
 * Es un ajuste del usuario porque el calendario real varía por plantel y por periodo. La
 * Fase 7 lo sustituirá por las fechas del semestre.
 */
export const setSemesterWeeksSchema = z.object({
  weeks: z
    .number({ error: 'Faltan las semanas' })
    .int('Las semanas deben ser un número entero')
    .min(MIN_SEMESTER_WEEKS, `El semestre debe tener al menos ${MIN_SEMESTER_WEEKS} semana`)
    .max(MAX_SEMESTER_WEEKS, `El semestre no puede pasar de ${MAX_SEMESTER_WEEKS} semanas`),
});

export type SetSemesterWeeksInput = z.infer<typeof setSemesterWeeksSchema>;

/** Consulta del historial de faltas, acotada por fechas. Ambos extremos son opcionales. */
export const absenceHistoryQuerySchema = z
  .object({
    from: calendarDateSchema.optional(),
    to: calendarDateSchema.optional(),
    subjectId: entityIdSchema.optional(),
  })
  .refine((data) => !data.from || !data.to || data.from <= data.to, {
    message: 'La fecha inicial debe ser anterior a la final',
    path: ['from'],
  });

export type AbsenceHistoryQuery = z.infer<typeof absenceHistoryQuerySchema>;
