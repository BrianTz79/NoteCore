import { z } from 'zod';
import { requiredString, usernameSchema } from './common.js';
import {
  AGE_MAX,
  AGE_MIN,
  BIO_MAX_LENGTH,
  POST_MAX_LENGTH,
  PROFILE_VISIBILITIES,
} from '../types/social.js';

/**
 * Validaciones de la sección social (FR-039 a FR-042, FR-045).
 *
 * Principio II: la API valida con estos esquemas en el servidor —esa es la validación que
 * cuenta—. Web y app los reutilizan para dar feedback inmediato en los formularios.
 */

/**
 * Un campo opcional del perfil que se puede **vaciar**.
 *
 * El detalle que resuelve: el usuario que borra su biografía manda `""`, y eso debe guardar
 * `null` —"no puse nada"— y no una cadena vacía. Tener dos formas de decir lo mismo obliga a
 * cada pantalla a comprobar las dos, y basta que una lo olvide para que pinte un renglón en
 * blanco donde otra no pinta nada.
 *
 * `undefined` se mantiene distinto de `null` a propósito: significa "no mandes este campo",
 * que es lo que permite editar la biografía sin reenviar la carrera.
 */
function optionalText(campo: string, max: number) {
  return z
    .string({ error: `${campo} debe ser texto` })
    .trim()
    .max(max, `${campo} no puede pasar de ${max} caracteres`)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional();
}

export const bioSchema = optionalText('La biografía', BIO_MAX_LENGTH);
export const careerSchema = optionalText('La carrera', 80);
export const schoolSchema = optionalText('La escuela', 80);

/**
 * Edad, cuando el usuario decide ponerla.
 *
 * El mínimo de 13 no es decorativo: es la edad por debajo de la cual un servicio con perfil
 * público y contactos entra en terreno de protección de menores (COPPA y equivalentes), y
 * este producto es para universitarios. El máximo solo descarta lo que es un error de
 * tecleo.
 */
export const ageSchema = z
  .number({ error: 'La edad debe ser un número' })
  .int('La edad debe ser un número entero')
  .min(AGE_MIN, `La edad debe ser de al menos ${AGE_MIN} años`)
  .max(AGE_MAX, `La edad no puede pasar de ${AGE_MAX} años`)
  .nullable()
  .optional();

export const profileVisibilitySchema = z.enum(PROFILE_VISIBILITIES);

/**
 * Edición del perfil ampliado (FR-045).
 *
 * Todos los campos son opcionales porque todos lo son en el perfil, pero al menos uno debe
 * venir: un `PATCH` vacío no es una edición, y aceptarlo silenciosamente haría creer al
 * usuario que guardó algo.
 *
 * No incluye `displayName` ni `username`: esos ya los edita `updateProfileSchema` de la Fase
 * 1, y duplicarlos aquí daría dos caminos para cambiar lo mismo —que es como acaban
 * divergiendo en sus validaciones—.
 */
export const updateSocialProfileSchema = z
  .object({
    bio: bioSchema,
    career: careerSchema,
    school: schoolSchema,
    age: ageSchema,
    visibility: profileVisibilitySchema.optional(),
  })
  .refine(
    (data) =>
      data.bio !== undefined ||
      data.career !== undefined ||
      data.school !== undefined ||
      data.age !== undefined ||
      data.visibility !== undefined,
    { message: 'No hay nada que actualizar' },
  );

/** Lo que **manda** el cliente, antes de validar. */
export type UpdateSocialProfileInput = z.input<typeof updateSocialProfileSchema>;
/** Lo que **valida** el servidor, con los vacíos ya convertidos a `null`. */
export type UpdateSocialProfileParsed = z.infer<typeof updateSocialProfileSchema>;

/**
 * Búsqueda de usuarios por `@usuario` (FR-039).
 *
 * Acepta un enlace de perfil completo además del nombre, porque la gente copia la URL entera
 * del navegador: `usernameFromProfileInput` lo resuelve en el cliente antes de llegar aquí, y
 * este esquema admite lo que quede.
 *
 * El mínimo de 2 caracteres evita que una búsqueda vacía o de una letra devuelva media base
 * de datos —que no le sirve a nadie y sí cuesta—.
 */
export const userSearchSchema = z.object({
  q: requiredString('el texto de búsqueda')
    .trim()
    .min(2, 'Escribe al menos 2 caracteres para buscar')
    .max(30, 'La búsqueda no puede pasar de 30 caracteres'),
});

export type UserSearchInput = z.infer<typeof userSearchSchema>;

/**
 * Envío de una solicitud de contacto (FR-040, FR-041).
 *
 * Se identifica al destinatario por `@usuario` y no por identificador: es lo que el usuario
 * tiene delante —de la búsqueda, del enlace o del QR—, y los tres caminos de FR-040
 * desembocan así en la misma llamada en lugar de tener uno por modalidad.
 */
export const contactRequestSchema = z.object({
  username: usernameSchema,
});

export type ContactRequestInput = z.infer<typeof contactRequestSchema>;

/**
 * Las respuestas posibles a una relación existente (FR-041, FR-042).
 *
 * Van como una acción en el cuerpo y no como rutas distintas porque todas operan sobre la
 * misma fila y se excluyen entre sí. El servidor comprueba que la acción corresponda al
 * estado real: `contactActions` decide, y una acción que no esté permitida se rechaza aunque
 * el cliente la haya ofrecido.
 */
export const CONTACT_ACTIONS = [
  'aceptar',
  'rechazar',
  'cancelar',
  'eliminar',
  'bloquear',
  'desbloquear',
] as const;
export type ContactActionName = (typeof CONTACT_ACTIONS)[number];

export const contactActionSchema = z.object({
  action: z.enum(CONTACT_ACTIONS, { error: 'Esa acción no existe' }),
});

export type ContactActionInput = z.infer<typeof contactActionSchema>;

/**
 * Texto de una publicación.
 *
 * Se exige contenido de verdad: una publicación de solo espacios no es una publicación, y
 * dejarla pasar llenaría el muro de renglones vacíos que no se pueden distinguir de un fallo
 * de pintado.
 */
export const postTextSchema = requiredString('el texto')
  .trim()
  .min(1, 'Escribe algo para publicar')
  .max(POST_MAX_LENGTH, `La publicación no puede pasar de ${POST_MAX_LENGTH} caracteres`);

export const createPostSchema = z.object({
  text: postTextSchema,
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
