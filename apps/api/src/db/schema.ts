import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Esquema de base de datos.
 *
 * La Fase 0 solo establece el sistema de migraciones. La tabla `users` real —con
 * autenticación y perfil— llega en la Fase 1; aquí se crea la mínima estructura que
 * permite verificar que Drizzle genera y aplica migraciones correctamente.
 *
 * Principio III: toda tabla de dominio que se añada a partir de la Fase 1 lleva
 * `userId` con clave foránea a `users`, y toda consulta filtra por el usuario autenticado.
 */

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  displayName: text('display_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
