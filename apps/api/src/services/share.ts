import { and, eq, inArray, sql } from 'drizzle-orm';
import {
  SHARE_DEFAULT_TTL_DAYS,
  generateShareCode,
  normalizeName,
  shareStatus,
  shareUnavailableReason,
  sharePayloadCount,
  shareUrl,
  subjectColorForIndex,
  type AcceptShareParsed,
  type AgendaKind,
  type CalendarDate,
  type CreateShareInput,
  type Share,
  type ShareAcceptResult,
  type SharedAgendaItem,
  type SharedSubject,
  type SharePayload,
  type SharePreview,
  type ShareKind,
  type Weekday,
} from '@notecore/shared';
import { db } from '../db/client.js';
import {
  agendaItems,
  scheduleBlocks,
  shares,
  subjects,
  users,
  type ShareRow,
} from '../db/schema.js';
import { config } from '../config.js';
import { errors } from '../lib/errors.js';
import { getCurrentSemesterId } from './semester.js';

/**
 * Lógica de la compartición (FR-028 a FR-033).
 *
 * Principio II: qué se congela, cuándo caduca, si se puede aceptar y cómo se copia se decide
 * aquí. Los clientes solo presentan y confirman.
 * Principio III: el emisor sale del token; el receptor también. Un compartido es la única
 * superficie donde datos de una cuenta llegan a otra, y ocurre **solo** por copia explícita.
 * Principio IV: al aceptar se escriben filas nuevas en la cuenta del receptor. No queda
 * ningún vínculo con el original: ni clave foránea, ni identificador, ni referencia.
 */

/** PostgreSQL devuelve `time` como `HH:MM:SS`; el dominio lo usa como `HH:MM`. */
function toClockTime(value: string): string {
  return value.slice(0, 5);
}

/**
 * `date` de PostgreSQL como `YYYY-MM-DD`.
 *
 * Igual que en la agenda: cuando el driver devuelve `Date` se formatea con los componentes
 * locales y nunca con `toISOString()`, que pasa por UTC y en México restaría un día.
 */
function toCalendarDateValue(value: string | Date | null): CalendarDate | null {
  if (value === null) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  const year = String(value.getFullYear()).padStart(4, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Compone el compartido tal como lo ve su emisor, con las tres modalidades resueltas. */
function toShare(row: ShareRow): Share {
  const payload = row.payload as SharePayload;

  return {
    id: row.id,
    code: row.code,
    kind: row.kind as ShareKind,
    title: row.title,
    // El enlace lo compone el servidor para que app y web produzcan exactamente el mismo
    // (FR-032): es el que se codifica en el QR.
    url: shareUrl(config.webUrl, row.code),
    itemCount: sharePayloadCount(payload),
    status: shareStatus(row),
    acceptedCount: row.acceptedCount,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
  };
}

/* ─────────────────────────── Congelar el contenido ─────────────────────────── */

/**
 * Copia las materias seleccionadas a la forma que se guarda dentro del compartido (FR-029).
 *
 * Solo entran las materias **del emisor**: el `WHERE` lleva su `userId` además de los
 * identificadores. Sin eso, mandar el identificador de la materia de otra persona la
 * copiaría dentro de un compartido propio, y bastaría un enlace para leerla (Principio III).
 */
async function freezeSubjects(
  userId: string,
  subjectIds: readonly string[],
): Promise<readonly SharedSubject[]> {
  const subjectRows = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.userId, userId), inArray(subjects.id, [...subjectIds])));

  if (subjectRows.length === 0) {
    throw errors.validacion('No encontramos esas materias en tu horario.', [
      { field: 'subjectIds', message: 'No encontramos esas materias en tu horario' },
    ]);
  }

  const blockRows = await db
    .select()
    .from(scheduleBlocks)
    .where(
      and(
        eq(scheduleBlocks.userId, userId),
        inArray(scheduleBlocks.subjectId, subjectRows.map((row) => row.id)),
      ),
    );

  return subjectRows.map((row) => ({
    name: row.name,
    color: row.color,
    blocks: blockRows
      .filter((block) => block.subjectId === row.id)
      .map((block) => ({
        weekday: block.weekday as Weekday,
        startTime: toClockTime(block.startTime),
        endTime: toClockTime(block.endTime),
        room: block.room,
      })),
  }));
}

/**
 * Copia las actividades seleccionadas a la forma que se guarda dentro del compartido.
 *
 * La materia viaja como **nombre** y no como identificador: el del emisor no significa nada
 * en la cuenta del receptor. Al aceptar se busca por nombre, y si no aparece la actividad se
 * queda sin materia —un estado válido desde FR-018—.
 *
 * El estado de completado no se copia: se comparte lo que hay que hacer, no lo que el emisor
 * ya hizo. Una tarea que llegara marcada como entregada no le serviría de nada al receptor.
 */
