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
  /**
   * Se intentó modificar algo de un semestre archivado (FR-037).
   *
   * Es un código propio y no `validacion` porque no hay nada que el usuario pueda corregir en
   * el formulario: el dato es correcto, lo que no procede es escribir ahí. El cliente lo usa
   * para explicar que está viendo historial —y ofrecer volver al semestre en curso— en lugar
   * de marcar un campo en rojo.
   */
  'semestre_archivado',
  /**
   * Se intentó escribir a alguien que no es contacto, o a quien uno bloqueó (FR-044).
   *
   * Es un código propio y no `validacion` porque el mensaje está bien: lo que falta es el
   * permiso para mandarlo, y no hay campo que corregir. El cliente lo usa para explicar la
   * situación y ofrecer la acción que corresponde —agregar, esperar o desbloquear— en lugar
   * de marcar el campo de texto en rojo.
   *
   * El motivo concreto viaja en `fields` bajo `relacion`, igual que el de un compartido no
   * disponible: cada uno lleva a una acción distinta.
   */
  'mensaje_no_permitido',
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
