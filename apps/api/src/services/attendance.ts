import { and, asc, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import {
  DEFAULT_SEMESTER_WEEKS,
  absenceStatus,
  calculateAbsenceLimit,
  estimateTotalSessions,
  remainingAbsences,
  weekdayOf,
  type AbsenceRecord,
  type AbsenceHistoryQuery,
  type AttendanceSummary,
  type CalendarDate,
  type DayAttendance,
  type MarkAbsencesParsed,
  type SetAbsenceLimitInput,
  type SubjectAttendance,
  type UpdateAbsenceParsed,
  type Weekday,
} from '@notecore/shared';
import { db } from '../db/client.js';
import {
  absenceRecords,
  scheduleBlocks,
  subjects,
  userSettings,
  type AbsenceRecordRow,
} from '../db/schema.js';
import { errors } from '../lib/errors.js';

/**
 * Lógica del control de faltas (FR-011 a FR-017).
 *
 * Principio II: el conteo, el límite sugerido y el estado de alerta se calculan aquí. Los
 * clientes reciben los números ya resueltos y solo los pintan.
 * Principio III: ninguna función confía en un `userId` del cliente; llega del token ya
 * verificado y toda consulta lo lleva en su `WHERE`.
 */

/** PostgreSQL devuelve `time` como `HH:MM:SS`; el dominio lo usa como `HH:MM`. */
function toClockTime(value: string): string {
  return value.slice(0, 5);
}

/**
 * `date` de PostgreSQL como `YYYY-MM-DD`.
 *
 * El driver puede devolverlo ya como cadena o como `Date`. Cuando es `Date` se formatea con
 * los componentes locales, nunca con `toISOString()`: esa conversión pasa por UTC y en
 * México restaría un día, moviendo la falta a la víspera.
 */
function toCalendarDateValue(value: string | Date): CalendarDate {
  if (typeof value === 'string') return value.slice(0, 10);
  const year = String(value.getFullYear()).padStart(4, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Compone la falta tal como la consumen web y app. */
function toAbsenceRecord(
  row: AbsenceRecordRow,
  block: { weekday: string; startTime: string; endTime: string },
): AbsenceRecord {
  const date = toCalendarDateValue(row.date);
  return {
    id: row.id,
    subjectId: row.subjectId,
    blockId: row.blockId,
    date,
    weekday: block.weekday as Weekday,
    startTime: toClockTime(block.startTime),
    endTime: toClockTime(block.endTime),
    justified: row.justified,
    note: row.note,
    createdAt: row.createdAt,
  };
}

/**
 * Semanas del semestre del usuario, creando sus ajustes si aún no los tiene.
 *
 * Se crea al vuelo en vez de al registrarse para no tener que migrar las cuentas que ya
 * existen ni acordarse de insertarla en el alta.
 */
export async function getSemesterWeeks(userId: string): Promise<number> {
  const row = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });

  return row?.semesterWeeks ?? DEFAULT_SEMESTER_WEEKS;
}

/** Fija las semanas del semestre (FR-013). Crea la fila de ajustes si no existía. */
export async function setSemesterWeeks(userId: string, weeks: number): Promise<void> {
  await db
    .insert(userSettings)
    .values({ userId, semesterWeeks: weeks, updatedAt: new Date() })
    // Si el usuario ya tenía ajustes, se actualizan en lugar de fallar por clave duplicada.
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { semesterWeeks: weeks, updatedAt: new Date() },
    });
}

/**
 * Panel de faltas: una fila por materia con conteo, límite y estado (FR-012 a FR-016).
 *
 * Todo se resuelve en el servidor —incluido el estado de alerta— para que app y web
 * muestren exactamente lo mismo sin reimplementar la regla (Principio II).
 */
