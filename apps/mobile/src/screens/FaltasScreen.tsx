import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  ABSENCE_LIMIT_DISCLAIMER,
  ABSENCE_STATUS_COLORS,
  ABSENCE_STATUS_LABELS,
  CACHE_KEYS,
  MAX_SEMESTER_WEEKS,
  MIN_SEMESTER_WEEKS,
  absenceStatusMessage,
  addDays,
  cacheAgeMessage,
  formatCalendarDate,
  toFormErrors,
  todayCalendarDate,
  type AttendanceSummary,
  type CalendarDate,
  type DayAttendance,
  type Instant,
  type SubjectAttendance,
} from '@notecore/shared';
import { attendanceApi } from '../lib/api';
import { Button, Card, FormError, RADIUS, SPACE, ScreenHeader, TEXT, base, c, colors, fuente } from '../components/ui';
import { SyncIndicator } from '../components/sync-indicator';
import { loadWithCache, useSyncActions } from '../lib/sync-context';
import { useBotonAtras } from '../lib/boton-atras';

/**
 * Control de faltas en la app (FR-011 a FR-017).
 *
 * Misma funcionalidad que la pantalla de la web: marcar la falta de un día y el panel de
 * conteo por materia. Todos los números llegan calculados de la API (Principio II).
 *
 * La fecha se elige con pasos de un día en lugar de un calendario completo: lo normal es
 * registrar la falta el mismo día o al siguiente, y así se resuelve con un toque en vez de
 * abrir un selector.
 */
