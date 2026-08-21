import { eq } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { SessionClient } from '@notecore/shared';
import { db } from '../db/client.js';
import { sessions, users } from '../db/schema.js';
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

  /**
   * Se anota qué versión del cliente usó la sesión (Fase 25).
   *
   * **Solo cuando cambia**, y sin esperar a que termine. Escribir en cada petición sería una
   * escritura extra en la ruta más caliente de la API —esto corre antes de *todo* endpoint
   * autenticado—, a cambio de reescribir el mismo valor una y otra vez; y esperar el `await`
   * añadiría el viaje de ida y vuelta a la latencia de cada petición para un dato de
   * operación que a nadie le urge un segundo. Si la escritura falla, se pierde una cifra del
   * panel y no la petición del estudiante, que es el intercambio correcto.
   */
  const version = versionOf(request);
  if (version !== null && version !== session.clientVersion) {
    void db
      .update(sessions)
      .set({ clientVersion: version })
      .where(eq(sessions.id, session.id))
      .catch(() => undefined);
  }

  request.auth = {
    userId: payload.sub,
    sessionId: payload.sid,
    client: payload.client,
  };
}

/**
 * Qué versión dice traer el cliente (Fase 25).
 *
 * Se recorta a 32 caracteres porque va a una columna de texto sin más validación: es un dato
 * informativo que llega de fuera, y aceptarlo de cualquier longitud sería dejar que alguien
 * escriba lo que quiera en la base de datos por una cabecera. Nada lo autoriza ni lo
 * interpreta —solo se cuenta—, así que un valor inventado ensucia una cifra del panel y no
 * concede nada.
 */
function versionOf(request: FastifyRequest): string | null {
  const raw = request.headers['x-notecore-version'];
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().slice(0, 32);
  return trimmed.length > 0 ? trimmed : null;
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

/**
 * Exige que quien pide sea administrador (Fase 25).
 *
 * Se registra **después** de `requireAuth`, del que depende para saber quién pregunta.
 *
 * ## Por qué responde 404 y no 403
 *
 * Porque un 403 confirma que la ruta existe. Para cualquiera que no sea administrador —que
 * es todo el mundo salvo una cuenta—, `/panel/resumen` tiene que ser indistinguible de una
 * dirección inventada: mismo estado, mismo cuerpo, mismo mensaje que da el manejador de rutas
 * no encontradas de `app.ts`. Que además la web no pinte el enlace es comodidad; **esto** es
 * lo que protege el panel, porque la ruta responde a quien la escriba a mano.
 *
 * ## Por qué se consulta la base y no basta el token
 *
 * Porque el token se firmó al abrir la sesión y dura treinta días. Quitarle el permiso a una
 * cuenta —un `UPDATE` en `users`— tiene que surtir efecto en la siguiente petición, no cuando
 * caduque un token emitido antes. Es el mismo motivo por el que `requireAuth` comprueba que
 * la sesión siga existiendo en lugar de fiarse de que el JWT esté bien firmado.
 */
export async function requireAdmin(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const { userId } = authOf(request);

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { isAdmin: true },
  });

  if (!user?.isAdmin) throw errors.noEncontrado('Esa ruta no existe.');
}
