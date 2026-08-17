import { and, asc, eq, gte, isNotNull, lte } from 'drizzle-orm';
import {
  DEFAULT_REMINDER_LEAD_DAYS,
  DEFAULT_REMINDER_TIME,
  agendaUrgency,
  calendarDateRange,
  currentClockTime,
  reminderDate,
  reminderHasPassed,
  todayCalendarDate,
  weekdayOf,
  type AgendaKind,
  type CalendarClass,
  type CalendarDate,
  type CalendarDay,
  type CalendarDue,
  type CalendarRange,
  type ClockTime,
  type ReminderLeadDays,
  type ReminderPlan,
  type ReminderSettings,
  type ScheduledReminder,
  type UpdateReminderSettingsParsed,
  type Weekday,
} from '@notecore/shared';
import { db } from '../db/client.js';
import {
  absenceRecords,
  agendaItems,
  scheduleBlocks,
  subjects,
  userSettings,
} from '../db/schema.js';

/**
 * Lógica del calendario y los recordatorios (FR-023 a FR-027).
 *
 * Principio II: la combinación de clases y vencimientos, la urgencia y el momento de cada
 * aviso se calculan aquí. Los clientes reciben los días ya resueltos y solo los pintan.
 * Principio III: ninguna función confía en un `userId` del cliente; llega del token ya
 * verificado y toda consulta lo lleva en su `WHERE`.
 */

/** PostgreSQL devuelve `time` como `HH:MM:SS`; el dominio lo usa como `HH:MM`. */
function toClockTime(value: string): ClockTime {
  return value.slice(0, 5);
}

/**
 * `date` de PostgreSQL como `YYYY-MM-DD`.
 *
 * El driver puede devolverlo ya como cadena o como `Date`. Cuando es `Date` se formatea con
 * los componentes locales, nunca con `toISOString()`: esa conversión pasa por UTC y en
 * México restaría un día, moviendo la clase o la entrega a la víspera.
 */
