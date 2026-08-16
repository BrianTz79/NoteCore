/**
 * Tipos de dominio comunes a las tres capas.
 *
 * Principio VIII: estos tipos se definen UNA sola vez aquí y se consumen desde
 * `api`, `web` y `mobile`. Nunca los redefinas por cliente.
 */

/** Identificador único de cualquier entidad del dominio. */
export type EntityId = string;

/** Campos de auditoría que acompañan a toda entidad persistida. */
export interface Timestamps {
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Toda entidad pertenece a un usuario (Principio III: aislamiento de datos).
 * El servidor deriva `userId` del token de sesión — nunca del cliente.
 */
export interface OwnedByUser {
  readonly userId: EntityId;
}

/** Días de la semana con clase, tal como se almacenan en el horario. */
export const WEEKDAYS = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

/** Respuesta de la comprobación de salud de la API. */
export interface HealthStatus {
  readonly status: 'ok' | 'degraded';
  readonly service: string;
  readonly version: string;
  readonly database: 'up' | 'down';
  readonly timestamp: string;
}
