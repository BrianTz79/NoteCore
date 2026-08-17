import { and, asc, desc, eq } from 'drizzle-orm';
import {
  agendaUrgency,
  daysBetween,
  sortByDueDate,
  todayCalendarDate,
  type AgendaItem,
  type AgendaKind,
  type AgendaList,
  type AgendaQueryParsed,
  type CalendarDate,
  type CreateAgendaItemParsed,
  type UpdateAgendaItemParsed,
} from '@notecore/shared';
import { db } from '../db/client.js';
import { agendaItems, subjects, type AgendaItemRow } from '../db/schema.js';
import { errors } from '../lib/errors.js';

/**
 * Lógica de la agenda (FR-018 a FR-022).
 *
 * Principio II: el orden por vencimiento, la urgencia y los días que faltan se calculan
 * aquí. Los clientes reciben la lista ya ordenada y solo la pintan.
 * Principio III: ninguna función confía en un `userId` del cliente; llega del token ya
 * verificado y toda consulta lo lleva en su `WHERE`.
 */

/**
 * `date` de PostgreSQL como `YYYY-MM-DD`.
 *
 * El driver puede devolverlo ya como cadena o como `Date`. Cuando es `Date` se formatea con
 * los componentes locales, nunca con `toISOString()`: esa conversión pasa por UTC y en
 * México restaría un día, adelantando el vencimiento de toda entrega.
 */
function toCalendarDateValue(value: string | Date | null): CalendarDate | null {
  if (value === null) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  const year = String(value.getFullYear()).padStart(4, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** La materia asociada, cuando la actividad la tiene. */
interface SubjectInfo {
  readonly name: string | null;
  readonly color: string | null;
}

/**
 * Compone la actividad tal como la consumen web y app, con la urgencia ya resuelta.
 *
 * `today` se pasa desde fuera en lugar de leerlo aquí para que toda una lista se calcule
 * contra la misma fecha: si el servidor cruzara la medianoche a mitad del recorrido, unas
 * actividades saldrían "vencidas" y otras "vencen hoy" en la misma respuesta.
 */
function toAgendaItem(
  row: AgendaItemRow,
  subject: SubjectInfo,
  today: CalendarDate,
): AgendaItem {
  const dueDate = toCalendarDateValue(row.dueDate);

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    kind: row.kind as AgendaKind,
    subjectId: row.subjectId,
    subjectName: subject.name,
    subjectColor: subject.color,
    dueDate,
    completed: row.completed,
    completedAt: row.completedAt,
    urgency: agendaUrgency(dueDate, today, row.completed),
    // Se manda resuelto porque el cliente lo calcularía con el reloj del dispositivo, que
    // puede ir en otro huso o simplemente mal.
    daysUntilDue: dueDate === null ? null : daysBetween(today, dueDate),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Comprueba que la materia sea del usuario antes de asociarla.
 *
 * Principio III: sin esto se podría colgar una tarea de la materia de otra persona pasando
 * su identificador, y su nombre se filtraría en la respuesta.
 */
async function assertSubjectOwned(userId: string, subjectId: string): Promise<void> {
  const rows = await db
    .select({ id: subjects.id })
    .from(subjects)
    .where(and(eq(subjects.id, subjectId), eq(subjects.userId, userId)))
    .limit(1);

  if (rows.length === 0) {
    throw errors.validacion('Esa materia no existe en tu horario.', [
      { field: 'subjectId', message: 'Esa materia no existe en tu horario' },
    ]);
  }
}

/**
 * La agenda del usuario: pendientes ordenadas por vencimiento y completadas aparte.
 *
 * FR-022 pide las pendientes por proximidad de vencimiento; las completadas se devuelven
 * por lo más recientemente terminado, que es otro criterio, así que son dos listas.
 */
export async function listAgenda(
  userId: string,
  query: AgendaQueryParsed,
): Promise<AgendaList> {
  const today = todayCalendarDate();

  const filters = [eq(agendaItems.userId, userId)];
  if (query.subjectId) filters.push(eq(agendaItems.subjectId, query.subjectId));
  if (query.kind) filters.push(eq(agendaItems.kind, query.kind));
  if (!query.includeCompleted) filters.push(eq(agendaItems.completed, false));

  // `leftJoin` y no `innerJoin`: la mayoría de actividades puede no tener materia, y con un
  // join interno desaparecerían todas las que no la tienen.
  const rows = await db
    .select({
      item: agendaItems,
      subjectName: subjects.name,
      subjectColor: subjects.color,
    })
    .from(agendaItems)
    .leftJoin(subjects, eq(agendaItems.subjectId, subjects.id))
    .where(and(...filters))
    .orderBy(asc(agendaItems.dueDate), desc(agendaItems.createdAt));

  const items = rows.map((row) =>
    toAgendaItem(row.item, { name: row.subjectName, color: row.subjectColor }, today),
  );

  // El orden final lo pone `sortByDueDate` y no el `ORDER BY`: PostgreSQL coloca los nulos
  // al final en orden ascendente, pero no distingue lo vencido —que debe ir primero— ni
  // desempata por fecha de creación como exige FR-022.
  const pending = sortByDueDate(items.filter((item) => !item.completed));

  const completed = items
    .filter((item) => item.completed)
    // Lo último completado primero: es lo que el estudiante acaba de terminar.
    .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)));

  return {
    pending,
    completed,
    overdueCount: pending.filter((item) => item.urgency === 'vencida').length,
    dueTodayCount: pending.filter((item) => item.urgency === 'hoy').length,
  };
}