export async function getSummary(userId: string): Promise<AttendanceSummary> {
  const semesterWeeks = await getSemesterWeeks(userId);

  const subjectRows = await db
    .select()
    .from(subjects)
    .where(eq(subjects.userId, userId))
    .orderBy(asc(subjects.name));

  if (subjectRows.length === 0) {
    return { subjects: [], semesterWeeks };
  }

  // Sesiones semanales por materia, para estimar el total del semestre.
  const blockRows = await db
    .select({ subjectId: scheduleBlocks.subjectId })
    .from(scheduleBlocks)
    .where(eq(scheduleBlocks.userId, userId));

  const sessionsPerWeek = new Map<string, number>();
  for (const block of blockRows) {
    sessionsPerWeek.set(block.subjectId, (sessionsPerWeek.get(block.subjectId) ?? 0) + 1);
  }

  // Faltas por materia, separando las justificadas: no cuentan para el límite (FR-017).
  const absenceRows = await db
    .select({ subjectId: absenceRecords.subjectId, justified: absenceRecords.justified })
    .from(absenceRecords)
    .where(eq(absenceRecords.userId, userId));

  const counted = new Map<string, number>();
  const justified = new Map<string, number>();
  for (const row of absenceRows) {
    const target = row.justified ? justified : counted;
    target.set(row.subjectId, (target.get(row.subjectId) ?? 0) + 1);
  }

  const summary: SubjectAttendance[] = subjectRows.map((subject) => {
    const perWeek = sessionsPerWeek.get(subject.id) ?? 0;
    const totalSessions = estimateTotalSessions(perWeek, semesterWeeks);
    const suggestedLimit = calculateAbsenceLimit(totalSessions).suggested;

    // El límite guardado es el que fijó el usuario; `null` significa "usa la sugerencia".
    const limitIsCustom = subject.absenceLimit !== null;
    const limit = subject.absenceLimit ?? suggestedLimit;

    const absences = counted.get(subject.id) ?? 0;

    return {
      subjectId: subject.id,
      subjectName: subject.name,
      color: subject.color,
      sessionsPerWeek: perWeek,
      totalSessions,
      absences,
      justifiedAbsences: justified.get(subject.id) ?? 0,
      limit,
      suggestedLimit,
      limitIsCustom,
      remaining: remainingAbsences(absences, limit),
      status: absenceStatus(absences, limit),
    };
  });

  return { subjects: summary, semesterWeeks };
}

/**
 * Clases de una fecha concreta y cuáles ya están marcadas (FR-011).
 *
 * Es el primer paso de "marcar falta": el usuario elige el día y ve qué tenía ese día, con
 * lo ya registrado señalado para no marcarlo dos veces.
 */
export async function getDay(userId: string, date: CalendarDate): Promise<DayAttendance> {
  const weekday = weekdayOf(date);

  // El domingo no es día de clase: se responde con la lista vacía en lugar de un error,
  // porque elegir un domingo en el calendario es una acción legítima del usuario.
  if (weekday === null) {
    return { date, weekday: 'lunes', sessions: [] };
  }

  const rows = await db
    .select({
      blockId: scheduleBlocks.id,
      subjectId: scheduleBlocks.subjectId,
      subjectName: subjects.name,
      color: subjects.color,
      startTime: scheduleBlocks.startTime,
      endTime: scheduleBlocks.endTime,
      room: scheduleBlocks.room,
    })
    .from(scheduleBlocks)
    .innerJoin(subjects, eq(scheduleBlocks.subjectId, subjects.id))
    .where(and(eq(scheduleBlocks.userId, userId), eq(scheduleBlocks.weekday, weekday)))
    .orderBy(asc(scheduleBlocks.startTime));

  const existing = await db
    .select({
      id: absenceRecords.id,
      blockId: absenceRecords.blockId,
      justified: absenceRecords.justified,
    })
    .from(absenceRecords)
    .where(and(eq(absenceRecords.userId, userId), eq(absenceRecords.date, date)));

  const byBlock = new Map(existing.map((row) => [row.blockId, row]));

  return {
    date,
    weekday,
    sessions: rows.map((row) => {
      const absence = byBlock.get(row.blockId);
      return {
        blockId: row.blockId,
        subjectId: row.subjectId,
        subjectName: row.subjectName,
        color: row.color,
        startTime: toClockTime(row.startTime),
        endTime: toClockTime(row.endTime),
        room: row.room,
        alreadyAbsent: absence !== undefined,
        absenceId: absence?.id ?? null,
        justified: absence?.justified ?? false,
      };
    }),
  };
}

