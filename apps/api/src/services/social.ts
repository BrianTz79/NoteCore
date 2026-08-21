import { and, desc, eq, ilike, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import {
  areConnected,
  canSeeProfileDetails,
  contactActions,
  contactViewpoint,
  isBlocked,
  orderedPair,
  profileUrl,
  type Contact,
  type ContactActionName,
  type ContactLists,
  type ContactStatus,
  type ContactViewpoint,
  type CreatePostInput,
  type OwnProfile,
  type Post,
  type ProfileVisibility,
  type PublicProfile,
  type UpdateSocialProfileParsed,
  type UserSearchResult,
} from '@notecore/shared';
import { db } from '../db/client.js';
import { contacts, posts, users, type ContactRow, type UserRow } from '../db/schema.js';
import { config } from '../config.js';
import { errors, isUniqueViolation } from '../lib/errors.js';
import { notifyRelationChanged } from './messaging.js';

/**
 * Lógica de la sección social (FR-039 a FR-042, FR-045).
 *
 * Principio II: quién puede ver qué, si dos personas pueden conectarse y qué acción procede
 * sobre una relación se decide **aquí**. Los clientes pintan lo que llega.
 *
 * Principio III: el usuario que mira sale siempre del token. Esta es la primera superficie
 * del proyecto donde datos de una cuenta se muestran a otra de forma continuada —la
 * compartición de la Fase 6 era puntual y por copia—, así que cada lectura de un perfil ajeno
 * pasa por `canSeeProfileDetails` antes de componer la respuesta, y lo que no se puede ver
 * **no se manda**, en vez de mandarse para que el cliente lo esconda.
 */

/* ─────────────────────────── Relaciones ─────────────────────────── */

/** La relación entre dos personas, o `null` si no hay ninguna. */
async function findRelation(userId: string, otherId: string): Promise<ContactRow | null> {
  const [a, b] = orderedPair(userId, otherId);

  const rows = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.userAId, a), eq(contacts.userBId, b)))
    .limit(1);

  return rows[0] ?? null;
}

/** El punto de vista de `viewerId` sobre su relación con `otherId`. */
function viewpointOf(relation: ContactRow | null, viewerId: string): ContactViewpoint {
  return contactViewpoint(
    relation === null
      ? null
      : {
          status: relation.status as ContactStatus,
          requesterId: relation.requesterId,
          blockedById: relation.blockedById,
        },
    viewerId,
  );
}

/** Compone el resultado de búsqueda de una persona, con la relación ya resuelta. */
function toSearchResult(row: Pick<UserRow, 'id' | 'username' | 'displayName'>, viewpoint: ContactViewpoint): UserSearchResult {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    viewpoint,
  };
}

/** Compone una relación tal como la ve uno de los dos lados. */
function toContact(
  relation: ContactRow,
  other: Pick<UserRow, 'id' | 'username' | 'displayName'>,
  viewerId: string,
): Contact {
  const viewpoint = viewpointOf(relation, viewerId);

  return {
    id: relation.id,
    user: toSearchResult(other, viewpoint),
    viewpoint,
    actions: contactActions(viewpoint),
    requestedAt: relation.requestedAt,
    acceptedAt: relation.acceptedAt,
  };
}

/* ─────────────────────────── Perfil propio ─────────────────────────── */

/** Cuántos contactos aceptados tiene alguien (FR-041). */
async function countContacts(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(contacts)
    .where(
      and(
        eq(contacts.status, 'aceptada'),
        or(eq(contacts.userAId, userId), eq(contacts.userBId, userId)),
      ),
    );

  return row?.total ?? 0;
}

/** Cuántas publicaciones tiene alguien. */
async function countPosts(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(posts)
    .where(eq(posts.userId, userId));

  return row?.total ?? 0;
}

