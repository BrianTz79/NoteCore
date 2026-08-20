'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ApiError,
  LiveChannel,
  MESSAGE_MAX_LENGTH,
  DELETED_MESSAGE_TEXT,
  groupsWithPrevious,
  liveStatusMessage,
  mergeMessages,
  messagePreview,
  messagingBlockedMessage,
  applyReadReceipt,
  relativeTime,
  sortConversations,
  unreadBadge,
  type Conversation,
  type ConversationSummary,
  type LiveStatus,
  type Message,
  type ServerEvent,
} from '@notecore/shared';
import { apiBaseUrl, messagingApi } from '@/lib/api';
import { RequireSession } from '@/components/require-session';
import { Button, Card, FormError, ScreenHeader } from '@/components/ui';

/**
 * Mensajería (FR-043, FR-044).
 *
 * Principio II: esta pantalla no decide **nada** sobre quién puede escribir a quién. Si el
 * campo de texto se pinta o no lo dice `blockedReason`, que llega resuelto por el servidor, y
 * el texto que lo explica sale de `shared`. Derivarlo aquí sería la regla de FR-044 escrita
 * por tercera vez, y la discrepancia se vería como un campo que acepta lo escrito y falla al
 * enviar.
 *
 * El canal en vivo es un **acelerador, no la fuente**: todo lo que se ve se ha leído por HTTP
 * primero, y lo que llega por el canal se mezcla encima. Si el canal se cae, la conversación
 * se sigue leyendo entera al abrirla —solo deja de aparecer sola—.
 */
export default function MensajesPage() {
  return (
    <RequireSession>
      {/*
        `Suspense` es obligatorio, no decorativo: `Mensajes` lee la query con
        `useSearchParams` —de ahí sale el `?con=@usuario` que abre un hilo desde el perfil— y
        en Next 16 una página estática que lo llama sin este límite **rompe la compilación de
        producción**. En desarrollo no se nota, porque las rutas se renderizan a demanda; se
        notaría al construir el despliegue.
      */}
      <Suspense fallback={<Cargando />}>
        <Mensajes />
      </Suspense>
    </RequireSession>
  );
}

function Cargando() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-nc-lg px-nc-lg py-nc-3xl">
      <p className="text-tinta2">Cargando tus mensajes…</p>
    </main>
  );
}

function Mensajes() {
  const searchParams = useSearchParams();
  const inicial = searchParams.get('con');

  const [conversaciones, setConversaciones] = useState<readonly ConversationSummary[] | null>(null);
  const [abierta, setAbierta] = useState<string | null>(inicial);
  const [error, setError] = useState<string | undefined>();
  const [estadoCanal, setEstadoCanal] = useState<LiveStatus>('conectando');

  /**
   * Lo que llega por el canal se guarda en un estado que el hilo abierto observa.
   *
   * Se guarda el **evento** y no se aplica aquí porque el hilo es quien sabe si el evento le
   * concierne: aplicar en la lista lo que pertenece a una conversación cerrada sería trabajo
   * tirado, y peor, dejaría el hilo abierto sin enterarse.
   */
  const [ultimoEvento, setUltimoEvento] = useState<ServerEvent | null>(null);

  const cargarLista = useCallback(async () => {
    try {
      const lista = await messagingApi.listConversations();
      setConversaciones(lista);
      setError(undefined);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'No se pudieron cargar tus conversaciones.',
      );
    }
  }, []);

  useEffect(() => {
    void cargarLista();
  }, [cargarLista]);

  /**
   * El canal se abre **una vez** para toda la pantalla, no uno por conversación.
   *
   * Es lo que hace que la lista se entere de un mensaje de una conversación que no está
   * abierta —para subir su insignia— sin tener un socket por hilo. El servidor manda todo lo
   * del usuario por el mismo canal, así que abrir varios sería recibir lo mismo varias veces.
   */
  useEffect(() => {
    const canal = new LiveChannel({
      baseUrl: apiBaseUrl(),
      // En web el token vive en una cookie `httpOnly` que este código no puede leer: viaja
      // solo en el handshake. Por eso no hay nada que devolver aquí.
      getToken: () => null,
      onEvent: (evento) => setUltimoEvento(evento),
      onStatus: setEstadoCanal,
    });

    canal.connect();
    return () => canal.close();
  }, []);

  /** Cualquier evento puede cambiar la lista: se recarga para tener las insignias al día. */
  useEffect(() => {
    if (ultimoEvento === null) return;
    void cargarLista();
  }, [ultimoEvento, cargarLista]);

  const avisoCanal = liveStatusMessage(estadoCanal);
  const ordenadas = useMemo(
    () => (conversaciones === null ? null : sortConversations(conversaciones)),
    [conversaciones],
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-nc-lg px-nc-lg py-nc-3xl">
      <ScreenHeader
        title="Mensajes"
        back={{ href: '/', label: 'Inicio' }}
      />
      {avisoCanal ? (
        <p
          data-testid="estado-canal"
          className="rounded-lg border border-aviso/40 bg-aviso-fondo px-nc-sm py-nc-xs text-sm text-aviso"
        >
          {avisoCanal}
        </p>
      ) : null}

      <FormError message={error} />

      <div className="grid gap-nc-lg md:grid-cols-[20rem_1fr]">
        <Bandeja
          conversaciones={ordenadas}
          abierta={abierta}
          onAbrir={(username) => setAbierta(username)}
        />

        {abierta === null ? (
          <Card>
            <p data-testid="sin-hilo" className="text-tinta2">
              Elige una conversación para leerla, o abre el perfil de un contacto para
              escribirle por primera vez.
            </p>
          </Card>
        ) : (
          <Hilo
            key={abierta}
            username={abierta}
            evento={ultimoEvento}
            onCambio={cargarLista}
          />
        )}
      </div>
    </main>
  );
}

