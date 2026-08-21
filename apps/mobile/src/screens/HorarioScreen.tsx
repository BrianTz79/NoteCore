import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  CACHE_KEYS,
  WEEKDAY_SHORT_LABELS,
  cacheAgeMessage,
  toFormErrors,
  toScheduleEntries,
  type Instant,
  type ScheduleBlockInput,
  type Subject,
} from '@notecore/shared';
import { scheduleApi } from '../lib/api';
import { ScheduleGrid } from '../components/schedule-grid';
import { SubjectForm } from '../components/subject-form';
import { ImportDialog } from '../components/import-dialog';
import { Button, Card, FormError, RADIUS, SPACE, ScreenHeader, TEXT, base, c, colors } from '../components/ui';
import { SyncIndicator } from '../components/sync-indicator';
import { loadWithCache, useSync, useSyncActions } from '../lib/sync-context';
import {
  CLASES_DE_WIDGET,
  WIDGETS,
  actualizarWidget,
  fijarWidget,
  sePuedeFijarWidget,
} from '../lib/widget';
import { useBotonAtras } from '../lib/boton-atras';

/**
 * Horario semanal en la app (FR-005 a FR-010).
 *
 * Misma funcionalidad que la pantalla de la web: rejilla semanal, alta y edición manual, e
 * importación desde el JSON de una IA. Toda la regla la aplica la API (Principio II).
 */

/** Qué panel está abierto sobre la rejilla. */
type Panel =
  | { kind: 'ninguno' }
  | { kind: 'nueva' }
  | { kind: 'editar'; subject: Subject }
  | { kind: 'importar' };

