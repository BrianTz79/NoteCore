import type { z } from 'zod';
import type { FieldError } from '@notecore/shared';
import { errors } from './errors.js';

/**
 * Valida el cuerpo de una petición con un esquema de `shared`.
 *
 * Principio II: esta es la validación que cuenta. Los clientes validan también, pero solo
 * para dar feedback inmediato; el servidor nunca da por bueno lo que recibe.
 */
export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  /**
   * Una petición sin cuerpo se valida como objeto vacío.
   *
   * El analizador de contenido entrega `undefined` cuando no vino nada, y Zod respondería a
   * eso con "expected object, received undefined" —en inglés y sin decir qué falta—. Con
   * `{}` el error vuelve a ser el de los campos obligatorios, que es lo que el formulario
   * necesita pintar. Los esquemas de edición siguen rechazándolo con "no hay nada que
   * actualizar", que también es correcto.
   */
  const result = schema.safeParse(body === undefined ? {} : body);

  if (result.success) return result.data;

  const fields: FieldError[] = result.error.issues.map((issue) => ({
    field: issue.path.join('.') || '_',
    message: issue.message,
  }));

  // El mensaje general es el del primer campo: suele ser el más útil para mostrar arriba
  // del formulario, y los `fields` permiten marcar cada entrada por separado.
  throw errors.validacion(fields[0]?.message ?? 'Revisa los datos enviados.', fields);
}
