import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ApiError,
  DELETED_MESSAGE_TEXT,
  LiveChannel,
  MESSAGE_MAX_LENGTH,
  applyReadReceipt,
  groupsWithPrevious,
  liveStatusMessage,
  mergeMessages,
  messagePreview,
  messagingBlockedMessage,
  relativeTime,
  sortConversations,
  unreadBadge,
  type Conversation,
  type ConversationSummary,
  type LiveStatus,
  type Message,
  type ServerEvent,
} from '@notecore/shared';
import { apiBaseUrl, messagingApi, tokenStore } from '../lib/api';
import { useBotonAtras } from '../lib/boton-atras';
import { Button, Card, FormError, RADIUS, SPACE, ScreenHeader, TEXT, base, c, colors, fuente } from '../components/ui';

/**
 * Mensajería (FR-043, FR-044).
 *
 * Principio I: la misma funcionalidad que la web, con los **mismos textos** —la vista previa,
 * el motivo por el que no se puede escribir y el estado del canal salen todos de `shared`—.
 *
 * Principio II: aquí no se decide nada sobre quién puede escribir a quién. El campo de texto
 * se pinta o no según el `blockedReason` que llega resuelto por el servidor.
 *
 * Como en el calendario y en la sección social, el hilo se abre **dentro** de esta pantalla y
 * no como otra ruta: se alterna entre conversaciones, y perder el contexto de la bandeja en
 * cada toque sería peor. Sigue sin hacer falta `expo-router`.
 */
