/**
 * @notecore/shared — tipos de dominio, validaciones y reglas puras.
 *
 * Consumido por `@notecore/api`, `@notecore/web` y `@notecore/mobile`.
 * Antes de crear un tipo o una regla en cualquier cliente, revisa si ya existe aquí.
 */

export * from './types/common.js';
export * from './types/auth.js';
export * from './types/api.js';
export * from './types/schedule.js';
export * from './types/attendance.js';
export * from './types/agenda.js';
export * from './types/calendar.js';
export * from './schemas/common.js';
export * from './schemas/auth.js';
export * from './schemas/schedule.js';
export * from './schemas/attendance.js';
export * from './schemas/agenda.js';
export * from './schemas/calendar.js';
export * from './logic/attendance.js';
export * from './logic/agenda.js';
export * from './logic/form-errors.js';
export * from './logic/dates.js';
export * from './logic/schedule.js';
export * from './logic/schedule-import.js';
export * from './logic/calendar.js';
export * from './api/client.js';
export * from './api/auth.js';
export * from './api/schedule.js';
export * from './api/attendance.js';
export * from './api/agenda.js';
export * from './api/calendar.js';
