/**
 * El canal en vivo de la mensajería, compartido por web y app (FR-043).
 *
 * Principio VIII: la mecánica del canal —autenticar, reconectar con espera creciente,
 * latido, y traducir lo que llega a eventos tipados— se escribe UNA vez aquí. Web y app solo
 * difieren en de dónde sacan el token, y eso se inyecta.
 *
 * Se usa el `WebSocket` **global**, no una librería. React Native trae el suyo y todo
 * navegador tiene el estándar, así que la única implementación que hace falta es la que
 * decide *cuándo* reconectar —que es justo lo que esta clase aporta—. Meter una dependencia
 * habría añadido dos copias del mismo problema, una por cliente.
 *
 * ## Por qué la autenticación va en un frame y no en la URL
 *
 * El handshake de WebSocket del navegador **no admite cabeceras**: no hay forma de mandar
 * `Authorization: Bearer` al abrir. Las dos salidas habituales son la query de la URL o un
 * primer mensaje, y aquí es lo segundo: una URL termina en los registros del servidor, en el
 * historial del navegador y en cualquier proxy intermedio, y un token de acceso en un
 * registro es un token filtrado. El frame no se registra en ningún sitio.
 *
 * El servidor cierra el canal si el frame de autenticación no llega a tiempo, así que un
 * socket abierto sin credenciales no se queda esperando indefinidamente.
 */

import type { ClientEvent, LiveStatus, ServerEvent } from '../types/messaging.js';
import { reconnectDelay } from '../logic/messaging.js';
import { MESSAGING_ROUTES } from './messaging.js';

export interface LiveChannelOptions {
  /** URL base de la API, la misma de `ApiClient`. Se traduce a `ws://` o `wss://`. */
  readonly baseUrl: string;
  /**
   * De dónde sale el token con el que autenticar el canal.
   *
   * En la app es el token de acceso guardado. **En web devuelve `null`**: el token vive en
   * una cookie `httpOnly` que este código no puede leer —esa es su protección contra XSS—,
   * y el navegador la adjunta sola al handshake. El servidor acepta las dos vías, igual que
   * `requireAuth` hace con las peticiones normales.
   */
  readonly getToken: () => Promise<string | null> | string | null;
  /** Se invoca con cada evento del servidor. */
  readonly onEvent: (event: ServerEvent) => void;
  /** Se invoca cuando cambia el estado del canal, para el indicador. */
  readonly onStatus?: (status: LiveStatus) => void;
}

/** Cada cuánto se manda el latido. */
const HEARTBEAT_MS = 25_000;

/**
 * Un canal en vivo con su reconexión.
 *
 * El ciclo de vida es explícito —`connect` y `close`— porque la pantalla que lo abre es la
 * que sabe cuándo deja de hacer falta. Un canal que se cerrara solo por inactividad tendría
 * que adivinar eso, y adivinaría mal en la conversación tranquila, que es el caso normal.
 */
export class LiveChannel {
  private readonly options: LiveChannelOptions;
  private socket: WebSocket | null = null;
  private status: LiveStatus = 'sin_conexion';
  private attempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  /**
   * `true` cuando el cierre lo pidió la pantalla.
   *
   * Sin esta marca, cerrar el canal al salir del hilo dispararía el `onclose` que programa la
   * reconexión, y el canal volvería solo un segundo después de que nadie lo quisiera. Es el
   * fallo clásico de las reconexiones automáticas: la app deja sockets vivos detrás de cada
   * pantalla cerrada.
   */
  private closedByUs = false;

  constructor(options: LiveChannelOptions) {
    this.options = options;
  }

  /** El estado actual, para pintar el indicador sin esperar al siguiente aviso. */
  get currentStatus(): LiveStatus {
    return this.status;
  }

  private setStatus(status: LiveStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.options.onStatus?.(status);
  }

  /**
   * La URL del canal.
   *
   * `http` pasa a `ws` y `https` a `wss`: un canal sin cifrar desde una página cifrada lo
   * bloquea el propio navegador, así que derivarlo del esquema de la API es lo único que
   * funciona en los dos entornos sin configurar nada aparte.
   */
  private streamUrl(): string {
    const base = this.options.baseUrl.replace(/\/+$/, '');
    const ws = base.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
    return `${ws}${MESSAGING_ROUTES.stream}`;
  }

  private send(event: ClientEvent): void {
    if (this.socket?.readyState === 1) {
      this.socket.send(JSON.stringify(event));
    }
  }