function toCalendarDateValue(value: string | Date): CalendarDate {
  if (typeof value === 'string') return value.slice(0, 10);
  const year = String(value.getFullYear()).padStart(4, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * El calendario de un rango: clases y vencimientos, día a día (FR-023).
 *
 * Se resuelve en tres consultas —horario, faltas y agenda— y se cruzan en memoria, en lugar
 * de una consulta por día: un mes son 30 días, y treinta viajes a la base de datos para
 * pintar una rejilla haría la vista notablemente lenta en el móvil.
 */
export async function getRange(
  userId: string,
  from: CalendarDate,
  to: CalendarDate,
): Promise<CalendarRange> {
  const today = todayCalendarDate();

  // El horario entero: son pocas filas y hay que cruzarlas contra cada día del rango.
  const blockRows = await db
    .select({
      blockId: scheduleBlocks.id,
      subjectId: scheduleBlocks.subjectId,
      subjectName: subjects.name,
      color: subjects.color,
      weekday: scheduleBlocks.weekday,
      startTime: scheduleBlocks.startTime,
      endTime: scheduleBlocks.endTime,
      room: scheduleBlocks.room,
    })
    .from(scheduleBlocks)
    .innerJoin(subjects, eq(scheduleBlocks.subjectId, subjects.id))
    .where(eq(scheduleBlocks.userId, userId))
    .orderBy(asc(scheduleBlocks.startTime));

  // Las clases se agrupan por día de la semana: cada fecha del rango toma las de su día.
  const blocksByWeekday = new Map<Weekday, typeof blockRows>();
  for (const block of blockRows) {
    const weekday = block.weekday as Weekday;
    const list = blocksByWeekday.get(weekday) ?? [];
    list.push(block);
    blocksByWeekday.set(weekday, list);
  }

  // Faltas del rango, para señalar en el calendario a qué clases no se asistió (FR-011).
  const absenceRows = await db
    .select({
      id: absenceRecords.id,
      blockId: absenceRecords.blockId,
      date: absenceRecords.date,
      justified: absenceRecords.justified,
    })
    .from(absenceRecords)
    .where(
      and(
        eq(absenceRecords.userId, userId),
        gte(absenceRecords.date, from),
        lte(absenceRecords.date, to),
      ),
    );

  // Se indexan por fecha y bloque juntos: una misma sesión tiene una falta distinta cada día.
  const absencesByDateBlock = new Map<string, { id: string; justified: boolean }>();
  for (const row of absenceRows) {
    const date = toCalendarDateValue(row.date);
    absencesByDateBlock.set(`${date}|${row.blockId}`, {
      id: row.id,
      justified: row.justified,
    });
  }

  // Vencimientos del rango. `leftJoin` porque la materia es opcional (FR-018).
  const dueRows = await db
    .select({
      itemId: agendaItems.id,
      title: agendaItems.title,
      kind: agendaItems.kind,
      subjectId: agendaItems.subjectId,
      subjectName: subjects.name,
      subjectColor: subjects.color,
      dueDate: agendaItems.dueDate,
      completed: agendaItems.completed,
    })
    .from(agendaItems)
    .leftJoin(subjects, eq(agendaItems.subjectId, subjects.id))
    .where(
      and(
        eq(agendaItems.userId, userId),
        isNotNull(agendaItems.dueDate),
        gte(agendaItems.dueDate, from),
        lte(agendaItems.dueDate, to),
      ),
    )
    .orderBy(asc(agendaItems.createdAt));

  const duesByDate = new Map<CalendarDate, CalendarDue[]>();
  for (const row of dueRows) {
    // El `isNotNull` del filtro lo garantiza, pero el tipo de la columna sigue siendo nulable.
    if (row.dueDate === null) continue;
    const date = toCalendarDateValue(row.dueDate);

    const list = duesByDate.get(date) ?? [];
    list.push({
      itemId: row.itemId,
      title: row.title,
      kind: row.kind as AgendaKind,
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      subjectColor: row.subjectColor,
      completed: row.completed,
      // La urgencia se resuelve contra la misma fecha `today` para toda la respuesta: si el
      // servidor cruzara la medianoche a mitad del recorrido, unos días saldrían "vencidos"
      // y otros "vencen hoy" en la misma rejilla.
      urgency: agendaUrgency(date, today, row.completed),
    });
    duesByDate.set(date, list);
  }

  const days: CalendarDay[] = calendarDateRange(from, to).map((date) => {
    const weekday = weekdayOf(date);
    // `weekdayOf` devuelve `null` en domingo, que no es día de clase.
    const blocks = weekday === null ? [] : (blocksByWeekday.get(weekday) ?? []);

    const classes: CalendarClass[] = blocks.map((block) => {
      const absence = absencesByDateBlock.get(`${date}|${block.blockId}`);
      return {
        blockId: block.blockId,
        subjectId: block.subjectId,
        subjectName: block.subjectName,
        color: block.color,
        startTime: toClockTime(block.startTime),
        endTime: toClockTime(block.endTime),
        room: block.room,
        absenceId: absence?.id ?? null,
        absenceJustified: absence?.justified ?? false,
      };
    });

    return {
      date,
      classes,
      dues: duesByDate.get(date) ?? [],
      isToday: date === today,
    };
  });

  return { from, to, days, today };
}

/**
 * El detalle de un día concreto (FR-024).
 *
 * Se apoya en `getRange` con el rango de un solo día en lugar de repetir las tres consultas:
 * es exactamente el mismo cruce, y duplicarlo abriría la puerta a que el detalle y la rejilla
 * mostraran cosas distintas del mismo día.
 */
export async function getDay(userId: string, date: CalendarDate): Promise<CalendarDay> {
  const range = await getRange(userId, date, date);

  const day = range.days[0];
  // `calendarDateRange` con `from === to` siempre devuelve exactamente un día.
  if (!day) throw new Error('El rango de un día no devolvió ninguno');

  return day;
}

/**
 * Ajustes de recordatorios del usuario (FR-025), con los valores por defecto si no los tiene.
 *
 * Se crean al vuelo igual que las semanas del semestre: así no hay que migrar las cuentas que
 * ya existen ni acordarse de insertar la fila en el alta.
 */
export async function getReminderSettings(userId: string): Promise<ReminderSettings> {
  const row = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });

  if (!row) {
    return {
      enabled: false,
      leadDays: DEFAULT_REMINDER_LEAD_DAYS,
      timeOfDay: DEFAULT_REMINDER_TIME,
      updatedAt: new Date(),
    };
  }

  return {
    enabled: row.remindersEnabled,
    leadDays: row.reminderLeadDays as ReminderLeadDays,
    timeOfDay: toClockTime(row.reminderTimeOfDay),
    updatedAt: row.updatedAt,
  };
}

