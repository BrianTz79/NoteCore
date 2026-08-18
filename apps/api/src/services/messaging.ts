import { and, desc, eq, gt, isNull, lt, ne, or, sql } from 'drizzle-orm';
import {
  MESSAGE_PAGE_SIZE,
  contactViewpoint,
  messagingBlockedReason,
  orderedPair,
  type Conversation,
  type ConversationSummary,
  type ContactStatus,
  type ContactViewpoint,
  type Message,
  type MessagePageInput,
  type MessagingBlockedReason,
  type SendMessageInput,
  type UnreadSummary,
  type UserSearchResult,
} from '@notecore/shared';
import { db } from '../db/client.js';
import {
  contacts,
  conversations,
  messages,
  users,
  type ConversationRow,
  type MessageRow,
  type UserRow,
} from '../db/schema.js';
import { errors, isUniqueViolation } from '../lib/errors.js';
import { publish } from './live.js';

/**
 * Lógica de la mensajería (FR-043, FR-044).
 *
 * Principio II: **si dos personas pueden escribirse se decide aquí**, y se decide en cada
 * envío consultando la relación real. Los clientes pintan el campo de texto según lo que
 * llega en `blockedReason`, pero que lo hayan pintado no autoriza nada.
 *
 * Principio III: quien escribe sale siempre del token, y toda lectura de una conversación
 * comprueba que quien pregunta sea una de las dos partes. Es la superficie más delicada del
 * proyecto: aquí no se enseña un perfil recortado como en la Fase 8, se enseña lo que dos
 * personas se dijeron en privado, y un fallo de alcance no tiene grados —o es tuyo o no lo
 * es—.
 *
 * ## La decisión que gobierna el módulo
 *
 * **No se guarda si una conversación está permitida.** FR-044 se resuelve preguntando por la
 * relación en cada envío, con la misma `messagingBlockedReason` que los clientes usan para
 * pintar. Guardar un `permitida` en la fila sería una copia del estado de contacto que
 * quedaría vieja en cuanto alguien bloqueara —y entonces el bloqueo dejaría de surtir efecto
 * justo en el momento en que más importa—.
 */

/* ─────────────────────────── La relación (FR-044) ─────────────────────────── */

/**
 * El punto de vista de una persona sobre su relación con otra.
 *
 * Consulta `contacts` —la tabla de la Fase 8— en lugar de guardar nada propio. Es lo que
 * hace que bloquear surta efecto **inmediato** sobre las conversaciones ya abiertas, sin que
 * la mensajería tenga que enterarse de nada ni mantener copia de un estado ajeno.
 */
async function viewpointBetween(userId: string, otherId: string): Promise<ContactViewpoint> {
  const [a, b] = orderedPair(userId, otherId);

  const rows = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.userAId, a), eq(contacts.userBId, b)))
    .limit(1);

  const relation = rows[0];

  return contactViewpoint(
    relation === undefined
      ? null
      : {
          status: relation.status as ContactStatus,
          requesterId: relation.requesterId,
          blockedById: relation.blockedById,
        },
    userId,
  );
}

/**
 * Por qué no se puede escribir a alguien, o `null` si sí se puede (FR-044).
 *
 * Es la comprobación que hay que pasar antes de escribir un mensaje, y la misma cuyo
 * resultado viaja a los clientes para que pinten el campo de texto o la explicación.
 */
async function blockedReasonFor(
  userId: string,
  otherId: string,
): Promise<MessagingBlockedReason | null> {
  return messagingBlockedReason(await viewpointBetween(userId, otherId));
}

/* ─────────────────────────── Composición ─────────────────────────── */

/** Compone un mensaje tal como lo ve uno de los dos lados. */
function toMessage(row: MessageRow, viewerId: string, otherReadAt: Date | null): Message {
  const isOwn = row.senderId === viewerId;
  const deleted = row.deletedAt !== null;

  return {
    id: row.id,
    conversationId: row.conversationId,
    isOwn,
    // De un mensaje borrado no viaja el texto: se vació al borrarlo y el hueco lo pinta el
    // cliente con su propio texto.
    text: deleted ? '' : row.text,
    sentAt: row.sentAt,
    /**
     * El acuse solo tiene sentido en los propios (FR-043).
     *
     * De los recibidos, quien lee es uno mismo, y el momento en que uno lee su propio hilo no
     * es información para nadie. Se deriva de la marca del **otro** lado en lugar de guardar
     * una columna por mensaje: leer es siempre "hasta aquí".
     */
    readAt:
      isOwn && otherReadAt !== null && row.sentAt.getTime() <= otherReadAt.getTime()
        ? otherReadAt
        : null,
    deleted,
  };
}