  /** Abre el canal. Llamarlo con uno ya abierto no hace nada. */
  connect(): void {
    if (this.socket !== null) return;

    this.closedByUs = false;
    this.setStatus(this.attempts === 0 ? 'conectando' : 'reconectando');

    let socket: WebSocket;
    try {
      socket = new WebSocket(this.streamUrl());
    } catch {
      // Ni siquiera se pudo construir: se trata como cualquier otro fallo de conexión, para
      // que la espera creciente lo absorba en vez de dejar el canal muerto sin explicación.
      this.scheduleReconnect();
      return;
    }

    this.socket = socket;

    socket.onopen = () => {
      /**
       * Lo primero que viaja es el token.
       *
       * En web `getToken` devuelve `null` y no se manda nada: la cookie ya viajó en el
       * handshake. El servidor distingue los dos casos y cierra el canal si ninguna de las
       * dos vías le dice quién es.
       */
      void Promise.resolve(this.options.getToken())
        .then((token) => {
          if (token !== null && token !== '') {
            this.send({ tipo: 'auth', token });
          }
        })
        .catch(() => {
          // No se pudo leer el token: cerrar y dejar que la reconexión lo intente otra vez.
          socket.close();
        });

      this.startHeartbeat();
    };

    socket.onmessage = (event: MessageEvent) => {
      const parsed = parseServerEvent(event.data);
      if (parsed === null) return;

      /**
       * `listo` es lo que marca el canal como vivo, no el `onopen`.
       *
       * Entre abrir el socket y verificar la sesión hay un hueco en el que el servidor
       * todavía puede cerrarlo por token inválido. Dar por bueno el `onopen` dejaría el
       * indicador diciendo "en vivo" durante ese hueco, y en el caso malo —token caducado—
       * lo diría justo antes de caerse.
       */
      if (parsed.tipo === 'listo') {
        this.attempts = 0;
        this.setStatus('en_vivo');
        return;
      }

      this.options.onEvent(parsed);
    };

    socket.onerror = () => {
      // El detalle del error no llega por seguridad del navegador, y tampoco haría falta:
      // la reacción es la misma en todos los casos. El `onclose` viene detrás y es el que
      // programa la reconexión.
    };

    socket.onclose = () => {
      this.stopHeartbeat();
      this.socket = null;

      if (this.closedByUs) {
        this.setStatus('sin_conexion');
        return;
      }

      this.scheduleReconnect();
    };
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => this.send({ tipo: 'ping' }), HEARTBEAT_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Programa el siguiente intento con espera creciente.
   *
   * El estado pasa a `reconectando` y no a `sin_conexion` mientras haya un intento en
   * camino: son cosas distintas para el usuario —una se arregla sola— y merecen textos
   * distintos.
   */
  private scheduleReconnect(): void {
    if (this.closedByUs) return;
    if (this.reconnectTimer !== null) return;

    this.setStatus('reconectando');

    const delay = reconnectDelay(this.attempts);
    this.attempts += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  /**
   * Cierra el canal y cancela cualquier reintento pendiente.
   *
   * Lo llama la pantalla al desmontarse. Sin él, cada apertura de un hilo dejaría un socket
   * y un temporizador vivos detrás.
   */
  close(): void {
    this.closedByUs = true;

    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    const socket = this.socket;
    this.socket = null;
    socket?.close();

    this.attempts = 0;
    this.setStatus('sin_conexion');
  }
}

/**
 * Traduce lo que llega por el canal a un evento tipado, o `null` si no lo es.
 *
 * Se valida la forma en lugar de confiar en el `JSON.parse`. Lo que entra por un socket es
 * entrada externa igual que un cuerpo HTTP, y un evento con el `tipo` que no toca haría que
 * la pantalla leyera `undefined` donde espera un mensaje —un fallo en tiempo de ejecución
 * dentro de un manejador de eventos, que además no tiene dónde mostrarse—.
 */
export function parseServerEvent(raw: unknown): ServerEvent | null {
  if (typeof raw !== 'string') return null;

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof payload !== 'object' || payload === null) return null;
  const event = payload as Record<string, unknown>;

  switch (event.tipo) {
    case 'listo':
      return { tipo: 'listo' };

    case 'mensaje':
      if (typeof event.conversationId !== 'string') return null;
      if (typeof event.message !== 'object' || event.message === null) return null;
      return event as unknown as ServerEvent;

    case 'leidos':
      if (typeof event.conversationId !== 'string') return null;
      if (typeof event.readAt !== 'string') return null;
      return event as unknown as ServerEvent;

    case 'borrado':
      if (typeof event.conversationId !== 'string') return null;
      if (typeof event.messageId !== 'string') return null;
      return event as unknown as ServerEvent;

    case 'relacion':
      if (typeof event.conversationId !== 'string') return null;
      if (event.blockedReason !== null && typeof event.blockedReason !== 'string') return null;
      return event as unknown as ServerEvent;

    default:
      return null;
  }
}