/** El perfil ampliado propio, con lo que solo su dueño ve (FR-045). */
export async function getOwnProfile(userId: string): Promise<OwnProfile> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw errors.noEncontrado('No se encontró tu cuenta.');

  const [contactCount, postCount, pendingRequestCount] = await Promise.all([
    countContacts(userId),
    countPosts(userId),
    countPendingRequests(userId),
  ]);

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    career: user.career,
    school: user.school,
    age: user.age,
    visibility: user.profileVisibility as ProfileVisibility,
    contactCount,
    postCount,
    pendingRequestCount,
    // El enlace lo compone el servidor por lo mismo que el de un compartido (Fase 6): es el
    // que se codifica en el QR, y si cada cliente armara el suyo, escanear y abrir el enlace
    // llevarían a sitios distintos.
    url: profileUrl(config.webUrl, user.username),
  };
}

/**
 * Edita el perfil ampliado (FR-045).
 *
 * Solo se tocan los campos que vienen: `undefined` significa "déjalo como está" y `null`
 * significa "vacíalo". Sin esa distinción, editar la biografía borraría la carrera —el
 * mismo fallo que la Fase 3 corrigió en las notas de las faltas—.
 */
export async function updateOwnProfile(
  userId: string,
  input: UpdateSocialProfileParsed,
): Promise<OwnProfile> {
  const [updated] = await db
    .update(users)
    .set({
      ...(input.bio !== undefined && { bio: input.bio }),
      ...(input.career !== undefined && { career: input.career }),
      ...(input.school !== undefined && { school: input.school }),
      ...(input.age !== undefined && { age: input.age }),
      ...(input.visibility !== undefined && { profileVisibility: input.visibility }),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  if (!updated) throw errors.noEncontrado('No se encontró tu cuenta.');

  return getOwnProfile(userId);
}

/* ─────────────────────────── Búsqueda ─────────────────────────── */

/**
 * Busca usuarios por `@usuario` o por nombre mostrado (FR-039).
 *
 * Se busca también por nombre mostrado porque quien busca a un compañero recuerda cómo se
 * llama antes que su `@usuario`. El requisito pide lo segundo y esto lo incluye.
 *
 * **Los bloqueados no aparecen, en ninguno de los dos sentidos** (FR-042). Un bloqueo que
 * dejara a la persona saliendo en cada búsqueda sería una etiqueta, no una separación; y al
 * bloqueado no se le señala nada: para él, esa cuenta simplemente no está entre los
 * resultados, igual que cualquier otra que no exista.
 *
 * El propio usuario se excluye: encontrarse a uno mismo y ver un botón de "agregar" no lleva
 * a ningún sitio.
 */
export async function searchUsers(
  userId: string,
  query: string,
): Promise<readonly UserSearchResult[]> {
  // `ilike` con comodín al final aprovecha el índice y busca "empieza por", que es como se
  // teclea un `@usuario` que se conoce a medias.
  const pattern = `${query.replace(/[%_]/g, '\\$&')}%`;

  const rows = await db
    .select({ id: users.id, username: users.username, displayName: users.displayName })
    .from(users)
    .where(
      and(
        ne(users.id, userId),
        // Las cuentas borradas (Fase 20) no se buscan ni se encuentran. La lápida existe
        // para que los mensajes que esa persona envió conserven su sitio en la conversación
        // de quien los recibió, no para seguir figurando en el directorio: sin este filtro,
        // buscar «eliminado» devolvería la lista de todo el que se ha ido.
        isNull(users.anonymizedAt),
        or(ilike(users.username, pattern), ilike(users.displayName, pattern)),
      ),
    )
    .limit(20);

  if (rows.length === 0) return [];

  // Las relaciones del usuario con los encontrados, en una sola consulta en vez de una por
  // resultado.
  const relations = await db
    .select()
    .from(contacts)
    .where(or(eq(contacts.userAId, userId), eq(contacts.userBId, userId)));

  const byOther = new Map<string, ContactRow>();
  for (const relation of relations) {
    const otherId = relation.userAId === userId ? relation.userBId : relation.userAId;
    byOther.set(otherId, relation);
  }

  return rows
    .map((row) => toSearchResult(row, viewpointOf(byOther.get(row.id) ?? null, userId)))
    // El filtro va aquí y no en el `WHERE` para que la exclusión de bloqueados sea la misma
    // regla que el resto del proyecto usa, y no una condición SQL que haya que mantener en
    // paralelo con `isBlocked`.
    .filter((result) => !isBlocked(result.viewpoint));
}

/* ─────────────────────────── Perfil ajeno ─────────────────────────── */

/**
 * Busca a alguien por su `@usuario`, para las rutas que lo reciben.
 *
 * Una cuenta borrada (Fase 20) responde igual que una que nunca existió. Es el único punto
 * por el que pasan el perfil ajeno, la solicitud de contacto, el bloqueo y el muro, así que
 * filtrar aquí cierra los cuatro de una vez: sin esto, se podría abrir el perfil de una
 * lápida escribiendo su `@usuario`, o mandarle una solicitud de contacto a nadie.
 */
async function findByUsername(username: string): Promise<UserRow> {
  const user = await db.query.users.findFirst({
    where: and(eq(users.username, username), isNull(users.anonymizedAt)),
  });
  if (!user) throw errors.noEncontrado('No encontramos a esa persona.');
  return user;
}

/**
 * El perfil de alguien tal como lo ve quien consulta (FR-040, FR-045).
 *
 * Aquí es donde FR-045 se hace efectivo: lo que la visibilidad no alcanza **no se incluye en
 * la respuesta**. Mandarlo para que el cliente lo esconda dejaría el dato viajando por la red
 * y visible en las herramientas del navegador, que es lo mismo que no protegerlo.
 *
 * A quien fue bloqueado se le devuelve el perfil cerrado, no un 404: un "no existe" para una
 * cuenta que sí existe se nota en cuanto se compara con otra sesión, y confirmaría el bloqueo
 * justo a quien no se le cuenta.
 */
export async function getPublicProfile(
  viewerId: string,
  username: string,
): Promise<PublicProfile> {
  const user = await findByUsername(username);
  const isOwn = user.id === viewerId;

  const relation = isOwn ? null : await findRelation(viewerId, user.id);
  const viewpoint = viewpointOf(relation, viewerId);
  const visibility = user.profileVisibility as ProfileVisibility;
  const detailsVisible = canSeeProfileDetails(visibility, viewpoint, isOwn);

  const [contactCount, postCount] = detailsVisible
    ? await Promise.all([countContacts(user.id), countPosts(user.id)])
    : [null, null];

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    // El nombre y el `@usuario` siempre se ven: son lo que FR-039 hace buscable, y sin ellos
    // no se podría ni reconocer a quién se está mirando.
    bio: detailsVisible ? user.bio : null,
    career: detailsVisible ? user.career : null,
    school: detailsVisible ? user.school : null,
    age: detailsVisible ? user.age : null,
    detailsVisible,
    contactCount,
    postCount,
    viewpoint,
    actions: contactActions(viewpoint),
    url: profileUrl(config.webUrl, user.username),
    createdAt: user.createdAt,
  };
}

/* ─────────────────────────── Contactos ─────────────────────────── */

/** Las cuatro listas de la pantalla de contactos, en una sola respuesta. */
export async function listContacts(userId: string): Promise<ContactLists> {
  const rows = await db
    .select({
      relation: contacts,
      otherA: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
      },
    })
    .from(contacts)
    .innerJoin(
      users,
      // Se une con **la otra** persona: la de la columna que no es la del usuario.
      or(
        and(eq(contacts.userAId, userId), eq(users.id, contacts.userBId)),
        and(eq(contacts.userBId, userId), eq(users.id, contacts.userAId)),
      ),
    )
    .where(or(eq(contacts.userAId, userId), eq(contacts.userBId, userId)));

  const aceptados: Contact[] = [];
  const recibidas: Contact[] = [];
  const enviadas: Contact[] = [];
  const bloqueados: Contact[] = [];

  for (const row of rows) {
    const contact = toContact(row.relation, row.otherA, userId);

    switch (contact.viewpoint) {
      case 'aceptada':
        aceptados.push(contact);
        break;
      case 'recibida':
        recibidas.push(contact);
        break;
      case 'enviada':
        enviadas.push(contact);
        break;
      case 'bloqueada_por_mi':
        bloqueados.push(contact);
        break;
      // `bloqueada_por_otro` no se lista: a quien fue bloqueado no se le enseña la relación,
      // porque verla en una lista es enterarse del bloqueo.
      default:
        break;
    }
  }

  return { aceptados, recibidas, enviadas, bloqueados };
}

