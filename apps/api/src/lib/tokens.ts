import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { AccessTokenPayload, SessionClient } from '@notecore/shared';
import { config } from '../config.js';

/**
 * Emisión y verificación de tokens.
 *
 * Dos piezas distintas:
 * - **Access token**: JWT firmado, corto, sin estado. Se verifica con la firma, sin tocar
 *   la base de datos, para que cada petición sea barata.
 * - **Refresh token**: cadena aleatoria opaca, larga, con estado en la tabla `sessions`.
 *   No es un JWT a propósito: al vivir en base de datos se puede revocar de verdad.
 */

const ISSUER = 'notecore';

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: config.accessTokenSeconds,
    issuer: ISSUER,
  });
}

function decodeAccessToken(token: string, ignoreExpiration: boolean): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: ISSUER,
      ignoreExpiration,
    });

    if (typeof decoded !== 'object' || decoded === null) return null;

    const { sub, sid, client } = decoded as Record<string, unknown>;
    if (typeof sub !== 'string' || typeof sid !== 'string') return null;
    if (client !== 'web' && client !== 'mobile') return null;

    return { sub, sid, client: client satisfies SessionClient };
  } catch {
    return null;
  }
}

/** Verifica y decodifica un token de acceso. Devuelve `null` si no es válido o caducó. */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  return decodeAccessToken(token, false);
}

/**
 * Como `verifyAccessToken`, pero acepta un token caducado.
 *
 * Solo para cerrar sesión: si el usuario pulsa "salir" con el access token ya vencido, la
 * sesión debe borrarse igualmente. La firma se sigue verificando, así que un token
 * inventado no cierra la sesión de nadie; lo único que se ignora es la fecha de caducidad.
 */
export function verifyAccessTokenIgnoringExpiry(token: string): AccessTokenPayload | null {
  return decodeAccessToken(token, true);
}

/**
 * Genera un refresh token. 32 bytes aleatorios en base64url: imposible de adivinar y sin
 * información dentro, porque todo lo que hace falta saber está en la fila de `sessions`.
 */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Hash del refresh token para guardarlo.
 *
 * SHA-256 y no bcrypt: el token ya es aleatorio de 256 bits, así que no hay nada que
 * proteger contra fuerza bruta, y esto se ejecuta en cada renovación.
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
