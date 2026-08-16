'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  ABSENCE_LIMIT_DISCLAIMER,
  ABSENCE_STATUS_COLORS,
  ABSENCE_STATUS_LABELS,
  MAX_SEMESTER_WEEKS,
  MIN_SEMESTER_WEEKS,
  absenceStatusMessage,
  formatCalendarDate,
  toFormErrors,
  todayCalendarDate,
  type AttendanceSummary,
  type CalendarDate,
  type DayAttendance,
  type SubjectAttendance,
} from '@notecore/shared';
import { attendanceApi } from '@/lib/api';
import { RequireSession } from '@/components/require-session';
import { Button, Card, FormError } from '@/components/ui';

/**
 * Control de faltas (FR-011 a FR-017).
 *
 * Dos mitades: marcar la falta de un día y el panel de conteo por materia. Todos los
 * números —límite sugerido, faltas restantes, estado de alerta— llegan calculados de la
 * API; aquí solo se presentan (Principio II).
 */
export default function FaltasPage() {
  return (
    <RequireSession>
      <Faltas />
    </RequireSession>
  );
}

function Faltas() {
  const [summary, setSummary] = useState<AttendanceSummary>();
  const [date, setDate] = useState<CalendarDate>(todayCalendarDate());
  const [day, setDay] = useState<DayAttendance>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await attendanceApi.summary());
      setError(undefined);
    } catch (caught) {
      setError(toFormErrors(caught).general);
    }
  }, []);

  const loadDay = useCallback(async (target: CalendarDate) => {
    try {
      setDay(await attendanceApi.day(target));
      setError(undefined);
    } catch (caught) {
      setError(toFormErrors(caught).general);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await Promise.all([loadSummary(), loadDay(date)]);
      setLoading(false);
    })();
    // Solo al montar: el cambio de fecha lo gestiona `cambiarFecha`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cambiarFecha(nueva: CalendarDate) {
    setDate(nueva);
    setNotice(undefined);
    await loadDay(nueva);
  }

  /** Registra faltas y refresca las dos mitades de la pantalla. */
  async function marcar(blockIds: readonly string[], etiqueta: string) {
    if (blockIds.length === 0) return;

    setBusy(true);
    try {
      await attendanceApi.mark({ date, blockIds: [...blockIds], justified: false, note: null });
      await Promise.all([loadSummary(), loadDay(date)]);
      setNotice(etiqueta);
    } catch (caught) {
      setError(toFormErrors(caught).general);
    } finally {
      setBusy(false);
    }
  }

  async function quitar(absenceId: string) {
    setBusy(true);
    try {
      await attendanceApi.deleteAbsence(absenceId);
      await Promise.all([loadSummary(), loadDay(date)]);
      setNotice('Se quitó la falta.');
    } catch (caught) {
      setError(toFormErrors(caught).general);
    } finally {
      setBusy(false);
    }
  }

  async function justificar(absenceId: string, justified: boolean) {
    setBusy(true);
    try {
      await attendanceApi.updateAbsence(absenceId, { justified });
      await Promise.all([loadSummary(), loadDay(date)]);
      setNotice(justified ? 'Falta justificada: deja de contar.' : 'La falta vuelve a contar.');
    } catch (caught) {
      setError(toFormErrors(caught).general);
    } finally {
      setBusy(false);
    }
  }

  const pendientes = day?.sessions.filter((s) => !s.alreadyAbsent) ?? [];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Mis faltas</h1>
          <p className="text-slate-400">
            {summary?.subjects.length
              ? `${summary.subjects.length} materias · semestre de ${summary.semesterWeeks} semanas`
              : 'Registra tus inasistencias y vigila tu margen'}
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

      {loading ? (
        <p className="text-slate-500">Cargando tus faltas…</p>
      ) : summary?.subjects.length === 0 ? (
        <Card>
          <p className="text-slate-300">
            Todavía no tienes materias en tu horario. Captúralo primero y aquí podrás llevar
            el control de tus faltas.
          </p>
          <Link href="/horario" className="text-sm font-medium text-sky-400 hover:text-sky-300">
            Ir a mi horario →
          </Link>
        </Card>
      ) : (
        <>
          {/* ── Marcar falta ─────────────────────────────────────────────── */}
          <Card title="Marcar una falta">
            <div className="space-y-1.5">
              <label htmlFor="fecha" className="block text-sm font-medium text-slate-300">
                Fecha
              </label>
              <input
                id="fecha"
                type="date"
                value={date}
                onChange={(event) => void cambiarFecha(event.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-slate-100 outline-none transition focus:border-sky-700 focus:ring-2 focus:ring-sky-900/50"
              />
              <p className="text-sm text-slate-500">{formatCalendarDate(date)}</p>
            </div>

            {day && day.sessions.length === 0 ? (
              <p className="text-slate-400">Ese día no tienes clases.</p>
            ) : (
              <>
                <ul className="divide-y divide-slate-800">
                  {day?.sessions.map((session) => (
                    <li
                      key={session.blockId}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden
                          style={{ backgroundColor: session.color }}
                          className="h-3 w-3 shrink-0 rounded-full"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-100">
                            {session.subjectName}
                          </p>
                          <p className="truncate text-sm text-slate-400">
                            {session.startTime}–{session.endTime}
                            {session.room ? ` · ${session.room}` : ''}
                            {session.alreadyAbsent
                              ? session.justified
                                ? ' · falta justificada'
                                : ' · falta registrada'
                              : ''}
                          </p>
                        </div>
                      </div>

                      {session.alreadyAbsent && session.absenceId ? (
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            disabled={busy}
                            onClick={() =>
                              void justificar(session.absenceId as string, !session.justified)
                            }
                          >
                            {session.justified ? 'Quitar justificación' : 'Justificar'}
                          </Button>
                          <Button
                            variant="danger"
                            disabled={busy}
                            onClick={() => void quitar(session.absenceId as string)}
                          >
                            Quitar
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="secondary"
                          disabled={busy}
                          onClick={() =>
                            void marcar(
                              [session.blockId],
                              `Falta registrada en ${session.subjectName}.`,
                            )
                          }
                        >
                          Marcar falta
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>

                {/* El día completo es la lista entera de sesiones: el servidor guarda igual
                    una falta por clase, sin importar cómo se registró (FR-011). */}
                {pendientes.length > 1 ? (
                  <Button
                    disabled={busy}
                    onClick={() =>
                      void marcar(
                        pendientes.map((s) => s.blockId),
                        `Se registró el día completo: ${pendientes.length} clases.`,
                      )
                    }
                  >
                    Marcar el día completo ({pendientes.length} clases)
                  </Button>
                ) : null}
              </>
            )}
          </Card>

          {/* ── Panel por materia ────────────────────────────────────────── */}
          <Card title="Tus materias">
            <ul className="space-y-4">
              {summary?.subjects.map((subject) => (
                <SubjectRow
                  key={subject.subjectId}
                  subject={subject}
                  busy={busy}
                  onLimitChange={async (limit) => {
                    setBusy(true);
                    try {
                      setSummary(await attendanceApi.setLimit(subject.subjectId, { limit }));
                      setNotice(
                        limit === null
                          ? `${subject.subjectName}: vuelve al límite sugerido.`
                          : `${subject.subjectName}: límite fijado en ${limit}.`,
                      );
                    } catch (caught) {
                      setError(toFormErrors(caught).general);
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              ))}
            </ul>

            {/* Principio VII: la recomendación de confirmar con el profesor es obligatoria
                y va siempre visible junto a los límites (FR-014). */}
            <p className="rounded-lg border border-amber-900/50 bg-amber-950/20 px-3.5 py-2.5 text-sm text-amber-300">
              {ABSENCE_LIMIT_DISCLAIMER}
            </p>
          </Card>

          {/* ── Semanas del semestre ─────────────────────────────────────── */}
          <Card title="Semanas del semestre">
            <p className="text-sm text-slate-400">
              Los totales y los límites sugeridos se calculan multiplicando tus clases
              semanales por este número. Ajústalo al calendario de tu escuela.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="number"
                min={MIN_SEMESTER_WEEKS}
                max={MAX_SEMESTER_WEEKS}
                defaultValue={summary?.semesterWeeks}
                key={summary?.semesterWeeks}
                disabled={busy}
                onBlur={(event) => {
                  const weeks = Number(event.target.value);
                  if (!Number.isInteger(weeks) || weeks === summary?.semesterWeeks) return;
                  void (async () => {
                    setBusy(true);
                    try {
                      setSummary(await attendanceApi.setSemesterWeeks({ weeks }));
                      setNotice(`Semestre de ${weeks} semanas.`);
                    } catch (caught) {
                      setError(toFormErrors(caught).general);
                    } finally {
                      setBusy(false);
                    }
                  })();
                }}
                className="w-24 rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-slate-100 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-900/50"
              />
              <span className="text-sm text-slate-400">semanas</span>
            </div>
          </Card>
        </>
      )}
    </main>
  );
}

/** Una materia del panel: conteo, barra de avance y límite editable. */
function SubjectRow({
  subject,
  busy,
  onLimitChange,
}: {
  subject: SubjectAttendance;
  busy: boolean;
  onLimitChange: (limit: number | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(subject.limit));

  const color = ABSENCE_STATUS_COLORS[subject.status];
  // La barra se llena con la proporción de faltas usadas; se corta al 100% para que
  // pasarse del límite no la desborde.
  const percent =
    subject.limit === 0 ? 100 : Math.min(100, (subject.absences / subject.limit) * 100);

  return (
    <li className="space-y-2 rounded-lg border border-slate-800 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            style={{ backgroundColor: subject.color }}
            className="h-3 w-3 shrink-0 rounded-full"
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-100">{subject.subjectName}</p>
            <p className="text-sm text-slate-400">
              {subject.absences} de {subject.limit} faltas
              {subject.justifiedAbsences > 0
                ? ` · ${subject.justifiedAbsences} justificada${subject.justifiedAbsences > 1 ? 's' : ''}`
                : ''}
            </p>
          </div>
        </div>

        <span
          className="rounded-full px-2.5 py-1 text-xs font-medium"
          style={{ backgroundColor: `${color}22`, color }}
        >
          {ABSENCE_STATUS_LABELS[subject.status]}
        </span>
      </div>

      <div
        className="h-2 w-full overflow-hidden rounded-full bg-slate-800"
        role="progressbar"
        aria-valuenow={subject.absences}
        aria-valuemin={0}
        aria-valuemax={subject.limit}
        aria-label={`Faltas en ${subject.subjectName}`}
      >
        <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>

      <p className="text-sm" style={{ color }}>
        {absenceStatusMessage(subject.status, subject.remaining)}
      </p>

      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <span>
          {subject.sessionsPerWeek} por semana · {subject.totalSessions} en el semestre ·
          sugerido {subject.suggestedLimit}
        </span>

        {editing ? (
          <span className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="w-20 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-slate-100 outline-none focus:border-sky-700"
            />
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                const limit = Number(value);
                if (!Number.isInteger(limit) || limit < 0) return;
                void onLimitChange(limit).then(() => setEditing(false));
              }}
            >
              Guardar
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setValue(String(subject.limit));
                setEditing(true);
              }}
              className="font-medium text-sky-400 hover:text-sky-300"
            >
              Cambiar límite
            </button>
            {/* Solo tiene sentido volver a la sugerencia si el usuario la sobrescribió. */}
            {subject.limitIsCustom ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void onLimitChange(null)}
                className="font-medium text-slate-400 hover:text-slate-300"
              >
                Usar el sugerido
              </button>
            ) : null}
          </span>
        )}
      </div>
    </li>
  );
}
