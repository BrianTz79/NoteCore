import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';
import {
  canSeeProfileDetails,
  contactViewpoint,
  orderedPair,
  type CreateReportParsed,
  type Report,
  type ReportList,
  type ReportReason,
  type ReportReceipt,
  type ReportQueryParsed,
  type ReportStatus,
  type ReportTarget,
  type ReportUser,
  type ProfileVisibility,
  type ReviewReportInput,
} from '@notecore/shared';
import { db } from '../db/client.js';
import {
  contacts,
  conversations,
  messages,
  posts,
  reports,
  users,
  type ReportRow,
  type UserRow,
} from '../db/schema.js';
import { errors, isUniqueViolation } from '../lib/errors.js';

/**
 * Reportes de contenido (Fase 21).
 *
 * Principio II: qué se puede reportar, quién puede reportarlo y a quién se le atribuye lo
 * reportado se decide **aquí**. Los clientes solo ofrecen el botón y mandan el motivo.
 *
 * ## Las dos reglas que gobiernan el módulo
 *
 * **1. Solo se reporta lo que uno puede ver.** Antes de aceptar un reporte se comprueba que
 * quien reporta tenía acceso a ese contenido — la misma comprobación que hace la pantalla que
 * se lo enseñó. Sin esto, `/reports` sería un oráculo: mandando identificadores al azar y
 * mirando si responden 404 o 201, cualquiera podría averiguar qué publicaciones y qué
 * mensajes existen, y de paso leer su texto en el panel si algún día tuviera acceso. Un
 * formulario de denuncia es exactamente el sitio donde nadie espera una fuga.
 *
 * **2. Al autor lo resuelve el servidor.** Nunca viaja en la petición. Principio III llevado
 * a su conclusión: si el cliente dijera a quién acusa, bastaría con cambiar ese campo para
 * levantar reportes contra cualquiera.
 */

/* ─────────────────────────── Piezas comunes ─────────────────────────── */

/** Una persona dentro de un reporte. */
function toReportUser(row: Pick<UserRow, 'id' | 'username' | 'displayName'>): ReportUser {
  return { id: row.id, username: row.username, displayName: row.displayName };
}

/** La fila, ya con las dos personas resueltas, tal como la lee el panel. */
function toReport(
  row: ReportRow,
  reporter: Pick<UserRow, 'id' | 'username' | 'displayName'>,
  author: Pick<UserRow, 'id' | 'username' | 'displayName'>,
): Report {
  return {
    id: row.id,
    target: row.target as ReportTarget,
    targetId: row.targetId,
    targetText: row.targetText,
    reporter: toReportUser(reporter),
    author: toReportUser(author),
    reason: row.reason as ReportReason,
    detail: row.detail,
    status: row.status as ReportStatus,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
  };
}

/**
 * El contenido señalado, ya comprobado que quien reporta puede verlo.
 *
 * Devuelve el texto congelado y quién lo escribió. Las dos superficies se resuelven aquí, en
 * una función, para que la regla 1 no dependa de que cada rama se acuerde de comprobar.
 */
interface Senalado {
  readonly text: string;
  readonly authorId: string;
}

/**
 * Lo mismo que responde el resto del proyecto cuando algo no existe **o no se puede ver**.
 *
 * Es el mismo mensaje en los dos casos a propósito, con el criterio de `requireAdmin` en la
 * Fase 25: distinguirlos convertiría esta ruta en la vía para averiguar qué existe.
 */
function noSeEncuentra(): never {
  throw errors.noEncontrado('No encontramos ese contenido.');
}

/**
 * Resuelve una publicación reportada.
 *
 * La visibilidad se comprueba con `canSeeProfileDetails`, **la misma función** que usan el
 * perfil, `listUserPosts` y el muro. Es lo que mantiene una sola definición de "puedo ver
 * esto" en el proyecto: si mañana cambia lo que `aceptada` permite ver, cambia en un sitio y
 * esta ruta obedece sin tocarla.
 */