/** El resultado de búsqueda de la otra persona, con la relación ya resuelta. */
function toUser(
  row: Pick<UserRow, 'id' | 'username' | 'displayName'>,
  viewpoint: ContactViewpoint,
): UserSearchResult {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    viewpoint,
  };
}

/** Hasta cuándo ha leído cada lado, resuelto desde el par ordenado. */
function readMarks(
  row: ConversationRow,
  viewerId: string,
): { readonly mine: Date | null; readonly theirs: Date | null } {
  const viewerIsA = row.userAId === viewerId;
  return {
    mine: viewerIsA ? row.readByAAt : row.readByBAt,
    theirs: viewerIsA ? row.readByBAt : row.readByAAt,
  };
}

/** Cuántos mensajes de la otra persona no ha leído quien mira. */
async function countUnread(conversationId: string, viewerId: string, mine: Date | null): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        // Los propios nunca cuentan como sin leer.
        ne(messages.senderId, viewerId),
        // Los borrados tampoco: un hueco que dice "mensaje eliminado" no es algo que leer.
        isNull(messages.deletedAt),
        ...(mine === null ? [] : [gt(messages.sentAt, mine)]),
      ),
    );

  return row?.total ?? 0;
}

/* ─────────────────────────── La conversación ─────────────────────────── */

/** Busca a alguien por su `@usuario`. */
async function findByUsername(username: string): Promise<UserRow> {
  const user = await db.query.users.findFirst({ where: eq(users.username, username) });
  if (!user) throw errors.noEncontrado('No encontramos a esa persona.');
  return user;
}

/** La conversación entre dos personas, o `null` si nunca se han escrito. */
async function findConversation(userId: string, otherId: string): Promise<ConversationRow | null> {
  const [a, b] = orderedPair(userId, otherId);

  const rows = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.userAId, a), eq(conversations.userBId, b)))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * La conversación entre dos personas, creándola si no existía.
 *
 * Solo se llama al **enviar**, nunca al abrir la pantalla: crear la fila por mirar dejaría un
 * hilo vacío por cada vez que alguien entra y sale de un perfil.
 *
 * La carrera —dos personas escribiéndose por primera vez en el mismo instante— la resuelve el
 * índice único, igual que en las solicitudes de contacto de la Fase 8: quien pierde lee la
 * fila que quedó, que expresa exactamente lo mismo que la que no se pudo insertar.
 */
async function ensureConversation(userId: string, otherId: string): Promise<ConversationRow> {
  const existing = await findConversation(userId, otherId);
  if (existing !== null) return existing;

  const [a, b] = orderedPair(userId, otherId);

  try {
    const [created] = await db.insert(conversations).values({ userAId: a, userBId: b }).returning();
    if (!created) throw new Error('No se pudo crear la conversación');
    return created;
  } catch (error) {
    if (isUniqueViolation(error, 'conversations_pair_unique')) {
      const winner = await findConversation(userId, otherId);
      if (winner) return winner;
    }
    throw error;
  }
}

/** Compone el resumen de una conversación, con su relación y sus conteos resueltos. */
async function toSummary(
  row: ConversationRow,
  viewerId: string,
  other: Pick<UserRow, 'id' | 'username' | 'displayName'>,
): Promise<ConversationSummary> {
  const viewpoint = await viewpointBetween(viewerId, other.id);
  const { mine, theirs } = readMarks(row, viewerId);

  const [lastRows, unreadCount] = await Promise.all([
    db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, row.id))
      .orderBy(desc(messages.sentAt))
      .limit(1),
    countUnread(row.id, viewerId, mine),
  ]);

  const last = lastRows[0];

  return {
    id: row.id,
    user: toUser(other, viewpoint),
    lastMessage: last === undefined ? null : toMessage(last, viewerId, theirs),
    unreadCount,
    blockedReason: messagingBlockedReason(viewpoint),
    updatedAt: row.updatedAt,
  };
}

