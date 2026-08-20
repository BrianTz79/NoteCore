import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
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
  type ReminderLeadDays,
  type ReminderPlan,
} from '@notecore/shared';
import { calendarApi } from '../lib/api';
import { reprogramarRecordatorios } from '../lib/notifications';
import { useBotonAtras } from '../lib/boton-atras';
import { Button, Card, FormError, RADIUS, SPACE, ScreenHeader, TEXT, base, c, colors } from '../components/ui';

/**
 * Calendario y recordatorios en la app (FR-023 a FR-027).
 *
 * Misma funcionalidad que la pantalla de la web —rejilla mensual, detalle del día y ajustes de
 * recordatorio—, con lo que la web no puede hacer: **programar la notificación** en el sistema
 * operativo para que llegue aunque la app esté cerrada (FR-026).
 *
 * Todo lo que se pinta llega resuelto de la API (Principio II); aquí solo se presenta y se
 * traslada el plan al programador de notificaciones.
 */

/** Cabeceras de las columnas. Coinciden con `WEEKDAYS`, que empieza en lunes. */
const CABECERAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;

export function CalendarioScreen({ onVolver }: { onVolver: () => void }) {
  const [mes, setMes] = useState(() => startOfMonth(todayCalendarDate()));
  const [rango, setRango] = useState<CalendarRange>();
  const [diaAbierto, setDiaAbierto] = useState<CalendarDay>();
  const [plan, setPlan] = useState<ReminderPlan>();
  const [programadas, setProgramadas] = useState<number>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  /**
   * Atrás cierra el detalle del día antes de salir del calendario (Fase 12.2).
   *
   * El detalle se despliega bajo la rejilla en lugar de ocupar otra pantalla —así se puede
   * saltar de día en día sin perder el mes de vista—, pero para el usuario sigue siendo algo
   * que abrió, y atrás es la forma natural de cerrarlo.
   */
  useBotonAtras([
    { cuando: diaAbierto !== undefined, hacer: () => setDiaAbierto(undefined) },
    { cuando: true, hacer: onVolver },
  ]);
  const [avisoPermiso, setAvisoPermiso] = useState(false);

  const cargarMes = useCallback(async (mesActual: string) => {
    try {
      // La rejilla se pinta por semanas completas, así que el rango desborda el mes por ambos
      // extremos: los días vecinos rellenan la primera y la última fila.
      setRango(await calendarApi.range(monthGridStart(mesActual), monthGridEnd(mesActual)));
      setError(undefined);
    } catch (caught) {
      setError(toFormErrors(caught).general);
    }
  }, []);

  /**
   * Trae el plan y lo traslada al sistema de notificaciones (FR-026, FR-027).
   *
   * Se reprograma en cada carga —no solo al cambiar los ajustes— porque la agenda puede
   * haberse editado desde la web: al abrir la app, lo programado se pone al día solo.
   */
  const cargarPlan = useCallback(async () => {
    try {
      const nuevo = await calendarApi.reminderPlan();
      setPlan(nuevo);

      const total = await reprogramarRecordatorios(nuevo);
      setProgramadas(total);

      // Si hay avisos vigentes pero no se programó ninguno, el permiso está denegado: es la
      // única razón posible, y callarlo dejaría al usuario esperando notificaciones que el
      // sistema nunca va a emitir.
      const vigentes = nuevo.reminders.filter((r) => !r.overdue).length;
      setAvisoPermiso(nuevo.settings.enabled && vigentes > 0 && total === 0);
    } catch (caught) {
      setError(toFormErrors(caught).general);
    }
  }, []);

  // La rejilla se recarga al cambiar de mes; el plan de recordatorios no depende del mes, así
  // que va en su propio efecto. Juntos, pasar de mes reprogramaría todas las notificaciones
  // del teléfono sin que nada hubiera cambiado.
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

  /** Cambia los ajustes y reprograma lo que corresponda (FR-025, FR-027). */
  async function guardarAjustes(input: {
    enabled?: boolean;
    leadDays?: ReminderLeadDays;
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
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenHeader
        title="Mi calendario"
        subtitle={"Tus clases y tus entregas, día a día"}
        onBack={onVolver}
      />

      <FormError message={error} />

      {loading ? (
        <Text style={styles.muted}>Cargando tu calendario…</Text>
      ) : (
        <>
          {/* ── Rejilla del mes (FR-023) ─────────────────────────────────── */}
          <Card>
            <View style={styles.navMes}>
              <Pressable onPress={() => setMes(previousMonth(mes))} hitSlop={10} disabled={busy}>
                <Text style={styles.link}>← Anterior</Text>
              </Pressable>
              {/* `formatMonthName` ya devuelve la inicial en mayúscula: `textTransform` la
                  pondría en cada palabra y daría "Agosto De 2026". */}
              <Text style={styles.nombreMes}>{formatMonthName(mes)}</Text>
              <Pressable onPress={() => setMes(nextMonth(mes))} hitSlop={10} disabled={busy}>
                <Text style={styles.link}>Siguiente →</Text>
              </Pressable>
            </View>

            <View style={styles.fila}>
              {CABECERAS.map((dia, i) => (
                <Text key={`${dia}-${i}`} style={styles.cabecera}>
                  {dia}
                </Text>
              ))}
            </View>

            {/* La rejilla se pinta por filas de siete para que las celdas queden alineadas. */}
            {rango
              ? Array.from({ length: Math.ceil(rango.days.length / 7) }, (_, fila) => (
                  <View key={fila} style={styles.fila}>
                    {rango.days.slice(fila * 7, fila * 7 + 7).map((dia) => (
                      <CeldaDia
                        key={dia.date}
                        dia={dia}
                        delMes={isSameMonth(dia.date, mes)}
                        seleccionado={diaAbierto?.date === dia.date}
                        onAbrir={() => void abrirDia(dia.date)}
                      />
                    ))}
                  </View>
                ))
              : null}

            <Text style={styles.muted}>Toca un día para ver sus clases y sus entregas.</Text>
          </Card>

          {/* ── Detalle del día (FR-024) ─────────────────────────────────── */}
          {diaAbierto ? <DetalleDia dia={diaAbierto} /> : null}

          {/* ── Recordatorios (FR-025 a FR-027) ──────────────────────────── */}
          <Card title="Recordatorios">
            <Text style={styles.body}>
              Recibe un aviso en este teléfono antes de que venza cada entrega.
            </Text>

            <View style={styles.filaAjuste}>
              <Text style={styles.body}>Avisarme de mis entregas</Text>
              <Switch
                value={ajustes?.enabled ?? false}
                disabled={busy || !ajustes}
                onValueChange={(enabled) => void guardarAjustes({ enabled })}
                trackColor={{ false: colors.borde, true: colors.acento }}
                thumbColor={colors.textoFuerte}
              />
            </View>

            {ajustes?.enabled ? (
              <>
                <Text style={styles.etiqueta}>Con cuánta anticipación</Text>
                <View style={styles.opciones}>
                  {REMINDER_LEAD_DAYS.map((dias) => (
                    <Pressable
                      key={dias}
                      onPress={() => void guardarAjustes({ leadDays: dias })}
                      disabled={busy}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: ajustes.leadDays === dias }}
                      style={[
                        styles.opcion,
                        ajustes.leadDays === dias ? styles.opcionActiva : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.opcionTexto,
                          ajustes.leadDays === dias ? styles.opcionTextoActivo : null,
                        ]}
                      >
                        {REMINDER_LEAD_LABELS[dias]}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.etiqueta}>A qué hora</Text>
                <Text style={styles.body}>{ajustes.timeOfDay}</Text>
                <Text style={styles.muted}>
                  Las entregas se guardan por día, sin hora. Este es el momento del aviso, y se
                  cambia desde la web.
                </Text>

                {avisoPermiso ? (
                  <Text style={styles.alerta}>
                    Android tiene bloqueadas las notificaciones de NoteCore. Actívalas en los
                    ajustes del teléfono para recibir los avisos.
                  </Text>
                ) : programadas !== undefined ? (
                  <Text style={styles.ok}>
                    {programadas === 0
                      ? 'No hay avisos pendientes que programar.'
                      : `${programadas} ${programadas === 1 ? 'aviso programado' : 'avisos programados'} en este teléfono.`}
                  </Text>
                ) : null}

                <ListaRecordatorios plan={plan} />
              </>
            ) : null}
          </Card>
        </>
      )}

      <Button title="Volver al inicio" variant="secondary" onPress={onVolver} />
    </ScrollView>
  );
}

/**
 * Una celda de la rejilla mensual.
 *
 * Muestra el número, un punto por clase y un punto por vencimiento. En el móvil no cabe el
 * título de la entrega como en la web, así que el color del punto lleva la señal de urgencia y
 * el detalle se abre al tocar.
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
    <Pressable
      onPress={onAbrir}
      accessibilityRole="button"
      accessibilityLabel={`${formatCalendarDate(dia.date)}: ${dia.classes.length} clases, ${dia.dues.length} entregas`}
      style={[
        styles.celda,
        seleccionado ? styles.celdaSeleccionada : dia.isToday ? styles.celdaHoy : null,
        delMes ? null : styles.celdaFuera,
      ]}
    >
      <Text style={[styles.celdaNumero, dia.isToday ? styles.celdaNumeroHoy : null]}>
        {numero}
      </Text>

      <View style={styles.puntos}>
        {/* Un punto por clase, con el color de su materia (FR-010). */}
        {dia.classes.map((clase) => (
          <View key={clase.blockId} style={[styles.punto, { backgroundColor: clase.color }]} />
        ))}
        {/* Un punto por vencimiento, con el color de su urgencia. */}
        {dia.dues.map((due) => (
          <View
            key={due.itemId}
            style={[
              styles.puntoEntrega,
              { backgroundColor: AGENDA_URGENCY_COLORS[due.urgency] },
            ]}
          />
        ))}
      </View>
    </Pressable>
  );
}

