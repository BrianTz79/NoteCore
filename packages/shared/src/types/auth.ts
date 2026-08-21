/**
 * Tipos de cuenta y sesión.
 *
 * Principio VIII: definidos UNA vez aquí y consumidos por `api`, `web` y `mobile`.
 * Principio III: `PublicUser` es el único perfil que la API devuelve del usuario
 * autenticado; nunca incluye el hash de la contraseña.
 */

import type { EntityId } from './common.js';

/**
 * Marca de tiempo tal como la ven los clientes.
 *
 * En la API es un `Date`; al viajar por HTTP se serializa a texto ISO y llega como
 * `string`. El tipo admite ambas formas para no mentir sobre lo que recibe cada capa;
 * `parseDate` la normaliza donde haga falta formatearla.
 */
export type Instant = Date | string;

/** Convierte a `Date` una marca de tiempo venga como venga. */
export function parseDate(value: Instant): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Perfil del propio usuario autenticado. */
export interface AuthenticatedUser {
  readonly id: EntityId;
  readonly email: string;
  readonly username: string;
  readonly displayName: string;
  /**
   * Si esta cuenta ve el panel de operación (Fase 25).
   *
   * Está aquí para que la web sepa si pintar el enlace, y **para nada más**: quien ponga esto
   * a `true` en las herramientas del navegador verá aparecer un enlace que lleva a un 404,
   * porque la autorización la decide el servidor en cada petición (`requireAdmin`). Es
   * comodidad de interfaz, no una medida de seguridad — igual que `RequireSession`.
   *
   * No aparece en `PublicUser`: quién administra el servicio no es asunto de los demás.
   */
  readonly isAdmin: boolean;
  readonly createdAt: Instant;
  readonly updatedAt: Instant;
}

/**
 * Perfil visible por terceros (FR-045).
 *
 * Deliberadamente sin correo ni fechas: lo que la Fase 8 podrá mostrar en una búsqueda
 * o en un perfil ajeno. Se define ya para que ninguna respuesta futura filtre de más.
 */
export interface PublicUser {
  readonly id: EntityId;
  readonly username: string;
  readonly displayName: string;
}

/**
 * Clientes que pueden abrir sesión. Se guarda con cada sesión para que el usuario
 * distinga sus dispositivos y pueda cerrar uno sin tumbar el otro (FR-002).
 */
export const SESSION_CLIENTS = ['web', 'mobile'] as const;
export type SessionClient = (typeof SESSION_CLIENTS)[number];

/** Sesión activa, tal como se le presenta al usuario en su perfil. */
export interface SessionInfo {
  readonly id: EntityId;
  readonly client: SessionClient;
  readonly createdAt: Instant;
  readonly lastUsedAt: Instant;
  readonly expiresAt: Instant;
  /** `true` si es la sesión desde la que se hizo la petición. */
  readonly isCurrent: boolean;
}

/**
 * Respuesta de registro y de login.
 *
 * El `refreshToken` solo viaja en el cuerpo para la app (que lo guarda en almacenamiento
 * seguro). En web ambos tokens van en cookies `httpOnly` y este campo se omite.
 */
export interface AuthResult {
  readonly user: AuthenticatedUser;
  readonly accessToken: string;
  readonly refreshToken?: string;
  /** Segundos de vida del token de acceso, para que el cliente lo renueve a tiempo. */
  readonly expiresIn: number;
}

/** Contenido del token de acceso. El servidor nunca confía en otra fuente para el usuario. */
export interface AccessTokenPayload {
  /** `subject`: identificador del usuario. */
  readonly sub: EntityId;
  /** Sesión a la que pertenece el token, para poder revocarla de forma individual. */
  readonly sid: EntityId;
  readonly client: SessionClient;
}
