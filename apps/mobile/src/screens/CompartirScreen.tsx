import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  AGENDA_KIND_LABELS,
  SHARE_KIND_LABELS,
  SHARE_STATUS_COLORS,
  SHARE_STATUS_LABELS,
  WEEKDAY_LABELS,
  formatCalendarDateShort,
  formatShareCode,
  normalizeShareCode,
  sharePayloadSummary,
  sortShares,
  toFormErrors,
  type AgendaItem,
  type Share,
  type ShareAcceptMode,
  type ShareAcceptResult,
  type ShareKind,
  type SharePreview,
  type Subject,
} from '@notecore/shared';
import { agendaApi, scheduleApi, shareApi } from '../lib/api';
import { QrCode } from '../components/qr-code';
import { QrScanner } from '../components/qr-scanner';
import { Button, Card, Field, FormError, RADIUS, SPACE, TEXT, base, colors } from '../components/ui';

/**
 * Compartir en la app (FR-028 a FR-033).
 *
 * Misma funcionalidad que la pantalla de la web, más lo que solo el teléfono puede hacer:
 * **escanear** el QR con la cámara. Toda la regla la aplica la API (Principio II).
 */

type Panel =
  | { kind: 'ninguno' }
  | { kind: 'nuevo'; shareKind: ShareKind }
  | { kind: 'generado'; share: Share }
  | { kind: 'escanear' }
  | { kind: 'recibido'; preview: SharePreview }
  | { kind: 'aceptado'; resultado: ShareAcceptResult };

