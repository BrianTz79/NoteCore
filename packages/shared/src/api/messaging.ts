/**
 * Llamadas de la mensajería, tipadas (FR-043, FR-044).
 *
 * Principio VIII: web y app llaman a estas funciones en lugar de escribir cada una sus
 * rutas y sus tipos de respuesta.
 */

import type { MessagePageInput, SendMessageInput } from '../schemas/messaging.js';
import type {
  Conversation,
  ConversationSummary,
  Message,
  UnreadSummary,
} from '../types/messaging.js';
import type { ApiClient } from './client.js';

export const MESSAGING_ROUTES = {
  /** La lista de conversaciones (FR-043). */
  conversations: '/messages/conversations',
  /**
   * La conversación con alguien, por su `@usuario`.
   *
   * Se direcciona por persona y no por identificador de conversación porque **la
   * conversación puede no existir todavía**: abrir el hilo con un contacto al que nunca se
   * ha escrito es el caso normal, y con un identificador habría que crearla primero solo
   * para poder mirarla —una fila escrita por abrir una pantalla, que además dejaría hilos
   * vacíos de cada vez que alguien entra y sale—.
   */
  conversationWith: (username: string) => `/messages/with/${username}`,
  /** Envío de un mensaje a alguien (FR-043). */
  sendTo: (username: string) => `/messages/with/${username}`,
  /** Marcar como leído lo recibido en una conversación. */
  readConversation: (id: string) => `/messages/conversations/${id}/read`,
  /** Un mensaje concreto, para borrarlo. */
  messageById: (id: string) => `/messages/${id}`,
  /** Cuántos mensajes sin leer hay en total, para el aviso del inicio. */
  unread: '/messages/unread',
  /** El canal en vivo. No es HTTP: se abre con WebSocket. */
  stream: '/messages/stream',
} as const;

export function createMessagingApi(client: ApiClient) {
  return {
    /** Las conversaciones, la más reciente primero (FR-043). */
    listConversations(): Promise<readonly ConversationSummary[]> {
      return client.get<readonly ConversationSummary[]>(MESSAGING_ROUTES.conversations);
    },

    /**
     * La conversación con alguien y su última página de mensajes.
     *
     * Si nunca se han escrito, llega una conversación vacía en lugar de un 404: no haber
     * hablado todavía no es un error, y es exactamente el estado en el que está el hilo la
     * primera vez que se abre.
     *
     * Llega también `blockedReason`, ya resuelto por el servidor: es lo que decide si la
     * pantalla pinta el campo de texto o la explicación (FR-044).
     */
    getConversation(username: string, page: MessagePageInput = {}): Promise<Conversation> {
      const params = new URLSearchParams();
      if (page.antesDe !== undefined) params.set('antesDe', page.antesDe);
      if (page.limite !== undefined) params.set('limite', String(page.limite));

      const query = params.toString();
      const path = MESSAGING_ROUTES.conversationWith(username);

      return client.get<Conversation>(query === '' ? path : `${path}?${query}`);
    },

    /**
     * Envía un mensaje (FR-043).
     *
     * El servidor comprueba la relación antes de escribir nada: que la pantalla haya pintado
     * el campo de texto no autoriza nada (FR-044).
     *
     * `id` se puede proponer desde el cliente, con la mecánica de la Fase 9: reenviar un
     * mensaje cuya respuesta se perdió encuentra el que ya existe en lugar de mandarlo dos
     * veces.
     */
    send(username: string, input: SendMessageInput): Promise<Message> {
      return client.post<Message>(MESSAGING_ROUTES.sendTo(username), input);
    },

    /**
     * Marca como leído todo lo recibido en una conversación.
     *
     * Devuelve la conversación actualizada —con su `unreadCount` ya en cero— en lugar de
     * nada: la lista necesita repintar la insignia, y pedirla otra vez sería un viaje de más
     * para un dato que el servidor ya tiene en la mano.
     */
    markRead(conversationId: string): Promise<ConversationSummary> {
      return client.post<ConversationSummary>(
        MESSAGING_ROUTES.readConversation(conversationId),
        {},
      );
    },

    /**
     * Borra un mensaje propio.
     *
     * Deja el hueco con "Mensaje eliminado" en vez de quitar la fila: un hilo del que
     * desaparecen renglones se lee mal, y quien ya lo leyó no puede desleerlo.
     */
    deleteMessage(id: string): Promise<Message> {
      return client.delete<Message>(MESSAGING_ROUTES.messageById(id));
    },

    /** Cuántos mensajes sin leer hay, para el aviso del inicio. */
    unread(): Promise<UnreadSummary> {
      return client.get<UnreadSummary>(MESSAGING_ROUTES.unread);
    },
  };
}

export type MessagingApi = ReturnType<typeof createMessagingApi>;