/** Una actividad concreta del usuario. Lanza 404 si no existe o es de otra persona. */
export async function getAgendaItem(userId: string, itemId: string): Promise<AgendaItem> {
  const rows = await db
    .select({
      item: agendaItems,
      subjectName: subjects.name,
      subjectColor: subjects.color,
    })
    .from(agendaItems)
    .leftJoin(subjects, eq(agendaItems.subjectId, subjects.id))
    .where(and(eq(agendaItems.id, itemId), eq(agendaItems.userId, userId)))
    .limit(1);

  const row = rows[0];
  if (!row) throw errors.noEncontrado('Esa actividad no existe.');

  return toAgendaItem(
    row.item,
    { name: row.subjectName, color: row.subjectColor },
    todayCalendarDate(),
  );
}

/**
 * Crea una actividad (FR-018).
 *
 * Solo el título es obligatorio: materia y fecha límite son opcionales por requisito, y de
 * eso depende que la alta rápida de la app se resuelva en un campo.
 */
export async function createAgendaItem(
  userId: string,
  input: CreateAgendaItemParsed,
): Promise<AgendaItem> {
  if (input.subjectId !== null) {
    await assertSubjectOwned(userId, input.subjectId);
  }

  const inserted = await db
    .insert(agendaItems)
    .values({
      userId,
      title: input.title,
      description: input.description,
      kind: input.kind,
      subjectId: input.subjectId,
      dueDate: input.dueDate,
    })
    .returning({ id: agendaItems.id });

  const created = inserted[0];
  if (!created) throw new Error('La actividad no se insertó');

  return getAgendaItem(userId, created.id);
}

/**
 * Edita una actividad (FR-019) o la completa y reabre (FR-020).
 *
 * Solo se tocan los campos presentes en el cuerpo: `undefined` significa "déjalo como
 * estaba", mientras que `null` en materia o fecha límite sí los vacía —es como se desasocia
 * una materia o se quita una entrega que ya no aplica—.
 */
export async function updateAgendaItem(
  userId: string,
  itemId: string,
  input: UpdateAgendaItemParsed,
): Promise<AgendaItem> {
  // Confirma que la actividad es del usuario antes de tocar nada (Principio III).
  const current = await getAgendaItem(userId, itemId);

  if (input.subjectId !== undefined && input.subjectId !== null) {
    await assertSubjectOwned(userId, input.subjectId);
  }

  /**
   * `completedAt` acompaña a `completed` y solo se toca cuando el estado cambia de verdad.
   *
   * Sin la comparación con el estado actual, volver a mandar `completed: true` sobre algo ya
   * completado reescribiría la fecha, y las completadas —ordenadas por ella— saltarían al
   * principio de la lista sin que el estudiante hubiera hecho nada.
   */
  const completionChanged =
    input.completed !== undefined && input.completed !== current.completed;

  await db
    .update(agendaItems)
    .set({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.kind !== undefined && { kind: input.kind }),
      ...(input.subjectId !== undefined && { subjectId: input.subjectId }),
      ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
      ...(input.completed !== undefined && { completed: input.completed }),
      ...(completionChanged && { completedAt: input.completed ? new Date() : null }),
      updatedAt: new Date(),
    })
    .where(and(eq(agendaItems.id, itemId), eq(agendaItems.userId, userId)));

  return getAgendaItem(userId, itemId);
}

/**
 * Elimina una actividad (FR-021).
 *
 * Principio VI: esto no contradice "los datos históricos no se borran". Completar una
 * actividad la conserva (FR-020); borrarla es una acción explícita y distinta del usuario
 * que FR-021 exige, para lo anotado por error o lo que dejó de aplicar.
 */
export async function deleteAgendaItem(userId: string, itemId: string): Promise<void> {
  const deleted = await db
    .delete(agendaItems)
    .where(and(eq(agendaItems.id, itemId), eq(agendaItems.userId, userId)))
    .returning({ id: agendaItems.id });

  if (deleted.length === 0) throw errors.noEncontrado('Esa actividad no existe.');
}
