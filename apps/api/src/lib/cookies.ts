import type { CookieSerializeOptions } from '@fastify/cookie';
import type { FastifyReply } from 'fastify';
import { config } from '../config.js';
import { AUTH_ROUTES } from '@notecore/shared';

/**
 * Cookies de sesión para la web.
 *
 * La app no las usa: guarda los tokens en almacenamiento seguro y los manda por cabecera.
 */

export const ACCESS_TOKEN_COOKIE = 'notecore_access';
export const REFRESH_TOKEN_COOKIE = 'notecore_refresh';

function baseOptions(maxAgeSeconds: number): CookieSerializeOptions {
  return {
    // Inaccesible desde JavaScript: un XSS en la web no puede leer la sesión.
    httpOnly: true,
    // Solo por HTTPS en producción; en desarrollo hace falta permitir http://localhost.
    secure: config.isProduction,
    /**
     * `lax` bloquea el envío de la cookie en peticiones cruzadas que no sean navegación,
     * que es lo que necesita un CSRF. Con web y API bajo el mismo dominio, basta.
     */
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
    ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
  };
}

/** Escribe las dos cookies de sesión tras un registro, login o renovación. */
export function setAuthCookies(
  reply: FastifyReply,
  tokens: { accessToken: string; refreshToken: string },
): void {
  reply.setCookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, baseOptions(config.accessTokenSeconds));

  reply.setCookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...baseOptions(config.refreshTokenSeconds),
    // El refresh token solo se envía a la ruta que lo consume: ninguna otra petición
    // lo lleva encima, así que su exposición es mínima.
    path: AUTH_ROUTES.refresh,
  });
}

/** Borra las cookies al cerrar sesión. */
export function clearAuthCookies(reply: FastifyReply): void {
  const expired = { ...baseOptions(0), maxAge: 0 };
  reply.clearCookie(ACCESS_TOKEN_COOKIE, expired);
  reply.clearCookie(REFRESH_TOKEN_COOKIE, { ...expired, path: AUTH_ROUTES.refresh });
}