/**
 * Envía una solicitud de contacto (FR-040, FR-041).
 *
 * Los tres caminos de FR-040 —búsqueda, QR y enlace— desembocan aquí, porque los tres acaban
 * teniendo un `@usuario`.
 *
 * El caso que merece atención: **si la otra persona ya me había enviado una solicitud, esto
 * la acepta** en lugar de crear una segunda. Dos personas que se agregan a la vez es el caso
 * real —se escanean el QR mutuamente— y dejarlas con dos solicitudes cruzadas pendientes
 * sería absurdo: ambas quieren lo mismo.
 */
export async function requestContact(userId: string, username: string): Promise<Contact> {
  const other = await findByUsername(username);

  if (other.id === userId) {
    throw errors.validacion('No puedes agregarte a ti mismo.');
  }

  const existing = await findRelation(userId, other.id);
  const viewpoint = viewpointOf(existing, userId);

  if (existing !== null) {
    // Quien bloqueó no puede solicitar sin desbloquear antes; a quien fue bloqueado se le
    // responde lo mismo que si la persona no aceptara solicitudes, sin revelar el bloqueo.
    if (viewpoint === 'bloqueada_por_mi') {
      throw errors.validacion('Desbloquea a esta persona antes de agregarla.');
    }
    if (viewpoint === 'bloqueada_por_otro') {
      throw errors.validacion('No se puede enviar una solicitud a esta persona.');
    }
    if (viewpoint === 'aceptada') {
      throw errors.validacion('Ya son contactos.');
    }
    if (viewpoint === 'enviada') {
      throw errors.validacion('Ya enviaste una solicitud a esta persona.');
    }

    // `recibida`: ella me la envió antes. Aceptarla es lo que ambos querían.
    const [accepted] = await db
      .update(contacts)
      .set({ status: 'aceptada', acceptedAt: new Date(), updatedAt: new Date() })
      .where(eq(contacts.id, existing.id))
      .returning();

    if (!accepted) throw errors.noEncontrado('Esa solicitud ya no existe.');

    // Ahora son contactos: si ya tenían una conversación de antes —de cuando lo fueron—, sus
    // pantallas abiertas deben dejar de decir que no se puede escribir (FR-044).
    await notifyRelationChanged(userId, other.id);

    return toContact(accepted, other, userId);
  }

  const [a, b] = orderedPair(userId, other.id);

  try {
    const [created] = await db
      .insert(contacts)
      .values({ userAId: a, userBId: b, requesterId: userId, status: 'pendiente' })
      .returning();

    if (!created) throw new Error('No se pudo crear la solicitud');
    return toContact(created, other, userId);
  } catch (error) {
    /**
     * Las dos personas se agregaron en el mismo instante y la otra ganó la carrera.
     *
     * La relación que quedó expresa lo mismo que la que no se pudo insertar —las dos querían
     * conectarse—, así que se lee y se devuelve en lugar de fallar: el índice único hizo
     * justo su trabajo, y quien perdió la carrera no tiene por qué enterarse.
     *
     * Es el caso real de dos compañeros escaneándose el QR a la vez, y lo destapó la suite de
     * concurrencia: la comprobación previa de ambas peticiones pasa antes de que ninguna
     * escriba.
     */
    if (isUniqueViolation(error, 'contacts_pair_unique')) {
      const winner = await findRelation(userId, other.id);
      if (winner) return toContact(winner, other, userId);
    }
    throw error;
  }
}