export function MensajesScreen({
  onVolver,
  conversacionInicial,
}: {
  onVolver: () => void;
  /** Con quién abrir el hilo directamente, si se llega desde un perfil. */
  conversacionInicial?: string | undefined;
}) {
  const [conversaciones, setConversaciones] = useState<readonly ConversationSummary[] | null>(
    null,
  );
  const [abierta, setAbierta] = useState<string | null>(conversacionInicial ?? null);
  const [error, setError] = useState<string | undefined>();
  const [estadoCanal, setEstadoCanal] = useState<LiveStatus>('conectando');
  const [ultimoEvento, setUltimoEvento] = useState<ServerEvent | null>(null);

  /**
   * Atrás cierra el hilo y devuelve a la bandeja (Fase 12.2).
   *
   * Hace lo mismo que la flecha del hilo, incluido el caso de haber llegado desde un perfil:
   * también entonces atrás deja la bandeja, no el inicio. El hilo se abrió estando dentro de
   * mensajes, así que salir de él es volver a la lista.
   */
  useBotonAtras([
    { cuando: abierta !== null, hacer: () => setAbierta(null) },
    { cuando: true, hacer: onVolver },
  ]);

  const cargarLista = useCallback(async () => {
    try {
      const lista = await messagingApi.listConversations();
      setConversaciones(lista);
      setError(undefined);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'No se pudieron cargar tus conversaciones.',
      );
    }
  }, []);

  useEffect(() => {
    void cargarLista();
  }, [cargarLista]);

  /**
   * Un solo canal para toda la pantalla, no uno por conversación.
   *
   * Es lo que permite que la bandeja suba la insignia de un hilo cerrado sin mantener un
   * socket por conversación. El servidor manda todo lo del usuario por el mismo canal.
   */
  useEffect(() => {
    const canal = new LiveChannel({
      baseUrl: apiBaseUrl,
      // A diferencia de la web, aquí no hay cookies: el token se manda en el primer frame.
      getToken: () => tokenStore.getAccessToken(),
      onEvent: (evento) => setUltimoEvento(evento),
      onStatus: setEstadoCanal,
    });

    canal.connect();
    return () => canal.close();
  }, []);

  useEffect(() => {
    if (ultimoEvento === null) return;
    void cargarLista();
  }, [ultimoEvento, cargarLista]);

  const avisoCanal = liveStatusMessage(estadoCanal);

  if (abierta !== null) {
    return (
      <Hilo
        key={abierta}
        username={abierta}
        evento={ultimoEvento}
        avisoCanal={avisoCanal}
        onVolver={() => setAbierta(null)}
        onCambio={cargarLista}
      />
    );
  }

  const ordenadas = conversaciones === null ? null : sortConversations(conversaciones);

  return (
    <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <ScreenHeader
        title="Mensajes"
        onBack={onVolver}
      />

      {avisoCanal ? (
        <View style={styles.avisoCanal}>
          <Text style={styles.avisoCanalTexto}>{avisoCanal}</Text>
        </View>
      ) : null}

      <FormError message={error} />

      {ordenadas === null ? (
        <Card>
          <Text style={styles.textoSuave}>Cargando…</Text>
        </Card>
      ) : ordenadas.length === 0 ? (
        <Card title="Conversaciones">
          <Text style={styles.textoSuave}>
            Todavía no tienes conversaciones. Abre el perfil de un contacto desde la sección
            social para escribirle.
          </Text>
        </Card>
      ) : (
        <Card title="Conversaciones">
          <View style={styles.lista}>
            {ordenadas.map((conversacion) => {
              const insignia = unreadBadge(conversacion.unreadCount);

              return (
                <Pressable
                  key={conversacion.id}
                  onPress={() => setAbierta(conversacion.user.username)}
                  style={({ pressed }) => [styles.fila, pressed ? styles.filaPulsada : null]}
                >
                  <View style={styles.filaTexto}>
                    <Text style={styles.filaNombre} numberOfLines={1}>
                      {conversacion.user.displayName}
                    </Text>
                    <Text style={styles.filaPrevia} numberOfLines={1}>
                      {messagePreview(conversacion.lastMessage)}
                    </Text>
                  </View>

                  {insignia ? (
                    <View style={styles.insignia}>
                      <Text style={styles.insigniaTexto}>{insignia}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

/* ─────────────────────────── El hilo ─────────────────────────── */

function Hilo({
  username,
  evento,
  avisoCanal,
  onVolver,
  onCambio,
}: {
  username: string;
  evento: ServerEvent | null;
  avisoCanal: string | null;
  onVolver: () => void;
  onCambio: () => Promise<void>;
}) {
  const [conversacion, setConversacion] = useState<Conversation | null>(null);
  const [mensajes, setMensajes] = useState<readonly Message[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [cargandoAnteriores, setCargandoAnteriores] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const scrollRef = useRef<ScrollView | null>(null);

  const cargar = useCallback(async () => {
    try {
      const hilo = await messagingApi.getConversation(username);
      setConversacion(hilo);
      setMensajes(hilo.messages);
      setError(undefined);

      // Abrir el hilo lo marca como leído, pero solo si hay algo que marcar y si la
      // conversación existe: una vacía no tiene identificador todavía.
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

  /** Aplica lo que llega por el canal, solo si es de **esta** conversación. */
  useEffect(() => {
    if (evento === null || conversacion === null) return;
    if (!('conversationId' in evento)) return;
    if (evento.conversationId !== conversacion.id) return;

    if (evento.tipo === 'mensaje') {
      setMensajes((previos) => mergeMessages(previos, [evento.message]));

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
          mensaje.id === evento.messageId ? { ...mensaje, deleted: true, text: '' } : mensaje,
        ),
      );
      return;
    }

    if (evento.tipo === 'relacion') {
      setConversacion((previa) =>
        previa === null ? previa : { ...previa, blockedReason: evento.blockedReason },
      );
    }
  }, [evento, conversacion, onCambio]);

  async function enviar() {
    const limpio = texto.trim();
    if (limpio === '') return;

    setEnviando(true);
    setError(undefined);
    try {
      const enviado = await messagingApi.send(username, { text: limpio });
      setTexto('');
      // Se mezcla, no se añade: el canal trae el mismo mensaje y sin deduplicar el usuario
      // vería el suyo dos veces.
      setMensajes((previos) => mergeMessages(previos, [enviado]));
      await onCambio();

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

  if (conversacion === null) {
    return (
      <View style={styles.pantalla}>
        <View style={styles.contenido}>
          <Pressable onPress={onVolver} hitSlop={8}>
            <Text style={styles.volver}>← Conversaciones</Text>
          </Pressable>
          <Card>
            <Text style={styles.textoSuave}>Cargando…</Text>
          </Card>
        </View>
      </View>
    );
  }

  const motivo = messagingBlockedMessage(conversacion.blockedReason);

  return (
    <KeyboardAvoidingView
      style={styles.pantalla}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.cabecera}>
        <Pressable onPress={onVolver} hitSlop={8}>
          <Text style={styles.volver}>← Conversaciones</Text>
        </Pressable>
        <Text style={styles.cabeceraNombre} numberOfLines={1}>
          {conversacion.user.displayName}
        </Text>
        <Text style={styles.cabeceraUsuario}>@{conversacion.user.username}</Text>
      </View>

      {avisoCanal ? (
        <View style={styles.avisoCanalHilo}>
          <Text style={styles.avisoCanalTexto}>{avisoCanal}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorHilo}>
          <FormError message={error} />
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        style={styles.hilo}
        contentContainerStyle={styles.hiloContenido}
        // Al llegar algo nuevo se baja al final, que es donde se está leyendo.
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {conversacion.hasMore ? (
          <View style={styles.anteriores}>
            <Button
              title="Ver mensajes anteriores"
              variant="secondary"
              onPress={() => void cargarAnteriores()}
              loading={cargandoAnteriores}
            />
          </View>
        ) : null}

        {mensajes.length === 0 ? (
          <Text style={styles.hiloVacio}>Todavía no se han escrito nada.</Text>
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
      </ScrollView>

      {motivo ? (
        <View style={styles.motivo}>
          <Text style={styles.motivoTexto}>{motivo}</Text>
        </View>
      ) : (
        <View style={styles.compositor}>
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder="Escribe un mensaje…"
            placeholderTextColor={colors.textoTenue}
            maxLength={MESSAGE_MAX_LENGTH}
            multiline
            style={styles.entrada}
          />
          <Button title="Enviar" onPress={() => void enviar()} loading={enviando} />
        </View>
      )}
    </KeyboardAvoidingView>
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
    <View
      style={[
        styles.burbujaFila,
        mensaje.isOwn ? styles.burbujaDerecha : styles.burbujaIzquierda,
        agrupado ? styles.burbujaAgrupada : styles.burbujaSeparada,
      ]}
    >
      <Pressable
        // Mantener pulsado para borrar: en un teléfono no hay «pasar el ratón por encima»,
        // así que el gesto largo hace el papel del botón que en la web solo aparece al pasar.
        onLongPress={mensaje.isOwn && !mensaje.deleted ? onBorrar : undefined}
        style={styles.burbujaContenedor}
      >
        <View
          style={[
            styles.burbuja,
            mensaje.deleted
              ? styles.burbujaBorrada
              : mensaje.isOwn
                ? styles.burbujaPropia
                : styles.burbujaAjena,
          ]}
        >
          <Text style={[styles.burbujaTexto, mensaje.deleted ? styles.burbujaTextoBorrado : null]}>
            {mensaje.deleted ? DELETED_MESSAGE_TEXT : mensaje.text}
          </Text>
        </View>

        <View style={styles.meta}>
          <Text style={styles.metaTexto}>{relativeTime(mensaje.sentAt)}</Text>
          {/*
            El acuse solo en los propios: de los ajenos, quien leyó es uno mismo, y eso no es
            información para nadie.
          */}
          {mensaje.isOwn && !mensaje.deleted ? (
            <Text style={styles.metaTexto}>
              {mensaje.readAt === null ? 'Enviado' : 'Leído'}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  contenido: { ...base.contenido, paddingTop: SPACE.md },
  volver: { color: c.tinta3, fontSize: TEXT.sm, fontFamily: fuente.cuerpo },
  titulo: { ...base.titulo },
  textoSuave: { color: colors.textoSuave, fontSize: TEXT.md, lineHeight: 21 },

  avisoCanal: {
    backgroundColor: c.avisoFondo,
    borderColor: c.aviso,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 12,
  },
  avisoCanalHilo: {
    backgroundColor: c.avisoFondo,
    borderBottomColor: c.aviso,
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  avisoCanalTexto: { color: c.aviso, fontSize: TEXT.sm },

  lista: { gap: 8 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.fondo,
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 12,
  },
  filaPulsada: { opacity: 0.7 },
  filaTexto: { flex: 1, gap: 2 },
  filaNombre: { color: colors.textoFuerte, fontSize: TEXT.md, fontWeight: '600' },
  filaPrevia: { color: colors.textoSuave, fontSize: TEXT.sm },
  insignia: {
    backgroundColor: colors.acento,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  insigniaTexto: { color: colors.textoFuerte, fontSize: TEXT.sm, fontWeight: '700' },

  cabecera: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 4,
    borderBottomColor: colors.borde,
    borderBottomWidth: 1,
  },
  cabeceraNombre: { color: colors.textoFuerte, fontSize: TEXT.xl, fontWeight: '700' },
  cabeceraUsuario: { color: colors.textoSuave, fontSize: TEXT.sm },

  errorHilo: { paddingHorizontal: 20, paddingTop: 12 },

  hilo: { flex: 1 },
  hiloContenido: { padding: 16, gap: 2 },
  hiloVacio: {
    color: colors.textoTenue,
    fontSize: TEXT.md,
    textAlign: 'center',
    paddingVertical: 40,
  },
  anteriores: { paddingBottom: 12 },

  burbujaFila: { flexDirection: 'row' },
  burbujaIzquierda: { justifyContent: 'flex-start' },
  burbujaDerecha: { justifyContent: 'flex-end' },
  burbujaSeparada: { marginTop: 12 },
  burbujaAgrupada: { marginTop: 2 },
  burbujaContenedor: { maxWidth: '82%' },
  burbuja: { borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 9 },
  burbujaPropia: { backgroundColor: c.acento },
  burbujaAjena: { backgroundColor: colors.borde },
  burbujaBorrada: {
    backgroundColor: 'transparent',
    borderColor: colors.borde,
    borderWidth: 1,
  },
  burbujaTexto: { color: colors.textoFuerte, fontSize: TEXT.md, lineHeight: 20 },
  burbujaTextoBorrado: { color: colors.textoTenue, fontStyle: 'italic' },
  meta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 3,
  },
  metaTexto: { color: colors.textoTenue, fontSize: TEXT.xs },

  motivo: {
    borderTopColor: colors.borde,
    borderTopWidth: 1,
    padding: 20,
  },
  motivoTexto: { color: colors.textoSuave, fontSize: TEXT.md, lineHeight: 20 },

  compositor: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    borderTopColor: colors.borde,
    borderTopWidth: 1,
    padding: 12,
  },
  entrada: {
    flex: 1,
    backgroundColor: colors.tarjeta,
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.textoFuerte,
    fontSize: TEXT.md,
    maxHeight: 120,
  },
});
