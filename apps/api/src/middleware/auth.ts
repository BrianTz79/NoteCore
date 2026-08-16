import { eq } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { SessionClient } from '@notecore/shared';
import { db } from '../db/client.js';
import { sessions } from '../db/schema.js';
import { errors } from '../lib/errors.js';
import { verifyAccessToken } from '../lib/tokens.js';
import { ACCESS_TOKEN_COOKIE } from '../lib/cookies.js';

/**
 * Autenticación.
 *
 * Principio III: este es el único sitio donde se establece quién hace la petición. A partir
 * de aquí, toda consulta usa `request.auth.userId` —derivado del token firmado— y nunca un
 * identificador que venga del cuerpo, la ruta o la query.
 */

export interface AuthContext {
  readonly userId: string;
  readonly sessionId: string;
  readonly client: SessionClient;
}

declare module 'fastify' {
  interface FastifyRequest {
    /** Presente solo tras pasar por `requireAuth`. */
    auth?: AuthContext;
  }
}

/**
 * Extrae el token de acceso.
 *
 * Dos vías, una por cliente: la app manda `Authorization: Bearer`, la web lo lleva en una
 * cookie `httpOnly` que su JavaScript no puede leer (y por tanto un XSS no puede robar).
 */
function extractAccessToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim();
    if (token.length > 0) return token;
  }

  const cookie = request.cookies[ACCESS_TOKEN_COOKIE];
  return cookie && cookie.length > 0 ? cookie : null;
}

/**
 * Exige sesión válida. Se registra con `preHandler` en las rutas protegidas.
 *
 * Comprueba dos cosas: que el JWT esté bien firmado y sin caducar, y que su sesión siga
 * existiendo en base de datos. Lo segundo es lo que hace que cerrar sesión surta efecto de
 * inmediato en lugar de esperar a que el token expire por su cuenta.
 */
export async function requireAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const token = extractAccessToken(request);
  if (!token) throw errors.noAutenticado();

  const payload = verifyAccessToken(token);
  if (!payload) throw errors.sesionExpirada();

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, payload.sid),
  });

  // Sesión cerrada o revocada desde otro dispositivo: el token, aunque siga firmado y
  // dentro de su vigencia, ya no vale.
  if (!session || session.userId !== payload.sub) throw errors.sesionExpirada();

  if (session.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, session.id));
    throw errors.sesionExpirada();
  }

  request.auth = {
    userId: payload.sub,
    sessionId: payload.sid,
    client: payload.client,
  };
}

/**
 * Devuelve el contexto de autenticación de una petición ya protegida.
 *
 * Existe para no repetir la comprobación de `undefined` en cada ruta: si esto lanza, es que
 * la ruta se registró sin `requireAuth`, y eso es un fallo de programación, no del usuario.
 */
export function authOf(request: FastifyRequest): AuthContext {
  if (!request.auth) throw errors.noAutenticado();
  return request.auth;
}

/**
 * Identifica de qué cliente viene la petición, para etiquetar la sesión.
 *
 * Es solo informativo —el usuario ve "web" o "app" en su lista de dispositivos—, así que
 * un valor manipulado no da acceso a nada; por eso basta con la cabecera.
 */
export function clientOf(request: FastifyRequest): SessionClient {
  return request.headers['x-notecore-client'] === 'mobile' ? 'mobile' : 'web';
}