/**
 * Actúa sobre una relación existente (FR-041, FR-042).
 *
 * Principio II: la acción se comprueba contra `contactActions`, la **misma** función con la
 * que el cliente decidió qué botón pintar. Que el cliente haya ofrecido el botón no autoriza
 * nada: quien manda la petición puede no ser el cliente.
 */
export async function actOnContact(
  userId: string,
  contactId: string,
  action: ContactActionName,
): Promise<Contact> {
  const rows = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.id, contactId),
        // Principio III: solo se opera sobre relaciones de las que uno es parte. Sin esto,
        // un identificador ajeno permitiría aceptar o romper la relación de otras personas.
        or(eq(contacts.userAId, userId), eq(contacts.userBId, userId)),
      ),
    )
    .limit(1);

  const relation = rows[0];
  if (!relation) throw errors.noEncontrado('Esa relación no existe.');

  const otherId = relation.userAId === userId ? relation.userBId : relation.userAId;
  const other = await db.query.users.findFirst({ where: eq(users.id, otherId) });
  if (!other) throw errors.noEncontrado('Esa persona ya no existe.');

  const viewpoint = viewpointOf(relation, userId);
  const permitted = contactActions(viewpoint);

  const allowed: Record<ContactActionName, boolean> = {
    aceptar: permitted.puedeAceptar,
    rechazar: permitted.puedeRechazar,
    cancelar: permitted.puedeCancelar,
    eliminar: permitted.puedeEliminar,
    bloquear: permitted.puedeBloquear,
    desbloquear: permitted.puedeDesbloquear,
  };

  if (!allowed[action]) {
    throw errors.validacion('Esa acción no procede sobre esta relación.');
  }

  /**
   * Rechazar, cancelar y eliminar **borran la fila** (FR-042).
   *
   * No es historial que el Principio VI proteja: una solicitud rechazada o un contacto
   * eliminado es precisamente una relación que dejó de existir, y conservarla impediría
   * volver a enviar una solicitud —el índice único la rechazaría—. Lo que el principio
   * protege es lo académico: materias, faltas y actividades.
   */
  if (action === 'rechazar' || action === 'cancelar' || action === 'eliminar') {
    await db.delete(contacts).where(eq(contacts.id, relation.id));

    /**
     * Eliminar un contacto **cierra** la conversación que tuvieran abierta (FR-044).
     *
     * El hilo sigue existiendo y ambos lo siguen leyendo —eso es historial y no le toca
     * destruirlo a una operación de rutina—, pero deja de admitir mensajes. Sin este aviso,
     * quien lo tuviera abierto seguiría viendo el campo de texto y se enteraría al fallar el
     * envío, que es el peor camino para descubrirlo.
     */
    await notifyRelationChanged(userId, otherId);

    return {
      id: relation.id,
      user: toSearchResult(other, 'ninguna'),
      viewpoint: 'ninguna',
      actions: contactActions('ninguna'),
      requestedAt: relation.requestedAt,
      acceptedAt: null,
    };
  }

  /**
   * Desbloquear **no restaura la amistad**: la relación desaparece y hay que volver a
   * solicitar.
   *
   * Decisión del usuario. Resucitar una conexión que se cortó deliberadamente sería
   * sorprendente en el peor momento —quien desbloquea para poder buscar a alguien no está
   * pidiendo volver a ser su contacto—, y volver a agregar cuesta un toque.
   */
  if (action === 'desbloquear') {
    await db.delete(contacts).where(eq(contacts.id, relation.id));

    // Desbloquear no restaura la amistad, así que la conversación sigue cerrada: lo que
    // cambia es el motivo —de "bloqueaste a esta persona" a "solo puedes escribir a tus
    // contactos"— y por tanto la acción que se le ofrece.
    await notifyRelationChanged(userId, otherId);

    return {
      id: relation.id,
      user: toSearchResult(other, 'ninguna'),
      viewpoint: 'ninguna',
      actions: contactActions('ninguna'),
      requestedAt: relation.requestedAt,
      acceptedAt: null,
    };
  }

  const [updated] = await db
    .update(contacts)
    .set(
      action === 'aceptar'
        ? { status: 'aceptada', acceptedAt: new Date(), updatedAt: new Date() }
        : {
            // Bloquear conserva la fila y anota quién bloqueó: es lo que permite ofrecer
            // "desbloquear" solo a quien bloqueó, y no decirle nada al bloqueado.
            status: 'bloqueada',
            blockedById: userId,
            acceptedAt: null,
            updatedAt: new Date(),
          },
    )
    .where(eq(contacts.id, relation.id))
    .returning();

  if (!updated) throw errors.noEncontrado('Esa relación ya no existe.');

  /**
   * Aceptar abre la conversación y bloquear la cierra, **en el acto** (FR-043, FR-044).
   *
   * Es el caso que más importa de los cuatro: bloquear a alguien que está escribiendo ahora
   * mismo tiene que surtir efecto en su pantalla sin que recargue nada. A cada lado le llega
   * su propia versión del motivo, así que el bloqueo sigue sin anunciarse.
   */
  await notifyRelationChanged(userId, otherId);

  return toContact(updated, other, userId);
}