async function freezeAgendaItems(
  userId: string,
  itemIds: readonly string[],
): Promise<readonly SharedAgendaItem[]> {
  const rows = await db
    .select({ item: agendaItems, subjectName: subjects.name })
    .from(agendaItems)
    .leftJoin(subjects, eq(agendaItems.subjectId, subjects.id))
    .where(and(eq(agendaItems.userId, userId), inArray(agendaItems.id, [...itemIds])));

  if (rows.length === 0) {
    throw errors.validacion('No encontramos esas actividades en tu agenda.', [
      { field: 'itemIds', message: 'No encontramos esas actividades en tu agenda' },
    ]);
  }

  return rows.map((row) => ({
    title: row.item.title,
    description: row.item.description,
    kind: row.item.kind as AgendaKind,
    subjectName: row.subjectName,
    dueDate: toCalendarDateValue(row.item.dueDate),
  }));
}

/* ─────────────────────────── Emisor ─────────────────────────── */

/**
 * Genera un compartido con el contenido seleccionado (FR-028, FR-029).
 *
 * El contenido se **congela** aquí: a partir de este momento, lo que el emisor haga con su
 * horario o su agenda no toca el compartido. Es lo que permite que el receptor vea en la
 * vista previa exactamente lo que va a recibir, aunque acepte una semana después.
 */
export async function createShare(
  userId: string,
  input: CreateShareInput,
): Promise<Share> {
  const payload: SharePayload =
    input.kind === 'horario'
      ? { kind: 'horario', subjects: await freezeSubjects(userId, input.subjectIds ?? []) }
      : { kind: 'agenda', items: await freezeAgendaItems(userId, input.itemIds ?? []) };

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SHARE_DEFAULT_TTL_DAYS);

  /**
   * Reintento ante colisión de código.
   *
   * Con 32^8 combinaciones la colisión es remotísima, pero la restricción única existe y
   * fallar con un 500 por azar sería el peor error posible de diagnosticar. Se reintenta con
   * un código nuevo en vez de comprobar antes de insertar: la comprobación previa tiene su
   * propia carrera entre dos peticiones simultáneas, y el índice único no.
   */
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const inserted = await db
        .insert(shares)
        .values({
          userId,
          code: generateShareCode(),
          kind: input.kind,
          title: input.title,
          payload,
          expiresAt,
        })
        .returning();

      const row = inserted[0];
      if (!row) throw new Error('El compartido no se insertó');

      return toShare(row);
    } catch (error) {
      const code = (error as { code?: string }).code;
      // 23505: violación de restricción única, es decir, el código ya existía.
      if (code !== '23505' || attempt === 4) throw error;
    }
  }

  throw new Error('No se pudo generar un código de compartición');
}

/** Los compartidos generados por el usuario, con su estado ya resuelto (FR-033). */
export async function listShares(userId: string): Promise<readonly Share[]> {
  const rows = await db.select().from(shares).where(eq(shares.userId, userId));

  // El orden lo pone `sortShares` en el cliente sobre el estado ya derivado: la caducidad no
  // está en ninguna columna que PostgreSQL pueda ordenar sin recalcularla.
  return rows.map(toShare);
}

/**
 * Revoca un compartido (FR-033).
 *
 * Marca la fila en vez de borrarla: quien abra el enlace después debe recibir "lo retiraron"
 * y no "no existe". Son mensajes distintos que llevan a acciones distintas —pedir uno nuevo
 * frente a revisar si tecleó mal el código—.
 *
 * Revocar dos veces no falla ni mueve la fecha: la primera revocación es la que cuenta.
 */
export async function revokeShare(userId: string, shareId: string): Promise<Share> {
  const rows = await db
    .select()
    .from(shares)
    .where(and(eq(shares.id, shareId), eq(shares.userId, userId)))
    .limit(1);

  const current = rows[0];
  if (!current) throw errors.noEncontrado('Ese compartido no existe.');

  if (current.revokedAt !== null) return toShare(current);

  const updated = await db
    .update(shares)
    .set({ revokedAt: new Date() })
    .where(and(eq(shares.id, shareId), eq(shares.userId, userId)))
    .returning();

  const row = updated[0];
  if (!row) throw errors.noEncontrado('Ese compartido no existe.');

  return toShare(row);
}

/* ─────────────────────────── Receptor ─────────────────────────── */

/**
 * Busca un compartido por su código y comprueba que se pueda usar (FR-033).
 *
 * Los tres motivos se distinguen a propósito —revocado, caducado y no encontrado— porque
 * cada uno lleva al receptor a hacer algo distinto. Un único "no disponible" lo dejaría sin
 * saber si pedir otro código o revisar el que tecleó.
 */
