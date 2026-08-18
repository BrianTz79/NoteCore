/**
 * Reglas de la mensajería (FR-043, FR-044).
 *
 * Principio II: la API decide con estas mismas funciones. Los clientes las usan para
 * presentar —si se pinta el campo de texto, cómo se resume un hilo, cómo se ordena la
 * lista— nunca para decidir por su cuenta si dos personas pueden escribirse: eso lo
 * verifica el servidor en cada envío.
 *
 * La pieza central es `messagingBlockedReason`, y no es casualidad que sea tan corta: FR-044
 * cuelga entero de `contactViewpoint`, que la Fase 8 dejó resuelto. Escribir aquí una
 * segunda lectura del estado de la relación —"si el status es aceptada y nadie bloqueó…"—
 * sería la misma regla por segunda vez, y la discrepancia entre las dos dejaría pasar
 * mensajes que el requisito prohíbe.
 */

import type { ContactViewpoint } from '../types/social.js';
import type {
  ConversationSummary,
  Message,
  MessagingBlockedReason,
  LiveStatus,
} from '../types/messaging.js';
import { MESSAGING_BLOCKED_MESSAGES } from '../types/messaging.js';
import { parseDate, type Instant } from '../types/auth.js';

/* ─────────────────────────── Quién puede escribir (FR-044) ─────────────────────────── */

/**
 * Por qué no se puede escribir en una conversación, o `null` si sí se puede (FR-044).
 *
 * **La** función de la fase. Se apoya en el punto de vista que la Fase 8 ya resuelve, y por
 * eso no vuelve a mirar estados ni identificadores: pasar dos veces por la misma pregunta es
 * cómo se llega a que la pantalla ofrezca escribir y el servidor lo rechace.
 *
 * `bloqueada_por_otro` devuelve `no_contacto`, exactamente lo mismo que un desconocido. El
 * bloqueo no se anuncia —regla de la Fase 8—, y en mensajería importa más que en ninguna
 * otra pantalla: distinguir "no es tu contacto" de "te bloqueó" le diría al bloqueado justo
 * lo que le empujaría a buscar otra vía para insistir.
 */
export function messagingBlockedReason(
  viewpoint: ContactViewpoint,
): MessagingBlockedReason | null {
  switch (viewpoint) {
    case 'aceptada':
      // El único caso que permite escribir (FR-043).
      return null;
    case 'bloqueada_por_mi':
      return 'bloqueada_por_mi';
    case 'enviada':
    case 'recibida':
      return 'solicitud_pendiente';
    case 'ninguna':
    case 'bloqueada_por_otro':
      // Al bloqueado se le responde lo mismo que a un desconocido: el bloqueo no se cuenta.
      return 'no_contacto';
  }
}

/**
 * `true` si se puede enviar un mensaje desde este punto de vista (FR-043, FR-044).
 *
 * Es `messagingBlockedReason` leída al derecho. Existe porque `if (canSendMessage(v))` dice
 * lo que quiere decir, mientras que `if (messagingBlockedReason(v) === null)` obliga a
 * traducir una doble negación en cada sitio donde se usa.
 */
export function canSendMessage(viewpoint: ContactViewpoint): boolean {
  return messagingBlockedReason(viewpoint) === null;
}

/** El texto que explica por qué no se puede escribir, o `null` si sí se puede. */
export function messagingBlockedMessage(reason: MessagingBlockedReason | null): string | null {
  return reason === null ? null : MESSAGING_BLOCKED_MESSAGES[reason];
}

/* ─────────────────────────── Presentación del hilo ─────────────────────────── */

/**
 * Vista previa de un mensaje para la lista de conversaciones.
 *
 * Recorta a una línea y antepone "Tú: " en los propios, que es como se distingue de un
 * vistazo si la conversación espera respuesta mía o suya. Vive en `shared` porque es
 * justamente el texto que se afinaría en un cliente y se olvidaría en el otro.
 */
export function messagePreview(message: Message | null, maxLength = 60): string {
  if (message === null) return 'Sin mensajes todavía';
  if (message.deleted) return message.isOwn ? 'Tú: mensaje eliminado' : 'Mensaje eliminado';

  // Los saltos de línea se colapsan: en un renglón de lista, un mensaje de varias líneas
  // rompería la altura de la fila y desalinearía toda la lista.
  const flat = message.text.replace(/\s+/g, ' ').trim();
  const cut = flat.length > maxLength ? `${flat.slice(0, maxLength - 1).trimEnd()}…` : flat;

  return message.isOwn ? `Tú: ${cut}` : cut;
}

/**
 * El texto que se pinta en el sitio de un mensaje borrado.
 *
 * Una constante y no una cadena escrita en cada pantalla: es lo que hace que el hueco se lea
 * igual en el teléfono y en el navegador.
 */
export const DELETED_MESSAGE_TEXT = 'Mensaje eliminado';

/**
 * Ordena las conversaciones: la que tiene lo más reciente, primero.
 *
 * Es el orden de cualquier bandeja, y el que hace que responder a alguien lo suba al principio
 * —que es donde el usuario lo va a buscar acto seguido—.
 */
export function sortConversations(
  conversations: readonly ConversationSummary[],
): readonly ConversationSummary[] {
  return [...conversations].sort(
    (a, b) => parseDate(b.updatedAt).getTime() - parseDate(a.updatedAt).getTime(),
  );
}

/**
 * Ordena los mensajes de un hilo: del más antiguo al más reciente.
 *
 * El servidor ya los manda así, pero el cliente vuelve a ordenar después de insertar lo que
 * llega por el canal en vivo: un mensaje que llega mientras se estaba cargando una página
 * anterior se colaría en medio del hilo si se confiara en el orden de llegada.
 */