/**
 * Bloquea a alguien con quien no había relación previa (FR-042).
 *
 * Existe porque bloquear no exige haber sido contacto: se bloquea a quien molesta desde una
 * búsqueda o desde su perfil, sin haberlo agregado nunca. Crea la fila directamente en estado
 * `bloqueada`.
 */
export async function blockUser(userId: string, username: string): Promise<Contact> {
  const other = await findByUsername(username);

  if (other.id === userId) throw errors.validacion('No puedes bloquearte a ti mismo.');

  const existing = await findRelation(userId, other.id);

  if (existing !== null) {
    return actOnContact(userId, existing.id, 'bloquear');
  }

  const [a, b] = orderedPair(userId, other.id);

  const [created] = await db
    .insert(contacts)
    .values({
      userAId: a,
      userBId: b,
      // Nadie pidió nada, pero la columna es obligatoria y el `CHECK` exige que sea una de
      // las dos partes: se anota a quien bloquea, que es quien originó la fila.
      requesterId: userId,
      status: 'bloqueada',
      blockedById: userId,
    })
    .returning();

  if (!created) throw new Error('No se pudo bloquear');

  // Bloquear sin relación previa: si ya se habían escrito alguna vez, la conversación se
  // cierra igual que en cualquier otro bloqueo.
  await notifyRelationChanged(userId, other.id);

  return toContact(created, other, userId);
}

