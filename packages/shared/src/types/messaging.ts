/**
 * Tipos de la mensajería (FR-043, FR-044).
 *
 * Principio VIII: definidos UNA vez aquí y consumidos por `api`, `web` y `mobile`.
 *
 * La idea que gobierna el módulo la hereda de la Fase 8: **una conversación entre dos
 * personas es un solo hecho**, igual que la relación de la que cuelga. Se guarda con el par
 * ordenado —el mismo `orderedPair` de los contactos— para que la conversación entre A y B
 * ocupe la misma fila se abra desde donde se abra. Sin eso, escribirse a la vez crearía dos
 * hilos —uno en cada orden— y cada uno vería la mitad de lo dicho.
 *
 * La segunda idea, la de FR-044: **poder escribir no es un estado del mensaje, es un estado
 * de la relación**. No se guarda "esta conversación está permitida"; se pregunta por la
 * relación en cada envío. Guardarlo sería una copia del estado de contacto que quedaría
 * vieja en cuanto alguien bloqueara, y el bloqueo dejaría de surtir efecto justo cuando más
 * importa —que es lo que FR-044 pide impedir—.
 */

import type { EntityId } from './common.js';
import type { Instant } from './auth.js';
import type { UserSearchResult } from './social.js';

/* ─────────────────────────── Límites ─────────────────────────── */

/**
 * Longitud máxima de un mensaje.
 *
 * Más largo que una publicación (1000) sería raro: un mensaje es una intervención en una
 * conversación, no un texto para leerse solo. Se queda en 2000 porque pegar un enunciado de
 * problema o una lista de temas de examen —lo que de verdad se manda entre compañeros de
 * clase— pasa de mil caracteres con facilidad.
 */
export const MESSAGE_MAX_LENGTH = 2000;

/**
 * Cuántos mensajes trae una página del hilo.
 *
 * El hilo se lee de abajo arriba: llegan los más recientes y se piden los anteriores al
 * subir. 50 es lo que llena una pantalla larga con margen, sin traer meses de conversación
 * a un teléfono para pintar los últimos diez renglones.
 */
export const MESSAGE_PAGE_SIZE = 50;

/* ─────────────────────────── Por qué no se puede escribir ─────────────────────────── */

/**
 * El motivo por el que una conversación no admite mensajes (FR-044).
 *
 * Existe como conjunto cerrado y no como texto libre porque cada motivo lleva al usuario a
 * una acción distinta: a una solicitud pendiente se le espera, a un desconocido se le
 * agrega, y a quien uno bloqueó se le desbloquea. Un solo mensaje de "no se puede" los
 * confundiría los tres.
 *
 * `bloqueada_por_otro` **no está en la lista** deliberadamente: a quien fue bloqueado se le
 * responde `no_contacto`, lo mismo que a un desconocido. Es la misma regla de la Fase 8 —el
 * bloqueo no se anuncia—, y aquí importa más que en ninguna otra pantalla: enterarse de que
 * a uno lo bloquearon es exactamente lo que empuja a buscar otra vía para insistir.
 */
export const MESSAGING_BLOCKED_REASONS = [
  /** No son contactos aceptados, o la otra persona bloqueó (no se distingue). */
  'no_contacto',
  /** Hay una solicitud pendiente: todavía no se han aceptado. */
  'solicitud_pendiente',
  /** Yo bloqueé a esta persona. Puedo desbloquearla. */
  'bloqueada_por_mi',
] as const;
export type MessagingBlockedReason = (typeof MESSAGING_BLOCKED_REASONS)[number];

/**
 * Qué se le dice al usuario en cada caso.
 *
 * Se escribe una vez para los dos clientes por lo mismo que los textos de visibilidad de la
 * Fase 8: es el texto del que depende que el usuario entienda por qué no puede escribir, y
 * si la web dijera una cosa y la app otra, la misma situación se entendería distinto según
 * el dispositivo.
 */
export const MESSAGING_BLOCKED_MESSAGES: Readonly<Record<MessagingBlockedReason, string>> = {
  no_contacto: 'Solo puedes escribir a tus contactos.',
  solicitud_pendiente: 'Podrán escribirse cuando se acepte la solicitud.',
  bloqueada_por_mi: 'Bloqueaste a esta persona. Desbloquéala para poder escribirle.',
};

/* ─────────────────────────── El mensaje ─────────────────────────── */

