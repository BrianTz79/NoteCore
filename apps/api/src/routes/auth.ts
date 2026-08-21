import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import {
  AUTH_ROUTES,
  changePasswordSchema,
  deleteAccountSchema,
  entityIdSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  updateProfileSchema,
  type AuthResult,
} from '@notecore/shared';
import { authOf, clientOf, requireAuth } from '../middleware/auth.js';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from '../lib/cookies.js';
import { errors } from '../lib/errors.js';
import { verifyAccessTokenIgnoringExpiry } from '../lib/tokens.js';
import { parseBody } from '../lib/validate.js';
import * as auth from '../services/auth.js';
import type { IssuedSession } from '../services/auth.js';

/**
 * Rutas de cuenta y sesión.
 *
 * Principio II: aquí no hay reglas de negocio, solo traducción entre HTTP y el servicio.
 * La única decisión propia de esta capa es cómo se entregan los tokens según el cliente.
 */

/**
 * Entrega los tokens según el cliente.
 *
 * - **Web**: en cookies `httpOnly`. El cuerpo lleva el access token para que la interfaz
 *   sepa cuándo caduca, pero nunca el refresh token.
 * - **App**: en el cuerpo, porque React Native no tiene cookies y los guarda en
 *   almacenamiento seguro.
 */
function respondWithSession(
  reply: FastifyReply,
  issued: IssuedSession,
  client: 'web' | 'mobile',
  statusCode = 200,
): void {
  const body: AuthResult = {
    user: issued.user,
    accessToken: issued.accessToken,
    expiresIn: issued.expiresIn,
    ...(client === 'mobile' ? { refreshToken: issued.refreshToken } : {}),
  };

  if (client === 'web') {
    setAuthCookies(reply, {
      accessToken: issued.accessToken,
      refreshToken: issued.refreshToken,
    });
  }

  void reply.code(statusCode).send(body);
}

/**
 * Límite para las rutas que aceptan una contraseña.
 *
 * 30 intentos cada 15 minutos por IP. El límite se cuenta por IP, y varios estudiantes en
 * la misma casa o residencia salen a internet por una sola: con un umbral más bajo, uno
 * que se equivoque varias veces dejaría fuera a los demás. 30 sigue haciendo inviable
 * probar contraseñas a gran escala, que es de lo que protege.
 */
const passwordRateLimit = {
  config: {
    rateLimit: { max: 30, timeWindow: '15 minutes' },
  },
};

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post(AUTH_ROUTES.register, passwordRateLimit, async (request, reply) => {
    const input = parseBody(registerSchema, request.body);
    const client = clientOf(request);
    respondWithSession(reply, await auth.register(input, client), client, 201);
  });

  app.post(AUTH_ROUTES.login, passwordRateLimit, async (request, reply) => {
    const input = parseBody(loginSchema, request.body);
    const client = clientOf(request);
    respondWithSession(reply, await auth.login(input, client), client);
  });

  app.post(AUTH_ROUTES.refresh, async (request, reply) => {
    const client = clientOf(request);
    const input = parseBody(refreshSchema, request.body ?? {});

    // La app lo manda en el cuerpo; la web lo lleva en su cookie de ruta restringida.
    const token = input.refreshToken ?? request.cookies[REFRESH_TOKEN_COOKIE];
    if (!token) throw errors.sesionExpirada();

    try {
      respondWithSession(reply, await auth.refresh(token, client), client);
    } catch (error) {
      // Si la sesión ya no vale, se limpian las cookies para que el navegador deje de
      // reintentar con credenciales muertas en cada petición.
      if (client === 'web') clearAuthCookies(reply);
      throw error;
    }
  });

  app.post(AUTH_ROUTES.logout, async (request, reply) => {
    // No usa `requireAuth`: cerrar sesión debe funcionar aunque el access token ya haya
    // caducado. Basta con identificar la sesión a borrar.
    const client = clientOf(request);
    const accessToken =
      request.headers.authorization?.replace(/^Bearer /, '') ??
      request.cookies[ACCESS_TOKEN_COOKIE];

    if (accessToken) {
      const payload = verifyAccessTokenIgnoringExpiry(accessToken);
      if (payload) await auth.logout(payload.sid);
    }

    if (client === 'web') clearAuthCookies(reply);
    return reply.code(204).send();
  });

  app.get(AUTH_ROUTES.me, { preHandler: requireAuth }, async (request) => {
    return auth.getProfile(authOf(request).userId);
  });

  app.patch(AUTH_ROUTES.me, { preHandler: requireAuth }, async (request) => {
    const input = parseBody(updateProfileSchema, request.body);
    return auth.updateProfile(authOf(request).userId, input);
  });

  app.post(AUTH_ROUTES.password, { ...passwordRateLimit, preHandler: requireAuth }, async (request, reply) => {
    const input = parseBody(changePasswordSchema, request.body);
    const { userId, sessionId } = authOf(request);
    await auth.changePassword(userId, sessionId, input);
    return reply.code(204).send();
  });

  /**
   * Borrar la cuenta (Fase 20).
   *
   * Lleva el mismo límite que las demás rutas con contraseña: sin él, esta sería la ruta
   * ideal para probar contraseñas contra una sesión robada —cada intento fallido es barato y
   * el acierto vacía la cuenta—.
   *
   * Las cookies se limpian en la web aunque la sesión ya no exista en la base: el navegador
   * seguiría mandando credenciales muertas en cada petición hasta que caducaran solas.
   */
  app.delete(
    AUTH_ROUTES.deleteAccount,
    { ...passwordRateLimit, preHandler: requireAuth },
    async (request, reply) => {
      const input = parseBody(deleteAccountSchema, request.body);
      await auth.deleteAccount(authOf(request).userId, input);

      if (clientOf(request) === 'web') clearAuthCookies(reply);
      return reply.code(204).send();
    },
  );

  app.get(AUTH_ROUTES.sessions, { preHandler: requireAuth }, async (request) => {
    const { userId, sessionId } = authOf(request);
    return auth.listSessions(userId, sessionId);
  });

  app.delete<{ Params: { id: string } }>(
    `${AUTH_ROUTES.sessions}/:id`,
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = entityIdSchema.safeParse(request.params.id);
      if (!parsed.success) throw errors.noEncontrado('Esa sesión no existe.');

      // Principio III: el servicio filtra por `userId`, así que un identificador ajeno
      // no cierra la sesión de nadie más.
      await auth.revokeSession(authOf(request).userId, parsed.data);
      return reply.code(204).send();
    },
  );
};
