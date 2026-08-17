import { relations } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Esquema de base de datos.
 *
 * Principio III: toda tabla de dominio lleva `userId` con clave foránea a `users`, y toda
 * consulta filtra por el usuario autenticado.
 */

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Identificador de acceso. Se guarda ya normalizado a minúsculas. */
  email: text('email').notNull().unique(),
  /** `@usuario` público, único (FR-004). También en minúsculas. */
  username: text('username').notNull().unique(),
  displayName: text('display_name').notNull(),
  /** Hash bcrypt. Nunca sale de la API en ninguna respuesta. */
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Sesiones abiertas. Una fila por dispositivo con sesión iniciada.
 *
 * Existe para que FR-002 se cumpla de verdad: cerrar sesión en la web borra su fila y deja
 * intacta la de la app. Guardar el hash del refresh token —y no el token— evita que quien
 * lea la base de datos pueda suplantar sesiones.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      // Si se borra la cuenta, se van sus sesiones. Es la única cascada del esquema:
      // las sesiones no son datos históricos (Principio VI), son estado efímero.
      .references(() => users.id, { onDelete: 'cascade' }),
    /** SHA-256 del refresh token vigente. Rota en cada renovación. */
    refreshTokenHash: text('refresh_token_hash').notNull(),
    /** `web` o `mobile`, para que el usuario reconozca el dispositivo. */
    client: text('client').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    // Listar las sesiones del usuario y limpiar las caducadas son las dos consultas
    // que se hacen sobre esta tabla.
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_expires_at_idx').on(table.expiresAt),
  ],
);

/**
 * Materias del horario (FR-005).
 *
 * Lleva `userId` directo, no heredado de otra tabla: así toda consulta filtra por el
 * usuario autenticado sin necesidad de un JOIN previo (Principio III).
 */
export const subjects = pgTable(
  'subjects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** Color con el que se distingue en la vista semanal (FR-010). Formato `#rrggbb`. */
    color: text('color').notNull(),
    /**
     * Límite de faltas fijado a mano por el estudiante (FR-015).
     *
     * `null` significa "usa la sugerencia calculada": no se guarda el 20% ya resuelto
     * porque cambiaría al editar el horario o las semanas del semestre, y quedaría un
     * número obsoleto. Guardando solo lo que el usuario decidió, la sugerencia se recalcula
     * siempre y se distingue de un ajuste deliberado (Principio VII).
     */
    absenceLimit: integer('absence_limit'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Listar el horario del usuario es, con diferencia, la consulta más frecuente.
    index('subjects_user_id_idx').on(table.userId),
  ],
);

/**
 * Sesiones de clase: un día de la semana con hora de inicio, fin y aula.
 *
 * `userId` se repite aquí aunque se pueda deducir de `subjects` porque permite filtrar y
 * borrar por usuario sin JOIN, y porque deja el aislamiento explícito en cada fila
 * (Principio III).
 *
 * Las horas se guardan como `time` de PostgreSQL —hora de reloj sin fecha ni zona—: una
 * clase de los lunes a las 07:00 es un horario recurrente, no un instante. Con `timestamp`
 * el horario se desplazaría al cambiar de huso.
 */
export const scheduleBlocks = pgTable(
  'schedule_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      // Borrar una materia se lleva sus sesiones: no tienen sentido por separado.
      .references(() => subjects.id, { onDelete: 'cascade' }),
    /** `lunes` … `sabado`, tal como los define `WEEKDAYS` en `shared`. */
    weekday: text('weekday').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    room: text('room'),
  },
  (table) => [
    index('schedule_blocks_user_id_idx').on(table.userId),
    index('schedule_blocks_subject_id_idx').on(table.subjectId),
  ],
);

/**
 * Inasistencias registradas (FR-011, FR-012, FR-017).
 *
 * Una fila por sesión a la que se faltó, nunca por día: una materia puede tener dos clases
 * el mismo día, y sin el bloque no se podría saber si se faltó a una o a las dos. El "día
 * completo" de FR-011 se guarda como varias filas, una por clase de ese día.
 *
 * La fecha es `date` de PostgreSQL —día de calendario sin hora ni zona—: "falté el 3 de
 * septiembre" es un día, no un instante. Con `timestamp` la falta se desplazaría de día al
 * cambiar de huso.
 */
export const absenceRecords = pgTable(
  'absence_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    /**
     * Sesión a la que se faltó.
     *
     * Si el estudiante reorganiza su horario y borra la sesión, la falta se va con ella:
     * una inasistencia a una clase que ya no existe en el horario no se puede contar contra
     * ningún límite. No es historial archivable (Principio VI), es un registro del semestre
     * en curso que la Fase 7 archivará como parte del semestre entero.
     */
    blockId: uuid('block_id')
      .notNull()
      .references(() => scheduleBlocks.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    /** Justificada: se conserva pero no cuenta para el límite (FR-017). */
    justified: boolean('justified').notNull().default(false),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('absence_records_user_id_idx').on(table.userId),
    index('absence_records_subject_id_idx').on(table.subjectId),
    // El panel de faltas cuenta por materia y la pantalla de marcar consulta por fecha.
    index('absence_records_user_date_idx').on(table.userId, table.date),
    /**
     * Una misma sesión no puede tener dos faltas el mismo día.
     *
     * Lo impone la base de datos y no solo el servicio: dos toques rápidos en la app
     * lanzarían dos peticiones a la vez, y la comprobación previa de ambas pasaría antes de
     * que ninguna insertara. El conteo de FR-012 saldría inflado.
     */
    unique('absence_records_block_date_unique').on(table.blockId, table.date),
  ],
);

