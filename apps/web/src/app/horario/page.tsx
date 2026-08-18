'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  CACHE_KEYS,
  WEEKDAY_LABELS,
  toFormErrors,
  toScheduleEntries,
  type Instant,
  type ScheduleBlockInput,
  type Subject,
} from '@notecore/shared';
import { scheduleApi } from '@/lib/api';
import { RequireSession } from '@/components/require-session';
import { ScheduleGrid } from '@/components/schedule-grid';
import { SubjectForm } from '@/components/subject-form';
import { ImportDialog } from '@/components/import-dialog';
import { Button, Card, FormError } from '@/components/ui';
import { CacheNotice, SyncIndicator } from '@/components/sync-indicator';
import { loadWithCache, useSyncActions } from '@/lib/sync-context';

/**
 * Horario semanal (FR-005 a FR-010).
 *
 * Muestra la rejilla, permite dar de alta materias a mano y ofrece la importación desde el
 * JSON de una IA. Toda la regla la aplica la API: aquí solo se presenta (Principio II).
 */
export default function HorarioPage() {
  return (
    <RequireSession>
      <Horario />
    </RequireSession>
  );
}

/** Qué panel está abierto sobre la rejilla. */
type Panel =
  | { kind: 'ninguno' }
  | { kind: 'nueva' }
  | { kind: 'editar'; subject: Subject }
  | { kind: 'importar' };

function Horario() {
  const [subjects, setSubjects] = useState<readonly Subject[]>([]);
  const [panel, setPanel] = useState<Panel>({ kind: 'ninguno' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  /** De cuándo es el horario que se está viendo, si viene del cache (FR-048). */
  const [cachedAt, setCachedAt] = useState<Instant | null>(null);

  const sync = useSyncActions();

  const load = useCallback(async () => {
    try {
      const result = await loadWithCache(sync, CACHE_KEYS.schedule, () =>
        scheduleApi.subjects(),
      );
      setSubjects(result.data);
      setCachedAt(result.cachedAt);
      setError(undefined);
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

  async function removeSubject(subject: Subject) {
    // Borrar una materia se lleva sus sesiones: conviene confirmarlo antes.
    if (!window.confirm(`¿Eliminar ${subject.name} y todas sus sesiones?`)) return;

    try {
      await scheduleApi.deleteSubject(subject.id);
      await load();
      setNotice(`Se eliminó ${subject.name}.`);
    } catch (caught) {
      setError(toFormErrors(caught).general);
    }
  }

  const entries = toScheduleEntries(subjects);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Mi horario</h1>
          <p className="text-slate-400">
            {subjects.length === 0
              ? 'Todavía no has capturado tus clases'
              : `${subjects.length} materias · ${entries.length} sesiones a la semana`}
          </p>
        </div>
        <Link href="/" className="text-sm font-medium text-sky-400 hover:text-sky-300">
          ← Volver al inicio
        </Link>
      </header>

      {/* Estado de la conexión (FR-050) y antigüedad de lo cacheado (FR-048). */}
      <SyncIndicator />
      <CacheNotice cachedAt={cachedAt} />

      <FormError message={error} />

      {notice ? (
        <p
          role="status"
          className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-3.5 py-2.5 text-sm text-emerald-300"
        >
          {notice}
        </p>
      ) : null}

      {panel.kind === 'ninguno' ? (
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => { setNotice(undefined); setPanel({ kind: 'nueva' }); }}>
            Añadir materia
          </Button>
          <Button
            variant="secondary"
            onClick={() => { setNotice(undefined); setPanel({ kind: 'importar' }); }}
          >
            Importar desde una IA
          </Button>
        </div>
      ) : null}

      {panel.kind === 'nueva' ? (
        <Card title="Nueva materia">
          <SubjectForm
            onSubmit={createSubject}
            onCancel={() => setPanel({ kind: 'ninguno' })}
          />
        </Card>
      ) : null}

      {panel.kind === 'editar' ? (
        <Card title={`Editar ${panel.subject.name}`}>
          <SubjectForm
            subject={panel.subject}
            onSubmit={(input) => updateSubject(panel.subject, input)}
            onCancel={() => setPanel({ kind: 'ninguno' })}
          />
        </Card>
      ) : null}

      {panel.kind === 'importar' ? (
        <Card title="Importar horario">
          <ImportDialog
            hasSubjects={subjects.length > 0}
            onImported={(message) => {
              setPanel({ kind: 'ninguno' });
              setNotice(message);
              void load();
            }}
            onCancel={() => setPanel({ kind: 'ninguno' })}
          />
        </Card>
      ) : null}

      {loading ? (
        <p className="text-slate-500">Cargando tu horario…</p>
      ) : entries.length === 0 ? (
        <Card>
          <p className="text-slate-300">
            Añade tus materias una por una, o pega el horario que te genere una IA a partir de
            una foto: es más rápido si llevas muchas clases.
          </p>
        </Card>
      ) : (
        <>
          <ScheduleGrid entries={entries} />

          <Card title="Tus materias">
            <ul className="divide-y divide-slate-800">
              {subjects.map((subject) => (
                <li
                  key={subject.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden
                      style={{ backgroundColor: subject.color }}
                      className="h-3 w-3 shrink-0 rounded-full"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-100">{subject.name}</p>
                      <p className="truncate text-sm text-slate-400">
                        {subject.blocks
                          .map(
                            (block) =>
                              `${WEEKDAY_LABELS[block.weekday]} ${block.startTime}–${block.endTime}`,
                          )
                          .join(' · ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => { setNotice(undefined); setPanel({ kind: 'editar', subject }); }}
                    >
                      Editar
                    </Button>
                    <Button variant="danger" onClick={() => void removeSubject(subject)}>
                      Eliminar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </main>
  );
}
