import bcrypt from 'bcryptjs';

/**
 * Hasheo de contraseñas.
 *
 * 12 rondas: en el hardware actual son unos cientos de milisegundos, suficiente para que
 * probar contraseñas a gran escala salga caro sin que el login se note lento.
 */
const ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Hash de descarte, usado cuando el correo no existe.
 *
 * Sin esto, un login con correo inexistente respondería mucho más rápido que uno con
 * contraseña incorrecta, y esa diferencia de tiempo delataría qué correos están
 * registrados. Comparar contra este hash iguala ambos caminos.
 */
const DUMMY_HASH = bcrypt.hashSync('notecore-usuario-inexistente', ROUNDS);

export async function wastePasswordComparison(plain: string): Promise<void> {
  await bcrypt.compare(plain, DUMMY_HASH);
}