export function FaltasScreen({ onVolver }: { onVolver: () => void }) {
  const [summary, setSummary] = useState<AttendanceSummary>();
  const [date, setDate] = useState<CalendarDate>(todayCalendarDate());
  const [day, setDay] = useState<DayAttendance>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  /** De cuándo es el panel que se está viendo, si viene del cache (FR-048). */
  const [cachedAt, setCachedAt] = useState<Instant | null>(null);

  /**
   * Atrás vuelve al inicio (Fase 12.2).
   *
   * Esta pantalla no abre capas: el día que se está marcando se cambia con las flechas, sin
   * salir de la vista. Un solo paso, entonces —y sin el hook, Android cerraría la app—.
   */
  useBotonAtras([{ cuando: true, hacer: onVolver }]);

  const sync = useSyncActions();

  /**
   * El panel de faltas, cayendo a lo guardado si no hay red (FR-048).
   *
   * Es la pantalla que más importa sin conexión: el estudiante la consulta dentro del aula,
   * que es justo donde falla la señal.
   */
  const loadSummary = useCallback(async () => {
    try {
      const result = await loadWithCache(sync, CACHE_KEYS.attendance, () =>
        attendanceApi.summary(),
      );
      setSummary(result.data);
      setCachedAt(result.cachedAt);
      setError(undefined);
    } catch (caught) {
      setError(toFormErrors(caught).general);
    }
  }, [sync]);

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
      await Promise.all([loadSummary(), loadDay(todayCalendarDate())]);
      setLoading(false);
    })();
  }, [loadSummary, loadDay]);

  async function cambiarDia(delta: number) {
    const nueva = addDays(date, delta);
    setDate(nueva);
    setNotice(undefined);
    await loadDay(nueva);
  }

  /**
   * Registra faltas en la fecha elegida (FR-011), encolándolas si no hay red (FR-049).
   *
   * Marcar es **idempotente en el servidor desde la Fase 3** —las faltas que ya estaban se
   * omiten en lugar de duplicarse—, así que el reintento de la cola es seguro sin necesidad
   * de identificador propuesto: la pareja fecha + sesión ya identifica la falta.
   *
   * La entidad de la cola es la fecha y no una falta concreta porque la falta todavía no
   * tiene identificador: lo asigna el servidor al escribirla.
   */
  async function marcar(blockIds: readonly string[], etiqueta: string) {
    if (blockIds.length === 0) return;

    setBusy(true);
    try {
      const payload = { date, blockIds: [...blockIds] };

      const { queued } = await sync.write({
        operation: 'falta_marcar',
        entityId: date,
        payload,
        label: `${etiquetaDeMaterias(blockIds, day)} · ${formatCalendarDate(date)}`,
        send: () => attendanceApi.mark(payload).then(() => undefined),
      });

      if (queued) {
        // Sin red no se puede recalcular el panel —el conteo y el límite los decide el
        // servidor (Principio II)—, así que se avisa de que subirá en lugar de enseñar un
        // número que podría no coincidir.
        setNotice(`${etiqueta} Se subirá cuando vuelva la conexión.`);
      } else {
        await Promise.all([loadSummary(), loadDay(date)]);
        setNotice(etiqueta);
      }
    } catch (caught) {
      setError(toFormErrors(caught).general);
    } finally {
      setBusy(false);
    }
  }

  function quitar(absenceId: string, materia: string) {
    Alert.alert('Quitar falta', `¿Quitar la falta de ${materia}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () => {
          void (async () => {
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
          })();
        },
      },
    ]);
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

  async function cambiarLimite(subject: SubjectAttendance, limit: number | null) {
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
  }

  const pendientes = day?.sessions.filter((s) => !s.alreadyAbsent) ?? [];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenHeader
        title="Mis faltas"
        subtitle={summary?.subjects.length
            ? `${summary.subjects.length} materias · semestre de ${summary.semesterWeeks} semanas`
            : 'Registra tus inasistencias y vigila tu margen'}
        onBack={onVolver}
      />

      {/* Estado de la sincronización (FR-050): solo aparece si hay algo que decir. */}
      <SyncIndicator />

      {/* De cuándo es el panel que se está viendo, cuando viene del cache (FR-048). */}
      {cachedAt ? <Text style={styles.muted}>{cacheAgeMessage(cachedAt)}</Text> : null}

      <FormError message={error} />
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      {loading ? (
        <Text style={styles.muted}>Cargando tus faltas…</Text>
      ) : summary?.subjects.length === 0 ? (
        <Card>
          <Text style={styles.body}>
            Todavía no tienes materias en tu horario. Captúralo primero y aquí podrás llevar
            el control de tus faltas.
          </Text>
        </Card>
      ) : (
        <>
          {/* ── Marcar falta ─────────────────────────────────────────────── */}
          <Card title="Marcar una falta">
            <View style={styles.dayNav}>
              <Pressable
                onPress={() => void cambiarDia(-1)}
                hitSlop={10}
                style={styles.dayArrow}
              >
                <Text style={styles.dayArrowText}>‹</Text>
              </Pressable>

              <View style={styles.dayLabel}>
                <Text style={styles.dayText}>{formatCalendarDate(date)}</Text>
                {date !== todayCalendarDate() ? (
                  <Pressable
                    onPress={() => {
                      const hoy = todayCalendarDate();
                      setDate(hoy);
                      setNotice(undefined);
                      void loadDay(hoy);
                    }}
                    hitSlop={8}
                  >
                    <Text style={styles.link}>Volver a hoy</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.muted}>Hoy</Text>
                )}
              </View>

              <Pressable
                onPress={() => void cambiarDia(1)}
                hitSlop={10}
                style={styles.dayArrow}
              >
                <Text style={styles.dayArrowText}>›</Text>
              </Pressable>
            </View>

            {day && day.sessions.length === 0 ? (
              <Text style={styles.muted}>Ese día no tienes clases.</Text>
            ) : (
              <>
                {day?.sessions.map((session) => (
                  <View key={session.blockId} style={styles.sessionRow}>
                    <View style={styles.sessionInfo}>
                      <View style={styles.sessionName}>
                        <View style={[styles.colorDot, { backgroundColor: session.color }]} />
                        <Text style={styles.body} numberOfLines={1}>
                          {session.subjectName}
                        </Text>
                      </View>
                      <Text style={styles.muted}>
                        <Text style={styles.cifra}>
                          {session.startTime}–{session.endTime}
                        </Text>
                        {session.room ? ` · ${session.room}` : ''}
                        {session.alreadyAbsent
                          ? session.justified
                            ? ' · justificada'
                            : ' · falta registrada'
                          : ''}
                      </Text>
                    </View>

                    {session.alreadyAbsent && session.absenceId ? (
                      <View style={styles.sessionActions}>
                        <Pressable
                          onPress={() =>
                            void justificar(session.absenceId as string, !session.justified)
                          }
                          disabled={busy}
                          hitSlop={8}
                        >
                          <Text style={styles.link}>
                            {session.justified ? 'Sí contar' : 'Justificar'}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            quitar(session.absenceId as string, session.subjectName)
                          }
                          disabled={busy}
                          hitSlop={8}
                        >
                          <Text style={styles.deleteText}>Quitar</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() =>
                          void marcar(
                            [session.blockId],
                            `Falta registrada en ${session.subjectName}.`,
                          )
                        }
                        disabled={busy}
                        hitSlop={8}
                      >
                        <Text style={styles.link}>Marcar falta</Text>
                      </Pressable>
                    )}
                  </View>
                ))}

                {/* El día completo manda todas las sesiones del día: el servidor guarda
                    igual una falta por clase (FR-011). */}
                {pendientes.length > 1 ? (
                  <Button
                    title={`Marcar el día completo (${pendientes.length} clases)`}
                    disabled={busy}
                    onPress={() =>
                      void marcar(
                        pendientes.map((s) => s.blockId),
                        `Se registró el día completo: ${pendientes.length} clases.`,
                      )
                    }
                  />
                ) : null}
              </>
            )}
          </Card>

          {/* ── Panel por materia ────────────────────────────────────────── */}
          <Card title="Tus materias">
            {summary?.subjects.map((subject) => (
              <SubjectRow
                key={subject.subjectId}
                subject={subject}
                busy={busy}
                onLimitChange={(limit) => cambiarLimite(subject, limit)}
              />
            ))}

            {/* Principio VII: la recomendación de confirmar con el profesor va siempre
                visible junto a los límites (FR-014). */}
            <Text style={styles.disclaimer}>{ABSENCE_LIMIT_DISCLAIMER}</Text>
          </Card>

          {/* ── Semanas del semestre ─────────────────────────────────────── */}
          <Card title="Semanas del semestre">
            <Text style={styles.muted}>
              Los totales y los límites sugeridos se calculan multiplicando tus clases
              semanales por este número. Ajústalo al calendario de tu escuela.
            </Text>
            <SemesterWeeks
              value={summary?.semesterWeeks ?? 16}
              busy={busy}
              onChange={(weeks) => {
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
            />
          </Card>
        </>
      )}

      <Button title="Volver al inicio" variant="secondary" onPress={onVolver} />
    </ScrollView>
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
  // Se corta al 100% para que pasarse del límite no desborde la barra.
  const percent =
    subject.limit === 0 ? 100 : Math.min(100, (subject.absences / subject.limit) * 100);

  return (
    <View style={styles.subjectCard}>
      <View style={styles.subjectHeader}>
        <View style={styles.sessionName}>
          <View style={[styles.colorDot, { backgroundColor: subject.color }]} />
          <Text style={styles.body} numberOfLines={1}>
            {subject.subjectName}
          </Text>
        </View>
        <Text style={[styles.badge, { color, backgroundColor: `${color}22` }]}>
          {ABSENCE_STATUS_LABELS[subject.status]}
        </Text>
      </View>

      <Text style={styles.muted}>
        <Text style={styles.cifra}>
          {subject.absences} de {subject.limit}
        </Text>{' '}faltas
        {subject.justifiedAbsences > 0
          ? ` · ${subject.justifiedAbsences} justificada${subject.justifiedAbsences > 1 ? 's' : ''}`
          : ''}
      </Text>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${percent}%`, backgroundColor: color }]} />
      </View>

      <Text style={[styles.statusText, { color }]}>
        {absenceStatusMessage(subject.status, subject.remaining)}
      </Text>

      <Text style={styles.tenue}>
        {subject.sessionsPerWeek} por semana · {subject.totalSessions} en el semestre ·
        sugerido {subject.suggestedLimit}
      </Text>

      {editing ? (
        <View style={styles.limitRow}>
          <TextInput
            value={value}
            onChangeText={setValue}
            keyboardType="number-pad"
            style={styles.limitInput}
            placeholderTextColor={colors.textoTenue}
          />
          <Pressable
            onPress={() => {
              const limit = Number(value);
              if (!Number.isInteger(limit) || limit < 0) return;
              void onLimitChange(limit).then(() => setEditing(false));
            }}
            disabled={busy}
            hitSlop={8}
          >
            <Text style={styles.link}>Guardar</Text>
          </Pressable>
          <Pressable onPress={() => setEditing(false)} hitSlop={8}>
            <Text style={styles.tenue}>Cancelar</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.limitRow}>
          <Pressable
            onPress={() => {
              setValue(String(subject.limit));
              setEditing(true);
            }}
            hitSlop={8}
          >
            <Text style={styles.link}>Cambiar límite</Text>
          </Pressable>
          {/* Solo tiene sentido volver a la sugerencia si el usuario la sobrescribió. */}
          {subject.limitIsCustom ? (
            <Pressable onPress={() => void onLimitChange(null)} disabled={busy} hitSlop={8}>
              <Text style={styles.tenue}>Usar el sugerido</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

/** Ajuste de las semanas del semestre, confirmado con un botón. */
function SemesterWeeks({
  value,
  busy,
  onChange,
}: {
  value: number;
  busy: boolean;
  onChange: (weeks: number) => void;
}) {
  const [text, setText] = useState(String(value));

  // Si el panel se recarga con otro valor, el campo lo sigue.
  useEffect(() => {
    setText(String(value));
  }, [value]);

  const weeks = Number(text);
  const valido =
    Number.isInteger(weeks) && weeks >= MIN_SEMESTER_WEEKS && weeks <= MAX_SEMESTER_WEEKS;

  return (
    <View style={styles.limitRow}>
      <TextInput
        value={text}
        onChangeText={setText}
        keyboardType="number-pad"
        style={styles.limitInput}
        placeholderTextColor={colors.textoTenue}
      />
      <Text style={styles.muted}>semanas</Text>
      {valido && weeks !== value ? (
        <Pressable onPress={() => onChange(weeks)} disabled={busy} hitSlop={8}>
          <Text style={styles.link}>Guardar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Nombre de las materias de una falta encolada, para la lista de pendientes (FR-050).
 *
 * "Cálculo · 17 de agosto" le dice al usuario qué falta le falta por subir; "1 cambio" no.
 * Cuando son varias sesiones del mismo día se resumen, que es el caso del día completo.
 */
function etiquetaDeMaterias(
  blockIds: readonly string[],
  day: DayAttendance | undefined,
): string {
  const nombres = [
    ...new Set(
      blockIds
        .map((id) => day?.sessions.find((session) => session.blockId === id)?.subjectName)
        .filter((name): name is string => Boolean(name)),
    ),
  ];

  if (nombres.length === 0) return 'Falta';
  if (nombres.length === 1) return nombres[0]!;
  return `${nombres.length} materias`;
}

const styles = StyleSheet.create({
  /** Cifra que se compara con otra: mono tabular, igual que en la web. */
  cifra: { fontFamily: fuente.mono, fontVariant: ['tabular-nums'] },
  content: { ...base.contenido, paddingTop: SPACE.md },
  header: { gap: 4 },
  title: { ...base.titulo },
  subtitle: { ...base.cuerpo },
  body: { color: colors.texto, fontSize: TEXT.md, flexShrink: 1 },
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
  dayNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  dayArrow: {
    backgroundColor: colors.borde,
    borderRadius: RADIUS.lg,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayArrowText: { color: colors.textoFuerte, fontSize: TEXT['2xl'], lineHeight: 26 },
  dayLabel: { flex: 1, alignItems: 'center', gap: 2 },
  dayText: { color: colors.textoFuerte, fontSize: TEXT.md, fontWeight: '600', textAlign: 'center' },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopColor: colors.borde,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  sessionInfo: { flex: 1, gap: 4 },
  sessionName: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  sessionActions: { alignItems: 'flex-end', gap: 8 },
  colorDot: { width: 10, height: 10, borderRadius: RADIUS.md },
  subjectCard: {
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 8,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badge: {
    fontSize: TEXT.sm,
    fontWeight: '600',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  barTrack: {
    height: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.borde,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: RADIUS.pill },
  statusText: { fontSize: TEXT.sm },
  limitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  limitInput: {
    backgroundColor: colors.fondo,
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.textoFuerte,
    fontSize: TEXT.md,
    minWidth: 72,
  },
  disclaimer: {
    color: c.aviso,
    fontSize: TEXT.sm,
    borderColor: c.aviso,
    borderWidth: 1,
    backgroundColor: c.avisoFondo,
    borderRadius: RADIUS.lg,
    padding: 10,
  },
});
