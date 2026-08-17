'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  AGENDA_KIND_LABELS,
  AGENDA_URGENCY_COLORS,
  REMINDER_LEAD_DAYS,
  REMINDER_LEAD_LABELS,
  daysBetween,
  formatCalendarDate,
  formatMonthName,
  isSameMonth,
  monthGridEnd,
  monthGridStart,
  nextMonth,
  previousMonth,
  reminderListMessage,
  startOfMonth,
  toFormErrors,
  todayCalendarDate,
  type CalendarDay,
  type CalendarRange,
  type ReminderPlan,
  type ReminderLeadDays,
} from '@notecore/shared';
import { calendarApi } from '@/lib/api';
import { RequireSession } from '@/components/require-session';
import { Button, Card, FormError } from '@/components/ui';

/**
 * Calendario y recordatorios (FR-023 a FR-027).
 *
 * Combina clases y vencimientos en una rejilla mensual, abre el detalle de un día y gestiona
 * los ajustes de recordatorio. Todo lo que se pinta —qué cae cada día, la urgencia, el momento
 * del aviso— llega resuelto de la API (Principio II).
 *
 * La web **configura** los recordatorios y muestra en pantalla los que están por vencer; la
 * notificación del dispositivo la emite la app (FR-026), que es donde el sistema operativo
 * permite programarlas aunque la aplicación esté cerrada.
 */
export default function CalendarioPage() {
  return (
    <RequireSession>
      <Calendario />
    </RequireSession>
  );
}

/** Etiquetas de las columnas. Coinciden con `WEEKDAYS`, que empieza en lunes. */
const CABECERAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

