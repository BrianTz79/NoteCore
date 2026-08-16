import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  WEEKDAY_SHORT_LABELS,
  toFormErrors,
  toScheduleEntries,
  type ScheduleBlockInput,
  type Subject,
} from '@notecore/shared';
import { scheduleApi } from '../lib/api';
import { ScheduleGrid } from '../components/schedule-grid';
import { SubjectForm } from '../components/subject-form';
import { ImportDialog } from '../components/import-dialog';
import { Button, Card, FormError, colors } from '../components/ui';

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

  const load = useCallback(async () => {
    try {
      setSubjects(await scheduleApi.subjects());
      setError(undefined);
    } catch (caught) {
      setError(toFormErrors(caught).general);
    } finally {
      setLoading(false);
    }
  }, []);

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
      <View style={styles.header}>
        <Text style={styles.title}>Mi horario</Text>
        <Text style={styles.subtitle}>
          {subjects.length === 0
            ? 'Todavía no has capturado tus clases'
            : `${subjects.length} materias · ${entries.length} sesiones`}
        </Text>
      </View>

      <FormError message={error} />

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

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
                  <Pressable onPress={() => removeSubject(subject)} hitSlop={8}>
                    <Text style={styles.deleteText}>Eliminar</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </Card>
        </>
      )}

      <Button title="Volver al inicio" variant="secondary" onPress={onVolver} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16, paddingBottom: 48 },
  header: { gap: 4 },
  title: { color: colors.textoFuerte, fontSize: 26, fontWeight: '700' },
  subtitle: { color: colors.textoSuave, fontSize: 14 },
  actions: { gap: 10 },
  body: { color: colors.texto, fontSize: 15 },
  muted: { color: colors.textoTenue, fontSize: 13 },
  notice: {
    color: colors.exito,
    fontSize: 14,
    borderColor: '#065f46',
    borderWidth: 1,
    backgroundColor: '#06402933',
    borderRadius: 10,
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
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  subjectActions: { gap: 10, alignItems: 'flex-end' },
  editText: { color: colors.acentoClaro, fontSize: 14 },
  deleteText: { color: colors.error, fontSize: 14 },
});