/**
 * Un mensaje de una conversación.
 *
 * No lleva el autor resuelto como una publicación: en un hilo de dos, saber si es mío o suyo
 * es todo lo que hace falta para pintarlo, y repetir el mismo perfil en cada uno de
 * cincuenta mensajes sería peso muerto en cada página.
 */
export interface Message {
  readonly id: EntityId;
  /** La conversación a la que pertenece. */
  readonly conversationId: EntityId;
  /**
   * `true` si lo escribí yo.
   *
   * Lo resuelve el servidor y no el cliente comparando identificadores, por lo mismo que el
   * punto de vista de un contacto en la Fase 8: esa comparación es justo donde un cliente se
   * equivocaría de lado, y el fallo se vería como el hilo entero pintado al revés.
   */
  readonly isOwn: boolean;
  readonly text: string;
  readonly sentAt: Instant;
  /**
   * Cuándo lo leyó el destinatario. `null` mientras no lo haya leído.
   *
   * Solo tiene sentido en los propios: de los ajenos, quien lee es uno mismo, y el momento
   * en que uno lee su propio hilo no es información para nadie. En los recibidos llega
   * siempre `null`.
   */
  readonly readAt: Instant | null;
  /**
   * `true` si el mensaje fue borrado por su autor.
   *
   * El texto llega vacío y la pantalla pinta "Mensaje eliminado" en su sitio. Se deja el
   * hueco en lugar de quitar la fila porque un hilo del que desaparecen renglones se lee mal
   * —las respuestas quedan colgando de nada—, y porque quien ya lo leyó no puede
   * desleerlo: fingir que nunca se dijo sería mentirle a la otra persona.
   */
  readonly deleted: boolean;
}

/* ─────────────────────────── La conversación ─────────────────────────── */

/**
 * Una conversación tal como aparece en la lista.
 *
 * Lleva el último mensaje dentro porque es lo que se pinta en la lista: pedirlo aparte serían
 * tantas peticiones como conversaciones para llenar una sola pantalla.
 */
export interface ConversationSummary {
  readonly id: EntityId;
  /** La otra persona. Quien lee ya sabe quién es él mismo. */
  readonly user: UserSearchResult;
  /** Vista previa del último mensaje, o `null` si la conversación está vacía. */
  readonly lastMessage: Message | null;
  /** Cuántos mensajes suyos no he leído. */
  readonly unreadCount: number;
  /**
   * Por qué no se puede escribir aquí, o `null` si sí se puede (FR-044).
   *
   * Principio II: lo decide el servidor consultando la relación, y el cliente pinta el
   * campo de texto o la explicación según lo que llegue. Derivarlo en el cliente sería la
   * regla de FR-044 escrita dos veces más, y la discrepancia se vería como un campo de
   * texto que acepta lo escrito y falla al enviar.
   */
  readonly blockedReason: MessagingBlockedReason | null;
  /** Cuándo se dijo lo último. Es por lo que se ordena la lista. */
  readonly updatedAt: Instant;
}

/**
 * Una conversación abierta, con su página de mensajes.
 *
 * Los mensajes van **del más antiguo al más reciente**, que es como se lee un hilo. La
 * paginación pide hacia atrás —lo anterior a un mensaje dado—, así que el servidor invierte
 * antes de responder y ningún cliente tiene que acordarse de hacerlo.
 */
export interface Conversation extends ConversationSummary {
  readonly messages: readonly Message[];
  /**
   * `true` si hay mensajes anteriores a los que llegaron.
   *
   * Lo dice el servidor en lugar de dejar que el cliente lo deduzca de que la página vino
   * llena: una página exactamente llena y el final del hilo son indistinguibles desde fuera,
   * y el cliente pintaría "cargar anteriores" sobre un hilo que ya está entero.
   */
  readonly hasMore: boolean;
}

/**
 * Cuántos mensajes sin leer hay en total, para el aviso del inicio.
 *
 * Viaja como su propio tipo y no como un número suelto por lo mismo que el conteo de
 * solicitudes de la Fase 8: la pantalla de inicio necesita el número sin traerse la lista
 * entera de conversaciones para contarlo.
 */
export interface UnreadSummary {
  /** Mensajes sin leer, sumando todas las conversaciones. */
  readonly total: number;
  /** En cuántas conversaciones distintas hay algo sin leer. */
  readonly conversations: number;
}

/* ─────────────────────────── Tiempo real ─────────────────────────── */

