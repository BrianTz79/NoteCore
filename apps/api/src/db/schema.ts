import { relations } from 'drizzle-orm';
import { index, pgTable, text, time, timestamp, uuid } from 'drizzle-orm/pg-core';

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

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  subjects: many(subjects),
  scheduleBlocks: many(scheduleBlocks),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  user: one(users, { fields: [subjects.userId], references: [users.id] }),
  blocks: many(scheduleBlocks),
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
