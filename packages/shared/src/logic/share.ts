/**
 * Reglas de la compartición (FR-028 a FR-033).
 *
 * Principio II: la API decide con estas mismas funciones. Los clientes las usan para
 * presentar —normalizar lo que se teclea, componer el enlace, leer el estado— nunca para
 * decidir por su cuenta si un compartido sigue siendo válido.
 */

import {
  SHARE_CODE_ALPHABET,
  SHARE_CODE_LENGTH,
  SHARE_UNAVAILABLE_MESSAGES,
  type Share,
  type SharePayload,
  type ShareStatus,
  type ShareUnavailableReason,
} from '../types/share.js';
import { parseDate, type Instant } from '../types/auth.js';
import { COLOR } from '../design/tokens.js';

/**
 * Normaliza un código tecleado o pegado por el receptor.
 *
 * Quita espacios y guiones y sube a mayúsculas, porque el código se comparte por voz, por
 * mensaje o escrito a mano: llega como `abcd-1234`, `ABCD 1234` o `abcd1234` y las tres son
 * el mismo código. Además convierte las letras que el alfabeto excluye a propósito —`I` y
 * `L` a `1`, `O` a `0`— que es justo la confusión que se produce al copiarlo a ojo.
 *
 * Devuelve `null` si lo que queda no puede ser un código: así el cliente distingue "esto no
 * tiene forma de código" de "el código no existe", sin gastar una petición.
 */
export function normalizeShareCode(value: string): string | null {
  const cleaned = value
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, '')
    // Sustituciones de lo que una persona confunde al leer, no de lo que el generador emite:
    // el alfabeto no contiene ninguna de estas cuatro letras.
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0')
    .replace(/U/g, 'V');

  if (cleaned.length !== SHARE_CODE_LENGTH) return null;

  for (const character of cleaned) {
    if (!SHARE_CODE_ALPHABET.includes(character)) return null;
  }

  return cleaned;
}

/**
 * Genera un código corto aleatorio (FR-028).
 *
 * Usa `crypto.getRandomValues`, disponible tanto en Node como en React Native y el
 * navegador. Es aleatoriedad criptográfica y no `Math.random()` a propósito: el código es lo
 * único que protege el contenido de un compartido, y una secuencia predecible permitiría
 * enumerar los de otras personas.
 *
 * El rechazo del resto por encima del múltiplo evita el sesgo del módulo: con 256 valores y
 * un alfabeto de 32 el reparto es exacto, pero la comprobación se deja escrita para que el
 * día que el alfabeto cambie de tamaño el código siga siendo uniforme.
 */
export function generateShareCode(): string {
  const limit = Math.floor(256 / SHARE_CODE_ALPHABET.length) * SHARE_CODE_ALPHABET.length;
  let code = '';

  while (code.length < SHARE_CODE_LENGTH) {
    const bytes = new Uint8Array(SHARE_CODE_LENGTH);
    crypto.getRandomValues(bytes);

    for (const byte of bytes) {
      if (code.length === SHARE_CODE_LENGTH) break;
      if (byte >= limit) continue;
      code += SHARE_CODE_ALPHABET[byte % SHARE_CODE_ALPHABET.length];
    }
  }

  return code;
}

/**
 * El enlace de un compartido (FR-028).
 *
 * Una sola función para que app y web produzcan exactamente la misma URL: es la que se
 * codifica en el QR, así que si difirieran, escanear y abrir el enlace llevarían a sitios
 * distintos —y FR-032 exige que las tres modalidades entreguen lo mismo—.
 */