/* ─────────────────────────── La bandeja ─────────────────────────── */

function Bandeja({
  conversaciones,
  abierta,
  onAbrir,
}: {
  conversaciones: readonly ConversationSummary[] | null;
  abierta: string | null;
  onAbrir: (username: string) => void;
}) {
  if (conversaciones === null) return <Card>Cargando…</Card>;

  if (conversaciones.length === 0) {
    return (
      <Card title="Conversaciones">
        <p data-testid="sin-conversaciones" className="text-tinta2">
          Todavía no tienes conversaciones. Abre el perfil de un contacto para escribirle.
        </p>
        <Link href="/social" className="text-sm font-medium text-acento hover:text-foco">
          Ver mis contactos →
        </Link>
      </Card>
    );
  }

  return (
    <Card title="Conversaciones">
      <ul className="space-y-nc-xs" data-testid="lista-conversaciones">
        {conversaciones.map((conversacion) => {
          const insignia = unreadBadge(conversacion.unreadCount);
          const activa = conversacion.user.username === abierta;

          return (
            <li key={conversacion.id}>
              <button
                type="button"
                data-testid={`conversacion-${conversacion.user.username}`}
                onClick={() => onAbrir(conversacion.user.username)}
                className={`flex w-full items-center gap-nc-sm rounded-lg border p-nc-sm text-left transition ${
                  activa
                    ? 'border-acento-tenue bg-acento/10'
                    : 'border-filete bg-papel2 hover:border-filete2'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-tinta">
                    {conversacion.user.displayName}
                  </p>
                  <p
                    data-testid={`vista-previa-${conversacion.user.username}`}
                    className="truncate text-sm text-tinta2"
                  >
                    {messagePreview(conversacion.lastMessage)}
                  </p>
                </div>

                {insignia ? (
                  <span
                    data-testid={`sin-leer-${conversacion.user.username}`}
                    className="shrink-0 rounded-pill bg-acento px-nc-xs py-nc-3xs text-xs font-medium text-white"
                  >
                    {insignia}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/* ─────────────────────────── El hilo ─────────────────────────── */

function Hilo({
  username,
  evento,
  onCambio,
}: {
  username: string;
  evento: ServerEvent | null;
  onCambio: () => Promise<void>;
}) {
  const [conversacion, setConversacion] = useState<Conversation | null>(null);
  const [mensajes, setMensajes] = useState<readonly Message[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [cargandoAnteriores, setCargandoAnteriores] = useState(false);

  const finRef = useRef<HTMLDivElement | null>(null);

  const cargar = useCallback(async () => {
    try {
      const hilo = await messagingApi.getConversation(username);
      setConversacion(hilo);
      setMensajes(hilo.messages);
      setError(undefined);

      /**
       * Abrir el hilo lo marca como leído.
       *
       * Solo si hay algo que marcar y si la conversación existe: una conversación vacía no
       * tiene identificador todavía —el servidor no escribe una fila por mirar—, y marcar
       * como leído lo ya leído sería una escritura por cada apertura.
       */
      if (hilo.id !== '' && hilo.unreadCount > 0) {
        await messagingApi.markRead(hilo.id);
        await onCambio();
      }
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'No se pudo cargar la conversación.',
      );
    }
  }, [username, onCambio]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /**
   * Aplica lo que llega por el canal, si es de **esta** conversación.
   *
   * La comprobación importa: sin ella, un mensaje de otro hilo se pintaría en el que está
   * abierto —el fallo que hace que un chat mezcle conversaciones—.
   */
  useEffect(() => {
    if (evento === null || conversacion === null) return;
    if (!('conversationId' in evento)) return;
    if (evento.conversationId !== conversacion.id) return;

    if (evento.tipo === 'mensaje') {
      setMensajes((previos) => mergeMessages(previos, [evento.message]));

      // Lo que llega con el hilo abierto se lee al momento: el usuario lo está viendo.
      if (!evento.message.isOwn && conversacion.id !== '') {
        void messagingApi.markRead(conversacion.id).then(() => onCambio());
      }
      return;
    }

    if (evento.tipo === 'leidos') {
      setMensajes((previos) => applyReadReceipt(previos, evento.readAt));
      return;
    }

    if (evento.tipo === 'borrado') {
      setMensajes((previos) =>
        previos.map((mensaje) =>
          mensaje.id === evento.messageId
            ? { ...mensaje, deleted: true, text: '' }
            : mensaje,
        ),
      );
      return;
    }

    if (evento.tipo === 'relacion') {
      // La relación cambió: se repinta el pie con el motivo nuevo, sin recargar el hilo.
      setConversacion((previa) =>
        previa === null ? previa : { ...previa, blockedReason: evento.blockedReason },
      );
    }
  }, [evento, conversacion, onCambio]);

  /** Baja al final cuando llega algo nuevo, que es donde se está leyendo. */
  useEffect(() => {
    finRef.current?.scrollIntoView({ block: 'end' });
  }, [mensajes.length]);

  async function enviar() {
    const limpio = texto.trim();
    if (limpio === '') return;

    setEnviando(true);
    setError(undefined);
    try {
      const enviado = await messagingApi.send(username, { text: limpio });
      setTexto('');
      // Se mezcla en lugar de añadir: el canal en vivo trae el mismo mensaje, y sin
      // deduplicar el usuario vería su propio mensaje dos veces.
      setMensajes((previos) => mergeMessages(previos, [enviado]));
      await onCambio();

      // La conversación puede haber nacido con este envío: sin su identificador, lo que
      // llegue por el canal no se reconocería como de este hilo.
      if (conversacion !== null && conversacion.id === '') await cargar();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo enviar el mensaje.');
    } finally {
      setEnviando(false);
    }
  }

  async function cargarAnteriores() {
    if (conversacion === null || mensajes.length === 0) return;

    setCargandoAnteriores(true);
    try {
      const anterior = await messagingApi.getConversation(username, {
        antesDe: mensajes[0]?.id,
      });
      setMensajes((previos) => mergeMessages(anterior.messages, previos));
      setConversacion((previa) =>
        previa === null ? previa : { ...previa, hasMore: anterior.hasMore },
      );
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudieron cargar.');
    } finally {
      setCargandoAnteriores(false);
    }
  }

  async function borrar(id: string) {
    try {
      const borrado = await messagingApi.deleteMessage(id);
      setMensajes((previos) => previos.map((m) => (m.id === id ? borrado : m)));
      await onCambio();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo borrar.');
    }
  }

  if (conversacion === null) return <Card>Cargando…</Card>;

  const motivo = messagingBlockedMessage(conversacion.blockedReason);

  return (
    <Card>
      <header className="flex items-center justify-between gap-nc-sm border-b border-filete pb-nc-sm">
        <div className="min-w-0">
          <Link
            href={`/u/${conversacion.user.username}`}
            className="block truncate text-lg font-medium text-tinta hover:text-foco"
          >
            {conversacion.user.displayName}
          </Link>
          <p className="truncate text-sm text-tinta2">@{conversacion.user.username}</p>
        </div>
      </header>

      <FormError message={error} />

      <div
        data-testid="hilo"
        className="flex max-h-[26rem] min-h-[16rem] flex-col gap-nc-2xs overflow-y-auto py-nc-xs"
      >
        {conversacion.hasMore ? (
          <div className="pb-nc-xs text-center">
            <Button
              variant="secondary"
              onClick={() => void cargarAnteriores()}
              loading={cargandoAnteriores}
              data-testid="cargar-anteriores"
            >
              Ver mensajes anteriores
            </Button>
          </div>
        ) : null}

        {mensajes.length === 0 ? (
          <p data-testid="hilo-vacio" className="py-nc-xl text-center text-tinta3">
            Todavía no se han escrito nada.
          </p>
        ) : (
          mensajes.map((mensaje, indice) => (
            <Burbuja
              key={mensaje.id}
              mensaje={mensaje}
              agrupado={groupsWithPrevious(mensaje, mensajes[indice - 1])}
              onBorrar={() => void borrar(mensaje.id)}
            />
          ))
        )}

        <div ref={finRef} />
      </div>

      {motivo ? (
        <p
          data-testid="motivo-bloqueo"
          className="rounded-lg border border-filete bg-papel2 px-nc-sm py-nc-sm text-sm text-tinta2"
        >
          {motivo}
        </p>
      ) : (
        <form
          className="flex items-end gap-nc-xs border-t border-filete pt-nc-sm"
          onSubmit={(event) => {
            event.preventDefault();
            void enviar();
          }}
        >
          <textarea
            data-testid="campo-mensaje"
            value={texto}
            onChange={(event) => setTexto(event.target.value)}
            onKeyDown={(event) => {
              // Enter envía, Mayús+Enter hace salto de línea: es lo que espera cualquiera que
              // haya usado un chat antes.
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void enviar();
              }
            }}
            rows={2}
            maxLength={MESSAGE_MAX_LENGTH}
            placeholder="Escribe un mensaje…"
            className="flex-1 resize-none rounded-lg border border-filete bg-papel2 px-nc-sm py-nc-xs text-tinta outline-none transition placeholder:text-tinta3 focus:border-acento focus:ring-2 focus:ring-acento-tenue"
          />
          <Button type="submit" loading={enviando} data-testid="enviar-mensaje">
            Enviar
          </Button>
        </form>
      )}
    </Card>
  );
}

function Burbuja({
  mensaje,
  agrupado,
  onBorrar,
}: {
  mensaje: Message;
  agrupado: boolean;
  onBorrar: () => void;
}) {
  return (
    <div
      data-testid={`mensaje-${mensaje.id}`}
      className={`group flex ${mensaje.isOwn ? 'justify-end' : 'justify-start'} ${
        agrupado ? 'mt-nc-3xs' : 'mt-nc-sm'
      }`}
    >
      <div className={`max-w-[80%] ${mensaje.isOwn ? 'text-right' : 'text-left'}`}>
        <div
          className={`inline-block rounded-lg px-nc-sm py-nc-xs text-sm ${
            mensaje.deleted
              ? 'border border-filete bg-transparent italic text-tinta3'
              : mensaje.isOwn
                ? 'bg-acento text-white'
                : 'bg-papel3 text-tinta'
          }`}
        >
          <span className="whitespace-pre-wrap break-words">
            {mensaje.deleted ? DELETED_MESSAGE_TEXT : mensaje.text}
          </span>
        </div>

        <div className="mt-nc-3xs flex items-center justify-end gap-nc-xs text-xs text-tinta3">
          <span>{relativeTime(mensaje.sentAt)}</span>
          {/*
            El acuse solo se pinta en los propios: de los ajenos, quien leyó es uno mismo, y
            que a uno le confirmen que ha leído lo que acaba de leer no es información.
          */}
          {mensaje.isOwn && !mensaje.deleted ? (
            <span data-testid={`acuse-${mensaje.id}`}>
              {mensaje.readAt === null ? 'Enviado' : 'Leído'}
            </span>
          ) : null}
          {mensaje.isOwn && !mensaje.deleted ? (
            <button
              type="button"
              data-testid={`borrar-${mensaje.id}`}
              onClick={onBorrar}
              className="opacity-0 transition group-hover:opacity-100 hover:text-error"
            >
              Eliminar
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
