import type { ServerEvent } from '@notecore/shared';

/**
 * El registro de canales en vivo abiertos (FR-043).
 *
 * Un mapa de usuario a sus sockets. Es deliberadamente lo más simple que resuelve el
 * problema, y merece explicarse porque la simplicidad tiene un límite conocido.
 *
 * ## Por qué un mapa en memoria
 *
 * Cada usuario puede tener **varios** canales a la vez —la web y la app abiertas, que es el
 * caso que la Fase 1 hizo posible con la sesión simultánea—, así que el valor es un conjunto
 * y no un socket suelto. Publicar recorre el conjunto: quien escribe desde el navegador ve
 * aparecer su mensaje en el teléfono sin tocar nada.
 *
 * ## El límite, dicho claro
 *
 * **Esto vive en el proceso.** Con dos instancias de la API detrás de un balanceador, un
 * usuario conectado a la instancia A no recibiría lo que publica la instancia B, y el aviso
 * se perdería en silencio —que es la peor forma de perderse—. La salida es un canal externo
 * (`LISTEN/NOTIFY` de PostgreSQL, que ya está en el proyecto, o Redis).
 *
 * No se hace ahora porque el despliegue es **una sola instancia** detrás de un túnel de
 * Cloudflare, y montar la coordinación entre procesos antes de tener dos procesos sería
 * infraestructura sin uso. Queda anotado aquí, que es donde se buscará el día que se escale:
 * `publish` es el único punto que habría que cambiar, y su firma no cambiaría.
 *
 * **Nada de esto sustituye a la lectura por HTTP.** El canal acelera lo que ya funciona sin
 * él: si un aviso se pierde —por reconexión, por lo que sea— la conversación se sigue leyendo
 * completa al abrirla. Un canal que fuera la única vía convertiría cualquier corte en
 * mensajes que no aparecen nunca.
 */

/** Lo mínimo que el registro necesita de un socket, para no atarse a Fastify. */
export interface LiveSocket {
  send(data: string): void;
  close(): void;
}

/** Los canales abiertos, por usuario. */
const channels = new Map<string, Set<LiveSocket>>();

/** Registra un canal recién autenticado. */
export function register(userId: string, socket: LiveSocket): void {
  const existing = channels.get(userId);
  if (existing === undefined) {
    channels.set(userId, new Set([socket]));
    return;
  }
  existing.add(socket);
}

/**
 * Da de baja un canal.
 *
 * Se borra la entrada entera cuando queda vacía: sin eso, el mapa acumularía un conjunto
 * vacío por cada usuario que alguna vez se conectó, que es una fuga lenta pero segura en un
 * proceso que no se reinicia.
 */
export function unregister(userId: string, socket: LiveSocket): void {
  const existing = channels.get(userId);
  if (existing === undefined) return;

  existing.delete(socket);
  if (existing.size === 0) channels.delete(userId);
}

/**
 * Envía un evento a todos los canales de un usuario.
 *
 * Un socket que falla al escribir **no interrumpe a los demás**: puede haberse cerrado entre
 * el `send` y este instante, y que eso tumbara la publicación al resto de sus dispositivos
 * sería un fallo mucho peor que el que lo causó.
 */
export function publish(userId: string, event: ServerEvent): void {
  const sockets = channels.get(userId);
  if (sockets === undefined) return;

  const payload = JSON.stringify(event);

  for (const socket of sockets) {
    try {
      socket.send(payload);
    } catch {
      // El socket ya no sirve. El manejador de cierre lo dará de baja por su cuenta.
    }
  }
}

/** Cuántos canales hay abiertos, para diagnóstico. */
export function openChannels(): number {
  let total = 0;
  for (const sockets of channels.values()) total += sockets.size;
  return total;
}

/**
 * Cierra todos los canales de un usuario.
 *
 * La usa el cierre de sesión: un canal autenticado con una sesión que ya no existe seguiría
 * entregando mensajes a un dispositivo del que el usuario acaba de salir. El token de acceso
 * caducaría en quince minutos, pero el canal no vuelve a comprobarlo después del handshake
 * —esa es su naturaleza—, así que cerrarlo es lo único que hace efectivo el cierre de sesión.
 */
export function disconnectUser(userId: string): void {
  const sockets = channels.get(userId);
  if (sockets === undefined) return;

  for (const socket of sockets) {
    try {
      socket.close();
    } catch {
      // Ya estaba cerrado.
    }
  }

  channels.delete(userId);
}