async function findUsableShare(code: string): Promise<ShareRow> {
  const rows = await db.select().from(shares).where(eq(shares.code, code)).limit(1);

  const row = rows[0];
  if (!row) throw errors.compartidoNoDisponible('no_encontrado');

  const reason = shareUnavailableReason(row);
  if (reason !== null) throw errors.compartidoNoDisponible(reason);

  return row;
}

/**
 * Vista previa de un compartido antes de aceptarlo (FR-030).
 *
 * Es de **solo lectura**: no copia nada ni incrementa el contador. El receptor ve lo que
 * recibiría y decide después, que es el escenario 2 de la historia de usuario 6.
 *
 * Exige sesión como el resto de la API: el contenido pertenece a alguien, y aunque el código
 * sea la credencial que da acceso, dejarlo abierto convertiría cada enlace en una página
 * pública indexable.
 */
export async function previewShare(userId: string, code: string): Promise<SharePreview> {
  const row = await findUsableShare(code);

  const senderRows = await db
    .select({ displayName: users.displayName, username: users.username })
    .from(users)
    .where(eq(users.id, row.userId))
    .limit(1);

  const sender = senderRows[0];
  if (!sender) throw errors.compartidoNoDisponible('no_encontrado');

  const payload = row.payload as SharePayload;

  return {
    code: row.code,
    kind: row.kind as ShareKind,
    title: row.title,
    fromDisplayName: sender.displayName,
    fromUsername: sender.username,
    payload,
    itemCount: sharePayloadCount(payload),
    expiresAt: row.expiresAt,
    // Aceptar el propio duplicaría el horario sin querer; el cliente lo señala antes de que
    // el usuario lo intente, y `acceptShare` lo rechaza.
    isOwn: row.userId === userId,
  };
}

/**
 * Un nombre que no choque con los que el receptor ya tiene.
 *
 * Al añadir un horario compartido, el receptor puede tener ya una materia con ese nombre —es
 * el caso habitual: dos compañeros de la misma carrera—. La alta manual lo rechaza (Fase 2),
 * pero aquí rechazar la copia entera por una materia repetida sería peor que el problema:
 * el usuario aceptó un horario de seis materias y no obtendría ninguna.
 *
 * Se desambigua con un sufijo, que es lo que el usuario haría a mano, y se le informa en el
 * resultado.
 */
function availableName(name: string, taken: Set<string>): string {
  if (!taken.has(normalizeName(name))) return name;

  for (let suffix = 2; suffix < 100; suffix += 1) {
    const candidate = `${name} (${suffix})`;
    if (!taken.has(normalizeName(candidate))) return candidate;
  }

  // Con 98 materias del mismo nombre, algo va muy mal; el identificador corto lo desempata.
  return `${name} (${Date.now().toString(36).slice(-4)})`;
}

/**
 * Acepta un compartido: copia su contenido a la cuenta del receptor (FR-031).
 *
 * Aquí es donde el Principio IV se hace efectivo. Se escriben filas **nuevas** con el
 * `userId` del receptor y nada las ata al original: no hay clave foránea al compartido, ni
 * al emisor, ni identificador de procedencia. Lo que cualquiera de los dos edite después no
 * afecta al otro.
 *
 * Todo ocurre en una transacción: si algo falla a mitad, el receptor no se queda con medio
 * horario copiado.
 */