async function resolvePost(reporterId: string, postId: string): Promise<Senalado> {
  const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
  if (!post) noSeEncuentra();

  /*
   * Reportarse a uno mismo no tiene sentido, y se rechaza antes que nada: es la única forma
   * de que alguien meta su propio texto en la cola de moderación de otro.
   */
  if (post.userId === reporterId) {
    throw errors.validacion('No puedes reportar tu propio contenido.');
  }

  const author = await db.query.users.findFirst({ where: eq(users.id, post.userId) });
  if (!author || author.anonymizedAt !== null) noSeEncuentra();

  const [a, b] = orderedPair(reporterId, post.userId);
  const relation = await db.query.contacts.findFirst({
    where: and(eq(contacts.userAId, a), eq(contacts.userBId, b)),
  });

  const viewpoint = contactViewpoint(
    relation
      ? {
          status: relation.status as 'pendiente' | 'aceptada' | 'bloqueada',
          requesterId: relation.requesterId,
          blockedById: relation.blockedById,
        }
      : null,
    reporterId,
  );

  const visible = canSeeProfileDetails(
    author.profileVisibility as ProfileVisibility,
    viewpoint,
    false,
  );
  if (!visible) noSeEncuentra();

  return { text: post.text, authorId: post.userId };
}

/**
 * Resuelve un mensaje reportado.
 *
 * Aquí la comprobación de acceso es más simple y más estricta que en una publicación: hay que
 * ser **una de las dos personas de la conversación**, y no la que lo escribió. La relación de
 * contacto no entra en juego —quien bloqueó a alguien sigue teniendo su hilo y sigue debiendo
 * poder reportar lo que le escribieron antes—: eso es justo el caso en el que reportar más
 * importa.
 */
async function resolveMessage(reporterId: string, messageId: string): Promise<Senalado> {
  const message = await db.query.messages.findFirst({ where: eq(messages.id, messageId) });
  if (!message) noSeEncuentra();

  if (message.senderId === reporterId) {
    throw errors.validacion('No puedes reportar tu propio contenido.');
  }

  /*
   * Un mensaje ya borrado por su autor no se puede reportar: su texto se vació al borrarlo
   * (ver `messages.deletedAt`), así que no hay nada que congelar. Guardar un reporte con el
   * texto en blanco sería un aviso que no dice nada.
   */
  if (message.deletedAt !== null) noSeEncuentra();

  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, message.conversationId),
  });
  if (!conversation) noSeEncuentra();

  const participa =
    conversation.userAId === reporterId || conversation.userBId === reporterId;
  if (!participa) noSeEncuentra();

  return { text: message.text, authorId: message.senderId };
}

/* ─────────────────────────── Reportar ─────────────────────────── */

/**
 * Registra un reporte.
 *
 * Devuelve un acuse y no el reporte: quien reporta no consulta después el estado de su
 * denuncia. Saber si algo se revisó o se descartó es información sobre lo que se hizo con un
 * tercero, y ofrecerla convertiría el formulario en una forma de averiguar si a alguien se le
 * sancionó.
 */
export async function createReport(
  reporterId: string,
  input: CreateReportParsed,
): Promise<ReportReceipt> {
  const senalado =
    input.target === 'publicacion'
      ? await resolvePost(reporterId, input.targetId)
      : await resolveMessage(reporterId, input.targetId);

  try {
    const [created] = await db
      .insert(reports)
      .values({
        target: input.target,
        targetId: input.targetId,
        targetText: senalado.text,
        reporterId,
        authorId: senalado.authorId,
        reason: input.reason,
        detail: input.detail ?? null,
      })
      .returning();

    if (!created) throw errors.noEncontrado('No se pudo registrar el reporte.');

    return { id: created.id, yaReportado: false };
  } catch (error) {
    /**
     * Ya lo había reportado antes.
     *
     * No es un error para quien reporta: tocó el botón dos veces, probablemente porque no vio
     * pasar nada la primera. Se le confirma que su aviso está registrado en lugar de decirle
     * que algo falló —que es lo que le haría buscar otra forma de insistir—.
     *
     * El índice único es el que decide, no una consulta previa: dos toques seguidos pasarían
     * ambos la comprobación antes de que ninguno escribiera.
     */
    if (isUniqueViolation(error)) {
      const previo = await db.query.reports.findFirst({
        where: and(
          eq(reports.reporterId, reporterId),
          eq(reports.target, input.target),
          eq(reports.targetId, input.targetId),
        ),
      });
      if (previo) return { id: previo.id, yaReportado: true };
    }
    throw error;
  }
}

/* ─────────────────────────── Leerlos, desde el panel ─────────────────────────── */

/**
 * Los reportes recibidos.
 *
 * Se ordenan por fecha descendente y no por estado: quien abre el panel quiere ver lo último
 * que pasó, y filtrar por `pendiente` ya está disponible cuando lo que se quiere es la cola
 * de trabajo.
 *
 * **Se comprueba si el original sigue existiendo** en cada lectura, en lugar de guardarlo al
 * reportar: entre el reporte y la revisión es justo cuando el autor lo borra, y un `targetId`
 * escrito hace tres días no diría la verdad. La copia del texto no depende de eso, que es la
 * razón de guardarla.
 */