/* ─────────────────────────── Publicaciones ─────────────────────────── */

/** Compone una publicación con su autor resuelto. */
function toPost(
  row: { id: string; text: string; createdAt: Date; updatedAt: Date },
  author: Pick<UserRow, 'id' | 'username' | 'displayName'>,
  viewerId: string,
  viewpoint: ContactViewpoint,
): Post {
  return {
    id: row.id,
    author: toSearchResult(author, viewpoint),
    text: row.text,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isOwn: author.id === viewerId,
  };
}

/** Las publicaciones propias. */
export async function listOwnPosts(userId: string): Promise<readonly Post[]> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw errors.noEncontrado('No se encontró tu cuenta.');

  const rows = await db
    .select()
    .from(posts)
    .where(eq(posts.userId, userId))
    .orderBy(desc(posts.createdAt));

  return rows.map((row) => toPost(row, user, userId, 'ninguna'));
}

/**
 * Las publicaciones de alguien, si su visibilidad alcanza a quien mira (FR-045).
 *
 * La comprobación es la misma que la del perfil —`canSeeProfileDetails`— y no una copia:
 * dos reglas para lo mismo acabarían discrepando, y la discrepancia dejaría las
 * publicaciones visibles en un perfil que dice ser privado.
 */
export async function listUserPosts(
  viewerId: string,
  username: string,
): Promise<readonly Post[]> {
  const user = await findByUsername(username);
  const isOwn = user.id === viewerId;

  const relation = isOwn ? null : await findRelation(viewerId, user.id);
  const viewpoint = viewpointOf(relation, viewerId);

  if (!canSeeProfileDetails(user.profileVisibility as ProfileVisibility, viewpoint, isOwn)) {
    // Lista vacía y no un error: la pantalla ya explica con `detailsVisible` que el perfil es
    // privado, y un error obligaría a distinguir "privado" de "fallo" en cada cliente.
    return [];
  }

  const rows = await db
    .select()
    .from(posts)
    .where(eq(posts.userId, user.id))
    .orderBy(desc(posts.createdAt));

  return rows.map((row) => toPost(row, user, viewerId, viewpoint));
}

