'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AGENDA_KIND_LABELS,
  AGENDA_URGENCY_COLORS,
  CACHE_KEYS,
  dueDateLine,
  formatCalendarDateShort,
  SNOOZE_LABELS,
  SNOOZE_MINUTES,
  toFormErrors,
  type AgendaItem,
  type AgendaList,
  type Instant,
  type SnoozeMinutes,
  type Subject,
} from '@notecore/shared';
import { agendaApi, scheduleApi } from '@/lib/api';
import { RequireSession } from '@/components/require-session';
import { AgendaForm } from '@/components/agenda-form';
import { Button, Card, FormError, ScreenHeader } from '@/components/ui';
import { CacheNotice, SyncIndicator } from '@/components/sync-indicator';
import { loadWithCache, useSyncActions } from '@/lib/sync-context';

/**
 * Agenda de tareas y actividades (FR-018 a FR-022).
 *
 * Dos listas: pendientes y completadas. El orden por proximidad de vencimiento y la urgencia
 * llegan resueltos de la API; aquí solo se presentan (Principio II).
 */
export default function AgendaPage() {
  return (
    <RequireSession>
      <Agenda />
    </RequireSession>
  );
}

/** Qué panel está abierto sobre las listas. */
type Panel = { kind: 'ninguno' } | { kind: 'nueva' } | { kind: 'editar'; item: AgendaItem };