/**
 * El protocolo del canal en vivo, definido **una sola vez** para servidor y clientes.
 *
 * Es la parte de la fase que más se beneficia de vivir en `shared`: un canal WebSocket no
 * tiene ni rutas ni códigos de estado que obliguen a ponerse de acuerdo, así que sin un tipo
 * común el servidor emitiría `{tipo:'mensaje'}` y un cliente esperaría `{type:'message'}`
 * sin que nada fallara al compilar —fallaría en silencio, en el teléfono, y solo con la
 * conversación abierta—.
 */

/** Lo que el servidor envía por el canal. */
export type ServerEvent =
  /**
   * Llegó un mensaje. Se emite a **los dos** lados, también a quien lo escribió.
   *
   * Emitirlo también al autor es lo que mantiene sus dos sesiones al día: quien escribe
   * desde la web con la app abierta ve aparecer su propio mensaje en el teléfono. Y como el
   * `isOwn` lo resuelve el servidor para cada destinatario, cada uno lo recibe ya con el
   * lado correcto.
   */
  | { readonly tipo: 'mensaje'; readonly message: Message; readonly conversationId: EntityId }
  /**
   * La otra persona leyó lo que le escribí.
   *
   * Va con la marca de tiempo y no con la lista de identificadores: leer es siempre "hasta
   * aquí", y mandar cien identificadores para decir lo mismo que una fecha cargaría el canal
   * justo cuando alguien abre un hilo largo.
   */
  | {
      readonly tipo: 'leidos';
      readonly conversationId: EntityId;
      /** Todos mis mensajes anteriores a este instante quedan leídos. */
      readonly readAt: Instant;
    }
  /** Un mensaje fue borrado por su autor. */
  | { readonly tipo: 'borrado'; readonly conversationId: EntityId; readonly messageId: EntityId }
  /**
   * La relación cambió y con ella lo que se puede hacer en la conversación (FR-044).
   *
   * Se emite al bloquear, desbloquear, aceptar o eliminar un contacto. Sin este aviso, quien
   * tuviera el hilo abierto seguiría viendo el campo de texto después de que lo bloquearan,
   * y descubriría el cambio al fallar el envío —que es enterarse por el peor camino—.
   */
  | {
      readonly tipo: 'relacion';
      readonly conversationId: EntityId;
      readonly blockedReason: MessagingBlockedReason | null;
    }
  /**
   * El canal quedó listo, con la sesión ya verificada.
   *
   * Existe porque la autenticación de este canal ocurre **después** de abrirlo (el navegador
   * no deja poner cabeceras en el handshake), así que "conectado" y "autenticado" son dos
   * momentos distintos. El cliente no se considera en vivo hasta recibir esto: darlo por
   * hecho al abrir el socket dejaría un indicador diciendo "en vivo" durante los milisegundos
   * en que el servidor todavía podía cerrarlo por token inválido.
   */
  | { readonly tipo: 'listo' };

/** Lo que el cliente envía por el canal. */
export type ClientEvent =
  /**
   * Primer mensaje del canal: el token de acceso.
   *
   * Va en un frame y no en la query de la URL a propósito. Una URL termina en los registros
   * del servidor, en el historial del navegador y en cualquier proxy por el que pase; un
   * frame no. Es el mismo cuidado con el que el resto del proyecto mantiene el token fuera
   * de las URLs —la web ni siquiera lo tiene, va en cookie `httpOnly`—.
   */
  | { readonly tipo: 'auth'; readonly token: string }
  /**
   * Latido, para que el canal no lo cierre ningún intermediario por inactividad.
   *
   * Un hilo abierto sin escribir nada durante minutos es el caso normal de una conversación,
   * y muchos proxys cierran a los 60 segundos de silencio. Sin latido, el canal moriría justo
   * en las conversaciones tranquilas y el usuario dejaría de recibir sin que nada se lo diga.
   */
  | { readonly tipo: 'ping' };

/**
 * Estado del canal en vivo, tal como lo pinta el indicador.
 *
 * `reconectando` es un estado propio y no un `desconectado` cualquiera: son cosas distintas
 * para el usuario —una se arregla sola y la otra no— y merecen textos distintos.
 */
export const LIVE_STATUSES = ['conectando', 'en_vivo', 'reconectando', 'sin_conexion'] as const;
export type LiveStatus = (typeof LIVE_STATUSES)[number];