/**
 * Las conversaciones de alguien, la más reciente primero (FR-043).
 *
 * **Las de personas que ya no son contactos siguen apareciendo**, con su explicación y sin
 * campo de texto. Esconderlas al eliminar un contacto borraría de la vista lo que ambos se
 * dijeron, y eso es historial que no le toca destruir a una operación de rutina —el mismo
 * criterio del Principio VI—.
 *
 * **Las bloqueadas por mí también**: es donde uno va a comprobar a quién bloqueó. Lo que no
 * aparece son las conversaciones con quien me bloqueó a mí, por lo mismo de siempre: verla
 * desaparecer sería enterarse del bloqueo.
 */
export async function listConversations(
  userId: string,
): Promise<readonly ConversationSummary[]> {
  const rows = await db
    .select({
      conversation: conversations,
      other: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
      },
    })
    .from(conversations)
    .innerJoin(
      users,
      // Se une con **la otra** persona: la de la columna que no es la del usuario.
      or(
        and(eq(conversations.userAId, userId), eq(users.id, conversations.userBId)),
        and(eq(conversations.userBId, userId), eq(users.id, conversations.userAId)),
      ),
    )
    .where(or(eq(conversations.userAId, userId), eq(conversations.userBId, userId)))
    .orderBy(desc(conversations.updatedAt));

  const summaries = await Promise.all(
    rows.map((row) => toSummary(row.conversation, userId, row.other)),
  );

  // A quien me bloqueó no se le enseña la conversación: verla desaparecer de la lista sería
  // enterarse del bloqueo, que es justo lo que la Fase 8 decidió no comunicar.
  return summaries.filter((summary) => summary.user.viewpoint !== 'bloqueada_por_otro');
}

/**
 * La conversación con alguien y su página de mensajes (FR-043).
 *
 * Si nunca se han escrito devuelve una conversación **vacía** en lugar de un 404: no haber
 * hablado todavía no es un error, es el estado normal la primera vez que se abre un hilo. Y
 * no escribe nada: la fila se crea al enviar el primer mensaje, no al mirar.
 *
 * A quien fue bloqueado se le devuelve el hilo con `no_contacto`, no un 404 ni un hilo
 * vacío: es lo mismo que vería ante alguien que nunca fue su contacto (FR-044).
 */
