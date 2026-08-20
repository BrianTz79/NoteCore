import type { FastifyPluginAsync } from 'fastify';
import {
  SOCIAL_ROUTES,
  contactActionSchema,
  contactRequestSchema,
  createPostSchema,
  entityIdSchema,
  updateSocialProfileSchema,
  userSearchSchema,
  usernameSchema,
} from '@notecore/shared';
import { authOf, requireAuth } from '../middleware/auth.js';
import { errors } from '../lib/errors.js';
import { parseBody } from '../lib/validate.js';
import * as social from '../services/social.js';

/**
 * Rutas de la sección social (FR-039 a FR-042, FR-045).
 *
 * Principio II: aquí no hay reglas de negocio, solo traducción entre HTTP y el servicio.
 * Principio III: todas exigen sesión y el `userId` sale del token, nunca de la petición.
 * En esta sección eso importa el doble: es la primera donde se leen datos de otras cuentas,
 * así que quién mira —y por tanto qué se le puede enseñar— nunca puede venir del cliente.
 */

/** El `@usuario` de la ruta, validado antes de tocar la base de datos. */
function usernameOf(raw: string): string {
  const parsed = usernameSchema.safeParse(raw);
  // Un nombre con forma inválida no puede existir, así que se responde lo mismo que si no
  // existiera: quien lo tecleó se equivocó en ambos casos.
  if (!parsed.success) throw errors.noEncontrado('No encontramos a esa persona.');
  return parsed.data;
}

export const socialRoutes: FastifyPluginAsync = async (app) => {
  /* ─────────────────── Perfil propio ─────────────────── */

  /** El perfil ampliado propio, con su ajuste de visibilidad (FR-045). */
  app.get(SOCIAL_ROUTES.profile, { preHandler: requireAuth }, async (request) => {
    return social.getOwnProfile(authOf(request).userId);
  });

  /** Edita el perfil ampliado (FR-045). */
  app.patch(SOCIAL_ROUTES.profile, { preHandler: requireAuth }, async (request) => {
    const input = parseBody(updateSocialProfileSchema, request.body);
    return social.updateOwnProfile(authOf(request).userId, input);
  });

  /* ─────────────────── Búsqueda y perfiles ajenos ─────────────────── */

  /**
   * Busca usuarios por `@usuario` (FR-039).
   *
   * Los bloqueados no salen, en ninguno de los dos sentidos (FR-042).
   */
  app.get<{ Querystring: { q?: string } }>(
    SOCIAL_ROUTES.search,
    { preHandler: requireAuth },
    async (request) => {
      const { q } = parseBody(userSearchSchema, request.query);
      return social.searchUsers(authOf(request).userId, q);
    },
  );

  /**
   * El perfil público de alguien (FR-040, FR-045).
   *
   * Lo que la visibilidad del dueño no alcance llega vacío: el filtrado ocurre en el
   * servidor, no en el cliente.
   */
  app.get<{ Params: { username: string } }>(
    SOCIAL_ROUTES.userByUsername(':username'),
    { preHandler: requireAuth },
    async (request) => {
      return social.getPublicProfile(
        authOf(request).userId,
        usernameOf(request.params.username),
      );
    },
  );

  /** Las publicaciones de alguien, si su visibilidad lo permite (FR-045). */
  app.get<{ Params: { username: string } }>(
    SOCIAL_ROUTES.postsByUsername(':username'),
    { preHandler: requireAuth },
    async (request) => {
      return social.listUserPosts(
        authOf(request).userId,
        usernameOf(request.params.username),
      );
    },
  );

  /* ─────────────────── Contactos ─────────────────── */

  /** Las cuatro listas: aceptados, recibidas, enviadas y bloqueados. */
  app.get(SOCIAL_ROUTES.contacts, { preHandler: requireAuth }, async (request) => {
    return social.listContacts(authOf(request).userId);
  });

  /**
   * Envía una solicitud de contacto (FR-040, FR-041).
   *
   * Los tres caminos de FR-040 —búsqueda, QR y enlace— llegan aquí, porque los tres acaban
   * teniendo un `@usuario`. Una sola ruta es lo que garantiza que las tres modalidades
   * produzcan exactamente la misma relación.
   */
  app.post(SOCIAL_ROUTES.contacts, { preHandler: requireAuth }, async (request, reply) => {
    const input = parseBody(contactRequestSchema, request.body);
    const created = await social.requestContact(authOf(request).userId, input.username);
    return reply.code(201).send(created);
  });

  /** Bloquea a alguien sin relación previa (FR-042). */
  app.post(SOCIAL_ROUTES.block, { preHandler: requireAuth }, async (request, reply) => {
    const input = parseBody(contactRequestSchema, request.body);
    const blocked = await social.blockUser(authOf(request).userId, input.username);
    return reply.code(201).send(blocked);
  });

  /**
   * Acepta, rechaza, cancela, elimina, bloquea o desbloquea (FR-041, FR-042).
   *
   * Una sola ruta con la acción en el cuerpo porque todas operan sobre la misma fila y se
   * excluyen entre sí. El servicio comprueba que la acción corresponda al estado real de la
   * relación: que el cliente pintara el botón no autoriza nada.
   */
  app.patch<{ Params: { id: string } }>(
    SOCIAL_ROUTES.contactById(':id'),
    { preHandler: requireAuth },
    async (request) => {
      const parsed = entityIdSchema.safeParse(request.params.id);
      if (!parsed.success) throw errors.noEncontrado('Esa relación no existe.');

      const input = parseBody(contactActionSchema, request.body);
      return social.actOnContact(authOf(request).userId, parsed.data, input.action);
    },
  );

  /* ─────────────────── Publicaciones ─────────────────── */

  /**
   * El muro: lo de los contactos aceptados y lo propio (Fase 15).
   *
   * Se declara **antes** que `/social/posts` a propósito: son rutas hermanas y conviene
   * leerlas juntas. El filtrado por visibilidad lo hace el servicio, nunca el cliente.
   */
  app.get(SOCIAL_ROUTES.feed, { preHandler: requireAuth }, async (request) => {
    return social.listFeed(authOf(request).userId);
  });

  /** Las publicaciones propias. */
  app.get(SOCIAL_ROUTES.posts, { preHandler: requireAuth }, async (request) => {
    return social.listOwnPosts(authOf(request).userId);
  });

  /** Publica algo en el perfil propio. */
  app.post(SOCIAL_ROUTES.posts, { preHandler: requireAuth }, async (request, reply) => {
    const input = parseBody(createPostSchema, request.body);
    const created = await social.createPost(authOf(request).userId, input);
    return reply.code(201).send(created);
  });

  /** Borra una publicación propia. */
  app.delete<{ Params: { id: string } }>(
    SOCIAL_ROUTES.postById(':id'),
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = entityIdSchema.safeParse(request.params.id);
      if (!parsed.success) throw errors.noEncontrado('Esa publicación no existe.');

      await social.deletePost(authOf(request).userId, parsed.data);
      return reply.code(204).send();
    },
  );
};
