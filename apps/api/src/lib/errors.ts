import type { FastifyReply } from 'fastify';
import {
  MESSAGING_BLOCKED_MESSAGES,
  SEMESTER_ARCHIVED_MESSAGE,
  SHARE_UNAVAILABLE_MESSAGES,
  type ApiErrorCode,
  type FieldError,
  type MessagingBlockedReason,
  type ShareUnavailableReason,
} from '@notecore/shared';

/**
 * Errores de la API con el formato único que consumen web y app.
 *
 * Principio VIII: el contrato (`ApiErrorCode`, `FieldError`) está en `shared`; aquí solo
 * vive la maquinaria para producirlo desde Fastify.
 */

export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly fields: readonly FieldError[];

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    fields: readonly FieldError[] = [],
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

export const errors = {
  validacion: (message: string, fields: readonly FieldError[] = []) =>
    new AppError('validacion', message, 400, fields),

  credencialesInvalidas: () =>
    new AppError('credenciales_invalidas', 'Correo o contraseña incorrectos.', 401),

  noAutenticado: () =>
    new AppError('no_autenticado', 'Inicia sesión para continuar.', 401),

  sesionExpirada: () =>
    new AppError('sesion_expirada', 'Tu sesión caducó. Vuelve a iniciar sesión.', 401),

  emailEnUso: () =>
    new AppError('email_en_uso', 'Ese correo ya tiene una cuenta.', 409, [
      { field: 'email', message: 'Ese correo ya tiene una cuenta' },
    ]),

  usuarioEnUso: () =>
    new AppError('usuario_en_uso', 'Ese nombre de usuario ya está tomado.', 409, [
      { field: 'username', message: 'Ese nombre de usuario ya está tomado' },
    ]),

  noEncontrado: (message = 'No se encontró lo que buscas.') =>
    new AppError('no_encontrado', message, 404),

  /**
   * Un compartido que no se puede aceptar (FR-033).
   *
   * El motivo viaja en `fields` bajo la clave `code` para que el cliente lo lea sin analizar
   * el texto: revocado y caducado llevan al receptor a acciones distintas, y "no encontrado"
   * significa que probablemente tecleó mal.
   *
   * El estado es 404 en los tres casos: desde fuera, un compartido revocado o caducado es
   * indistinguible de uno que nunca existió, y devolver 410 solo para el caducado confirmaría
   * a quien pruebe códigos al azar que ese sí era válido.
   */
  compartidoNoDisponible: (reason: ShareUnavailableReason) =>
    new AppError('compartido_no_disponible', SHARE_UNAVAILABLE_MESSAGES[reason], 404, [
      { field: 'code', message: SHARE_UNAVAILABLE_MESSAGES[reason] },
    ]),

  /**
   * Se intentó modificar algo de un semestre archivado (FR-037).
   *
   * 409 y no 403: no es una cuestión de permisos —el semestre es del propio usuario— sino de
   * estado. El recurso existe y es suyo; lo que no procede es escribir en él.
   *
   * El mensaje sale de `shared` para que la app y la web expliquen lo mismo que ya escriben
   * en sus propias pantallas de solo lectura.
   */
  semestreArchivado: () =>
    new AppError('semestre_archivado', SEMESTER_ARCHIVED_MESSAGE, 409),

  /**
   * Se intentó escribir a quien no se puede (FR-044).
   *
   * **403 y no 400**: el mensaje está bien formado, lo que falta es el permiso. Tampoco 404,
   * porque la persona existe y el cliente lo sabe —viene de su propia lista de contactos o de
   * un perfil que acaba de ver—.
   *
   * El motivo viaja en `fields` bajo `relacion` para que el cliente lo lea sin analizar el
   * texto, igual que el de un compartido no disponible: esperar, agregar y desbloquear son
   * tres acciones distintas.
   *
   * El mensaje sale de `shared`, así que es **el mismo** que la pantalla ya pinta cuando el
   * servidor le dijo de antemano que no se podía escribir. Si difirieran, el usuario leería
   * una explicación al abrir el hilo y otra al intentar enviar.
   */
  mensajeNoPermitido: (reason: MessagingBlockedReason) =>
    new AppError('mensaje_no_permitido', MESSAGING_BLOCKED_MESSAGES[reason], 403, [
      { field: 'relacion', message: reason },
    ]),

  demasiadosIntentos: () =>
    new AppError(
      'demasiados_intentos',
      'Demasiados intentos. Espera un momento antes de volver a probar.',
      429,
    ),
} as const;

/**
 * `true` si el error es una violación de restricción única de PostgreSQL (23505).
 *
 * Mira también en `cause`, y ahí está el motivo de que exista esta función: Drizzle envuelve
 * el error del driver en un `DrizzleQueryError` propio, así que `error.code` viene
 * **`undefined`** y el `23505` queda un nivel más abajo. Comprobar solo el nivel superior
 * hace que el `catch` no reconozca la colisión y la deje escapar como 500 —que es justo lo
 * que ocurría al enviar dos solicitudes de contacto simultáneas—.
 *
 * `constraint` acota la comprobación a una restricción concreta: sin ella, un `catch`
 * pensado para una colisión de código trataría igual la de cualquier otra columna.
 */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const candidates = [error, (error as { cause?: unknown })?.cause];

  return candidates.some((candidate) => {
    if (typeof candidate !== 'object' || candidate === null) return false;
    const pg = candidate as { code?: unknown; constraint_name?: unknown };
    if (pg.code !== '23505') return false;
    return constraint === undefined || pg.constraint_name === constraint;
  });
}

/** Escribe un `AppError` en la respuesta con el formato del contrato. */
export function sendError(reply: FastifyReply, error: AppError): FastifyReply {
  return reply.code(error.status).send({
    error: {
      code: error.code,
      message: error.message,
      ...(error.fields.length > 0 ? { fields: error.fields } : {}),
    },
  });
}