function Agenda() {
  const [agenda, setAgenda] = useState<AgendaList>();
  const [subjects, setSubjects] = useState<readonly Subject[]>([]);
  const [panel, setPanel] = useState<Panel>({ kind: 'ninguno' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  /** De cuándo es la agenda que se está viendo, si viene del cache (FR-048). */
  const [cachedAt, setCachedAt] = useState<Instant | null>(null);

  const sync = useSyncActions();

  /** La agenda, cayendo a lo guardado si no hay red (FR-048). */
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
      // Las materias hacen falta para el desplegable del formulario (FR-018).
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
  /**
   * Aplaza el recordatorio de una actividad (Fase 28).
   *
   * La web no emite la notificación —eso es de la app—, pero sí puede mover cuándo suena, y
   * por eso la acción existe en los dos clientes (Principio I). El instante lo calcula el
   * servidor sobre su propio reloj: aquí solo viajan los minutos.
   */
  async function aplazarAviso(item: AgendaItem, minutos: SnoozeMinutes) {
    setBusy(true);
    try {
      await agendaApi.snooze(item.id, { minutes: minutos });
      await load();
      setNotice(`Te recordamos "${item.title}" ${SNOOZE_LABELS[minutos].toLowerCase()}.`);
    } catch (caught) {
      setError(toFormErrors(caught).general);
    } finally {
      setBusy(false);
    }
  }

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
  async function eliminar(item: AgendaItem) {
    if (!window.confirm(`¿Eliminar "${item.title}"? Esto no se puede deshacer.`)) return;

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
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-nc-lg px-nc-lg py-nc-2xl lg:max-w-6xl lg:px-nc-2xl">
      <ScreenHeader
        title="Mi agenda"
        subtitle={agenda
              ? agenda.pending.length === 0
                ? 'No tienes nada pendiente'
                : `${agenda.pending.length} pendiente${agenda.pending.length > 1 ? 's' : ''}`
              : 'Tus tareas, proyectos y actividades'}
        back={{ href: '/', label: 'Inicio' }}
      />

      {/* Estado de la conexión (FR-050) y antigüedad de lo cacheado (FR-048). */}
      <SyncIndicator />
      <CacheNotice cachedAt={cachedAt} />

      <FormError message={error} />

      {notice ? (
        <p
          role="status"
          className="rounded-lg border border-exito/40 bg-exito/10 px-nc-sm py-nc-xs text-sm text-exito"
        >
          {notice}
        </p>
      ) : null}

      {/* Lo vencido y lo de hoy se resumen arriba: es lo que decide qué hacer al abrir. */}
      {agenda && (agenda.overdueCount > 0 || agenda.dueTodayCount > 0) ? (
        <p className="rounded-lg border border-aviso/40 bg-aviso-fondo px-nc-sm py-nc-xs text-sm text-aviso">
          {agenda.overdueCount > 0
            ? `${agenda.overdueCount} ${agenda.overdueCount === 1 ? 'actividad vencida' : 'actividades vencidas'}`
            : ''}
          {agenda.overdueCount > 0 && agenda.dueTodayCount > 0 ? ' · ' : ''}
          {agenda.dueTodayCount > 0
            ? `${agenda.dueTodayCount} ${agenda.dueTodayCount === 1 ? 'vence' : 'vencen'} hoy`
            : ''}
        </p>
      ) : null}

      {loading ? (
        <p className="text-tinta3">Cargando tu agenda…</p>
      ) : (
        <>
          {/* ── Alta y edición ───────────────────────────────────────────── */}
          {panel.kind === 'ninguno' ? (
            <Button onClick={() => setPanel({ kind: 'nueva' })}>Añadir actividad</Button>
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
              <p className="text-tinta2">
                No tienes nada pendiente. Añade lo que te dejen en clase para no perderlo de
                vista.
              </p>
            ) : (
              <ul className="space-y-nc-sm">
                {agenda?.pending.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    busy={busy}
                    onToggle={() => void alternarCompletada(item)}
                    onEdit={() => setPanel({ kind: 'editar', item })}
                    onDelete={() => void eliminar(item)}
                    onAplazar={(minutos) => void aplazarAviso(item, minutos)}
                  />
                ))}
              </ul>
            )}
          </Card>

          {/* ── Completadas ──────────────────────────────────────────────── */}
          {agenda && agenda.completed.length > 0 ? (
            <Card title={`Completadas (${agenda.completed.length})`}>
              {/* FR-020: completar conserva el registro, así que siguen consultables. */}
              <ul className="space-y-nc-sm">
                {agenda.completed.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    busy={busy}
                    onToggle={() => void alternarCompletada(item)}
                    onEdit={() => setPanel({ kind: 'editar', item })}
                    onDelete={() => void eliminar(item)}
                    onAplazar={(minutos) => void aplazarAviso(item, minutos)}
                  />
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      )}
    </main>
  );
}

/** Una actividad de la lista, con sus acciones. */
/**
 * La hora local de un instante, para enseñar hasta cuándo está aplazado un aviso.
 *
 * Con componentes locales y no `toISOString()`, por lo mismo que en el resto del proyecto: esa
 * conversión pasa por UTC y enseñaría el aplazamiento movido de hora.
 */
function horaDeInstante(instante: Instant): string {
  const fecha = new Date(instante);
  const hora = String(fecha.getHours()).padStart(2, '0');
  const minuto = String(fecha.getMinutes()).padStart(2, '0');
  return `${hora}:${minuto}`;
}

function ItemRow({
  item,
  busy,
  onToggle,
  onEdit,
  onDelete,
  onAplazar,
}: {
  item: AgendaItem;
  busy: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Aplaza el recordatorio de esta actividad (Fase 28). */
  onAplazar: (minutos: SnoozeMinutes) => void;
}) {
  const color = AGENDA_URGENCY_COLORS[item.urgency];

  return (
    <li className="flex flex-wrap items-start justify-between gap-nc-sm rounded-lg border border-filete p-nc-md">
      <div className="flex min-w-0 flex-1 items-start gap-nc-sm">
        <input
          type="checkbox"
          checked={item.completed}
          disabled={busy}
          onChange={onToggle}
          aria-label={item.completed ? `Reabrir ${item.title}` : `Completar ${item.title}`}
          className="mt-nc-2xs h-4 w-4 shrink-0 accent-sky-500"
        />

        <div className="min-w-0 space-y-nc-2xs">
          <p
            className={`font-medium ${item.completed ? 'text-tinta3 line-through' : 'text-tinta'}`}
          >
            {item.title}
          </p>

          {item.description ? (
            <p className="whitespace-pre-wrap text-sm text-tinta2">{item.description}</p>
          ) : null}

          <p className="flex flex-wrap items-center gap-x-nc-xs gap-y-nc-2xs text-sm text-tinta3">
            <span>{AGENDA_KIND_LABELS[item.kind]}</span>

            {item.subjectName ? (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-nc-2xs">
                  <span
                    aria-hidden
                    style={{ backgroundColor: item.subjectColor ?? '#64748b' }}
                    className="h-2.5 w-2.5 rounded-pill"
                  />
                  {item.subjectName}
                </span>
              </>
            ) : null}

            {item.dueDate ? (
              <>
                <span aria-hidden>·</span>
                <span>{formatCalendarDateShort(item.dueDate)}</span>
              </>
            ) : null}
          </p>

          {/* Sin fecha límite no hay urgencia que mostrar, y las completadas ya no urgen. */}
          {!item.completed && item.dueDate ? (
            <p className="text-sm font-medium" style={{ color }}>
              {dueDateLine(item.urgency, item.daysUntilDue)}
            </p>
          ) : null}

          {/*
            Aplazamiento vigente (Fase 28). Se enseña también aquí, y no solo en la app, porque
            quien lo creó lo hizo desde una notificación del teléfono: sin verlo en la web no
            tendría forma de entender por qué su aviso no ha sonado. Es la paridad del
            Principio I aplicada a un estado que nació en el otro cliente.
          */}
          {!item.completed && item.reminderSnoozedUntil ? (
            <p className="text-sm italic text-tinta3">
              Aviso aplazado hasta las {horaDeInstante(item.reminderSnoozedUntil)}
            </p>
          ) : null}

          {/*
            Aplazar desde la web (Fase 28). Las cuatro opciones, que es lo que la notificación
            no puede ofrecer —allí solo caben dos botones—. Solo para lo pendiente y con fecha:
            sin fecha no hay aviso que aplazar y el servidor rechaza aplazar lo completado.
          */}
          {!item.completed && item.dueDate ? (
            <p className="flex flex-wrap items-center gap-x-nc-xs gap-y-nc-2xs text-sm text-tinta3">
              <span>Recordar más tarde:</span>
              {SNOOZE_MINUTES.map((minutos) => (
                <button
                  key={minutos}
                  type="button"
                  disabled={busy}
                  onClick={() => onAplazar(minutos)}
                  aria-label={`Aplazar el aviso de ${item.title}: ${SNOOZE_LABELS[minutos]}`}
                  className="rounded-md px-nc-2xs text-acento transition hover:text-foco disabled:opacity-50"
                >
                  {SNOOZE_LABELS[minutos]}
                </button>
              ))}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex gap-nc-xs">
        <Button variant="secondary" disabled={busy} onClick={onEdit}>
          Editar
        </Button>
        <Button variant="danger" disabled={busy} onClick={onDelete}>
          Eliminar
        </Button>
      </div>
    </li>
  );
}