/**
 * Registra faltas en una fecha (FR-011).
 *
 * Recibe las sesiones a las que se faltó. El "día completo" no es un modo aparte: el cliente
 * manda todas las sesiones del día, y aquí se guarda siempre una falta por sesión.
 *
 * Se comprueba que cada sesión sea del usuario y que toque ese día de la semana: sin lo
 * segundo se podría registrar una falta a la clase del lunes en un miércoles, y el conteo
 * dejaría de corresponder con el horario.
 */
export async function markAbsences(
  userId: string,
  input: MarkAbsencesParsed,
): Promise<readonly AbsenceRecord[]> {
  const weekday = weekdayOf(input.date);
  if (weekday === null) {
    throw errors.validacion('El domingo no tiene clases.', [
      { field: 'date', message: 'El domingo no tiene clases' },
    ]);
  }

  // Principio III: el filtro por `userId` es lo que impide marcar faltas sobre las clases
  // de otra persona pasando sus identificadores.
  const blocks = await db
    .select({
      id: scheduleBlocks.id,
      subjectId: scheduleBlocks.subjectId,
      weekday: scheduleBlocks.weekday,
      startTime: scheduleBlocks.startTime,
      endTime: scheduleBlocks.endTime,
    })
    .from(scheduleBlocks)
    .where(
      and(eq(scheduleBlocks.userId, userId), inArray(scheduleBlocks.id, input.blockIds)),
    );

  const byId = new Map(blocks.map((block) => [block.id, block]));

  for (const blockId of input.blockIds) {
    const block = byId.get(blockId);
    if (!block) {
      throw errors.noEncontrado('Esa clase no existe en tu horario.');
    }
    if (block.weekday !== weekday) {
      throw errors.validacion('Esa clase no es de ese día de la semana.', [
        { field: 'blockIds', message: 'Esa clase no toca ese día' },
      ]);
    }
  }

  // Las que ya estaban marcadas se omiten en lugar de fallar: marcar el día completo
  // cuando ya había una falta suelta es una acción razonable, y fallar entera obligaría al
  // usuario a desmarcarla primero.
  const already = await db
    .select({ blockId: absenceRecords.blockId })
    .from(absenceRecords)
    .where(and(eq(absenceRecords.userId, userId), eq(absenceRecords.date, input.date)));

  const marked = new Set(already.map((row) => row.blockId));
  const pending = input.blockIds.filter((id) => !marked.has(id));

  if (pending.length > 0) {
    await db.insert(absenceRecords).values(
      pending.map((blockId) => {
        const block = byId.get(blockId);
        if (!block) throw new Error('Bloque desaparecido entre la validación y la escritura');
        return {
          userId,
          subjectId: block.subjectId,
          blockId,
          date: input.date,
          justified: input.justified,
          note: input.note,
        };
      }),
    );
  }

  // Se devuelven todas las faltas del día, no solo las nuevas: es lo que el cliente pinta
  // después, y evita una segunda petición.
  return listAbsences(userId, { from: input.date, to: input.date });
}

