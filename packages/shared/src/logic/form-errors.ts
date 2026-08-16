/**
 * Traducción de un error de la API a mensajes de formulario.
 *
 * Principio VIII: web y app muestran los mismos textos ante el mismo error, porque ambas
 * usan esta función en lugar de interpretar los códigos por su cuenta.
 */

import { ApiError } from '../api/client.js';

export interface FormErrors {
  /** Mensaje general, para mostrar sobre el formulario. */
  readonly general?: string;
  /** Mensaje por campo, para marcar la entrada correspondiente. */
  readonly fields: Readonly<Record<string, string>>;
}

/**
 * Reparte un error entre "general" y "por campo".
 *
 * Cuando el servidor señala campos concretos, el mensaje general se omite: repetir arriba
 * lo que ya está marcado debajo de cada campo es ruido.
 */
export function toFormErrors(error: unknown): FormErrors {
  if (!(error instanceof ApiError)) {
    return { general: 'Ocurrió un error inesperado. Inténtalo de nuevo.', fields: {} };
  }

  const fields: Record<string, string> = {};
  for (const field of error.fields) {
    fields[field.field] = field.message;
  }

  return Object.keys(fields).length > 0
    ? { fields }
    : { general: error.message, fields: {} };
}
