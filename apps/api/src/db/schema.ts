import { relations } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;
