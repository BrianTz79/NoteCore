import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  AGENDA_KIND_LABELS,
  AGENDA_URGENCY_COLORS,
  dueDateLine,
  formatCalendarDateShort,
  toFormErrors,
  type AgendaItem,
  type AgendaList,
  type Subject,
} from '@notecore/shared';
import { agendaApi, scheduleApi } from '../lib/api';
import { AgendaForm } from '../components/agenda-form';
import { Button, Card, FormError, colors } from '../components/ui';

/**
 * Agenda en la app (FR-018 a FR-022).
 *
 * Misma funcionalidad que la pantalla de la web: pendientes ordenadas por vencimiento y
 * completadas aparte. El orden y la urgencia llegan calculados de la API (Principio II).
 */

/** Qué panel está abierto sobre las listas. */
type Panel = { kind: 'ninguno' } | { kind: 'nueva' } | { kind: 'editar'; item: AgendaItem };

export function AgendaScreen({ onVolver }: { onVolver: () => void }) {
  const [agenda, setAgenda] = useState<AgendaList>();
  const [subjects, setSubjects] = useState<readonly Subject[]>([]);
  const [panel, setPanel] = useState<Panel>({ kind: 'ninguno' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const load = useCallback(async () => {
    try {
      setAgenda(await agendaApi.list());
      setError(undefined);
    } catch (caught) {
      setError(toFormErrors(caught).general);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      // Las materias hacen falta para el selector del formulario (FR-018).
      await Promise.all([
        load(),
        (async () => {
          try {
            setSubjects(await scheduleApi.subjects());
          } catch {
            // Sin materias el formulario sigue sirviendo: la asociación es opcional.
          }
        })(),
      ]);
      setLoading(false);
    })();
  }, [load]);

  /** Completa o reabre una actividad (FR-020). El registro se conserva en ambos sentidos. */
  async function alternarCompletada(item: AgendaItem) {
    setBusy(true);
    try {
      await agendaApi.update(item.id, { completed: !item.completed });
      await load();
      setNotice(
        item.completed
          ? `"${item.title}" vuelve a pendientes.`
          : `Completaste "${item.title}".`,
      );
    } catch (caught) {
      setError(toFormErrors(caught).general);
    } finally {
      setBusy(false);
    }
  }

  /** Elimina una actividad (FR-021). Se confirma porque, a diferencia de completar, se pierde. */
  function eliminar(item: AgendaItem) {
    Alert.alert('Eliminar actividad', `¿Eliminar "${item.title}"? Esto no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              await agendaApi.delete(item.id);
              await load();
              setNotice(`Se eliminó "${item.title}".`);
            } catch (caught) {
              setError(toFormErrors(caught).general);
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi agenda</Text>
        <Text style={styles.subtitle}>
          {agenda
            ? agenda.pending.length === 0
              ? 'No tienes nada pendiente'
              : `${agenda.pending.length} pendiente${agenda.pending.length > 1 ? 's' : ''}`
            : 'Tus tareas, proyectos y actividades'}
        </Text>
      </View>

      <FormError message={error} />
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      {/* Lo vencido y lo de hoy se resumen arriba: es lo que decide qué hacer al abrir. */}
      {agenda && (agenda.overdueCount > 0 || agenda.dueTodayCount > 0) ? (
        <Text style={styles.alerta}>
          {agenda.overdueCount > 0
            ? `${agenda.overdueCount} ${agenda.overdueCount === 1 ? 'actividad vencida' : 'actividades vencidas'}`
            : ''}
          {agenda.overdueCount > 0 && agenda.dueTodayCount > 0 ? ' · ' : ''}
          {agenda.dueTodayCount > 0
            ? `${agenda.dueTodayCount} ${agenda.dueTodayCount === 1 ? 'vence' : 'vencen'} hoy`
            : ''}
        </Text>
      ) : null}

      {loading ? (
        <Text style={styles.muted}>Cargando tu agenda…</Text>
      ) : (
        <>
          {/* ── Alta y edición ───────────────────────────────────────────── */}
          {panel.kind === 'ninguno' ? (
            <Button title="Añadir actividad" onPress={() => setPanel({ kind: 'nueva' })} />
          ) : (
            <Card title={panel.kind === 'nueva' ? 'Nueva actividad' : 'Editar actividad'}>
              <AgendaForm
                subjects={subjects}
                {...(panel.kind === 'editar' ? { item: panel.item } : {})}
                onCancel={() => setPanel({ kind: 'ninguno' })}
                onSubmit={async (input) => {
                  if (panel.kind === 'editar') {
                    await agendaApi.update(panel.item.id, input);
                    setNotice(`Se guardó "${input.title}".`);
                  } else {
                    await agendaApi.create(input);
                    setNotice(`Se añadió "${input.title}".`);
                  }
                  await load();
                  setPanel({ kind: 'ninguno' });
                }}
              />
            </Card>
          )}

          {/* ── Pendientes ───────────────────────────────────────────────── */}
          <Card title="Pendientes">
            {agenda?.pending.length === 0 ? (
              <Text style={styles.body}>
                No tienes nada pendiente. Añade lo que te dejen en clase para no perderlo de
                vista.
              </Text>
            ) : (
              agenda?.pending.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  busy={busy}
                  onToggle={() => void alternarCompletada(item)}
                  onEdit={() => setPanel({ kind: 'editar', item })}
                  onDelete={() => eliminar(item)}
                />
              ))
            )}
          </Card>

          {/* ── Completadas ──────────────────────────────────────────────── */}
          {agenda && agenda.completed.length > 0 ? (
            <Card title={`Completadas (${agenda.completed.length})`}>
              {/* FR-020: completar conserva el registro, así que siguen consultables. */}
              {agenda.completed.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  busy={busy}
                  onToggle={() => void alternarCompletada(item)}
                  onEdit={() => setPanel({ kind: 'editar', item })}
                  onDelete={() => eliminar(item)}
                />
              ))}
            </Card>
          ) : null}
        </>
      )}

      <Button title="Volver al inicio" variant="secondary" onPress={onVolver} />
    </ScrollView>
  );
}

/** Una actividad de la lista, con sus acciones. */
function ItemRow({
  item,
  busy,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: AgendaItem;
  busy: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const color = AGENDA_URGENCY_COLORS[item.urgency];

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemMain}>
        {/* La casilla es el gesto de completar: un toque, sin abrir nada (FR-020). */}
        <Pressable
          onPress={onToggle}
          disabled={busy}
          hitSlop={10}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.completed }}
          accessibilityLabel={item.completed ? `Reabrir ${item.title}` : `Completar ${item.title}`}
          style={[styles.checkbox, item.completed ? styles.checkboxChecked : null]}
        >
          {item.completed ? <Text style={styles.checkmark}>✓</Text> : null}
        </Pressable>

        <View style={styles.itemBody}>
          <Text style={[styles.itemTitle, item.completed ? styles.itemTitleDone : null]}>
            {item.title}
          </Text>

          {item.description ? (
            <Text style={styles.muted}>{item.description}</Text>
          ) : null}

          <View style={styles.metaRow}>
            <Text style={styles.tenue}>{AGENDA_KIND_LABELS[item.kind]}</Text>

            {item.subjectName ? (
              <>
                <Text style={styles.tenue}>·</Text>
                <View style={styles.subjectTag}>
                  <View
                    style={[
                      styles.colorDot,
                      { backgroundColor: item.subjectColor ?? colors.textoTenue },
                    ]}
                  />
                  <Text style={styles.tenue}>{item.subjectName}</Text>
                </View>
              </>
            ) : null}

            {item.dueDate ? (
              <>
                <Text style={styles.tenue}>·</Text>
                <Text style={styles.tenue}>{formatCalendarDateShort(item.dueDate)}</Text>
              </>
            ) : null}
          </View>

          {/* Sin fecha límite no hay urgencia que mostrar, y las completadas ya no urgen. */}
          {!item.completed && item.dueDate ? (
            <Text style={[styles.urgency, { color }]}>
              {dueDateLine(item.urgency, item.daysUntilDue)}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.itemActions}>
        <Pressable onPress={onEdit} disabled={busy} hitSlop={8}>
          <Text style={styles.link}>Editar</Text>
        </Pressable>
        <Pressable onPress={onDelete} disabled={busy} hitSlop={8}>
          <Text style={styles.deleteText}>Eliminar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16, paddingBottom: 48 },
  header: { gap: 4 },
  title: { color: colors.textoFuerte, fontSize: 26, fontWeight: '700' },
  subtitle: { color: colors.textoSuave, fontSize: 14 },
  body: { color: colors.texto, fontSize: 15 },
  muted: { color: colors.textoSuave, fontSize: 13 },
  tenue: { color: colors.textoTenue, fontSize: 13 },
  link: { color: colors.acentoClaro, fontSize: 14 },
  deleteText: { color: colors.error, fontSize: 14 },
  notice: {
    color: colors.exito,
    fontSize: 14,
    borderColor: '#065f46',
    borderWidth: 1,
    backgroundColor: '#06402933',
    borderRadius: 10,
    padding: 10,
  },
  alerta: {
    color: '#fbbf24',
    fontSize: 14,
    borderColor: '#78350f',
    borderWidth: 1,
    backgroundColor: '#45170933',
    borderRadius: 10,
    padding: 10,
  },
  itemCard: {
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  itemMain: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.textoTenue,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: colors.acento, borderColor: colors.acento },
  checkmark: { color: colors.textoFuerte, fontSize: 15, lineHeight: 18, fontWeight: '700' },
  itemBody: { flex: 1, gap: 4 },
  itemTitle: { color: colors.textoFuerte, fontSize: 15, fontWeight: '600' },
  itemTitleDone: { color: colors.textoTenue, textDecorationLine: 'line-through' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  subjectTag: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  colorDot: { width: 8, height: 8, borderRadius: 4 },
  urgency: { fontSize: 13, fontWeight: '600' },
  itemActions: { flexDirection: 'row', gap: 16, justifyContent: 'flex-end' },
});