export function HorarioScreen({ onVolver }: { onVolver: () => void }) {
  const [subjects, setSubjects] = useState<readonly Subject[]>([]);
  const [panel, setPanel] = useState<Panel>({ kind: 'ninguno' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  /** De cuándo es el horario que se está viendo, si viene del cache (FR-048). */
  const [cachedAt, setCachedAt] = useState<Instant | null>(null);

  /**
   * Atrás cierra el formulario abierto antes de salir de la pantalla (Fase 12.2).
   *
   * Los paneles ocupan la pantalla entera, así que para el usuario son un paso más del
   * recorrido: atrás tiene que deshacer ese paso, no los dos de golpe.
   */
  useBotonAtras([
    { cuando: panel.kind !== 'ninguno', hacer: () => setPanel({ kind: 'ninguno' }) },
    { cuando: true, hacer: onVolver },
  ]);

  const sync = useSyncActions();
  const { state: syncState } = useSync();

  /**
   * Si se puede ofrecer colocar el widget en la pantalla de inicio (FR-051).
   *
   * Se pregunta al sistema en lugar de darlo por hecho: en Expo Go no hay módulo nativo, y
   * hay lanzadores que no admiten que una app proponga fijar un widget. Ofrecer un botón
   * que no hace nada es peor que no ofrecerlo.
   */
  const [sePuedeFijar, setSePuedeFijar] = useState(false);

  useEffect(() => {
    let vigente = true;
    void sePuedeFijarWidget().then((puede) => {
      if (vigente) setSePuedeFijar(puede);
    });
    return () => {
      vigente = false;
    };
  }, []);

  /**
   * El horario, cayendo a lo guardado si no hay red (FR-048).
   *
   * Es lo que más se consulta sin conexión —"¿en qué aula toca ahora?"— y por eso se cachea
   * aunque su **edición** siga exigiendo red: capturar el horario es una sesión larga que se
   * hace una vez y en casa, mientras que consultarlo ocurre a diario dentro del edificio.
   */
  const load = useCallback(async () => {
    try {
      const result = await loadWithCache(sync, CACHE_KEYS.schedule, () =>
        scheduleApi.subjects(),
      );
      setSubjects(result.data);
      setCachedAt(result.cachedAt);
      setError(undefined);
      // El widget de la pantalla de inicio se reconstruye con lo que se acaba de leer
      // (FR-051). Va aquí y no en cada operación de escritura porque todas terminan
      // llamando a `load()`: un solo punto, imposible de olvidar al añadir otra.
      void actualizarWidget(toScheduleEntries(result.data));
    } catch (caught) {
      setError(toFormErrors(caught).general);
    } finally {
      setLoading(false);
    }
  }, [sync]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createSubject(input: {
    name: string;
    color: string;
    blocks: ScheduleBlockInput[];
  }) {
    await scheduleApi.createSubject(input);
    await load();
    setPanel({ kind: 'ninguno' });
    setNotice(`Se añadió ${input.name}.`);
  }

  async function updateSubject(
    subject: Subject,
    input: { name: string; color: string; blocks: ScheduleBlockInput[] },
  ) {
    await scheduleApi.updateSubject(subject.id, input);
    await load();
    setPanel({ kind: 'ninguno' });
    setNotice(`Se guardó ${input.name}.`);
  }

  function removeSubject(subject: Subject) {
    // Borrar se lleva las sesiones de la materia: se confirma antes.
    Alert.alert(
      'Eliminar materia',
      `¿Eliminar ${subject.name} y todas sus sesiones?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await scheduleApi.deleteSubject(subject.id);
                await load();
                setNotice(`Se eliminó ${subject.name}.`);
              } catch (caught) {
                setError(toFormErrors(caught).general);
              }
            })();
          },
        },
      ],
    );
  }

  const entries = toScheduleEntries(subjects);

  // Los paneles ocupan la pantalla entera: en un teléfono, mostrarlos sobre la rejilla
  // dejaría el formulario apretado contra el borde inferior.
  if (panel.kind === 'nueva') {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Nueva materia</Text>
        <SubjectForm
          onSubmit={createSubject}
          onCancel={() => setPanel({ kind: 'ninguno' })}
        />
      </ScrollView>
    );
  }

  if (panel.kind === 'editar') {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Editar materia</Text>
        <SubjectForm
          subject={panel.subject}
          onSubmit={(input) => updateSubject(panel.subject, input)}
          onCancel={() => setPanel({ kind: 'ninguno' })}
        />
      </ScrollView>
    );
  }

  if (panel.kind === 'importar') {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Importar horario</Text>
        <ImportDialog
          hasSubjects={subjects.length > 0}
          onImported={(message) => {
            setPanel({ kind: 'ninguno' });
            setNotice(message);
            void load();
          }}
          onCancel={() => setPanel({ kind: 'ninguno' })}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenHeader
        title="Mi horario"
        subtitle={subjects.length === 0
            ? 'Todavía no has capturado tus clases'
            : `${subjects.length} materias · ${entries.length} sesiones`}
        onBack={onVolver}
      />

      {/* Estado de la sincronización (FR-050): solo aparece si hay algo que decir. */}
      <SyncIndicator />

      {/* De cuándo es el horario que se está viendo, cuando viene del cache (FR-048). */}
      {cachedAt ? <Text style={styles.muted}>{cacheAgeMessage(cachedAt)}</Text> : null}

      <FormError message={error} />

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      {/*
       * Capturar el horario exige conexión, y se dice **antes** de tocar el botón en lugar
       * de dejar que el formulario falle al guardar: el estudiante habría escrito la materia
       * y sus sesiones para perderlas al enviar.
       */}
      {!syncState.online ? (
        <Text style={styles.muted}>
          Sin conexión puedes consultar tu horario, pero para capturarlo o importarlo hace
          falta red.
        </Text>
      ) : (
        <View style={styles.actions}>
          <Button
            title="Añadir materia"
            onPress={() => {
              setNotice(undefined);
              setPanel({ kind: 'nueva' });
            }}
          />
          <Button
            title="Importar desde una IA"
            variant="secondary"
            onPress={() => {
              setNotice(undefined);
              setPanel({ kind: 'importar' });
            }}
          />
        </View>
      )}

      {loading ? (
        <Text style={styles.muted}>Cargando tu horario…</Text>
      ) : entries.length === 0 ? (
        <Card>
          <Text style={styles.body}>
            Añade tus materias una por una, o pega el horario que te genere una IA a partir
            de una foto: es más rápido si llevas muchas clases.
          </Text>
        </Card>
      ) : (
        <>
          <ScheduleGrid entries={entries} />

          <Card title="Tus materias">
            {subjects.map((subject) => (
              <View key={subject.id} style={styles.subjectRow}>
                <View style={styles.subjectInfo}>
                  <View style={styles.subjectName}>
                    <View
                      style={[styles.colorDot, { backgroundColor: subject.color }]}
                    />
                    <Text style={styles.body} numberOfLines={1}>
                      {subject.name}
                    </Text>
                  </View>
                  <Text style={styles.muted} numberOfLines={2}>
                    {subject.blocks
                      .map(
                        (block) =>
                          `${WEEKDAY_SHORT_LABELS[block.weekday]} ${block.startTime}–${block.endTime}`,
                      )
                      .join(' · ')}
                  </Text>
                </View>

                <View style={styles.subjectActions}>
                  <Pressable
                    onPress={() => {
                      setNotice(undefined);
                      setPanel({ kind: 'editar', subject });
                    }}
                    hitSlop={8}
                  >
                    <Text style={styles.editText}>Editar</Text>
                  </Pressable>
                  {/*
                    Botón y no enlace de texto, al contrario que «Editar»: borrar una
                    materia se lleva sus sesiones y sus faltas, y una acción destructiva
                    necesita el borde que la enmarca —además del área táctil que un texto
                    suelto no alcanza—.
                  */}
                  <Button
                    title="Eliminar"
                    variant="danger"
                    size="sm"
                    compacto
                    onPress={() => removeSubject(subject)}
                  />
                </View>
              </View>
            ))}
          </Card>
        </>
      )}

      {/*
        Atajo para colocar los widgets (FR-051, Fase 16). Va al final de la pantalla, después
        del horario y de las materias, y eso es deliberado: quien entra a «Mi horario» viene a
        ver sus clases, no a configurar la pantalla de inicio del teléfono. Cuando el panel
        iba arriba, empujaba la rejilla fuera de la vista y había que desplazarse para ver lo
        que se venía a ver. Aquí lo encuentra quien lo busca, sin estorbar a quien no.

        Desde la Fase 16 son cuatro y no uno, así que se listan con su nombre y lo que
        muestra cada uno: un botón único llamado «Añadir el widget» ya no diría cuál, y
        elegir a ciegas entre cuatro es peor que no poder elegir.
      */}
      {sePuedeFijar && entries.length > 0 ? (
        <Card title="Widgets para tu pantalla de inicio">
          {CLASES_DE_WIDGET.map((clase) => (
            <View key={clase} style={styles.widgetRow}>
              <View style={styles.widgetInfo}>
                <Text style={styles.body}>{WIDGETS[clase].nombre}</Text>
                <Text style={styles.muted}>{WIDGETS[clase].descripcion}</Text>
              </View>
              <Button
                title="Añadir"
                variant="secondary"
                onPress={() => {
                  void fijarWidget(clase);
                }}
              />
            </View>
          ))}
        </Card>
      ) : null}

      <Button title="Volver al inicio" variant="secondary" onPress={onVolver} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { ...base.contenido, paddingTop: SPACE.md },
  header: { gap: 4 },
  title: { ...base.titulo },
  subtitle: { ...base.cuerpo },
  actions: { gap: 10 },
  body: { color: colors.texto, fontSize: TEXT.md },
  muted: { ...base.tenue },
  notice: {
    color: colors.exito,
    fontSize: TEXT.md,
    borderColor: c.exito,
    borderWidth: 1,
    backgroundColor: c.papel3,
    borderRadius: RADIUS.lg,
    padding: 10,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopColor: colors.borde,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  subjectInfo: { flex: 1, gap: 4 },
  subjectName: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorDot: { width: 10, height: 10, borderRadius: RADIUS.md },
  subjectActions: { gap: 10, alignItems: 'flex-end' },
  /*
   * Las filas de la lista de widgets. Repiten la forma de `subjectRow` a propósito: son
   * la misma cosa en la misma pantalla —una lista de elementos con su acción a la
   * derecha— y darles una forma distinta las haría parecer dos secciones sin relación.
   */
  widgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopColor: colors.borde,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  widgetInfo: { flex: 1, gap: 2 },
  editText: { color: colors.acentoClaro, fontSize: TEXT.md },
  deleteText: { color: colors.error, fontSize: TEXT.md },
});