export async function getConversation(
  userId: string,
  username: string,
  page: MessagePageInput = {},
): Promise<Conversation> {
  const other = await findByUsername(username);

  if (other.id === userId) {
    throw errors.validacion('No puedes escribirte a ti mismo.');
  }

  const viewpoint = await viewpointBetween(userId, other.id);
  const blockedReason = messagingBlockedReason(viewpoint);
  const row = await findConversation(userId, other.id);

  if (row === null) {
    /**
     * Todavía no hay conversación: se devuelve una vacía **sin identificador**.
     *
     * El identificador vacío es lo que le dice al cliente que aquí no hay nada que marcar
     * como leído ni a lo que suscribirse. En cuanto se envíe el primer mensaje, la respuesta
     * traerá el de verdad.
     */
    return {
      id: '',
      user: toUser(other, viewpoint),
      lastMessage: null,
      unreadCount: 0,
      blockedReason,
      updatedAt: new Date(),
      messages: [],
      hasMore: false,
    };
  }

  // Solo hace falta la marca del **otro** lado: es la que decide si mis mensajes salen ya
  // leídos. La mía la usa `toSummary` para contar lo no leído, y la lee de la fila.
  const { theirs } = readMarks(row, userId);
  const limit = page.limite ?? MESSAGE_PAGE_SIZE;

  /**
   * El cursor ancla la página a un mensaje concreto.
   *
   * Se resuelve a su fecha de envío y se piden los **anteriores**. Paginar por número de
   * página no funcionaría: el hilo crece por abajo mientras se lee, así que "la página 2"
   * significa cosas distintas según cuántos mensajes hayan llegado entre una petición y la
   * siguiente, y se repetirían o se saltarían mensajes.
   */
  let before: Date | null = null;
  if (page.antesDe !== undefined) {
    const [cursor] = await db
      .select({ sentAt: messages.sentAt })
      .from(messages)
      .where(and(eq(messages.id, page.antesDe), eq(messages.conversationId, row.id)))
      .limit(1);

    // Un cursor que no es de esta conversación se ignora en vez de fallar: la página más
    // reciente es una respuesta correcta a "no sé por dónde iba".
    before = cursor?.sentAt ?? null;
  }

  /**
   * Se pide **uno más** de los que caben.
   *
   * Es lo que permite responder `hasMore` con certeza. Sin ese uno extra, una página
   * exactamente llena y el final del hilo son indistinguibles, y el cliente pintaría "cargar
   * anteriores" sobre un hilo que ya está entero.
   */
  const rows = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, row.id),
        ...(before === null ? [] : [lt(messages.sentAt, before)]),
      ),
    )
    .orderBy(desc(messages.sentAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page_ = hasMore ? rows.slice(0, limit) : rows;

  const summary = await toSummary(row, userId, other);

  return {
    ...summary,
    // Se invierte aquí y no en el cliente: los mensajes se leen del más antiguo al más
    // reciente, y que cada cliente se acuerde de darle la vuelta es una ocasión de que uno
    // se olvide.
    messages: [...page_].reverse().map((message) => toMessage(message, userId, theirs)),
    hasMore,
  };
}

/* ─────────────────────────── Enviar (FR-043, FR-044) ─────────────────────────── */

/**
 * Envía un mensaje (FR-043).
 *
 * **Aquí es donde FR-044 se hace efectivo.** La relación se consulta antes de escribir nada,
 * y se consulta ahora —no se lee de una copia guardada—, así que un bloqueo puesto hace un
 * segundo ya impide este envío. Que el cliente hubiera pintado el campo de texto no cuenta:
 * quien manda la petición puede no ser el cliente.
 *
 * El identificador puede venir propuesto, con la mecánica de la Fase 9: es lo que hace el
 * envío idempotente cuando la señal se cae con el mensaje ya escrito en el servidor. Un
 * mensaje duplicado en un hilo es de los errores más visibles que existen.
 */
export async function sendMessage(
  userId: string,
  username: string,
  input: SendMessageInput,
): Promise<Message> {
  const other = await findByUsername(username);

  if (other.id === userId) {
    throw errors.validacion('No puedes escribirte a ti mismo.');
  }

  const blockedReason = await blockedReasonFor(userId, other.id);
  if (blockedReason !== null) {
    /**
     * 403 y no 400: el mensaje está bien formado, lo que falta es el permiso para mandarlo.
     *
     * El motivo viaja en `fields` bajo `relacion` para que el cliente lo lea sin analizar el
     * texto, igual que hacen los compartidos no disponibles de la Fase 6: cada motivo lleva
     * a una acción distinta —esperar, agregar o desbloquear—.
     */
    throw errors.mensajeNoPermitido(blockedReason);
  }

  const conversation = await ensureConversation(userId, other.id);

  /**
   * Un identificador propuesto que ya existe se **devuelve** en lugar de escribirse otra vez.
   *
   * Es el reenvío de la Fase 9: la petición salió, se escribió, y la respuesta se perdió por
   * el camino. Se comprueba además que el mensaje sea de esta conversación y de este autor,
   * porque sin eso un identificador ajeno devolvería el mensaje de otras personas —el
   * Principio III roto por una ruta que ni siquiera escribe—.
   */
  if (input.id !== undefined) {
    const [existing] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, input.id))
      .limit(1);

    if (existing !== undefined) {
      if (existing.senderId !== userId || existing.conversationId !== conversation.id) {
        throw errors.validacion('Ese identificador ya está en uso.');
      }
      const { theirs } = readMarks(conversation, userId);
      return toMessage(existing, userId, theirs);
    }
  }

  const [created] = await db
    .insert(messages)
    .values({
      ...(input.id !== undefined ? { id: input.id } : {}),
      conversationId: conversation.id,
      senderId: userId,
      text: input.text,
    })
    .returning();

  if (!created) throw new Error('No se pudo enviar el mensaje');

  /**
   * La fecha de la conversación se mueve con cada mensaje.
   *
   * Es lo que ordena la bandeja. Se escribe en vez de derivarse con un `MAX(sent_at)` por
   * conversación, porque esa derivación sería la consulta de cada carga de la lista.
   */
  const [touched] = await db
    .update(conversations)
    .set({ updatedAt: created.sentAt })
    .where(eq(conversations.id, conversation.id))
    .returning();

  const row = touched ?? conversation;
  const { theirs } = readMarks(row, userId);

  /**
   * Se avisa a **los dos** por el canal en vivo, cada uno con su punto de vista.
   *
   * También al autor: es lo que mantiene sus otras sesiones al día —quien escribe desde la
   * web con la app abierta ve aparecer su mensaje en el teléfono—. Y como `isOwn` se resuelve
   * por destinatario, cada uno lo recibe con el lado correcto en vez de tener que deducirlo.
   */
  publish(userId, {
    tipo: 'mensaje',
    conversationId: conversation.id,
    message: toMessage(created, userId, theirs),
  });

  const theirReadMark = readMarks(row, other.id).theirs;
  publish(other.id, {
    tipo: 'mensaje',
    conversationId: conversation.id,
    message: toMessage(created, other.id, theirReadMark),
  });

  return toMessage(created, userId, theirs);
}

