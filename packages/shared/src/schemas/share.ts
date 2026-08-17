import { z } from 'zod';
import { entityIdSchema, requiredString } from './common.js';
import { SHARE_ACCEPT_MODES, SHARE_CODE_LENGTH, SHARE_KINDS } from '../types/share.js';
import { normalizeShareCode } from '../logic/share.js';

/**
 * Validaciones de la compartición (FR-028 a FR-033).
 *
 * Principio II: la API valida con estos esquemas en el servidor —esa es la validación que
 * cuenta—. Web y app los reutilizan para dar feedback inmediato en los formularios.
 */

export const shareKindSchema = z.enum(SHARE_KINDS);

/**
 * Código corto tal como llega del receptor.
 *
 * Normaliza antes de validar —igual que `clockTimeSchema` con las horas— porque el código se
 * teclea a mano desde un mensaje o al dictado: `abcd-1234` y `ABCD1234` son el mismo código,
 * y sin normalizar el primero daría "no encontrado" en lugar de funcionar.
 */
export const shareCodeSchema = requiredString('el código').transform((value, ctx) => {
  const normalized = normalizeShareCode(value);
  if (normalized === null) {
    ctx.addIssue({
      code: 'custom',
      message: `El código debe tener ${SHARE_CODE_LENGTH} caracteres`,
    });
    return z.NEVER;
  }
  return normalized;
});

/** Título con el que el emisor reconoce su compartido en la lista. */
export const shareTitleSchema = requiredString('el título')
  .trim()
  .min(1, 'Ponle un título para reconocerlo después')
  .max(80, 'El título no puede pasar de 80 caracteres');

/**
 * Generación de un compartido (FR-028, FR-029).
 *
 * `subjectIds` e `itemIds` son las dos formas de "qué incluye" que exige FR-029, y cuál
 * aplica lo decide `kind`. Se piden identificadores y no el contenido: el servidor lee de la
 * base de datos lo que el usuario seleccionó y congela **eso**, en lugar de confiar en un
 * contenido que el cliente podría haber alterado (Principio II).
 *
 * La comprobación cruzada va aquí y no en el servicio para que el error salga como error de
 * campo —el cliente lo pinta junto a la selección— en lugar de como un fallo genérico.
 */
export const createShareSchema = z
  .object({
    kind: shareKindSchema,
    title: shareTitleSchema,
    /** Materias a incluir cuando `kind` es `horario`. */
    subjectIds: z
      .array(entityIdSchema)
      .max(50, 'No puedes compartir más de 50 materias a la vez')
      .optional(),
    /** Actividades a incluir cuando `kind` es `agenda`. */
    itemIds: z
      .array(entityIdSchema)
      .max(200, 'No puedes compartir más de 200 actividades a la vez')
      .optional(),
  })
  .refine(
    (data) =>
      data.kind !== 'horario' || (data.subjectIds !== undefined && data.subjectIds.length > 0),
    { message: 'Elige al menos una materia para compartir', path: ['subjectIds'] },
  )
  .refine(
    (data) => data.kind !== 'agenda' || (data.itemIds !== undefined && data.itemIds.length > 0),
    { message: 'Elige al menos una actividad para compartir', path: ['itemIds'] },
  );

export type CreateShareInput = z.infer<typeof createShareSchema>;

export const shareAcceptModeSchema = z.enum(SHARE_ACCEPT_MODES);

/**
 * Aceptación de un compartido (FR-031).
 *
 * El modo solo aplica al horario —una agenda siempre se suma a la que ya hay, porque
 * reemplazarla borraría tareas propias que nada tienen que ver con lo recibido—, así que
 * tiene valor por defecto y el cliente de agenda puede omitirlo.
 */
export const acceptShareSchema = z.object({
  mode: shareAcceptModeSchema.default('añadir'),
});

/** Lo que **valida** el servidor: con el modo ya resuelto. */
export type AcceptShareParsed = z.infer<typeof acceptShareSchema>;

/**
 * Lo que **manda** el cliente, antes de validar.
 *
 * Se toma la entrada y no la salida por lo mismo que en las fases 3 a 5: `default` hace que
 * el tipo de salida marque `mode` como obligatorio, y entonces aceptar una agenda —donde el
 * modo no aplica— no compilaría sin repetirlo.
 */
export type AcceptShareInput = z.input<typeof acceptShareSchema>;
