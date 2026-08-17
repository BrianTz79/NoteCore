/**
 * Llamadas de la sección social, tipadas.
 *
 * Principio VIII: web y app llaman a estas funciones en lugar de escribir cada una sus
 * rutas y sus tipos de respuesta.
 */

import type {
  ContactActionInput,
  ContactRequestInput,
  CreatePostInput,
  UpdateSocialProfileInput,
} from '../schemas/social.js';
import type {
  Contact,
  ContactLists,
  OwnProfile,
  Post,
  PublicProfile,
  UserSearchResult,
} from '../types/social.js';
import type { ApiClient } from './client.js';

export const SOCIAL_ROUTES = {
  /** Perfil ampliado propio: consulta y edición (FR-045). */
  profile: '/social/profile',
  /** Búsqueda de usuarios por `@usuario` (FR-039). */
  search: '/social/search',
  /** Perfil público de alguien, por su `@usuario` (FR-040). */
  userByUsername: (username: string) => `/social/users/${username}`,
  /** Publicaciones de alguien. */
  postsByUsername: (username: string) => `/social/users/${username}/posts`,
  /** Las cuatro listas de contactos (FR-041, FR-042). */
  contacts: '/social/contacts',
  /** Bloqueo directo de alguien con quien no había relación previa (FR-042). */
  block: '/social/contacts/block',
  /** Una relación concreta, para responder o bloquear. */
  contactById: (id: string) => `/social/contacts/${id}`,
  /** Publicaciones propias: lista y alta. */
  posts: '/social/posts',
  postById: (id: string) => `/social/posts/${id}`,
} as const;

export function createSocialApi(client: ApiClient) {
  return {
    /** El perfil ampliado propio, con su ajuste de visibilidad (FR-045). */
    getProfile(): Promise<OwnProfile> {
      return client.get<OwnProfile>(SOCIAL_ROUTES.profile);
    },

    /**
     * Edita el perfil ampliado (FR-045).
     *
     * Solo viajan los campos que cambian: mandar `null` vacía uno, y omitirlo lo deja como
     * estaba. Son cosas distintas y el esquema las distingue.
     */
    updateProfile(input: UpdateSocialProfileInput): Promise<OwnProfile> {
      return client.patch<OwnProfile>(SOCIAL_ROUTES.profile, input);
    },

    /**
     * Busca usuarios por `@usuario` (FR-039).
     *
     * Los bloqueados no aparecen, en ninguno de los dos sentidos: el bloqueo solo sirve de
     * algo si la persona deja de salir en las búsquedas (FR-042).
     */
    search(q: string): Promise<readonly UserSearchResult[]> {
      return client.get<readonly UserSearchResult[]>(
        `${SOCIAL_ROUTES.search}?q=${encodeURIComponent(q)}`,
      );
    },

    /**
     * El perfil público de alguien (FR-040, FR-045).
     *
     * Lo que llega ya viene filtrado por el servidor según la visibilidad del dueño: si no
     * se puede ver, los campos llegan vacíos en lugar de llegar llenos para que el cliente
     * los esconda.
     */
    getUser(username: string): Promise<PublicProfile> {
      return client.get<PublicProfile>(SOCIAL_ROUTES.userByUsername(username));
    },

    /** Las publicaciones de alguien, si su visibilidad lo permite. */
    getUserPosts(username: string): Promise<readonly Post[]> {
      return client.get<readonly Post[]>(SOCIAL_ROUTES.postsByUsername(username));
    },

    /** Las cuatro listas: aceptados, recibidas, enviadas y bloqueados. */
    listContacts(): Promise<ContactLists> {
      return client.get<ContactLists>(SOCIAL_ROUTES.contacts);
    },

    /**
     * Envía una solicitud de contacto (FR-040, FR-041).
     *
     * Los tres caminos de FR-040 —búsqueda, QR y enlace— terminan aquí: los tres acaban
     * teniendo un `@usuario`, así que no hace falta una llamada por modalidad.
     */
    requestContact(input: ContactRequestInput): Promise<Contact> {
      return client.post<Contact>(SOCIAL_ROUTES.contacts, input);
    },

    /**
     * Responde o actúa sobre una relación existente (FR-041, FR-042).
     *
     * El servidor comprueba que la acción corresponda al estado real de la relación: que el
     * cliente haya pintado el botón no le da permiso.
     */
    actOnContact(id: string, input: ContactActionInput): Promise<Contact> {
      return client.patch<Contact>(SOCIAL_ROUTES.contactById(id), input);
    },

    /**
     * Bloquea a alguien directamente, sin relación previa (FR-042).
     *
     * Existe porque bloquear no exige haber sido contacto: se bloquea a quien molesta desde
     * una búsqueda o desde su perfil. Cuando ya hay relación, `actOnContact` con `bloquear`
     * hace lo mismo sobre la fila que ya existe.
     */
    blockUser(input: ContactRequestInput): Promise<Contact> {
      return client.post<Contact>(SOCIAL_ROUTES.block, input);
    },

    /** Las publicaciones propias. */
    listPosts(): Promise<readonly Post[]> {
      return client.get<readonly Post[]>(SOCIAL_ROUTES.posts);
    },

    /** Publica algo en el perfil propio. */
    createPost(input: CreatePostInput): Promise<Post> {
      return client.post<Post>(SOCIAL_ROUTES.posts, input);
    },

    /** Borra una publicación propia. */
    deletePost(id: string): Promise<void> {
      return client.delete<void>(SOCIAL_ROUTES.postById(id));
    },
  };
}

export type SocialApi = ReturnType<typeof createSocialApi>;
