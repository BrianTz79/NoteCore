'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  AGENDA_KIND_LABELS,
  AGENDA_URGENCY_COLORS,
  CLASS_ALERT_LEAD_MINUTES,
  CLASS_ALERT_LEAD_LABELS,
  WEEKDAYS,
  WEEKDAY_LABELS,
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
  type ClassAlertLeadMinutes,
  type ClassAlertPlan,
  type ReminderLeadDays,
} from '@notecore/shared';
import { calendarApi } from '@/lib/api';
import { RequireSession } from '@/components/require-session';
import { Button, Card, FormError, ScreenHeader } from '@/components/ui';

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
  /** Aviso de la siguiente clase (Fase 27), con su propio plan. */
  const [planClases, setPlanClases] = useState<ClassAlertPlan>();
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

  /**
   * Trae el plan de avisos de clase (Fase 27).
   *
   * La web no programa nada —lo hace la app—, así que aquí solo sirve para mostrar el estado y
   * la lista. Va en su propia función por lo mismo que en la app: son dos familias distintas.
   */
  const cargarPlanClases = useCallback(async () => {
    try {
      setPlanClases(await calendarApi.classAlertPlan());
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

  useEffect(() => {
    void cargarPlanClases();
  }, [cargarPlanClases]);

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

  /**
   * Cambia los ajustes del aviso de clase (Fase 27).
   *
   * La web **configura y muestra**; quien emite la notificación es la app, igual que con los
   * recordatorios de entrega y por el mismo motivo: el navegador no puede hacer sonar un aviso
   * con la pestaña cerrada. La paridad se cumple donde importa —los mismos ajustes y los mismos
   * datos en ambos clientes—, y por eso este ajuste también se toca desde aquí.
   */
  async function guardarAjustesClase(input: {
    enabled?: boolean;
    leadMinutes?: ClassAlertLeadMinutes;
  }) {
    setBusy(true);
    try {
      await calendarApi.updateClassAlertSettings(input);
      await cargarPlanClases();
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
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-nc-lg px-nc-lg py-nc-2xl lg:max-w-6xl lg:px-nc-2xl">
      <ScreenHeader
        title="Mi calendario"
        subtitle={"Tus clases y tus entregas, día a día"}
        back={{ href: '/', label: 'Inicio' }}
      />

      <FormError message={error} />

      {loading ? (
        <p className="text-tinta3">Cargando tu calendario…</p>
      ) : (
        <>
          {/* ── Rejilla del mes (FR-023) ─────────────────────────────────── */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-nc-sm">
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setMes(previousMonth(mes))}
              >
                ← Mes anterior
              </Button>

              {/* `formatMonthName` ya devuelve la inicial en mayúscula; `capitalize` la
                  pondría en cada palabra y daría "Agosto De 2026". */}
              <h2 className="text-lg font-medium text-tinta">{formatMonthName(mes)}</h2>

              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setMes(nextMonth(mes))}
              >
                Mes siguiente →
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-nc-2xs text-center text-xs font-medium text-tinta3">
              {CABECERAS.map((dia) => (
                <div key={dia} className="py-nc-2xs">
                  {dia}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-nc-2xs">
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

            <p className="text-sm text-tinta3">
              Toca un día para ver sus clases y sus entregas.
            </p>
          </Card>

          {/* ── Detalle del día (FR-024) ─────────────────────────────────── */}
          {diaAbierto ? <DetalleDia dia={diaAbierto} /> : null}

          {/* ── Recordatorios (FR-025 a FR-027) ──────────────────────────── */}
          <Card title="Recordatorios">
            <p className="text-tinta2">
              Recibe un aviso antes de que venza cada entrega. Las notificaciones llegan a tu
              teléfono desde la app de NoteCore; aquí eliges cuándo.
            </p>

            <label className="flex items-center gap-nc-sm text-tinta">
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
                <div className="space-y-nc-2xs">
                  <span className="block text-sm font-medium text-tinta2">
                    Con cuánta anticipación
                  </span>
                  <div className="flex flex-wrap gap-nc-xs">
                    {REMINDER_LEAD_DAYS.map((dias) => (
                      <button
                        key={dias}
                        type="button"
                        disabled={busy}
                        onClick={() => void guardarAjustes({ leadDays: dias })}
                        aria-pressed={ajustes.leadDays === dias}
                        className={`rounded-lg border px-nc-sm py-nc-xs text-sm transition ${
                          ajustes.leadDays === dias
                            ? 'border-filete2 bg-acento/10 text-foco'
                            : 'border-filete text-tinta2 hover:border-filete2'
                        }`}
                      >
                        {REMINDER_LEAD_LABELS[dias]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-nc-2xs">
                  <label
                    htmlFor="hora-aviso"
                    className="block text-sm font-medium text-tinta2"
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
                    className="rounded-lg border border-filete bg-papel2 px-nc-sm py-nc-xs text-tinta outline-none focus:border-acento focus:ring-2 focus:ring-acento-tenue"
                  />
                  <p className="text-sm text-tinta3">
                    Las entregas se guardan por día, sin hora. Este es el momento del aviso.
                  </p>
                </div>

                <ListaRecordatorios plan={plan} />
              </>
            ) : null}
          </Card>

          {/* ── Aviso de la siguiente clase (Fase 27) ─────────────────────── */}
          <Card title="Aviso de la siguiente clase">
            <p className="text-tinta2">
              Recibe un aviso unos minutos antes de que empiece cada clase, con la materia y el
              aula. Como los recordatorios, la notificación llega a tu teléfono desde la app;
              aquí eliges cuándo.
            </p>

            <label className="flex items-center gap-nc-sm text-tinta">
              <input
                type="checkbox"
                checked={planClases?.settings.enabled ?? false}
                disabled={busy || !planClases}
                onChange={(event) =>
                  void guardarAjustesClase({ enabled: event.target.checked })
                }
                className="h-4 w-4 accent-sky-500"
              />
              Avisarme antes de cada clase
            </label>

            {planClases?.settings.enabled ? (
              <>
                <div className="space-y-nc-2xs">
                  <span className="block text-sm font-medium text-tinta2">
                    Con cuánta antelación
                  </span>
                  <div className="flex flex-wrap gap-nc-xs">
                    {CLASS_ALERT_LEAD_MINUTES.map((minutos) => (
                      <button
                        key={minutos}
                        type="button"
                        disabled={busy}
                        onClick={() => void guardarAjustesClase({ leadMinutes: minutos })}
                        aria-pressed={planClases.settings.leadMinutes === minutos}
                        className={`rounded-lg border px-nc-sm py-nc-xs text-sm transition ${
                          planClases.settings.leadMinutes === minutos
                            ? 'border-filete2 bg-acento/10 text-foco'
                            : 'border-filete text-tinta2 hover:border-filete2'
                        }`}
                      >
                        {CLASS_ALERT_LEAD_LABELS[minutos]}
                      </button>
                    ))}
                  </div>
                </div>

                <ListaAvisosDeClase plan={planClases} />
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
      className={`flex min-h-20 flex-col gap-nc-2xs rounded-lg border p-nc-2xs text-left transition ${
        seleccionado
          ? 'border-acento bg-acento/10'
          : dia.isToday
            ? 'border-acento-tenue bg-papel2'
            : 'border-filete hover:border-filete2'
      } ${delMes ? '' : 'opacity-40'}`}
    >
      <span
        className={`font-mono text-sm tabular-nums ${
          dia.isToday ? 'font-semibold text-foco' : 'text-tinta2'
        }`}
      >
        {numero}
      </span>

      {/* Un punto por clase, con el color de su materia (FR-010). */}
      {dia.classes.length > 0 ? (
        <span className="flex flex-wrap gap-nc-3xs">
          {dia.classes.map((clase) => (
            <span
              key={clase.blockId}
              aria-hidden
              title={clase.subjectName}
              style={{ backgroundColor: clase.color }}
              className="h-1.5 w-1.5 rounded-pill"
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
      <div className="space-y-nc-md">
        <div className="space-y-nc-xs">
          <h3 className="text-sm font-medium text-tinta2">Clases</h3>
          {dia.classes.length === 0 ? (
            <p className="text-tinta3">No hay clases este día.</p>
          ) : (
            <ul className="space-y-nc-xs">
              {dia.classes.map((clase) => (
                <li
                  key={clase.blockId}
                  className="flex flex-wrap items-center gap-x-nc-sm gap-y-nc-2xs rounded-lg border border-filete p-nc-sm"
                >
                  <span
                    aria-hidden
                    style={{ backgroundColor: clase.color }}
                    className="h-3 w-3 shrink-0 rounded-pill"
                  />
                  <span className="font-medium text-tinta">{clase.subjectName}</span>
                  <span className="font-mono text-sm tabular-nums text-tinta2">
                    {clase.startTime}–{clase.endTime}
                  </span>
                  {clase.room ? (
                    <span className="text-sm text-tinta3">{clase.room}</span>
                  ) : null}
                  {/* Si se faltó a esa clase, el día lo dice: es parte de lo que pasó. */}
                  {clase.absenceId ? (
                    <span
                      className={`text-sm font-medium ${clase.absenceJustified ? 'text-tinta2' : 'text-error'}`}
                    >
                      {clase.absenceJustified ? 'Falta justificada' : 'Faltaste'}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-nc-xs">
          <h3 className="text-sm font-medium text-tinta2">Entregas</h3>
          {dia.dues.length === 0 ? (
            <p className="text-tinta3">No vence nada este día.</p>
          ) : (
            <ul className="space-y-nc-xs">
              {dia.dues.map((due) => (
                <li
                  key={due.itemId}
                  className="flex flex-wrap items-center gap-x-nc-sm gap-y-nc-2xs rounded-lg border border-filete p-nc-sm"
                >
                  <span
                    className={`font-medium ${due.completed ? 'text-tinta3 line-through' : 'text-tinta'}`}
                  >
                    {due.title}
                  </span>
                  <span className="text-sm text-tinta3">
                    {AGENDA_KIND_LABELS[due.kind]}
                  </span>
                  {due.subjectName ? (
                    <span className="inline-flex items-center gap-nc-2xs text-sm text-tinta2">
                      <span
                        aria-hidden
                        style={{ backgroundColor: due.subjectColor ?? '#64748b' }}
                        className="h-2.5 w-2.5 rounded-pill"
                      />
                      {due.subjectName}
                    </span>
                  ) : null}
                  {due.completed ? (
                    <span className="text-sm text-exito">Completada</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link
          href="/agenda"
          className="inline-block text-sm font-medium text-acento hover:text-foco"
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
/**
 * Los avisos de clase de la semana, agrupados por día (Fase 27).
 *
 * Se agrupan por día porque así se lee como un horario, que es como el estudiante tiene el
 * suyo en la cabeza. Una lista plana de veinticinco filas ordenadas por hora sería correcta y
 * no diría nada.
 */
function ListaAvisosDeClase({ plan }: { plan: ClassAlertPlan }) {
  if (plan.alerts.length === 0) {
    return (
      <p className="text-tinta3">
        No tienes clases en el horario de este periodo, así que no hay nada que avisar.
      </p>
    );
  }

  // Se recorre `WEEKDAYS` en lugar de las claves de un mapa: así los días salen siempre en el
  // orden de la semana, y un día sin clases simplemente no aparece.
  const porDia = WEEKDAYS.map((dia) => ({
    dia,
    avisos: plan.alerts.filter((aviso) => aviso.weekday === dia),
  })).filter((grupo) => grupo.avisos.length > 0);

  return (
    <div className="space-y-nc-sm">
      <h3 className="text-sm font-medium text-tinta2">
        Avisos cada semana ({plan.alerts.length})
      </h3>

      {porDia.map((grupo) => (
        <div key={grupo.dia} className="space-y-nc-2xs">
          <span className="block text-sm font-medium text-tinta3">
            {WEEKDAY_LABELS[grupo.dia]}
          </span>
          <ul className="space-y-nc-xs">
            {grupo.avisos.map((aviso) => (
              <li
                key={aviso.blockId}
                className="flex flex-wrap items-center justify-between gap-nc-xs rounded-lg border border-filete p-nc-sm"
              >
                <span className="text-tinta">
                  {aviso.subjectName}
                  {aviso.room ? (
                    <span className="text-tinta3"> · {aviso.room}</span>
                  ) : null}
                </span>
                <span className="text-sm text-tinta3">
                  {aviso.crossesMidnight ? (
                    /* Restar la antelación cruzó la medianoche: el aviso caería el día
                       anterior, así que la app no lo programa y aquí se dice por qué. */
                    <span className="text-aviso">
                      Empieza demasiado pronto para avisarte con esa antelación
                    </span>
                  ) : (
                    `Aviso a las ${aviso.alertAt} · empieza a las ${aviso.startTime}`
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ListaRecordatorios({ plan }: { plan: ReminderPlan | undefined }) {
  if (!plan) return null;

  if (plan.reminders.length === 0) {
    return (
      <p className="text-tinta3">
        No tienes entregas pendientes con fecha, así que no hay nada que recordarte.
      </p>
    );
  }

  return (
    <div className="space-y-nc-xs">
      <h3 className="text-sm font-medium text-tinta2">
        Próximos avisos ({plan.reminders.length})
      </h3>
      <ul className="space-y-nc-xs">
        {plan.reminders.map((recordatorio) => (
          <li
            key={recordatorio.itemId}
            className="flex flex-wrap items-center justify-between gap-nc-xs rounded-lg border border-filete p-nc-sm"
          >
            {/* El plazo se cuenta desde hoy, no desde el día del aviso: en una lista que se
                lee hoy, "Vence mañana" para algo a nueve días desorientaría. */}
            <span className="text-tinta">
              {reminderListMessage(
                recordatorio.title,
                recordatorio.subjectName,
                daysBetween(plan.today, recordatorio.dueDate),
              )}
            </span>
            <span
              className={`text-sm ${recordatorio.overdue ? 'text-aviso' : 'text-tinta3'}`}
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