/** Cambia los ajustes de recordatorios (FR-025). Crea la fila de ajustes si no existía. */
export async function updateReminderSettings(
  userId: string,
  input: UpdateReminderSettingsParsed,
): Promise<ReminderSettings> {
  const current = await getReminderSettings(userId);

  // Solo se tocan los campos presentes: `undefined` significa "déjalo como estaba", para que
  // dos pantallas abiertas no se pisen los ajustes.
  const enabled = input.enabled ?? current.enabled;
  const leadDays = input.leadDays ?? current.leadDays;
  const timeOfDay = input.timeOfDay ?? current.timeOfDay;

  await db
    .insert(userSettings)
    .values({
      userId,
      remindersEnabled: enabled,
      reminderLeadDays: leadDays,
      reminderTimeOfDay: timeOfDay,
      updatedAt: new Date(),
    })
    // Si el usuario ya tenía ajustes, se actualizan en lugar de fallar por clave duplicada.
    // `semesterWeeks` se deja fuera del `set` a propósito: es un ajuste de otra pantalla.
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        remindersEnabled: enabled,
        reminderLeadDays: leadDays,
        reminderTimeOfDay: timeOfDay,
        updatedAt: new Date(),
      },
    });

  return getReminderSettings(userId);
}

/**
 * Los recordatorios vigentes con su momento ya resuelto (FR-025 a FR-027).
 *
 * Se devuelven **todos** en cada consulta y no solo los nuevos: el cliente cancela lo que
 * tenía programado y reprograma esta lista entera. Así FR-027 se cumple sin que nadie lleve
 * registro de lo anterior —lo que cambió de fecha, se completó o se borró simplemente ya no
 * aparece, y su notificación desaparece con ello—.
 *
 * Las completadas quedan fuera por el mismo motivo por el que nunca urgen en la agenda:
 * recordar una entrega ya hecha es una alarma falsa (FR-027).
 */
export async function getReminderPlan(userId: string): Promise<ReminderPlan> {
  const settings = await getReminderSettings(userId);
  const today = todayCalendarDate();
  const nowTime = currentClockTime();

  // Con los recordatorios apagados no se devuelve ninguno: así el cliente que los tuviera
  // programados los cancela todos al recibir la lista vacía, sin ningún caso especial.
  if (!settings.enabled) {
    return { settings, reminders: [], today };
  }

  const rows = await db
    .select({
      itemId: agendaItems.id,
      title: agendaItems.title,
      kind: agendaItems.kind,
      subjectName: subjects.name,
      dueDate: agendaItems.dueDate,
    })
    .from(agendaItems)
    .leftJoin(subjects, eq(agendaItems.subjectId, subjects.id))
    .where(
      and(
        eq(agendaItems.userId, userId),
        // Sin fecha límite no hay momento que recordar (FR-018 la hace opcional).
        isNotNull(agendaItems.dueDate),
        // Completada: ya no se recuerda (FR-027).
        eq(agendaItems.completed, false),
      ),
    );

  const reminders: ScheduledReminder[] = rows
    .flatMap((row) => {
      if (row.dueDate === null) return [];
      const dueDate = toCalendarDateValue(row.dueDate);
      const remindOn = reminderDate(dueDate, settings.leadDays);

      return [
        {
          itemId: row.itemId,
          title: row.title,
          kind: row.kind as AgendaKind,
          subjectName: row.subjectName,
          dueDate,
          remindOn,
          remindAt: settings.timeOfDay,
          // Android descarta lo programado para un instante pasado, así que el cliente
          // necesita saberlo para no creer que lo programó cuando no llegará nada.
          overdue: reminderHasPassed(remindOn, settings.timeOfDay, today, nowTime),
        },
      ];
    })
    // Por momento de aviso: es el orden en que van a llegar, y el que la web muestra.
    .sort((a, b) => a.remindOn.localeCompare(b.remindOn) || a.title.localeCompare(b.title));

  return { settings, reminders, today };
}