/**
 * El muro: lo que han publicado tus contactos aceptados, más lo tuyo (Fase 15).
 *
 * **Por qué se apoya en `listContacts` en vez de consultar `contacts` por su cuenta**: quién
 * cuenta como contacto aceptado —y, sobre todo, que un bloqueo saque a alguien de esa lista—
 * ya está resuelto ahí. Repetir el `WHERE` aquí crearía una segunda definición de "contacto"
 * que envejecería sola, y la forma en que se rompería es la peor de todas: alguien a quien
 * bloqueaste siguiendo en tu muro.
 *
 * La visibilidad se comprueba **por autor** con `canSeeProfileDetails`, la misma función que
 * usan el perfil y `listUserPosts`. Un contacto aceptado la pasa siempre, pero comprobarlo
 * igualmente es lo que mantiene una sola regla en el proyecto: si mañana cambia lo que
 * "aceptada" permite ver, cambia en un sitio y el muro obedece sin tocarlo.
 */
export async function listFeed(userId: string): Promise<readonly Post[]> {
  const self = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!self) throw errors.noEncontrado('No se encontró tu cuenta.');

  const { aceptados } = await listContacts(userId);

  // Los autores de los que se leerá: los contactos aceptados que superan su propia
  // visibilidad, más uno mismo.
  const autores = new Map<string, { user: UserRow; viewpoint: ContactViewpoint }>();

  if (aceptados.length > 0) {
    const rows = await db
      .select()
      .from(users)
      .where(inArray(users.id, aceptados.map((c) => c.user.id)));

    for (const row of rows) {
      const visible = canSeeProfileDetails(
        row.profileVisibility as ProfileVisibility,
        'aceptada',
        false,
      );
      if (visible) autores.set(row.id, { user: row, viewpoint: 'aceptada' });
    }
  }

  autores.set(self.id, { user: self, viewpoint: 'ninguna' });

  const rows = await db
    .select()
    .from(posts)
    .where(inArray(posts.userId, [...autores.keys()]))
    .orderBy(desc(posts.createdAt));

  return rows.flatMap((row) => {
    const autor = autores.get(row.userId);
    // No debería faltar —el `WHERE` sale de las mismas claves—, pero si faltara, omitir la
    // publicación es lo correcto: nunca se manda algo cuyo permiso no se pudo comprobar.
    if (!autor) return [];
    return [toPost(row, autor.user, userId, autor.viewpoint)];
  });
}

/** Publica algo en el perfil propio. */
export async function createPost(userId: string, input: CreatePostInput): Promise<Post> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw errors.noEncontrado('No se encontró tu cuenta.');

  const [created] = await db
    .insert(posts)
    .values({ userId, text: input.text })
    .returning();

  if (!created) throw new Error('No se pudo crear la publicación');

  return toPost(created, user, userId, 'ninguna');
}

/**
 * Borra una publicación propia.
 *
 * Principio III: el `WHERE` lleva el `userId` para que nadie borre la publicación de otra
 * persona pasando un identificador que no le pertenece.
 */
export async function deletePost(userId: string, postId: string): Promise<void> {
  const deleted = await db
    .delete(posts)
    .where(and(eq(posts.id, postId), eq(posts.userId, userId)))
    .returning({ id: posts.id });

  if (deleted.length === 0) throw errors.noEncontrado('Esa publicación no existe.');
}

/**
 * Cuántas solicitudes esperan respuesta, para el aviso del inicio (FR-041).
 *
 * Una consulta propia y no `listContacts` porque el inicio solo necesita el número: traer las
 * cuatro listas para contar una sería trabajo de más en la pantalla que más se abre.
 */
export async function countPendingRequests(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(contacts)
    .where(
      and(
        eq(contacts.status, 'pendiente'),
        // Solo las que me enviaron: las que yo envié no esperan nada de mí.
        ne(contacts.requesterId, userId),
        or(eq(contacts.userAId, userId), eq(contacts.userBId, userId)),
      ),
    );

  return row?.total ?? 0;
}

/**
 * `true` si dos personas son contactos aceptados.
 *
 * La necesitará FR-044 en la Fase 10 para decidir si pueden escribirse. Se expone desde
 * ahora para que esa fase la use en lugar de escribir su propia lectura del estado.
 */
export async function areContacts(userId: string, otherId: string): Promise<boolean> {
  const relation = await findRelation(userId, otherId);
  return areConnected(viewpointOf(relation, userId));
}
