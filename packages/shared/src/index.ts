/**
 * @notecore/shared — tipos de dominio, validaciones y reglas puras.
 *
 * Consumido por `@notecore/api`, `@notecore/web` y `@notecore/mobile`.
 * Antes de crear un tipo o una regla en cualquier cliente, revisa si ya existe aquí.
 */

export * from './types/common.js';
export * from './types/auth.js';
export * from './types/api.js';
export * from './schemas/common.js';
export * from './schemas/auth.js';
export * from './logic/attendance.js';
export * from './logic/form-errors.js';
export * from './logic/dates.js';
export * from './api/client.js';
export * from './api/auth.js';