export function sortMessages(messages: readonly Message[]): readonly Message[] {
  return [...messages].sort(
    (a, b) => parseDate(a.sentAt).getTime() - parseDate(b.sentAt).getTime(),
  );
}

/**
 * Mezcla mensajes nuevos con los que ya estaban, sin duplicar.
 *
 * Hace falta porque hay **dos caminos** por los que un mensaje llega a la pantalla: la
 * respuesta del envío y el aviso del canal en vivo, que emite también al autor. Los dos
 * traen el mismo mensaje con el mismo identificador, y sin deduplicar el usuario vería su
 * propio mensaje dos veces —el fallo más visible que puede tener un chat—.
 *
 * Gana el mensaje que llega después: si el aviso del canal trae el `readAt` ya puesto, ese
 * es el estado bueno.
 */
export function mergeMessages(
  existing: readonly Message[],
  incoming: readonly Message[],
): readonly Message[] {
  const byId = new Map<string, Message>();
  for (const message of existing) byId.set(message.id, message);
  for (const message of incoming) byId.set(message.id, message);

  return sortMessages([...byId.values()]);
}

/**
 * Marca como leídos los mensajes propios anteriores a un instante.
 *
 * Es lo que aplica el aviso `leidos` del canal en vivo. Se hace por fecha y no por lista de
 * identificadores porque leer es siempre "hasta aquí": mandar cien identificadores para
 * decir lo mismo que una fecha cargaría el canal justo cuando alguien abre un hilo largo.
 */
export function applyReadReceipt(
  messages: readonly Message[],
  readAt: Instant,
): readonly Message[] {
  const limit = parseDate(readAt).getTime();

  return messages.map((message) =>
    message.isOwn && message.readAt === null && parseDate(message.sentAt).getTime() <= limit
      ? { ...message, readAt }
      : message,
  );
}

/**
 * `true` si dos mensajes seguidos deben agruparse bajo la misma cabecera.
 *
 * Cinco mensajes seguidos de la misma persona en el mismo minuto son una intervención, no
 * cinco: repetir el nombre y la hora en cada uno llena el hilo de ruido. Vive en `shared`
 * para que el hilo tenga la misma forma en los dos clientes.
 */
export function groupsWithPrevious(message: Message, previous: Message | undefined): boolean {
  if (previous === undefined) return false;
  if (previous.isOwn !== message.isOwn) return false;

  const gap = parseDate(message.sentAt).getTime() - parseDate(previous.sentAt).getTime();
  // Cinco minutos: pasado ese rato, lo que se escribe ya es otra intervención aunque sea de
  // la misma persona.
  return gap < 5 * 60 * 1000;
}

/* ─────────────────────────── Conteos ─────────────────────────── */

/**
 * Resumen de mensajes sin leer, para el aviso del inicio.
 *
 * Devuelve `null` cuando no hay ninguno, por lo mismo que el de solicitudes de la Fase 8: un
 * aviso que diga "0 mensajes" es ruido, y un aviso que siempre está es un aviso que se deja
 * de leer.
 *
 * Con singular y plural resueltos en las dos partes de la frase. "1 mensajes" y "en 1
 * conversaciones" son el detalle que delata un texto concatenado, y se corregiría en un
 * cliente y se olvidaría en el otro.
 */
export function unreadSummary(total: number, conversations: number): string | null {
  if (total <= 0) return null;

  const mensajes = total === 1 ? '1 mensaje sin leer' : `${total} mensajes sin leer`;
  if (conversations <= 1) return mensajes;

  return `${mensajes} en ${conversations} conversaciones`;
}

/**
 * La insignia de una conversación con mensajes sin leer.
 *
 * Se corta en "99+" porque un número de cuatro cifras deforma la burbuja y, pasado cierto
 * punto, "muchos" es toda la información que el usuario necesita.
 */
export function unreadBadge(count: number): string | null {
  if (count <= 0) return null;
  return count > 99 ? '99+' : String(count);
}

/* ─────────────────────────── El canal en vivo ─────────────────────────── */

/**
 * Qué se le dice al usuario sobre el estado del canal.
 *
 * `en_vivo` devuelve `null` a propósito: cuando todo funciona no hay nada que decir, y una
 * etiqueta permanente de "conectado" es ruido que se deja de leer —y entonces tampoco se lee
 * el aviso que sí importa—. Es la misma decisión que tomó el indicador de sincronización de
 * la Fase 9.
 */
export const LIVE_STATUS_MESSAGES: Readonly<Record<LiveStatus, string | null>> = {
  conectando: 'Conectando…',
  en_vivo: null,
  reconectando: 'Reconectando…',
  sin_conexion: 'Sin conexión en vivo. Los mensajes nuevos pueden tardar en aparecer.',
};

/** El texto del indicador del canal, o `null` si no hay nada que decir. */
export function liveStatusMessage(status: LiveStatus): string | null {
  return LIVE_STATUS_MESSAGES[status];
}

/**
 * Cuánto esperar antes del siguiente intento de reconexión.
 *
 * Crece con cada intento y se corta a 30 segundos. Sin el crecimiento, un servidor caído
 * recibiría un intento por segundo de cada cliente abierto —que es cómo un fallo pasajero se
 * convierte en uno que no se recupera—; sin el tope, una desconexión larga acabaría
 * reintentando cada varios minutos y el usuario vería el canal muerto mucho después de que
 * la red volviera.
 *
 * El jitter evita que todos los clientes que se cayeron a la vez vuelvan a la vez.
 */
export function reconnectDelay(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(1000 * 2 ** Math.max(0, attempt), 30_000);
  // ±20%: suficiente para repartir la vuelta sin que el primer intento se note lento.
  return Math.round(base * (0.8 + random() * 0.4));
}