/**
 * Actividades de la agenda: tareas, proyectos, exámenes (FR-018 a FR-022).
 *
 * `subjectId` y `dueDate` son nulos a propósito: FR-018 los declara opcionales, porque
 * "renovar la credencial" no cuelga de ninguna materia y "leer el capítulo 4" puede no
 * tener entrega.
 *
 * La fecha límite es `date` y no `timestamp` por lo mismo que la fecha de una falta: "se
 * entrega el 3 de septiembre" es un día de calendario. Con `timestamp` la entrega se
 * movería de día al cambiar de huso, y una tarea aparecería vencida un día antes.
 */
export const agendaItems = pgTable(
  'agenda_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    /** `tarea`, `proyecto`, `examen` o `actividad`, tal como los define `AGENDA_KINDS`. */
    kind: text('kind').notNull().default('tarea'),
    /**
     * Materia asociada, si la tiene (FR-018).
     *
     * `set null` y no `cascade`: borrar una materia no puede llevarse la tarea. La entrega
     * sigue existiendo aunque el estudiante reorganice su horario, y perderla en silencio
     * sería justo el fallo que la agenda existe para evitar. Se queda sin materia, que es
     * un estado válido.
     */
    subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
    dueDate: date('due_date'),
    /** Completada (FR-020). Completar conserva el registro; borrar es otra acción (FR-021). */
    completed: boolean('completed').notNull().default(false),
    /** Cuándo se completó. `null` mientras siga pendiente. */
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('agenda_items_user_id_idx').on(table.userId),
    index('agenda_items_subject_id_idx').on(table.subjectId),
    /**
     * La consulta de FR-022: los pendientes del usuario ordenados por vencimiento.
     *
     * Va sobre las tres columnas juntas porque es como se pide siempre —filtrar por usuario,
     * separar completadas y ordenar por fecha—, y así el índice resuelve la ordenación sin
     * pasar por un sort aparte.
     */
    index('agenda_items_user_due_idx').on(table.userId, table.completed, table.dueDate),
  ],
);

/**
 * Ajustes del usuario.
 *
 * Una fila por usuario, creada al vuelo la primera vez que hace falta. De momento solo
 * guarda las semanas del semestre; es el sitio natural para lo que vayan pidiendo las
 * fases siguientes.
 */
export const userSettings = pgTable('user_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  /**
   * Semanas de clase del semestre, base del límite sugerido (FR-013).
   *
   * Es un ajuste del usuario porque el calendario varía por plantel y periodo. La Fase 7 lo
   * sustituirá por las fechas reales del semestre.
   */
  semesterWeeks: integer('semester_weeks').notNull().default(16),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  subjects: many(subjects),
  scheduleBlocks: many(scheduleBlocks),
  absenceRecords: many(absenceRecords),
  agendaItems: many(agendaItems),
  settings: one(userSettings),
}));

export const agendaItemsRelations = relations(agendaItems, ({ one }) => ({
  user: one(users, { fields: [agendaItems.userId], references: [users.id] }),
  subject: one(subjects, { fields: [agendaItems.subjectId], references: [subjects.id] }),
}));

export const absenceRecordsRelations = relations(absenceRecords, ({ one }) => ({
  user: one(users, { fields: [absenceRecords.userId], references: [users.id] }),
  subject: one(subjects, { fields: [absenceRecords.subjectId], references: [subjects.id] }),
  block: one(scheduleBlocks, {
    fields: [absenceRecords.blockId],
    references: [scheduleBlocks.id],
  }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, { fields: [userSettings.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  user: one(users, { fields: [subjects.userId], references: [users.id] }),
  blocks: many(scheduleBlocks),
  absences: many(absenceRecords),
  agendaItems: many(agendaItems),
}));

export const scheduleBlocksRelations = relations(scheduleBlocks, ({ one }) => ({
  user: one(users, { fields: [scheduleBlocks.userId], references: [users.id] }),
  subject: one(subjects, { fields: [scheduleBlocks.subjectId], references: [subjects.id] }),
}));

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;
export type SubjectRow = typeof subjects.$inferSelect;
export type NewSubjectRow = typeof subjects.$inferInsert;
export type ScheduleBlockRow = typeof scheduleBlocks.$inferSelect;
export type NewScheduleBlockRow = typeof scheduleBlocks.$inferInsert;
export type AbsenceRecordRow = typeof absenceRecords.$inferSelect;
export type NewAbsenceRecordRow = typeof absenceRecords.$inferInsert;
export type AgendaItemRow = typeof agendaItems.$inferSelect;
export type NewAgendaItemRow = typeof agendaItems.$inferInsert;
export type UserSettingsRow = typeof userSettings.$inferSelect;