export async function listReports(query: ReportQueryParsed): Promise<ReportList> {
  const rows = await db
    .select({
      report: reports,
      reporterUser: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
      },
    })
    .from(reports)
    .innerJoin(users, eq(users.id, reports.reporterId))
    .where(query.status ? eq(reports.status, query.status) : undefined)
    .orderBy(desc(reports.createdAt))
    .limit(query.limit);

  /*
   * Los autores se traen en una segunda consulta y no en un segundo JOIN a `users`.
   *
   * Con dos JOIN a la misma tabla hay que aliasarla, y un alias mal puesto en Drizzle no
   * falla: devuelve las columnas de la otra copia, y el panel mostraría a quien reportó en el
   * sitio de a quien reportaron. Es exactamente el tipo de resultado falso silencioso que la
   * subconsulta correlacionada del panel de la Fase 25 ya produjo una vez, y no vale la pena
   * arriesgarlo para ahorrar una consulta sobre una lista de cincuenta filas.
   */
  const autorIds = [...new Set(rows.map((row) => row.report.authorId))];
  const autores =
    autorIds.length === 0
      ? []
      : await db
          .select({
            id: users.id,
            username: users.username,
            displayName: users.displayName,
          })
          .from(users)
          .where(inArray(users.id, autorIds));

  const autoresPorId = new Map(autores.map((autor) => [autor.id, autor]));

  const pendientes = await countPendingReports();

  const resueltos = await Promise.all(
    rows.map(async (row) => {
      const autor = autoresPorId.get(row.report.authorId);
      // No debería faltar —la clave foránea lo garantiza—, pero si faltara, omitir la fila es
      // preferible a pintar un reporte sin acusado.
      if (!autor) return null;

      const sigueExistiendo = await originalExiste(
        row.report.target as ReportTarget,
        row.report.targetId,
      );

      return toReport(
        sigueExistiendo ? row.report : { ...row.report, targetId: null },
        row.reporterUser,
        autor,
      );
    }),
  );

  return {
    reports: resueltos.filter((r): r is Report => r !== null),
    pendientes,
  };
}

/** Si el contenido señalado sigue estando donde estaba. */
async function originalExiste(target: ReportTarget, targetId: string | null): Promise<boolean> {
  if (targetId === null) return false;

  if (target === 'publicacion') {
    const row = await db.query.posts.findFirst({
      where: eq(posts.id, targetId),
      columns: { id: true },
    });
    return row !== undefined;
  }

  // Un mensaje borrado por su autor cuenta como que ya no está: su texto se vació.
  const row = await db.query.messages.findFirst({
    where: and(eq(messages.id, targetId), isNull(messages.deletedAt)),
    columns: { id: true },
  });
  return row !== undefined;
}

/**
 * Marca un reporte como revisado o descartado.
 *
 * Se guarda **quién** lo revisó además de cuándo. Hoy hay una sola cuenta administradora y el
 * dato parece redundante; el día que haya dos, un estado sin autor obliga a preguntar en voz
 * alta quién cerró un caso, y esa es información que ya no se puede recuperar.
 */
export async function reviewReport(
  adminId: string,
  reportId: string,
  input: ReviewReportInput,
): Promise<Report> {
  const [updated] = await db
    .update(reports)
    .set({
      status: input.status,
      reviewedAt: new Date(),
      reviewedById: adminId,
    })
    .where(eq(reports.id, reportId))
    .returning();

  if (!updated) throw errors.noEncontrado('Ese reporte no existe.');

  const reporter = await db.query.users.findFirst({
    where: eq(users.id, updated.reporterId),
    columns: { id: true, username: true, displayName: true },
  });
  const author = await db.query.users.findFirst({
    where: eq(users.id, updated.authorId),
    columns: { id: true, username: true, displayName: true },
  });

  if (!reporter || !author) throw errors.noEncontrado('Ese reporte no existe.');

  const sigueExistiendo = await originalExiste(
    updated.target as ReportTarget,
    updated.targetId,
  );

  return toReport(
    sigueExistiendo ? updated : { ...updated, targetId: null },
    reporter,
    author,
  );
}

/**
 * Cuántos reportes esperan revisión.
 *
 * La usa el resumen del panel (Fase 25) para poner el número junto a la sección, de modo que
 * quien lo abra vea que hay algo que mirar sin tener que ir a buscarlo.
 */
export async function countPendingReports(): Promise<number> {
  const [fila] = await db
    .select({ n: count() })
    .from(reports)
    .where(eq(reports.status, 'pendiente'));
  return fila?.n ?? 0;
}