function Calendario() {
  // El mes que se está pintando, como su día 1. Arranca en el mes de hoy.
  const [mes, setMes] = useState(() => startOfMonth(todayCalendarDate()));
  const [rango, setRango] = useState<CalendarRange>();
  const [diaAbierto, setDiaAbierto] = useState<CalendarDay>();
  const [plan, setPlan] = useState<ReminderPlan>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const cargarMes = useCallback(async (mesActual: string) => {
    try {
      // La rejilla se pinta por semanas completas, así que el rango desborda el mes por
      // ambos extremos: los días de los meses vecinos rellenan la primera y la última fila.
      setRango(
        await calendarApi.range(monthGridStart(mesActual), monthGridEnd(mesActual)),
      );
      setError(undefined);
    } catch (caught) {
      setError(toFormErrors(caught).general);
    }
  }, []);

  const cargarPlan = useCallback(async () => {
    try {
      setPlan(await calendarApi.reminderPlan());
    } catch (caught) {
      // El fallo se muestra en lugar de tragarse: sin el plan, los controles de recordatorio
      // se quedan deshabilitados, y sin mensaje el usuario vería una casilla muerta sin
      // ninguna explicación de por qué no responde.
      setError(toFormErrors(caught).general);
    }
  }, []);

  // La rejilla se recarga al cambiar de mes; el plan de recordatorios no depende del mes, así
  // que va en su propio efecto. Juntos, pasar de agosto a septiembre volvería a pedir los
  // recordatorios sin motivo.
  useEffect(() => {
    void (async () => {
      await cargarMes(mes);
      setLoading(false);
    })();
  }, [mes, cargarMes]);

  useEffect(() => {
    void cargarPlan();
  }, [cargarPlan]);

  /** Abre el detalle de un día (FR-024). */
  async function abrirDia(fecha: string) {
    setBusy(true);
    try {
      setDiaAbierto(await calendarApi.day(fecha));
      setError(undefined);
    } catch (caught) {
      setError(toFormErrors(caught).general);
    } finally {
      setBusy(false);
    }
  }

  /** Cambia los ajustes de recordatorio y recarga el plan resultante (FR-025). */
  async function guardarAjustes(input: {
    enabled?: boolean;
    leadDays?: ReminderLeadDays;
    timeOfDay?: string;
  }) {
    setBusy(true);
    try {
      await calendarApi.updateReminderSettings(input);
      await cargarPlan();
      setError(undefined);
    } catch (caught) {
      setError(toFormErrors(caught).general);
    } finally {
      setBusy(false);
    }
  }

  const ajustes = plan?.settings;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Mi calendario</h1>
          <p className="text-slate-400">Tus clases y tus entregas, día a día</p>
        </div>
        <Link href="/" className="text-sm font-medium text-sky-400 hover:text-sky-300">
          ← Volver al inicio
        </Link>
      </header>

      <FormError message={error} />

      {loading ? (
        <p className="text-slate-500">Cargando tu calendario…</p>
      ) : (
        <>
          {/* ── Rejilla del mes (FR-023) ─────────────────────────────────── */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setMes(previousMonth(mes))}
              >
                ← Mes anterior
              </Button>

              {/* `formatMonthName` ya devuelve la inicial en mayúscula; `capitalize` la
                  pondría en cada palabra y daría "Agosto De 2026". */}
              <h2 className="text-lg font-medium text-slate-100">{formatMonthName(mes)}</h2>

              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setMes(nextMonth(mes))}
              >
                Mes siguiente →
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
              {CABECERAS.map((dia) => (
                <div key={dia} className="py-1">
                  {dia}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {rango?.days.map((dia) => (
                <CeldaDia
                  key={dia.date}
                  dia={dia}
                  delMes={isSameMonth(dia.date, mes)}
                  seleccionado={diaAbierto?.date === dia.date}
                  onAbrir={() => void abrirDia(dia.date)}
                />
              ))}
            </div>

            <p className="text-sm text-slate-500">
              Toca un día para ver sus clases y sus entregas.
            </p>
          </Card>

          {/* ── Detalle del día (FR-024) ─────────────────────────────────── */}
          {diaAbierto ? <DetalleDia dia={diaAbierto} /> : null}

          {/* ── Recordatorios (FR-025 a FR-027) ──────────────────────────── */}
          <Card title="Recordatorios">
            <p className="text-slate-300">
              Recibe un aviso antes de que venza cada entrega. Las notificaciones llegan a tu
              teléfono desde la app de NoteCore; aquí eliges cuándo.
            </p>

            <label className="flex items-center gap-3 text-slate-200">
              <input
                type="checkbox"
                checked={ajustes?.enabled ?? false}
                disabled={busy || !ajustes}
                onChange={(event) =>
                  void guardarAjustes({ enabled: event.target.checked })
                }
                className="h-4 w-4 accent-sky-500"
              />
              Avisarme de mis entregas
            </label>

            {ajustes?.enabled ? (
              <>
                <div className="space-y-1.5">
                  <span className="block text-sm font-medium text-slate-300">
                    Con cuánta anticipación
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {REMINDER_LEAD_DAYS.map((dias) => (
                      <button
                        key={dias}
                        type="button"
                        disabled={busy}
                        onClick={() => void guardarAjustes({ leadDays: dias })}
                        aria-pressed={ajustes.leadDays === dias}
                        className={`rounded-lg border px-3 py-2 text-sm transition ${
                          ajustes.leadDays === dias
                            ? 'border-sky-700 bg-sky-950/50 text-sky-300'
                            : 'border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {REMINDER_LEAD_LABELS[dias]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="hora-aviso"
                    className="block text-sm font-medium text-slate-300"
                  >
                    A qué hora
                  </label>
                  <input
                    id="hora-aviso"
                    type="time"
                    value={ajustes.timeOfDay}
                    disabled={busy}
                    onChange={(event) =>
                      void guardarAjustes({ timeOfDay: event.target.value })
                    }
                    className="rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-slate-100 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-900/50"
                  />
                  <p className="text-sm text-slate-500">
                    Las entregas se guardan por día, sin hora. Este es el momento del aviso.
                  </p>
                </div>

                <ListaRecordatorios plan={plan} />
              </>
            ) : null}
          </Card>
        </>
      )}
    </main>
  );
}

/**
 * Una celda de la rejilla mensual.
 *
 * Muestra el número del día, un punto por materia con clase y los vencimientos. Los días de
 * los meses vecinos se atenúan en lugar de ocultarse: dan continuidad a la semana, que es
 * justo para lo que están.
 */
function CeldaDia({
  dia,
  delMes,
  seleccionado,
  onAbrir,
}: {
  dia: CalendarDay;
  delMes: boolean;
  seleccionado: boolean;
  onAbrir: () => void;
}) {
  const numero = Number(dia.date.slice(8, 10));

  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-label={`${formatCalendarDate(dia.date)}: ${dia.classes.length} clases, ${dia.dues.length} entregas`}
      aria-current={dia.isToday ? 'date' : undefined}
      className={`flex min-h-20 flex-col gap-1 rounded-lg border p-1.5 text-left transition ${
        seleccionado
          ? 'border-sky-600 bg-sky-950/40'
          : dia.isToday
            ? 'border-sky-800 bg-slate-900'
            : 'border-slate-800 hover:border-slate-700'
      } ${delMes ? '' : 'opacity-40'}`}
    >
      <span
        className={`text-sm ${dia.isToday ? 'font-semibold text-sky-300' : 'text-slate-300'}`}
      >
        {numero}
      </span>

      {/* Un punto por clase, con el color de su materia (FR-010). */}
      {dia.classes.length > 0 ? (
        <span className="flex flex-wrap gap-0.5">
          {dia.classes.map((clase) => (
            <span
              key={clase.blockId}
              aria-hidden
              title={clase.subjectName}
              style={{ backgroundColor: clase.color }}
              className="h-1.5 w-1.5 rounded-full"
            />
          ))}
        </span>
      ) : null}

      {/* Los vencimientos se nombran: son lo que decide si el día importa (FR-023). */}
      {dia.dues.map((due) => (
        <span
          key={due.itemId}
          style={{ color: AGENDA_URGENCY_COLORS[due.urgency] }}
          className={`truncate text-[11px] leading-tight ${due.completed ? 'line-through opacity-60' : ''}`}
        >
          {due.title}
        </span>
      ))}
    </button>
  );
}

/** El detalle de un día: sus clases con hora y aula, y lo que vence (FR-024). */
function DetalleDia({ dia }: { dia: CalendarDay }) {
  return (
    <Card title={formatCalendarDate(dia.date)}>
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-400">Clases</h3>
          {dia.classes.length === 0 ? (
            <p className="text-slate-500">No hay clases este día.</p>
          ) : (
            <ul className="space-y-2">
              {dia.classes.map((clase) => (
                <li
                  key={clase.blockId}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-800 p-3"
                >
                  <span
                    aria-hidden
                    style={{ backgroundColor: clase.color }}
                    className="h-3 w-3 shrink-0 rounded-full"
                  />
                  <span className="font-medium text-slate-100">{clase.subjectName}</span>
                  <span className="text-sm text-slate-400">
                    {clase.startTime}–{clase.endTime}
                  </span>
                  {clase.room ? (
                    <span className="text-sm text-slate-500">{clase.room}</span>
                  ) : null}
                  {/* Si se faltó a esa clase, el día lo dice: es parte de lo que pasó. */}
                  {clase.absenceId ? (
                    <span
                      className={`text-sm font-medium ${clase.absenceJustified ? 'text-slate-400' : 'text-red-400'}`}
                    >
                      {clase.absenceJustified ? 'Falta justificada' : 'Faltaste'}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-400">Entregas</h3>
          {dia.dues.length === 0 ? (
            <p className="text-slate-500">No vence nada este día.</p>
          ) : (
            <ul className="space-y-2">
              {dia.dues.map((due) => (
                <li
                  key={due.itemId}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-800 p-3"
                >
                  <span
                    className={`font-medium ${due.completed ? 'text-slate-500 line-through' : 'text-slate-100'}`}
                  >
                    {due.title}
                  </span>
                  <span className="text-sm text-slate-500">
                    {AGENDA_KIND_LABELS[due.kind]}
                  </span>
                  {due.subjectName ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-400">
                      <span
                        aria-hidden
                        style={{ backgroundColor: due.subjectColor ?? '#64748b' }}
                        className="h-2.5 w-2.5 rounded-full"
                      />
                      {due.subjectName}
                    </span>
                  ) : null}
                  {due.completed ? (
                    <span className="text-sm text-emerald-400">Completada</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link
          href="/agenda"
          className="inline-block text-sm font-medium text-sky-400 hover:text-sky-300"
        >
          Ir a mi agenda →
        </Link>
      </div>
    </Card>
  );
}

/**
 * Los recordatorios que la app va a emitir (FR-026).
 *
 * La web no programa notificaciones del sistema: las muestra para que el usuario vea qué va a
 * recibir y cuándo, y para que lo que ya debería haber avisado no pase desapercibido.
 */
function ListaRecordatorios({ plan }: { plan: ReminderPlan | undefined }) {
  if (!plan) return null;

  if (plan.reminders.length === 0) {
    return (
      <p className="text-slate-500">
        No tienes entregas pendientes con fecha, así que no hay nada que recordarte.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-slate-400">
        Próximos avisos ({plan.reminders.length})
      </h3>
      <ul className="space-y-2">
        {plan.reminders.map((recordatorio) => (
          <li
            key={recordatorio.itemId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 p-3"
          >
            {/* El plazo se cuenta desde hoy, no desde el día del aviso: en una lista que se
                lee hoy, "Vence mañana" para algo a nueve días desorientaría. */}
            <span className="text-slate-200">
              {reminderListMessage(
                recordatorio.title,
                recordatorio.subjectName,
                daysBetween(plan.today, recordatorio.dueDate),
              )}
            </span>
            <span
              className={`text-sm ${recordatorio.overdue ? 'text-amber-400' : 'text-slate-500'}`}
            >
              {recordatorio.overdue
                ? 'Ya debería haberte avisado'
                : `${formatCalendarDate(recordatorio.remindOn)} · ${recordatorio.remindAt}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
