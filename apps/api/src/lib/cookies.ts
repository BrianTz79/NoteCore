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

/**
 * El único sitio que decide dónde vive la cookie de refresco.
 *
 * No es `AUTH_ROUTES.refresh` a secas: **el path de una cookie se compara contra la URL que
 * pide el navegador**, y desde el despliegue del 2026-08-20 la web alcanza la API por un
 * rewrite del mismo origen, con lo que esa URL es `/api/auth/refresh`. Con el path fijado en
 * `/auth/refresh` el navegador no adjuntaba la cookie, el refresco respondía 401 y la sesión
 * de la web se caía en cuanto caducaba el token de acceso —15 minutos—.
 *
 * La tentación evidente era poner `path: '/'`, y es justo lo que no hay que hacer: el token
 * de refresco viajaría en **todas** las peticiones de la web, que es exactamente la
 * exposición que el path estrecho evita. Se compone el prefijo real en su lugar.
 *
 * Escribirlo y borrarlo tienen que usar esta misma función: una cookie solo se borra si el
 * `path` del borrado coincide con el del alta.
 */
export function refreshCookiePath(): string {
  return `${config.webApiPrefix}${AUTH_ROUTES.refresh}`;
}

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
    path: refreshCookiePath(),
  });
}

/** Borra las cookies al cerrar sesión. */
export function clearAuthCookies(reply: FastifyReply): void {
  const expired = { ...baseOptions(0), maxAge: 0 };
  reply.clearCookie(ACCESS_TOKEN_COOKIE, expired);
  reply.clearCookie(REFRESH_TOKEN_COOKIE, { ...expired, path: refreshCookiePath() });

  /**
   * Barrido de la cookie que quedó en el path anterior.
   *
   * Los navegadores que entraron antes de este arreglo guardaron el refresco en
   * `/auth/refresh`. Esa cookie nunca se envía —por eso mismo fallaba la sesión—, pero se
   * quedaría en el navegador hasta caducar dentro de 30 días. Cerrar sesión es el momento
   * de retirarla. Solo hace falta si hay prefijo: sin él, el borrado de arriba ya es este.
   */
  if (config.webApiPrefix !== '') {
    reply.clearCookie(REFRESH_TOKEN_COOKIE, { ...expired, path: AUTH_ROUTES.refresh });
  }
}