/** El detalle de un día: sus clases con hora y aula, y lo que vence (FR-024). */
function DetalleDia({ dia }: { dia: CalendarDay }) {
  return (
    <Card title={formatCalendarDate(dia.date)}>
      <Text style={styles.etiqueta}>Clases</Text>
      {dia.classes.length === 0 ? (
        <Text style={styles.muted}>No hay clases este día.</Text>
      ) : (
        dia.classes.map((clase) => (
          <View key={clase.blockId} style={styles.detalleFila}>
            <View style={[styles.colorDot, { backgroundColor: clase.color }]} />
            <View style={styles.detalleCuerpo}>
              <Text style={styles.detalleTitulo}>{clase.subjectName}</Text>
              <Text style={styles.muted}>
                {clase.startTime}–{clase.endTime}
                {clase.room ? ` · ${clase.room}` : ''}
              </Text>
              {/* Si se faltó a esa clase, el día lo dice: es parte de lo que pasó. */}
              {clase.absenceId ? (
                <Text style={clase.absenceJustified ? styles.muted : styles.falta}>
                  {clase.absenceJustified ? 'Falta justificada' : 'Faltaste'}
                </Text>
              ) : null}
            </View>
          </View>
        ))
      )}

      <Text style={styles.etiqueta}>Entregas</Text>
      {dia.dues.length === 0 ? (
        <Text style={styles.muted}>No vence nada este día.</Text>
      ) : (
        dia.dues.map((due) => (
          <View key={due.itemId} style={styles.detalleFila}>
            <View
              style={[
                styles.colorDot,
                { backgroundColor: due.subjectColor ?? AGENDA_URGENCY_COLORS[due.urgency] },
              ]}
            />
            <View style={styles.detalleCuerpo}>
              <Text style={[styles.detalleTitulo, due.completed ? styles.tachado : null]}>
                {due.title}
              </Text>
              <Text style={styles.muted}>
                {AGENDA_KIND_LABELS[due.kind]}
                {due.subjectName ? ` · ${due.subjectName}` : ''}
                {due.completed ? ' · Completada' : ''}
              </Text>
            </View>
          </View>
        ))
      )}
    </Card>
  );
}