/* ─────────────────────────── Leer ─────────────────────────── */

/**
 * Marca como leído todo lo recibido en una conversación.
 *
 * Se guarda una marca de tiempo por lado, no una columna por mensaje: leer es siempre "hasta
 * aquí", así que abrir un hilo de mil mensajes es una escritura de una fila en vez de mil.
 *
 * La marca **nunca retrocede**: dos pestañas abiertas marcando a la vez podrían escribir una
 * fecha anterior a la que ya había, y mensajes ya leídos volverían a contar como sin leer.
 */
export async function markConversationRead(
  userId: string,
  conversationId: string,
): Promise<ConversationSummary> {
  const [row] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        // Principio III: solo se marca lo propio. Sin esto, un identificador ajeno dejaría
        // marcar como leída la conversación de otras personas.
        or(eq(conversations.userAId, userId), eq(conversations.userBId, userId)),
      ),
    )
    .limit(1);

  if (!row) throw errors.noEncontrado('Esa conversación no existe.');

  const viewerIsA = row.userAId === userId;
  const otherId = viewerIsA ? row.userBId : row.userAId;
  const now = new Date();

  const [updated] = await db
    .update(conversations)
    .set(viewerIsA ? { readByAAt: now } : { readByBAt: now })
    .where(eq(conversations.id, row.id))
    .returning();

  const fresh = updated ?? row;

  const other = await db.query.users.findFirst({ where: eq(users.id, otherId) });
  if (!other) throw errors.noEncontrado('Esa persona ya no existe.');

  /**
   * Se avisa al otro lado de que lo suyo quedó leído.
   *
   * Solo al otro: que a uno le confirmen que ha leído lo que acaba de leer no es información.
   */
  publish(otherId, { tipo: 'leidos', conversationId: row.id, readAt: now });

  return toSummary(fresh, userId, other);
}

/* ─────────────────────────── Borrar ─────────────────────────── */

/**
 * Borra un mensaje propio.
 *
 * Deja el hueco marcado y **vacía el texto**: el hilo conserva su forma —las respuestas no
 * quedan colgando de nada— y lo que el autor retiró no sigue guardado. Quien ya lo leyó no
 * puede desleerlo, así que fingir que nunca se dijo sería mentirle a la otra persona; por eso
 * el hueco se ve en lugar de desaparecer.
 *
 * Principio III: el `WHERE` lleva el autor, así que nadie borra el mensaje de otro.
 */
