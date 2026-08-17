import { z } from 'zod';
import { calendarDateSchema } from './attendance.js';
// La hora del aviso se valida con el mismo esquema que las horas del horario: además de
// comprobar la forma, normaliza `7:00` y `07:00:00` a `HH:MM`, que es como se guarda.
import { clockTimeSchema } from './schedule.js';
import { REMINDER_LEAD_DAYS } from '../types/calendar.js';
import { MAX_CALENDAR_RANGE_DAYS } from '../logic/calendar.js';
import { daysBetween } from '../logic/agenda.js';
import { isCalendarDate } from '../logic/dates.js';

/**
 * Validaciones del calendario y los recordatorios (FR-023 a FR-027).
 *
 * Principio II: la API valida con estos esquemas en el servidor —esa es la validación que
 * cuenta—. Web y app los reutilizan para dar feedback inmediato.
 */

/**
 * Rango del calendario (FR-023).
 *
 * Ambos extremos son obligatorios: la vista siempre sabe qué mes está pintando, y dejar el
 * rango abierto obligaría al servidor a decidir un valor por defecto que ningún cliente
 * pediría de verdad.
 *
 * El tope de días evita que una petición pida diez años y construya miles de días en memoria.
 *
 * Las dos comprobaciones se hacen sobre **texto** (`<=` entre `YYYY-MM-DD`) y solo la del
 * tope construye fechas, protegida por `isCalendarDate`. Es deliberado: Zod ejecuta las
 * comprobaciones de nivel superior aunque las de los campos ya hayan fallado, así que con
 * `from=2026-02-31` —forma correcta, día inexistente— `daysBetween` recibía una fecha que
 * `calendarDateSchema` acababa de rechazar, y su `RangeError` salía de la validación como un
 * 500 "error inesperado" en lugar del mensaje de campo que el cliente necesita pintar.
 */
export const calendarRangeQuerySchema = z
  .object({
    from: calendarDateSchema,
    to: calendarDateSchema,
  })
  .refine((data) => data.from <= data.to, {
    message: 'La fecha inicial debe ser anterior a la final',
    path: ['from'],
  })
  .refine(
    (data) =>
      // Si alguna fecha no es real, esta comprobación no aplica: el error correcto ya lo
      // emitió el campo, y calcular sobre ella solo produciría una excepción.
      !isCalendarDate(data.from) ||
      !isCalendarDate(data.to) ||
      daysBetween(data.from, data.to) < MAX_CALENDAR_RANGE_DAYS,
    {
      message: `El rango no puede pasar de ${MAX_CALENDAR_RANGE_DAYS} días`,
      path: ['to'],
    },
  );

export type CalendarRangeQuery = z.infer<typeof calendarRangeQuerySchema>;

/**
 * Días de anticipación del recordatorio (FR-025).
 *
 * Conjunto cerrado en lugar de número libre: son las anticipaciones que se usan de verdad, y
 * así la app las ofrece como botones en vez de pedir que se escriba un número.
 *
 * `z.literal` sobre cada valor y no `z.enum`: los valores son números, no cadenas.
 */
export const reminderLeadDaysSchema = z.union(
  REMINDER_LEAD_DAYS.map((days) => z.literal(days)) as [
    z.ZodLiteral<0>,
    z.ZodLiteral<1>,
    ...z.ZodLiteral<(typeof REMINDER_LEAD_DAYS)[number]>[],
  ],
  { error: 'Esa anticipación no está disponible' },
);

/**
 * Ajustes de recordatorios (FR-025).
 *
 * Todos los campos son opcionales: la pantalla cambia una cosa a la vez —activar el aviso, o
 * mover la hora— y obligar a reenviar el resto haría que dos pestañas abiertas se pisaran los
 * ajustes mutuamente.
 */
export const updateReminderSettingsSchema = z
  .object({
    enabled: z.boolean().optional(),
    leadDays: reminderLeadDaysSchema.optional(),
    timeOfDay: clockTimeSchema.optional(),
  })
  .refine(
    (data) =>
      data.enabled !== undefined ||
      data.leadDays !== undefined ||
      data.timeOfDay !== undefined,
    { message: 'No hay nada que actualizar' },
  );

/** Lo que **valida** el servidor: la hora ya normalizada a `HH:MM`. */
export type UpdateReminderSettingsParsed = z.infer<typeof updateReminderSettingsSchema>;

/**
 * Lo que **manda** el cliente, antes de validar.
 *
 * Se toma la entrada y no la salida por lo mismo que en las fases 3 y 4: `clockTimeSchema`
 * lleva un `transform`, así que con el tipo de salida la hora que acepta el cliente sería la
 * ya normalizada, y un selector que ofrezca `7:00` no compilaría.
 */
export type UpdateReminderSettingsInput = z.input<typeof updateReminderSettingsSchema>;
