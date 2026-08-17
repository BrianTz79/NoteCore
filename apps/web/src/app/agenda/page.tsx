'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
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
import { agendaApi, scheduleApi } from '@/lib/api';
import { RequireSession } from '@/components/require-session';
import { AgendaForm } from '@/components/agenda-form';
import { Button, Card, FormError } from '@/components/ui';

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
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Mi agenda</h1>
          <p className="text-slate-400">
            {agenda
              ? agenda.pending.length === 0
                ? 'No tienes nada pendiente'
                : `${agenda.pending.length} pendiente${agenda.pending.length > 1 ? 's' : ''}`
              : 'Tus tareas, proyectos y actividades'}
          </p>
        </div>
        <Link href="/" className="text-sm font-medium text-sky-400 hover:text-sky-300">
          ← Volver al inicio
        </Link>
      </header>

      <FormError message={error} />

      {notice ? (
        <p
          role="status"
          className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-3.5 py-2.5 text-sm text-emerald-300"
        >
          {notice}
        </p>
      ) : null}

      {/* Lo vencido y lo de hoy se resumen arriba: es lo que decide qué hacer al abrir. */}
      {agenda && (agenda.overdueCount > 0 || agenda.dueTodayCount > 0) ? (
        <p className="rounded-lg border border-amber-900/50 bg-amber-950/20 px-3.5 py-2.5 text-sm text-amber-300">
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
        <p className="text-slate-500">Cargando tu agenda…</p>
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
              <p className="text-slate-400">
                No tienes nada pendiente. Añade lo que te dejen en clase para no perderlo de
                vista.
              </p>
            ) : (
              <ul className="space-y-3">
                {agenda?.pending.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    busy={busy}
                    onToggle={() => void alternarCompletada(item)}
                    onEdit={() => setPanel({ kind: 'editar', item })}
                    onDelete={() => void eliminar(item)}
                  />
                ))}
              </ul>
            )}
          </Card>

          {/* ── Completadas ──────────────────────────────────────────────── */}
          {agenda && agenda.completed.length > 0 ? (
            <Card title={`Completadas (${agenda.completed.length})`}>
              {/* FR-020: completar conserva el registro, así que siguen consultables. */}
              <ul className="space-y-3">
                {agenda.completed.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    busy={busy}
                    onToggle={() => void alternarCompletada(item)}
                    onEdit={() => setPanel({ kind: 'editar', item })}
                    onDelete={() => void eliminar(item)}
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
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-800 p-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <input
          type="checkbox"
          checked={item.completed}
          disabled={busy}
          onChange={onToggle}
          aria-label={item.completed ? `Reabrir ${item.title}` : `Completar ${item.title}`}
          className="mt-1 h-4 w-4 shrink-0 accent-sky-500"
        />

        <div className="min-w-0 space-y-1">
          <p
            className={`font-medium ${item.completed ? 'text-slate-500 line-through' : 'text-slate-100'}`}
          >
            {item.title}
          </p>

          {item.description ? (
            <p className="whitespace-pre-wrap text-sm text-slate-400">{item.description}</p>
          ) : null}

          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
            <span>{AGENDA_KIND_LABELS[item.kind]}</span>

            {item.subjectName ? (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    style={{ backgroundColor: item.subjectColor ?? '#64748b' }}
                    className="h-2.5 w-2.5 rounded-full"
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
        </div>
      </div>

      <div className="flex gap-2">
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
