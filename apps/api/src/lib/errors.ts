import type { FastifyReply } from 'fastify';
import type { ApiErrorCode, FieldError } from '@notecore/shared';

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

  demasiadosIntentos: () =>
    new AppError(
      'demasiados_intentos',
      'Demasiados intentos. Espera un momento antes de volver a probar.',
      429,
    ),
} as const;

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
