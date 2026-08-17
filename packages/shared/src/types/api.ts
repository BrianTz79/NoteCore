/**
 * Contrato de errores de la API.
 *
 * Un solo formato para toda respuesta de error, para que web y app muestren mensajes
 * sin inventarse cada una su interpretación de los códigos HTTP.
 */

/** Códigos de error estables. La interfaz decide qué hacer a partir de ellos, no del texto. */
export const API_ERROR_CODES = [
  'validacion',
  'credenciales_invalidas',
  'no_autenticado',
  'sesion_expirada',
  'email_en_uso',
  'usuario_en_uso',
  'no_encontrado',
  'demasiados_intentos',
  /**
   * Un compartido que no se puede aceptar: revocado, caducado o inexistente (FR-033).
   *
   * Es un código propio y no `no_encontrado` porque el receptor necesita distinguir los tres
   * casos —pedir uno nuevo, o revisar el código que tecleó—, y porque un compartido revocado
   * sí existe. El motivo concreto viaja en `fields` bajo `code`.
   */
  'compartido_no_disponible',
  'error_interno',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** Detalle de un campo concreto que falló la validación, para marcarlo en el formulario. */
export interface FieldError {
  readonly field: string;
  readonly message: string;
}

export interface ApiErrorBody {
  readonly error: {
    readonly code: ApiErrorCode;
    /** Mensaje en español, listo para mostrarse al usuario. */
    readonly message: string;
    readonly fields?: readonly FieldError[];
  };
}