/** Historial de faltas, opcionalmente acotado por fechas o materia. */
export async function listAbsences(
  userId: string,
  query: AbsenceHistoryQuery = {},
): Promise<readonly AbsenceRecord[]> {
  const filters = [eq(absenceRecords.userId, userId)];
  if (query.from) filters.push(gte(absenceRecords.date, query.from));
  if (query.to) filters.push(lte(absenceRecords.date, query.to));
  if (query.subjectId) filters.push(eq(absenceRecords.subjectId, query.subjectId));

  const rows = await db
    .select({
      absence: absenceRecords,
      weekday: scheduleBlocks.weekday,
      startTime: scheduleBlocks.startTime,
      endTime: scheduleBlocks.endTime,
    })
    .from(absenceRecords)
    .innerJoin(scheduleBlocks, eq(absenceRecords.blockId, scheduleBlocks.id))
    .where(and(...filters))
    // Lo más reciente primero: es lo que el estudiante quiere ver al abrir el historial.
    .orderBy(desc(absenceRecords.date), asc(scheduleBlocks.startTime));

  return rows.map((row) => toAbsenceRecord(row.absence, row));
}

/** Una falta concreta del usuario. Lanza 404 si no existe o es de otra persona. */
async function getAbsence(userId: string, absenceId: string): Promise<AbsenceRecord> {
  const rows = await db
    .select({
      absence: absenceRecords,
      weekday: scheduleBlocks.weekday,
      startTime: scheduleBlocks.startTime,
      endTime: scheduleBlocks.endTime,
    })
    .from(absenceRecords)
    .innerJoin(scheduleBlocks, eq(absenceRecords.blockId, scheduleBlocks.id))
    .where(and(eq(absenceRecords.id, absenceId), eq(absenceRecords.userId, userId)))
    .limit(1);

  const row = rows[0];
  if (!row) throw errors.noEncontrado('Esa falta no existe.');

  return toAbsenceRecord(row.absence, row);
}

/**
 * Justifica una falta o cambia su nota (FR-017).
 *
 * Justificar no borra el registro: se conserva y deja de contar para el límite. Perder la
 * fila haría desaparecer el hecho de que ese día no se asistió.
 */
export async function updateAbsence(
  userId: string,
  absenceId: string,
  input: UpdateAbsenceParsed,
): Promise<AbsenceRecord> {
  // Confirma que la falta es del usuario antes de tocar nada (Principio III).
  await getAbsence(userId, absenceId);

  await db
    .update(absenceRecords)
    .set({
      ...(input.justified !== undefined && { justified: input.justified }),
      ...(input.note !== undefined && { note: input.note }),
    })
    .where(and(eq(absenceRecords.id, absenceId), eq(absenceRecords.userId, userId)));

  return getAbsence(userId, absenceId);
}

/**
 * Elimina una falta, recalculando el conteo (FR-017).
 *
 * Principio VI: esto no es historial archivable sino la corrección de un registro erróneo
 * —el estudiante marcó la clase equivocada o sí asistió—, así que se borra de verdad.
 */
export async function deleteAbsence(userId: string, absenceId: string): Promise<void> {
  const deleted = await db
    .delete(absenceRecords)
    .where(and(eq(absenceRecords.id, absenceId), eq(absenceRecords.userId, userId)))
    .returning({ id: absenceRecords.id });

  if (deleted.length === 0) throw errors.noEncontrado('Esa falta no existe.');
}

/**
 * Fija el límite de faltas de una materia, o lo devuelve a la sugerencia (FR-015).
 *
 * Principio VII: el límite sugerido es orientativo, así que el usuario siempre puede
 * sobrescribirlo. Con `null` vuelve al cálculo automático.
 */
export async function setAbsenceLimit(
  userId: string,
  subjectId: string,
  input: SetAbsenceLimitInput,
): Promise<AttendanceSummary> {
  const updated = await db
    .update(subjects)
    .set({ absenceLimit: input.limit, updatedAt: new Date() })
    .where(and(eq(subjects.id, subjectId), eq(subjects.userId, userId)))
    .returning({ id: subjects.id });

  if (updated.length === 0) throw errors.noEncontrado('Esa materia no existe.');

  // Se devuelve el panel entero: cambiar un límite cambia el estado de esa materia, y el
  // cliente lo repinta sin pedir el resumen otra vez.
  return getSummary(userId);
}
