import type { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import {
  MESSAGING_ROUTES,
  entityIdSchema,
  messagePageSchema,
  sendMessageSchema,
  usernameSchema,
} from '@notecore/shared';
import { authOf, requireAuth } from '../middleware/auth.js';
import { errors } from '../lib/errors.js';
import { parseBody } from '../lib/validate.js';
import { verifyAccessToken } from '../lib/tokens.js';
import { ACCESS_TOKEN_COOKIE } from '../lib/cookies.js';
import { db } from '../db/client.js';
import { sessions } from '../db/schema.js';
import * as messaging from '../services/messaging.js';
import { register, unregister, type LiveSocket } from '../services/live.js';

/**
 * Rutas de la mensajería (FR-043, FR-044).
 *
 * Principio II: aquí no hay reglas de negocio, solo traducción entre el transporte y el
 * servicio. Quién puede escribir a quién lo decide `services/messaging.ts`.
 *
 * Principio III: todas exigen sesión y el `userId` sale del token, nunca de la petición. En
 * esta sección eso es lo único que separa una conversación privada de cualquiera que sepa
 * teclear un identificador.
 */

/** El `@usuario` de la ruta, validado antes de tocar la base de datos. */
function usernameOf(raw: string): string {
  const parsed = usernameSchema.safeParse(raw);
  // Un nombre con forma inválida no puede existir: se responde lo mismo que si no existiera.
  if (!parsed.success) throw errors.noEncontrado('No encontramos a esa persona.');
  return parsed.data;
}

/**
 * Cuánto se espera el frame de autenticación antes de cerrar el canal.
 *
 * Sin este plazo, un socket abierto y callado se quedaría ocupando sitio indefinidamente sin
 * haber demostrado quién es —que es la forma barata de sostener conexiones anónimas contra un
 * servidor—.
 */
const AUTH_TIMEOUT_MS = 10_000;

export const messagingRoutes: FastifyPluginAsync = async (app) => {
  /* ─────────────────── El canal en vivo ─────────────────── */

  /**
   * Canal WebSocket de entrega en tiempo real (FR-043).
   *
   * ## Por qué la autenticación no es `requireAuth`
   *
   * El handshake de WebSocket del navegador **no admite cabeceras**, así que la app no puede
   * mandar su `Authorization: Bearer` al abrir. Hay dos vías, y aquí se aceptan las dos:
   *
   * - **Web**: la cookie `httpOnly` de sesión viaja sola en el handshake, igual que en
   *   cualquier petición. No hace falta nada más.
   * - **App**: manda el token en el **primer frame**, no en la query de la URL. Una URL
   *   termina en los registros del servidor y en cualquier proxy intermedio, y un token en un
   *   registro es un token filtrado.
   *
   * En ambos casos se comprueba lo mismo que `requireAuth`: firma válida y **sesión viva en
   * base de datos**. Lo segundo es lo que hace que cerrar sesión surta efecto de verdad en vez
   * de esperar a que el token expire.
   *
   * Hasta que la sesión no está verificada el canal no recibe nada: se registra **después**
   * de autenticar, así que un socket sin credenciales no está en ningún reparto.
   */
  app.get(MESSAGING_ROUTES.stream, { websocket: true }, (socket, request) => {
    let userId: string | null = null;
    let registered: LiveSocket | null = null;

    const live: LiveSocket = {
      send: (data) => socket.send(data),
      close: () => socket.close(),
    };

    /** Cierra el canal sin dejar el socket registrado. */
    const reject = (): void => {
      clearTimeout(timer);
      socket.close();
    };

    const authenticate = async (token: string | null): Promise<void> => {
      if (token === null) return reject();

      const payload = verifyAccessToken(token);
      if (payload === null) return reject();

      // La misma comprobación que `requireAuth`: la sesión debe seguir existiendo. Un token
      // firmado y vigente cuya sesión se cerró desde otro dispositivo no vale aquí tampoco.
      const session = await db.query.sessions.findFirst({ where: eq(sessions.id, payload.sid) });
      if (!session || session.userId !== payload.sub) return reject();
      if (session.expiresAt.getTime() <= Date.now()) return reject();

      clearTimeout(timer);
      userId = payload.sub;
      registered = live;
      register(payload.sub, live);

      /**
       * `listo` es lo que le dice al cliente que ya está en vivo.
       *
       * Se manda **después** de registrar, no antes: entre una cosa y la otra hay un hueco en
       * el que un mensaje publicado no llegaría a este canal, y el cliente ya se creería
       * conectado. Registrado primero, ese hueco no existe.
       */
      socket.send(JSON.stringify({ tipo: 'listo' }));
    };

    const timer = setTimeout(() => {
      if (userId === null) socket.close();
    }, AUTH_TIMEOUT_MS);

    /**
     * La cookie del navegador ya viajó en el handshake: se intenta con ella de inmediato.
     *
     * Así la web queda autenticada sin mandar ningún frame, que es lo que hace que su token
     * no tenga que salir nunca de la cookie `httpOnly`.
     */
    const cookieToken = request.cookies[ACCESS_TOKEN_COOKIE];
    if (cookieToken !== undefined && cookieToken.length > 0) {
      void authenticate(cookieToken).catch(() => reject());
    }

    socket.on('message', (raw: Buffer | string) => {
      let event: unknown;
      try {
        event = JSON.parse(raw.toString());
      } catch {
        // Lo que entra por un socket es entrada externa: un frame que no es JSON se ignora
        // en lugar de tumbar el canal de alguien que sí estaba autenticado.
        return;
      }

      if (typeof event !== 'object' || event === null) return;
      const parsed = event as Record<string, unknown>;

      if (parsed.tipo === 'ping') {
        // El latido no necesita respuesta: basta con que haya tráfico para que ningún proxy
        // cierre el canal por inactividad.
        return;
      }

      if (parsed.tipo === 'auth' && userId === null) {
        const token = typeof parsed.token === 'string' ? parsed.token : null;
        void authenticate(token).catch(() => reject());
      }
    });

    socket.on('close', () => {
      clearTimeout(timer);
      // Se da de baja solo si llegó a registrarse: un socket que nunca autenticó no está en
      // el mapa, y borrar por un `userId` nulo no tendría a qué referirse.
      if (userId !== null && registered !== null) unregister(userId, registered);
    });

    socket.on('error', () => {
      clearTimeout(timer);
      if (userId !== null && registered !== null) unregister(userId, registered);
    });
  });

  /* ─────────────────── Conversaciones ─────────────────── */

  /** La bandeja: las conversaciones, la más reciente primero (FR-043). */
  app.get(MESSAGING_ROUTES.conversations, { preHandler: requireAuth }, async (request) => {
    return messaging.listConversations(authOf(request).userId);
  });

  /**
   * La conversación con alguien y su página de mensajes (FR-043).
   *
   * No crea nada: si nunca se han escrito, llega una conversación vacía. Escribir una fila
   * por abrir una pantalla dejaría un hilo vacío por cada visita a un perfil.
   */
  app.get<{ Params: { username: string }; Querystring: Record<string, string> }>(
    MESSAGING_ROUTES.conversationWith(':username'),
    { preHandler: requireAuth },
    async (request) => {
      const page = parseBody(messagePageSchema, request.query);
      return messaging.getConversation(
        authOf(request).userId,
        usernameOf(request.params.username),
        page,
      );
    },
  );

  /**
   * Envía un mensaje (FR-043).
   *
   * El servicio comprueba la relación **antes** de escribir: que el cliente haya pintado el
   * campo de texto no autoriza nada (FR-044).
   */
  app.post<{ Params: { username: string } }>(
    MESSAGING_ROUTES.sendTo(':username'),
    { preHandler: requireAuth },
    async (request, reply) => {
      const input = parseBody(sendMessageSchema, request.body);
      const message = await messaging.sendMessage(
        authOf(request).userId,
        usernameOf(request.params.username),
        input,
      );
      return reply.code(201).send(message);
    },
  );

  /** Marca como leído lo recibido en una conversación. */
  app.post<{ Params: { id: string } }>(
    MESSAGING_ROUTES.readConversation(':id'),
    { preHandler: requireAuth },
    async (request) => {
      const parsed = entityIdSchema.safeParse(request.params.id);
      if (!parsed.success) throw errors.noEncontrado('Esa conversación no existe.');

      return messaging.markConversationRead(authOf(request).userId, parsed.data);
    },
  );

  /* ─────────────────── Mensajes ─────────────────── */

  /**
   * Borra un mensaje propio.
   *
   * Deja el hueco en el hilo con el texto vaciado: quien ya lo leyó no puede desleerlo, y un
   * hilo del que desaparecen renglones se lee mal.
   */
  app.delete<{ Params: { id: string } }>(
    MESSAGING_ROUTES.messageById(':id'),
    { preHandler: requireAuth },
    async (request) => {
      const parsed = entityIdSchema.safeParse(request.params.id);
      if (!parsed.success) throw errors.noEncontrado('Ese mensaje no existe.');

      return messaging.deleteMessage(authOf(request).userId, parsed.data);
    },
  );

  /** Cuántos mensajes sin leer hay, para el aviso del inicio. */
  app.get(MESSAGING_ROUTES.unread, { preHandler: requireAuth }, async (request) => {
    return messaging.countUnreadMessages(authOf(request).userId);
  });
};
