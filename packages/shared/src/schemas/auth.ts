import { z } from 'zod';
import { SESSION_CLIENTS } from '../types/auth.js';
import { displayNameSchema, emailSchema, requiredString, usernameSchema } from './common.js';

/**
 * Validaciones de registro, login y perfil.
 *
 * Principio II: la API valida con estos esquemas en el servidor —esa es la validación que
 * cuenta—. Web y app los reutilizan solo para dar feedback inmediato en los formularios.
 */

/**
 * Contraseña. El mínimo de 8 caracteres sigue la recomendación del NIST, que prefiere
 * longitud a reglas de composición: exigir símbolos empuja a contraseñas cortas y
 * predecibles. El máximo evita que un cuerpo enorme cueste CPU al hashear.
 */
export const passwordSchema = requiredString('la contraseña')
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(128, 'La contraseña no puede pasar de 128 caracteres');

export const sessionClientSchema = z.enum(SESSION_CLIENTS);

export const registerSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  displayName: displayNameSchema,
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Login por correo. En la contraseña no se aplica `trim`: los espacios al inicio o al
 * final son parte de la contraseña que el usuario eligió.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: requiredString('la contraseña').min(1, 'Escribe tu contraseña'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Actualización de perfil. Al menos un campo debe venir. */
export const updateProfileSchema = z
  .object({
    displayName: displayNameSchema.optional(),
    username: usernameSchema.optional(),
  })
  .refine((data) => data.displayName !== undefined || data.username !== undefined, {
    message: 'No hay nada que actualizar',
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: requiredString('la contraseña actual').min(1, 'Escribe tu contraseña actual'),
  newPassword: passwordSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * Cuerpo de la renovación. La app manda el refresh token explícitamente; la web no lo
 * incluye porque viaja en su cookie `httpOnly`.
 */
export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export type RefreshInput = z.infer<typeof refreshSchema>;
