import { z } from 'zod';
import { WEEKDAYS } from '../types/common.js';

/**
 * Validaciones compartidas.
 *
 * Principio VIII: se definen aquí una sola vez. La API valida con ellas en el servidor
 * (fuente de verdad) y los clientes las reutilizan para dar feedback inmediato en formularios.
 */

export const entityIdSchema = z.string().uuid({ message: 'Identificador inválido' });

export const weekdaySchema = z.enum(WEEKDAYS);

/**
 * Nombre de usuario público (`@usuario`). Se normaliza a minúsculas para que la unicidad
 * no dependa de mayúsculas.
 */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'El nombre de usuario debe tener al menos 3 caracteres')
  .max(20, 'El nombre de usuario no puede pasar de 20 caracteres')
  .regex(
    /^[a-z0-9_]+$/,
    'Solo se permiten letras minúsculas, números y guion bajo',
  );

/** Nombre mostrado, visible para otros usuarios. */
export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'El nombre no puede estar vacío')
  .max(60, 'El nombre no puede pasar de 60 caracteres');

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Correo electrónico inválido');

export const healthStatusSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  service: z.string(),
  version: z.string(),
  database: z.enum(['up', 'down']),
  timestamp: z.string(),
});