/** Los avisos que este teléfono va a emitir, para que el usuario sepa qué esperar. */
function ListaRecordatorios({ plan }: { plan: ReminderPlan | undefined }) {
  if (!plan) return null;

  if (plan.reminders.length === 0) {
    return (
      <Text style={styles.muted}>
        No tienes entregas pendientes con fecha, así que no hay nada que recordarte.
      </Text>
    );
  }

  return (
    <>
      <Text style={styles.etiqueta}>Próximos avisos ({plan.reminders.length})</Text>
      {plan.reminders.map((recordatorio) => (
        <View key={recordatorio.itemId} style={styles.recordatorio}>
          {/* El plazo se cuenta desde hoy, no desde el día del aviso: en una lista que se lee
              hoy, "Vence mañana" para algo a nueve días desorientaría. */}
          <Text style={styles.body}>
            {reminderListMessage(
              recordatorio.title,
              recordatorio.subjectName,
              daysBetween(plan.today, recordatorio.dueDate),
            )}
          </Text>
          <Text style={recordatorio.overdue ? styles.alertaTexto : styles.muted}>
            {recordatorio.overdue
              ? 'Ya debería haberte avisado'
              : `${formatCalendarDate(recordatorio.remindOn)} · ${recordatorio.remindAt}`}
          </Text>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  content: { ...base.contenido, paddingTop: SPACE.md },
  header: { gap: 4 },
  title: { ...base.titulo },
  subtitle: { ...base.cuerpo },
  body: { color: colors.texto, fontSize: TEXT.md },
  muted: { ...base.tenue },
  link: { color: colors.acentoClaro, fontSize: TEXT.md },
  ok: { color: colors.exito, fontSize: TEXT.sm },
  falta: { color: colors.error, fontSize: TEXT.sm },
  etiqueta: { color: colors.textoSuave, fontSize: TEXT.sm, fontWeight: '600', marginTop: 4 },
  tachado: { color: colors.textoTenue, textDecorationLine: 'line-through' },

  navMes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nombreMes: { color: colors.textoFuerte, fontSize: TEXT.md, fontWeight: '600' },

  fila: { flexDirection: 'row', gap: 2 },
  cabecera: {
    flex: 1,
    textAlign: 'center',
    color: colors.textoTenue,
    fontSize: TEXT.sm,
    fontWeight: '600',
    paddingVertical: 4,
  },
  celda: {
    flex: 1,
    minHeight: 52,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: colors.borde,
    padding: 4,
    gap: 3,
  },
  celdaHoy: { borderColor: colors.acento, backgroundColor: c.acentoTenue },
  celdaSeleccionada: { borderColor: colors.acentoClaro, backgroundColor: c.acentoTenue },
  celdaFuera: { opacity: 0.4 },
  celdaNumero: { color: colors.texto, fontSize: TEXT.sm },
  celdaNumeroHoy: { color: colors.acentoClaro, fontWeight: '700' },
  puntos: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  punto: { width: 5, height: 5, borderRadius: RADIUS.sm },
  puntoEntrega: { width: 5, height: 5, borderRadius: RADIUS.sm },

  filaAjuste: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcion: {
    borderWidth: 1,
    borderColor: colors.borde,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  opcionActiva: { borderColor: colors.acento, backgroundColor: c.acentoTenue },
  opcionTexto: { color: colors.texto, fontSize: TEXT.sm },
  opcionTextoActivo: { color: colors.acentoClaro, fontWeight: '600' },

  detalleFila: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 4 },
  detalleCuerpo: { flex: 1, gap: 2 },
  detalleTitulo: { color: colors.textoFuerte, fontSize: TEXT.md, fontWeight: '600' },
  colorDot: { width: 10, height: 10, borderRadius: RADIUS.md, marginTop: 5 },

  recordatorio: {
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 12,
    gap: 4,
  },
  alerta: {
    color: c.aviso,
    fontSize: TEXT.sm,
    borderColor: c.aviso,
    borderWidth: 1,
    backgroundColor: c.avisoFondo,
    borderRadius: RADIUS.lg,
    padding: 10,
  },
  alertaTexto: { color: c.aviso, fontSize: TEXT.sm },
});