export async function acceptShare(
  userId: string,
  code: string,
  input: AcceptShareParsed,
): Promise<ShareAcceptResult> {
  const row = await findUsableShare(code);

  if (row.userId === userId) {
    throw errors.validacion('Este compartido es tuyo: ya tienes su contenido.');
  }

  const payload = row.payload as SharePayload;

  /**
   * Todo lo copiado entra en el semestre en curso del **receptor**.
   *
   * El compartido no lleva semestre: es una fotografía del contenido (Fase 6) y el semestre
   * del emisor no significa nada en la cuenta de quien lo acepta. Lo que se recibe es para
   * lo que se está cursando.
   */
  const semesterId = await getCurrentSemesterId(userId);

  const result = await db.transaction(async (tx) => {
    if (payload.kind === 'horario') {
      let subjectsRemoved = 0;

      if (input.mode === 'reemplazar') {
        // Las sesiones caen por la cascada de `subjects`, pero se borran explícitamente para
        // no depender de ella dentro de la transacción —igual que en la importación—.
        // Acotado al semestre en curso: sin el filtro, aceptar un horario en modo
        // "reemplazar" borraría también el de todos los semestres archivados (Principio VI).
        await tx
          .delete(scheduleBlocks)
          .where(
            and(
              eq(scheduleBlocks.userId, userId),
              eq(scheduleBlocks.semesterId, semesterId),
            ),
          );
        const gone = await tx
          .delete(subjects)
          .where(and(eq(subjects.userId, userId), eq(subjects.semesterId, semesterId)))
          .returning({ id: subjects.id });
        subjectsRemoved = gone.length;
      }

      const remaining = await tx
        .select({ id: subjects.id, name: subjects.name })
        .from(subjects)
        .where(and(eq(subjects.userId, userId), eq(subjects.semesterId, semesterId)));

      const taken = new Set(remaining.map((subject) => normalizeName(subject.name)));
      // El color continúa la rotación desde lo que ya hay, para que al añadir no se repitan
      // los de las materias existentes (FR-010).
      let colorIndex = remaining.length;
      let blocksCreated = 0;

      for (const shared of payload.subjects) {
        const name = availableName(shared.name, taken);
        taken.add(normalizeName(name));

        const [created] = await tx
          .insert(subjects)
          .values({
            userId,
            semesterId,
            name,
            // El color del emisor se conserva si es válido, para que el horario copiado se
            // lea igual que el original; si no, sigue la rotación del receptor.
            color: /^#[0-9a-f]{6}$/i.test(shared.color)
              ? shared.color.toLowerCase()
              : subjectColorForIndex(colorIndex),
          })
          .returning({ id: subjects.id });

        if (!created) throw new Error('No se pudo crear la materia copiada');
        colorIndex += 1;

        if (shared.blocks.length > 0) {
          await tx.insert(scheduleBlocks).values(
            shared.blocks.map((block) => ({
              userId,
              semesterId,
              subjectId: created.id,
              weekday: block.weekday,
              startTime: block.startTime,
              endTime: block.endTime,
              room: block.room,
            })),
          );
          blocksCreated += shared.blocks.length;
        }
      }

      /**
       * Los solapes **no** se rechazan al aceptar.
       *
       * La alta manual sí los rechaza (Fase 2), pero allí el usuario está capturando una
       * sesión y puede corregirla. Aquí rechazaría la copia entera por una hora que se
       * encima, dejando al receptor sin nada; y el caso es real —quien recibe un horario
       * suele tener ya algo capturado que se cruza—. El horario copiado se pinta con el
       * cruce visible y el usuario lo resuelve editando, que es lo que haría de todos modos.
       */
      return {
        kind: 'horario' as const,
        subjectsCreated: payload.subjects.length,
        blocksCreated,
        subjectsRemoved,
        itemsCreated: 0,
        itemsWithoutSubject: 0,
      };
    }

    // Agenda: siempre se suma. Reemplazar borraría tareas propias que nada tienen que ver
    // con lo recibido, así que el modo no aplica aquí.
    const own = await tx
      .select({ id: subjects.id, name: subjects.name })
      .from(subjects)
      .where(and(eq(subjects.userId, userId), eq(subjects.semesterId, semesterId)));

    const byName = new Map(own.map((subject) => [normalizeName(subject.name), subject.id]));
    let itemsWithoutSubject = 0;

    const values = payload.items.map((item) => {
      // La materia se reasocia **por nombre** a una del receptor. Si no la tiene, la
      // actividad entra sin materia en vez de descartarse: FR-018 lo permite y perder la
      // tarea sería peor que perder la asociación.
      const subjectId =
        item.subjectName === null ? null : byName.get(normalizeName(item.subjectName)) ?? null;

      if (item.subjectName !== null && subjectId === null) itemsWithoutSubject += 1;

      return {
        userId,
        semesterId,
        title: item.title,
        description: item.description,
        kind: item.kind,
        subjectId,
        dueDate: item.dueDate,
      };
    });

    if (values.length > 0) await tx.insert(agendaItems).values(values);

    return {
      kind: 'agenda' as const,
      subjectsCreated: 0,
      blocksCreated: 0,
      subjectsRemoved: 0,
      itemsCreated: values.length,
      itemsWithoutSubject,
    };
  });

  /**
   * El contador sube fuera de la transacción de la copia.
   *
   * Es informativo: si fallara, el receptor ya tiene su copia, y perder la cuenta importa
   * mucho menos que deshacerla.
   *
   * Se incrementa **en SQL** y no leyendo el valor y sumando uno: dos personas aceptando el
   * mismo compartido a la vez leerían ambas el mismo número y lo dejarían en +1 en lugar de
   * +2.
   */
  await db
    .update(shares)
    .set({ acceptedCount: sql`${shares.acceptedCount} + 1` })
    .where(eq(shares.id, row.id));

  return result;
}