export function CompartirScreen({ onVolver }: { onVolver: () => void }) {
  const [shares, setShares] = useState<readonly Share[]>([]);
  const [subjects, setSubjects] = useState<readonly Subject[]>([]);
  const [items, setItems] = useState<readonly AgendaItem[]>([]);
  const [panel, setPanel] = useState<Panel>({ kind: 'ninguno' });
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const load = useCallback(async () => {
    try {
      setShares(await shareApi.list());
      setError(undefined);
    } catch (caught) {
      setError(toFormErrors(caught).general);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await Promise.all([
        load(),
        (async () => {
          try {
            setSubjects(await scheduleApi.subjects());
          } catch {
            // Sin horario la pantalla sigue sirviendo para la agenda y para recibir.
          }
        })(),
        (async () => {
          try {
            setItems((await agendaApi.list()).pending);
          } catch {
            // Igual que arriba.
          }
        })(),
      ]);
      setLoading(false);
    })();
  }, [load]);

  /** Abre la vista previa de un código, venga del teclado o de la cámara (FR-030). */
  async function abrirCodigo(bruto: string) {
    const normalizado = normalizeShareCode(bruto);
    if (!normalizado) {
      setError('Ese código no tiene la forma correcta. Son 8 caracteres.');
      return;
    }

    setBusy(true);
    setError(undefined);
    try {
      setPanel({ kind: 'recibido', preview: await shareApi.preview(normalizado) });
      setCodigo('');
    } catch (caught) {
      // El mensaje del servidor distingue revocado, caducado e inexistente (FR-033).
      const errores = toFormErrors(caught);
      setError(errores.general ?? errores.fields.code);
      setPanel({ kind: 'ninguno' });
    } finally {
      setBusy(false);
    }
  }

  async function aceptar(preview: SharePreview, mode: ShareAcceptMode) {
    setBusy(true);
    try {
      const resultado = await shareApi.accept(preview.code, { mode });
      setPanel({ kind: 'aceptado', resultado });
      setError(undefined);
    } catch (caught) {
      const errores = toFormErrors(caught);
      setError(errores.general ?? errores.fields.code);
    } finally {
      setBusy(false);
    }
  }

  function revocar(share: Share) {
    Alert.alert(
      'Revocar compartido',
      `¿Revocar "${share.title}"? Quien tenga el código o el enlace dejará de poder aceptarlo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Revocar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusy(true);
              try {
                await shareApi.revoke(share.id);
                await load();
                setNotice(`"${share.title}" quedó revocado.`);
              } catch (caught) {
                setError(toFormErrors(caught).general);
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  }

  /* ── La cámara ocupa la pantalla entera mientras escanea ── */
  if (panel.kind === 'escanear') {
    return (
      <QrScanner
        onCancelar={() => setPanel({ kind: 'ninguno' })}
        onLeido={(texto) => {
          setPanel({ kind: 'ninguno' });
          // El QR lleva el enlace completo; el código es su último tramo.
          const delEnlace = texto.split('/compartido/')[1] ?? texto;
          void abrirCodigo(delEnlace);
        }}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.centro}>
        <Text style={styles.tenue}>Cargando…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <View style={styles.cabecera}>
        <Text style={styles.titulo}>Compartir</Text>
        <Pressable onPress={onVolver} hitSlop={8}>
          <Text style={styles.enlace}>← Inicio</Text>
        </Pressable>
      </View>

      <FormError message={error} />
      {notice ? <Text style={styles.exito}>{notice}</Text> : null}

      {panel.kind === 'aceptado' ? (
        <Resultado
          resultado={panel.resultado}
          onCerrar={() => {
            setPanel({ kind: 'ninguno' });
            void load();
          }}
        />
      ) : panel.kind === 'recibido' ? (
        <Recibido
          preview={panel.preview}
          busy={busy}
          onAceptar={(mode) => void aceptar(panel.preview, mode)}
          onCancelar={() => setPanel({ kind: 'ninguno' })}
        />
      ) : panel.kind === 'generado' ? (
        <Generado share={panel.share} onCerrar={() => setPanel({ kind: 'ninguno' })} />
      ) : panel.kind === 'nuevo' ? (
        <NuevoShare
          shareKind={panel.shareKind}
          subjects={subjects}
          items={items}
          onCancelar={() => setPanel({ kind: 'ninguno' })}
          onCreado={(share) => {
            setPanel({ kind: 'generado', share });
            void load();
          }}
        />
      ) : (
        <>
          <Card title="¿Te compartieron algo?">
            <Text style={styles.parrafo}>
              Escanea el QR de tu compañero, o escribe el código que te pasó.
            </Text>
            <Button title="Escanear QR" onPress={() => setPanel({ kind: 'escanear' })} />
            <Field
              label="O escribe el código"
              value={codigo}
              onChangeText={setCodigo}
              placeholder="ABCD-2345"
              autoCapitalize="characters"
              autoCorrect={false}
              {...(normalizeShareCode(codigo)
                ? { hint: `Se abrirá ${formatShareCode(normalizeShareCode(codigo)!)}` }
                : {})}
            />
            <Button
              title="Ver qué es"
              variant="secondary"
              loading={busy}
              disabled={!normalizeShareCode(codigo)}
              onPress={() => void abrirCodigo(codigo)}
            />
          </Card>

          <Card title="Compartir algo tuyo">
            <Text style={styles.parrafo}>
              Al generarlo se guarda una copia de lo que elijas, así que lo que edites después
              no cambia lo que reciba tu compañero.
            </Text>
            <Button
              title="Compartir horario"
              onPress={() => setPanel({ kind: 'nuevo', shareKind: 'horario' })}
              disabled={subjects.length === 0}
            />
            <Button
              title="Compartir actividades"
              variant="secondary"
              onPress={() => setPanel({ kind: 'nuevo', shareKind: 'agenda' })}
              disabled={items.length === 0}
            />
          </Card>

          <ListaShares shares={shares} busy={busy} onRevocar={revocar} />
        </>
      )}
    </ScrollView>
  );
}

/* ─────────────────────────── Generar ─────────────────────────── */

/** Selección del contenido a compartir (FR-029). */
function NuevoShare({
  shareKind,
  subjects,
  items,
  onCancelar,
  onCreado,
}: {
  shareKind: ShareKind;
  subjects: readonly Subject[];
  items: readonly AgendaItem[];
  onCancelar: () => void;
  onCreado: (share: Share) => void;
}) {
  const [title, setTitle] = useState(
    shareKind === 'horario' ? 'Mi horario' : 'Mis actividades',
  );
  // Arranca todo marcado: compartir el horario entero es el caso habitual, y desmarcar lo
  // que sobra es menos trabajo que marcar seis materias una por una.
  const [seleccion, setSeleccion] = useState<readonly string[]>(() =>
    shareKind === 'horario' ? subjects.map((s) => s.id) : items.map((i) => i.id),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const opciones =
    shareKind === 'horario'
      ? subjects.map((s) => ({
          id: s.id,
          etiqueta: s.name,
          detalle: `${s.blocks.length} ${s.blocks.length === 1 ? 'sesión' : 'sesiones'}`,
          color: s.color,
        }))
      : items.map((i) => ({
          id: i.id,
          etiqueta: i.title,
          detalle: i.subjectName ?? 'Sin materia',
          color: i.subjectColor ?? colors.textoTenue,
        }));

  async function generar() {
    setBusy(true);
    setError(undefined);
    try {
      onCreado(
        await shareApi.create({
          kind: shareKind,
          title,
          ...(shareKind === 'horario'
            ? { subjectIds: [...seleccion] }
            : { itemIds: [...seleccion] }),
        }),
      );
    } catch (caught) {
      const errores = toFormErrors(caught);
      setError(
        errores.general ?? errores.fields.subjectIds ?? errores.fields.itemIds,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={`Compartir ${SHARE_KIND_LABELS[shareKind].toLowerCase()}`}>
      <FormError message={error} />

      <Field label="Título" value={title} onChangeText={setTitle} />

      <Text style={styles.etiqueta}>
        Qué incluir ({seleccion.length} de {opciones.length})
      </Text>

      <View style={styles.fila}>
        <Pressable onPress={() => setSeleccion(opciones.map((o) => o.id))} hitSlop={8}>
          <Text style={styles.enlacePequeno}>Todo</Text>
        </Pressable>
        <Pressable onPress={() => setSeleccion([])} hitSlop={8}>
          <Text style={styles.enlaceTenue}>Nada</Text>
        </Pressable>
      </View>

      {opciones.map((opcion) => {
        const marcada = seleccion.includes(opcion.id);
        return (
          <Pressable
            key={opcion.id}
            onPress={() =>
              setSeleccion((actual) =>
                actual.includes(opcion.id)
                  ? actual.filter((x) => x !== opcion.id)
                  : [...actual, opcion.id],
              )
            }
            style={styles.opcion}
          >
            <View style={[styles.casilla, marcada ? styles.casillaMarcada : null]}>
              {marcada ? <Text style={styles.palomita}>✓</Text> : null}
            </View>
            <View style={[styles.punto, { backgroundColor: opcion.color }]} />
            <Text style={styles.opcionTexto} numberOfLines={1}>
              {opcion.etiqueta}
            </Text>
            <Text style={styles.tenue}>{opcion.detalle}</Text>
          </Pressable>
        );
      })}

      <Button
        title="Generar"
        onPress={() => void generar()}
        loading={busy}
        disabled={seleccion.length === 0}
      />
      <Button title="Cancelar" variant="secondary" onPress={onCancelar} />
    </Card>
  );
}

/** El compartido generado con sus tres modalidades (FR-028, FR-032). */
function Generado({ share, onCerrar }: { share: Share; onCerrar: () => void }) {
  const [copiado, setCopiado] = useState<'codigo' | 'enlace' | null>(null);

  async function copiar(texto: string, cual: 'codigo' | 'enlace') {
    await Clipboard.setStringAsync(texto);
    setCopiado(cual);
    setTimeout(() => setCopiado(null), 2000);
  }

  return (
    <Card title="Listo para compartir">
      <Text style={styles.parrafo}>
        Las tres formas llevan a lo mismo. Usa la que le venga mejor a tu compañero.
      </Text>

      <View style={styles.qrCentro}>
        <QrCode value={share.url} size={220} />
        <Text style={styles.tenue}>Que lo escanee con su app</Text>
      </View>

      <Text style={styles.etiqueta}>Código corto</Text>
      <Text style={styles.codigoGrande}>{formatShareCode(share.code)}</Text>
      <Button
        title={copiado === 'codigo' ? '✓ Copiado' : 'Copiar código'}
        variant="secondary"
        onPress={() => void copiar(share.code, 'codigo')}
      />

      <Text style={styles.etiqueta}>Enlace</Text>
      <Text style={styles.enlaceTexto} numberOfLines={2}>
        {share.url}
      </Text>
      <Button
        title={copiado === 'enlace' ? '✓ Copiado' : 'Copiar enlace'}
        variant="secondary"
        onPress={() => void copiar(share.url, 'enlace')}
      />

      <Text style={styles.tenue}>
        Caduca el{' '}
        {new Date(share.expiresAt).toLocaleDateString('es-MX', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
        . Puedes revocarlo antes desde tu lista.
      </Text>

      <Button title="Hecho" onPress={onCerrar} />
    </Card>
  );
}

/* ─────────────────────────── Recibir ─────────────────────────── */

/** Vista previa de lo recibido, antes de aceptar (FR-030). */
function Recibido({
  preview,
  busy,
  onAceptar,
  onCancelar,
}: {
  preview: SharePreview;
  busy: boolean;
  onAceptar: (mode: ShareAcceptMode) => void;
  onCancelar: () => void;
}) {
  const [mode, setMode] = useState<ShareAcceptMode>('añadir');

  return (
    <Card title={preview.title}>
      <Text style={styles.tenue}>
        De {preview.fromDisplayName} (@{preview.fromUsername}) ·{' '}
        {SHARE_KIND_LABELS[preview.kind]} · {sharePayloadSummary(preview.payload)}
      </Text>

      {preview.payload.kind === 'horario'
        ? preview.payload.subjects.map((subject, index) => (
            <View key={`${subject.name}-${index}`} style={styles.item}>
              <View style={styles.fila}>
                <View style={[styles.punto, { backgroundColor: subject.color }]} />
                <Text style={styles.itemTitulo}>{subject.name}</Text>
              </View>
              {subject.blocks.map((block, blockIndex) => (
                <Text key={blockIndex} style={styles.tenue}>
                  {WEEKDAY_LABELS[block.weekday]} · {block.startTime}–{block.endTime}
                  {block.room ? ` · ${block.room}` : ''}
                </Text>
              ))}
            </View>
          ))
        : preview.payload.items.map((item, index) => (
            <View key={`${item.title}-${index}`} style={styles.item}>
              <Text style={styles.itemTitulo}>{item.title}</Text>
              <Text style={styles.tenue}>
                {AGENDA_KIND_LABELS[item.kind]}
                {item.subjectName ? ` · ${item.subjectName}` : ''}
                {item.dueDate ? ` · vence ${formatCalendarDateShort(item.dueDate)}` : ''}
              </Text>
            </View>
          ))}

      {preview.isOwn ? (
        <>
          <Text style={styles.parrafo}>
            Este compartido es tuyo, así que ya tienes su contenido.
          </Text>
          <Button title="Cerrar" variant="secondary" onPress={onCancelar} />
        </>
      ) : (
        <>
          <Text style={styles.parrafo}>
            Vas a obtener tu propia copia. Podrás editarla libremente, y lo que{' '}
            {preview.fromDisplayName} cambie en la suya no la afectará.
          </Text>

          {preview.kind === 'horario' ? (
            <>
              <Text style={styles.etiqueta}>¿Qué hago con tu horario actual?</Text>
              {(
                [
                  ['añadir', 'Añadir', 'Se suma a lo que ya tienes.'],
                  ['reemplazar', 'Reemplazar', 'Borra tu horario y deja solo este.'],
                ] as const
              ).map(([valor, etiqueta, detalle]) => (
                <Pressable key={valor} onPress={() => setMode(valor)} style={styles.opcion}>
                  <View style={[styles.radio, mode === valor ? styles.radioMarcado : null]} />
                  <View style={styles.flex}>
                    <Text style={styles.opcionTexto}>{etiqueta}</Text>
                    <Text style={styles.tenue}>{detalle}</Text>
                  </View>
                </Pressable>
              ))}
            </>
          ) : (
            <Text style={styles.tenue}>
              Las actividades se suman a tu agenda. No se borra nada de lo tuyo.
            </Text>
          )}

          <Button
            title="Aceptar y copiar a mi cuenta"
            onPress={() => onAceptar(mode)}
            loading={busy}
          />
          <Button title="Cancelar" variant="secondary" onPress={onCancelar} />
        </>
      )}
    </Card>
  );
}

/** Lo que entró de verdad tras aceptar (FR-031). */
function Resultado({
  resultado,
  onCerrar,
}: {
  resultado: ShareAcceptResult;
  onCerrar: () => void;
}) {
  return (
    <Card title="Listo, ya es tuyo">
      {resultado.kind === 'horario' ? (
        <Text style={styles.parrafo}>
          Se copiaron {resultado.subjectsCreated}{' '}
          {resultado.subjectsCreated === 1 ? 'materia' : 'materias'} con{' '}
          {resultado.blocksCreated}{' '}
          {resultado.blocksCreated === 1 ? 'sesión' : 'sesiones'}.
          {resultado.subjectsRemoved > 0
            ? ` Se reemplazaron ${resultado.subjectsRemoved} materias que tenías.`
            : ''}
        </Text>
      ) : (
        <>
          <Text style={styles.parrafo}>
            Se copiaron {resultado.itemsCreated}{' '}
            {resultado.itemsCreated === 1 ? 'actividad' : 'actividades'} a tu agenda.
          </Text>
          {resultado.itemsWithoutSubject > 0 ? (
            <Text style={styles.tenue}>
              {resultado.itemsWithoutSubject}{' '}
              {resultado.itemsWithoutSubject === 1 ? 'quedó' : 'quedaron'} sin materia porque
              no tienes ninguna con ese nombre.
            </Text>
          ) : null}
        </>
      )}

      <Text style={styles.tenue}>
        Es una copia independiente: si quien te la compartió edita la suya, la tuya no cambia.
      </Text>

      <Button title="Hecho" onPress={onCerrar} />
    </Card>
  );
}

/** Los compartidos generados, con su estado y la opción de revocar (FR-033). */
function ListaShares({
  shares,
  busy,
  onRevocar,
}: {
  shares: readonly Share[];
  busy: boolean;
  onRevocar: (share: Share) => void;
}) {
  if (shares.length === 0) {
    return (
      <Card title="Lo que has compartido">
        <Text style={styles.tenue}>Todavía no has compartido nada.</Text>
      </Card>
    );
  }

  return (
    <Card title={`Lo que has compartido (${shares.length})`}>
      {sortShares(shares).map((share) => (
        <View key={share.id} style={styles.item}>
          <View style={styles.fila}>
            <Text style={styles.itemTitulo} numberOfLines={1}>
              {share.title}
            </Text>
            <Text
              style={[styles.estado, { color: SHARE_STATUS_COLORS[share.status] }]}
            >
              {SHARE_STATUS_LABELS[share.status]}
            </Text>
          </View>
          <Text style={styles.tenue}>
            {SHARE_KIND_LABELS[share.kind]} · {share.itemCount}{' '}
            {share.kind === 'horario'
              ? share.itemCount === 1
                ? 'materia'
                : 'materias'
              : share.itemCount === 1
                ? 'actividad'
                : 'actividades'}
            {share.acceptedCount > 0
              ? ` · aceptado ${share.acceptedCount} ${
                  share.acceptedCount === 1 ? 'vez' : 'veces'
                }`
              : ''}
          </Text>
          <Text style={styles.codigoLista}>{formatShareCode(share.code)}</Text>
          {share.status === 'activo' ? (
            <Button
              title="Revocar"
              variant="danger"
              disabled={busy}
              onPress={() => onRevocar(share)}
            />
          ) : null}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  contenido: { ...base.contenido, paddingTop: SPACE.md },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.fondo },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { ...base.titulo },
  enlace: { color: colors.acentoClaro, fontSize: TEXT.md },
  enlacePequeno: { color: colors.acentoClaro, fontSize: TEXT.sm },
  enlaceTenue: { color: colors.textoTenue, fontSize: TEXT.sm },
  parrafo: { color: colors.texto, fontSize: TEXT.md, lineHeight: 21 },
  tenue: { color: colors.textoSuave, fontSize: TEXT.sm },
  exito: { color: colors.exito, fontSize: TEXT.md },
  etiqueta: { color: colors.texto, fontSize: TEXT.md, fontWeight: '600', paddingTop: 4 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  opcionTexto: { color: colors.texto, fontSize: TEXT.md, flex: 1 },
  casilla: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: colors.textoTenue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  casillaMarcada: { backgroundColor: colors.acento, borderColor: colors.acento },
  palomita: { color: colors.textoFuerte, fontSize: TEXT.sm, fontWeight: '700' },
  radio: {
    width: 18,
    height: 18,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: colors.textoTenue,
  },
  radioMarcado: { borderColor: colors.acento, backgroundColor: colors.acento },
  punto: { width: 12, height: 12, borderRadius: RADIUS.md },
  item: {
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 12,
    gap: 4,
  },
  itemTitulo: { color: colors.textoFuerte, fontSize: TEXT.md, fontWeight: '600', flex: 1 },
  estado: { fontSize: TEXT.sm, fontWeight: '700' },
  qrCentro: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  codigoGrande: {
    color: colors.acentoClaro,
    fontSize: TEXT['2xl'],
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  codigoLista: { color: colors.textoSuave, fontSize: TEXT.md, letterSpacing: 2 },
  enlaceTexto: { color: colors.textoSuave, fontSize: TEXT.sm },
});