export function shareUrl(baseUrl: string, code: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/compartido/${code}`;
}

/**
 * Estado real de un compartido (FR-033).
 *
 * La caducidad se deriva aquí y no se guarda en la base de datos: un estado almacenado
 * exigiría un proceso que recorriera la tabla marcando los vencidos, y hasta que corriera un
 * compartido caducado seguiría diciendo que está activo.
 *
 * `now` se pasa desde fuera para que toda una lista se evalúe contra el mismo instante y
 * para que las pruebas no dependan del reloj.
 */
export function shareStatus(
  share: { readonly revokedAt: Instant | null; readonly expiresAt: Instant },
  now: Date = new Date(),
): ShareStatus {
  // La revocación gana sobre la caducidad: es una decisión explícita del emisor y es lo que
  // el receptor necesita saber (FR-033).
  if (share.revokedAt !== null) return 'revocado';
  if (parseDate(share.expiresAt).getTime() <= now.getTime()) return 'caducado';
  return 'activo';
}

/** `true` si el compartido todavía se puede aceptar. */
export function isShareUsable(
  share: { readonly revokedAt: Instant | null; readonly expiresAt: Instant },
  now: Date = new Date(),
): boolean {
  return shareStatus(share, now) === 'activo';
}

/**
 * El motivo por el que un compartido no se puede usar, o `null` si sí se puede.
 *
 * Traduce el estado al vocabulario del receptor: `activo` no es un motivo, y `no_encontrado`
 * no es un estado —no hay fila que consultar—, así que los dos conjuntos no coinciden.
 */
export function shareUnavailableReason(
  share: { readonly revokedAt: Instant | null; readonly expiresAt: Instant },
  now: Date = new Date(),
): ShareUnavailableReason | null {
  const status = shareStatus(share, now);
  if (status === 'activo') return null;
  return status;
}

/** El mensaje que se muestra al receptor cuando no puede aceptar (FR-033). */
export function shareUnavailableMessage(reason: ShareUnavailableReason): string {
  return SHARE_UNAVAILABLE_MESSAGES[reason];
}

/**
 * Cuántos elementos incluye un compartido.
 *
 * Cuenta materias, no sesiones: es lo que el usuario eligió en la pantalla de selección, y
 * "3 materias" se corresponde con lo que marcó mientras que "12 sesiones" no.
 */
export function sharePayloadCount(payload: SharePayload): number {
  return payload.kind === 'horario' ? payload.subjects.length : payload.items.length;
}

/**
 * Resumen legible de lo que contiene un compartido, para la vista previa y la lista.
 *
 * Vive aquí y no en cada cliente porque es justo el texto que se corregiría en la web y se
 * olvidaría en la app, y entonces el mismo compartido se leería distinto según el
 * dispositivo.
 */
export function sharePayloadSummary(payload: SharePayload): string {
  if (payload.kind === 'horario') {
    const subjects = payload.subjects.length;
    const blocks = payload.subjects.reduce((total, subject) => total + subject.blocks.length, 0);
    const materias = subjects === 1 ? '1 materia' : `${subjects} materias`;
    const sesiones = blocks === 1 ? '1 sesión' : `${blocks} sesiones`;
    return `${materias} · ${sesiones}`;
  }

  const items = payload.items.length;
  return items === 1 ? '1 actividad' : `${items} actividades`;
}

/**
 * El código formateado para leerlo en pantalla: `ABCD-1234`.
 *
 * Partirlo por la mitad es lo que hace que se pueda dictar sin perder la cuenta. Solo afecta
 * a la presentación —`normalizeShareCode` quita el guion al recibirlo de vuelta—.
 */
export function formatShareCode(code: string): string {
  const half = Math.floor(code.length / 2);
  return `${code.slice(0, half)}-${code.slice(half)}`;
}

/** Etiqueta del estado, igual en los dos clientes. */
export const SHARE_STATUS_LABELS: Readonly<Record<ShareStatus, string>> = {
  activo: 'Activo',
  revocado: 'Revocado',
  caducado: 'Caducado',
};

/**
 * Color del estado.
 *
 * Vive en `shared` por lo mismo que el color de las faltas: si la web pintara "revocado" en
 * gris y la app en rojo, la misma situación se leería distinto según el dispositivo.
 */
export const SHARE_STATUS_COLORS: Readonly<Record<ShareStatus, string>> = {
  activo: COLOR.exito,
  revocado: COLOR.error,
  caducado: COLOR.tinta3,
};

/** Ordena los compartidos del emisor: los usables primero, y dentro, lo más reciente. */
export function sortShares(shares: readonly Share[]): readonly Share[] {
  return [...shares].sort((a, b) => {
    const usable = (share: Share) => (share.status === 'activo' ? 0 : 1);
    const byUsable = usable(a) - usable(b);
    if (byUsable !== 0) return byUsable;
    return parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime();
  });
}
