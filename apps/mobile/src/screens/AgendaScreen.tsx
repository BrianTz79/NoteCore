import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  AGENDA_KIND_LABELS,
  AGENDA_URGENCY_COLORS,
  CACHE_KEYS,
  allAgendaItems,
  cacheAgeMessage,
  dueDateLine,
  formatCalendarDateShort,
  generateEntityId,
  rebuildAgendaList,
  todayCalendarDate,
  toFormErrors,
  type AgendaItem,
  type AgendaList,
  type Instant,
  type Subject,
} from '@notecore/shared';
import { agendaApi, scheduleApi } from '../lib/api';
import { AgendaForm } from '../components/agenda-form';
import { Button, Card, FormError, RADIUS, SPACE, ScreenHeader, TEXT, base, c, colors } from '../components/ui';
import { SyncIndicator } from '../components/sync-indicator';
import { loadWithCache, useSync, useSyncActions } from '../lib/sync-context';

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
  /** De cuándo es lo que se está viendo, si viene del cache (FR-048). */
  const [cachedAt, setCachedAt] = useState<Instant | null>(null);

  const sync = useSyncActions();
  const { state: syncState } = useSync();

  /**
   * Carga la agenda, cayendo a lo guardado si no hay red (FR-048).
   *
   * `loadWithCache` guarda lo leído en cada carga con éxito, así que consultar la agenda con
   * conexión es justo lo que la deja disponible para cuando no la haya.
   */
  const load = useCallback(async () => {
    try {
      const result = await loadWithCache(sync, CACHE_KEYS.agenda, () => agendaApi.list());
      setAgenda(result.data);
      setCachedAt(result.cachedAt);
      setError(undefined);
    } catch (caught) {
      setError(toFormErrors(caught).general);
    }
  }, [sync]);

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

  /**
   * Completa o reabre una actividad (FR-020). El registro se conserva en ambos sentidos.
   *
   * Sin conexión el cambio se encola y la lista se refresca desde el cache ya modificado:
   * el usuario ve la casilla marcada al instante, que es lo que FR-049 pide de una escritura
   * hecha sin red.
   */
  async function alternarCompletada(item: AgendaItem) {
    setBusy(true);
    try {
      const { queued } = await sync.write({
        operation: 'agenda_editar',
        entityId: item.id,
        payload: { completed: !item.completed },
        label: item.title,
        send: () => agendaApi.update(item.id, { completed: !item.completed }).then(() => undefined),
      });

      if (queued) {
        aplicarLocal((items) =>
          items.map((actual) =>
            actual.id === item.id
              ? {
                  ...actual,
                  completed: !item.completed,
                  completedAt: item.completed ? null : new Date().toISOString(),
                }
              : actual,
          ),
        );
      } else {
        await load();
      }

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

  /**
   * Aplica un cambio sobre la agenda que se está viendo y lo guarda en el cache.
   *
   * Es lo que hace que un cambio sin conexión se **vea** y que siga ahí al cerrar y abrir la
   * app: sin guardarlo en el cache, la actividad creada sin red desaparecería de la pantalla
   * en cuanto se recargara desde lo guardado.
   */
  function aplicarLocal(cambio: (items: readonly AgendaItem[]) => readonly AgendaItem[]) {
    setAgenda((actual) => {
      if (!actual) return actual;
      // `rebuildAgendaList` reparte, recalcula la urgencia y reordena con las mismas reglas
      // que el servidor (FR-022): la lista sin conexión se ve igual que con ella.
      const siguiente = rebuildAgendaList(cambio(allAgendaItems(actual)), todayCalendarDate());
      void sync.cache(CACHE_KEYS.agenda, siguiente);
      return siguiente;
    });
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
              const { queued } = await sync.write({
                operation: 'agenda_borrar',
                entityId: item.id,
                payload: null,
                label: item.title,
                send: () => agendaApi.delete(item.id),
              });

              if (queued) {
                aplicarLocal((items) => items.filter((actual) => actual.id !== item.id));
              } else {
                await load();
              }

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
      <ScreenHeader
        title="Mi agenda"
        subtitle={agenda
            ? agenda.pending.length === 0
              ? 'No tienes nada pendiente'
              : `${agenda.pending.length} pendiente${agenda.pending.length > 1 ? 's' : ''}`
            : 'Tus tareas, proyectos y actividades'}
        onBack={onVolver}
      />

      {/* Estado de la sincronización (FR-050): solo aparece si hay algo que decir. */}
      <SyncIndicator />

      {/* De cuándo es lo que se está viendo, cuando viene del cache (FR-048). */}
      {cachedAt ? <Text style={styles.muted}>{cacheAgeMessage(cachedAt)}</Text> : null}

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
                    const item = panel.item;
                    const { queued } = await sync.write({
                      operation: 'agenda_editar',
                      entityId: item.id,
                      payload: input,
                      label: input.title,
                      send: () => agendaApi.update(item.id, input).then(() => undefined),
                    });

                    if (queued) {
                      aplicarLocal((items) =>
                        items.map((actual) =>
                          actual.id === item.id
                            ? { ...actual, ...conMateria(input, subjects) }
                            : actual,
                        ),
                      );
                    }
                    setNotice(`Se guardó "${input.title}".`);
                  } else {
                    /**
                     * El identificador se genera **aquí**, antes de saber si hay red.
                     *
                     * Es lo que permite que la actividad exista para el usuario al
                     * instante: si la creación se encola, completarla o editarla acto
                     * seguido ya apunta a este mismo identificador, y cuando la cola suba
                     * no habrá nada que reescribir.
                     */
                    const id = generateEntityId();
                    const payload = { ...input, id };

                    const { queued } = await sync.write({
                      operation: 'agenda_crear',
                      entityId: id,
                      payload,
                      label: input.title,
                      send: () => agendaApi.create(payload).then(() => undefined),
                    });

                    if (queued) {
                      aplicarLocal((items) => [...items, nuevaActividadLocal(id, input, subjects)]);
                    }
                    setNotice(`Se añadió "${input.title}".`);
                  }

                  // Con red se recarga del servidor; sin ella, la lista local ya está al día.
                  if (syncState.online) await load();
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

/**
 * Resuelve el nombre y el color de la materia para pintar sin conexión.
 *
 * Con red los manda el servidor ya resueltos, para que la lista no tenga que cruzarlos. Sin
 * red hay que hacerlo aquí, porque el cliente sí tiene las materias cacheadas y sin ellas la
 * actividad recién creada saldría sin su color mientras no hubiera conexión.
 */
function conMateria(
  input: { subjectId?: string | null; [key: string]: unknown },
  subjects: readonly Subject[],
): Record<string, unknown> {
  const subject = subjects.find((candidate) => candidate.id === input.subjectId);
  return {
    ...input,
    subjectName: subject?.name ?? null,
    subjectColor: subject?.color ?? null,
  };
}

/**
 * La actividad tal como se ve mientras espera a subir.
 *
 * Los campos que normalmente calcula el servidor —urgencia y días que faltan— se dejan en su
 * valor neutro porque `rebuildAgendaList` los recalcula acto seguido con las reglas
 * compartidas. Se rellenan aquí solo para satisfacer el tipo.
 */
function nuevaActividadLocal(
  id: string,
  input: { title: string; description?: string | null; kind?: string; subjectId?: string | null; dueDate?: string | null },
  subjects: readonly Subject[],
): AgendaItem {
  const ahora = new Date().toISOString();
  const subject = subjects.find((candidate) => candidate.id === input.subjectId);

  return {
    id,
    title: input.title,
    description: input.description ?? null,
    kind: (input.kind ?? 'tarea') as AgendaItem['kind'],
    subjectId: input.subjectId ?? null,
    subjectName: subject?.name ?? null,
    subjectColor: subject?.color ?? null,
    dueDate: (input.dueDate ?? null) as AgendaItem['dueDate'],
    completed: false,
    completedAt: null,
    urgency: 'sin_fecha',
    daysUntilDue: null,
    createdAt: ahora,
    updatedAt: ahora,
  };
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
        {/*
          Botón y no enlace de texto: borrar es la acción destructiva de la fila y necesita
          el borde que la enmarca, además del área táctil que un texto suelto no alcanza.
          Es el mismo criterio que en el horario y que en la web.
        */}
        <Button
          title="Eliminar"
          variant="danger"
          size="sm"
          compacto
          disabled={busy}
          onPress={onDelete}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { ...base.contenido, paddingTop: SPACE.md },
  header: { gap: 4 },
  title: { ...base.titulo },
  subtitle: { ...base.cuerpo },
  body: { color: colors.texto, fontSize: TEXT.md },
  muted: { ...base.tenue },
  tenue: { color: colors.textoTenue, fontSize: TEXT.sm },
  link: { color: colors.acentoClaro, fontSize: TEXT.md },
  deleteText: { color: colors.error, fontSize: TEXT.md },
  notice: {
    color: colors.exito,
    fontSize: TEXT.md,
    borderColor: c.exito,
    borderWidth: 1,
    backgroundColor: c.papel3,
    borderRadius: RADIUS.lg,
    padding: 10,
  },
  alerta: {
    color: c.aviso,
    fontSize: TEXT.md,
    borderColor: c.aviso,
    borderWidth: 1,
    backgroundColor: c.avisoFondo,
    borderRadius: RADIUS.lg,
    padding: 10,
  },
  itemCard: {
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 10,
  },
  itemMain: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: colors.textoTenue,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: colors.acento, borderColor: colors.acento },
  checkmark: { color: colors.textoFuerte, fontSize: TEXT.md, lineHeight: 18, fontWeight: '700' },
  itemBody: { flex: 1, gap: 4 },
  itemTitle: { color: colors.textoFuerte, fontSize: TEXT.md, fontWeight: '600' },
  itemTitleDone: { color: colors.textoTenue, textDecorationLine: 'line-through' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  subjectTag: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  colorDot: { width: 8, height: 8, borderRadius: RADIUS.sm },
  urgency: { fontSize: TEXT.sm, fontWeight: '600' },
  itemActions: { flexDirection: 'row', gap: 16, justifyContent: 'flex-end' },
});