export async function deleteMessage(userId: string, messageId: string): Promise<Message> {
  const [row] = await db
    .select()
    .from(messages)
    .where(and(eq(messages.id, messageId), eq(messages.senderId, userId)))
    .limit(1);

  if (!row) throw errors.noEncontrado('Ese mensaje no existe.');

  if (row.deletedAt !== null) {
    // Ya estaba borrado: se devuelve tal cual en vez de fallar. Volver a tocar "eliminar" en
    // una pantalla que no se había refrescado no es un error del usuario.
    return toMessage(row, userId, null);
  }

  const [deleted] = await db
    .update(messages)
    .set({ deletedAt: new Date(), text: '' })
    .where(eq(messages.id, row.id))
    .returning();

  if (!deleted) throw errors.noEncontrado('Ese mensaje no existe.');

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, row.conversationId))
    .limit(1);

  if (conversation !== undefined) {
    const otherId = conversation.userAId === userId ? conversation.userBId : conversation.userAId;
    // Los dos lados: quien borra puede tener otra sesión abierta, y quien lo recibió necesita
    // ver el hueco sin recargar.
    for (const target of [userId, otherId]) {
      publish(target, {
        tipo: 'borrado',
        conversationId: row.conversationId,
        messageId: row.id,
      });
    }
  }

  return toMessage(deleted, userId, null);
}

/* ─────────────────────────── Conteos ─────────────────────────── */

/**
 * Cuántos mensajes sin leer hay en total, para el aviso del inicio.
 *
 * Una consulta propia y no `listConversations` porque el inicio solo necesita el número:
 * traer la bandeja entera con su último mensaje y su relación para contar sería trabajo de
 * más en la pantalla que más se abre. Es el mismo criterio que `countPendingRequests` en la
 * Fase 8.
 */
export async function countUnreadMessages(userId: string): Promise<UnreadSummary> {
  /**
   * Se cuenta con una sola consulta, agrupando por conversación.
   *
   * La marca de lectura que aplica depende de qué lado del par ordenado es el usuario, así
   * que la condición se escribe con un `CASE`: hacerlo en dos consultas —una por lado— y
   * sumarlas daría lo mismo a cambio de dos viajes.
   */
  const rows = await db
    .select({
      conversationId: messages.conversationId,
      total: sql<number>`count(*)::int`,
    })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(
      and(
        or(eq(conversations.userAId, userId), eq(conversations.userBId, userId)),
        ne(messages.senderId, userId),
        isNull(messages.deletedAt),
        sql`${messages.sentAt} > coalesce(
          case when ${conversations.userAId} = ${userId}
            then ${conversations.readByAAt}
            else ${conversations.readByBAt}
          end,
          '-infinity'::timestamptz
        )`,
      ),
    )
    .groupBy(messages.conversationId);

  return {
    total: rows.reduce((sum, row) => sum + row.total, 0),
    conversations: rows.length,
  };
}

/* ─────────────────────────── Avisos de la relación ─────────────────────────── */

/**
 * Avisa por el canal en vivo de que la relación con alguien cambió (FR-044).
 *
 * La llama la sección social al aceptar, eliminar, bloquear o desbloquear. Sin este aviso,
 * quien tuviera el hilo abierto seguiría viendo el campo de texto después de que lo
 * bloquearan y descubriría el cambio al fallar el envío —que es enterarse por el peor
 * camino—.
 *
 * **A cada lado se le manda su propia versión**, y ahí está el cuidado: quien bloquea recibe
 * `bloqueada_por_mi` con su explicación, y a quien fue bloqueado le llega `no_contacto`, lo
 * mismo que vería ante un desconocido. El bloqueo sigue sin anunciarse, también aquí.
 *
 * Si los dos nunca se han escrito no hay nada que avisar: no hay conversación abierta que
 * corregir.
 */
export async function notifyRelationChanged(userId: string, otherId: string): Promise<void> {
  const conversation = await findConversation(userId, otherId);
  if (conversation === null) return;

  const [mine, theirs] = await Promise.all([
    blockedReasonFor(userId, otherId),
    blockedReasonFor(otherId, userId),
  ]);

  publish(userId, {
    tipo: 'relacion',
    conversationId: conversation.id,
    blockedReason: mine,
  });
  publish(otherId, {
    tipo: 'relacion',
    conversationId: conversation.id,
    blockedReason: theirs,
  });
}
