import { z } from 'zod';
import { entityIdSchema } from './common.js';
import {
  REPORT_DETAIL_MAX_LENGTH,
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_TARGETS,
} from '../types/moderation.js';

/**
 * Validaciones de los reportes de contenido (Fase 21).
 *
 * Principio II: la API valida con estos esquemas en el servidor —esa es la validación que
 * cuenta—. Web y app los reutilizan para no dejar enviar un formulario incompleto.
 */

/**
 * Lo que manda quien reporta.
 *
 * El **autor no viaja**, aunque la pantalla lo tenga delante: lo resuelve el servidor a
 * partir del contenido señalado. Principio III llevado a su conclusión —si el cliente
 * mandara a quién acusa, bastaría con cambiar ese campo para levantar reportes contra
 * cualquiera—.
 */
export const createReportSchema = z.object({
  target: z.enum(REPORT_TARGETS, { error: 'Eso no se puede reportar' }),
  targetId: entityIdSchema,
  reason: z.enum(REPORT_REASONS, { error: 'Ese motivo no existe' }),
  /**
   * La explicación, opcional.
   *
   * Opcional a propósito: exigirla convierte reportar en redactar, y el reporte que más
   * importa —el de quien está incómodo ahora mismo— es justo el que no se va a escribir si
   * hay que rellenar un campo. Con el motivo basta para que llegue clasificado.
   *
   * Vacío se guarda como `null`, con el mismo criterio que los campos del perfil de la Fase
   * 8: «no escribí nada» y «escribí una cadena vacía» no son cosas distintas para nadie.
   */
  detail: z
    .string({ error: 'La explicación debe ser texto' })
    .trim()
    .max(
      REPORT_DETAIL_MAX_LENGTH,
      `La explicación no puede pasar de ${REPORT_DETAIL_MAX_LENGTH} caracteres`,
    )
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional(),
});

/** Lo que **manda** el cliente, antes de validar. */
export type CreateReportInput = z.input<typeof createReportSchema>;
/** Lo que **valida** el servidor, con el vacío ya convertido a `null`. */
export type CreateReportParsed = z.infer<typeof createReportSchema>;

/**
 * Cambio de estado de un reporte, desde el panel.
 *
 * No admite `pendiente`: volver a marcar algo como sin revisar después de haberlo mirado no
 * es una acción que quiera nadie, y ofrecerla solo da una forma de perder de vista lo que ya
 * se resolvió.
 */
export const reviewReportSchema = z.object({
  status: z.enum(
    REPORT_STATUSES.filter((estado) => estado !== 'pendiente') as ['revisado', 'descartado'],
    { error: 'Ese estado no existe' },
  ),
});

export type ReviewReportInput = z.infer<typeof reviewReportSchema>;

/**
 * Filtro de la lista del panel.
 *
 * Por defecto trae **todo** y no solo lo pendiente: la lista completa es la que responde a
 * «¿qué ha pasado aquí?», que es la pregunta con la que se abre el panel. Ver solo lo
 * pendiente es un caso concreto y se pide explícitamente.
 */
export const reportQuerySchema = z.object({
  status: z.enum(REPORT_STATUSES).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .default(50),
});

export type ReportQueryInput = z.input<typeof reportQuerySchema>;
export type ReportQueryParsed = z.infer<typeof reportQuerySchema>;
