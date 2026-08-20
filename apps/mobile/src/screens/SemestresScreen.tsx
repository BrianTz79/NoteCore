import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  MAX_SEMESTER_WEEKS,
  MIN_SEMESTER_WEEKS,
  SEMESTER_KINDS,
  SEMESTER_KIND_LABELS,
  SEMESTER_STATUS_COLORS,
  SEMESTER_STATUS_LABELS,
  defaultWeeksForKind,
  semesterArchivedMessage,
  semesterCloseDisclaimer,
  semesterCloseWarnings,
  semesterContentsSummary,
  semesterContentsTotal,
  semesterKindLabel,
  semesterPeriod,
  sortSemesters,
  toFormErrors,
  type Semester,
  type SemesterCloseEffect,
  type SemesterKind,
} from '@notecore/shared';
import { semesterApi } from '../lib/api';
import { useBotonAtras } from '../lib/boton-atras';
import { Button, Card, Field, FormError, RADIUS, SPACE, ScreenHeader, TEXT, base, c, colors, fuente } from '../components/ui';

/**
 * Semestres en la app (FR-034 a FR-038).
 *
 * Misma funcionalidad que la pantalla de la web: el semestre en curso con su cierre, y los
 * archivados en solo lectura. Los avisos del cierre y los textos de estado salen de `shared`,
 * así que ambos clientes explican exactamente lo mismo (Principio VIII).
 */
export function SemestresScreen({ onVolver }: { onVolver: () => void }) {
  const [semesters, setSemesters] = useState<readonly Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  /** El aviso previo al cierre. Mientras es `undefined`, el diálogo está cerrado (FR-038). */
  const [effect, setEffect] = useState<SemesterCloseEffect>();
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState<string>();
  /** Tipo y semanas del periodo que arranca. Se precargan con lo que propone la API. */
  const [newKind, setNewKind] = useState<SemesterKind>('semestre');
  const [newWeeks, setNewWeeks] = useState('16');

  /**
   * Atrás cancela el cierre de semestre antes de salir (Fase 12.2).
   *
   * Cerrar un semestre archiva datos y no se deshace, así que atrás sobre ese aviso debe
   * significar lo mismo que su botón «Cancelar»: retirar la pregunta, nunca responderla.
   */
  useBotonAtras([
    { cuando: effect !== undefined, hacer: () => setEffect(undefined) },
    { cuando: true, hacer: onVolver },
  ]);

  const load = useCallback(async () => {
    try {
      setSemesters(await semesterApi.list());
      setError(undefined);
    } catch (caught) {
      setError(toFormErrors(caught).general);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  /**
   * Pide el efecto a la API y abre el diálogo (FR-038).
   *
   * El aviso lo compone el servidor y no esta pantalla: es donde se sabe de verdad cuánto se
   * va a archivar, y los conteos pueden haber cambiado desde que se cargó la lista.
   */
  async function abrirCierre() {
    setBusy(true);
    setNotice(undefined);
    try {
      const next = await semesterApi.closeEffect();
      setEffect(next);
      setNewName(next.suggestedName);
      setNewKind(next.suggestedKind);
      setNewWeeks(String(next.suggestedWeeks));
      setNameError(undefined);
      setError(undefined);
    } catch (caught) {
      setError(toFormErrors(caught).general);
    } finally {
      setBusy(false);
    }
  }

  async function confirmarCierre() {
    setBusy(true);
    setNameError(undefined);
    try {
      const weeks = Number(newWeeks);
      const result = await semesterApi.close({
        name: newName,
        kind: newKind,
        // Un campo vacío o a medio teclear no viaja: sin `weeks`, el servidor propone las
        // del tipo elegido, que es mejor que rechazar el cierre por un `NaN`.
        ...(Number.isInteger(weeks) ? { weeks } : {}),
        confirmed: true,
      });
      setEffect(undefined);
      await load();
      setNotice(
        `Se archivó «${result.archived.name}» y empezó «${result.started.name}», ` +
          `${semesterKindLabel(result.started.kind).singular} vacío de ` +
          `${result.started.weeks} semanas.`,
      );
      setError(undefined);
    } catch (caught) {
      const errors = toFormErrors(caught);
      setNameError(errors.fields.name);
      if (!errors.fields.name) setError(errors.general);
    } finally {
      setBusy(false);
    }
  }

  const ordered = sortSemesters(semesters);
  const current = ordered.find((semester) => semester.status === 'activo');
  const archived = ordered.filter((semester) => semester.status === 'archivado');

  /**
   * Cambia el tipo o las semanas del periodo en curso (Fase 18).
   *
   * Recarga desde la API en lugar de tocar el estado local: el tipo decide las etiquetas de
   * la pantalla y las semanas mueven el límite de faltas de cada materia, así que lo que se
   * pinta después tiene que ser lo que el servidor guardó (Principio II).
   */
  async function editarActual(patch: { kind?: SemesterKind; weeks?: number }) {
    if (!current) return;
    setBusy(true);
    setNotice(undefined);
    try {
      await semesterApi.update(current.id, patch);
      await load();
      setNotice(
        patch.weeks !== undefined
          ? `Periodo de ${patch.weeks} semanas. El límite sugerido de cada materia se recalculó.`
          : `Ahora es un ${semesterKindLabel(patch.kind).singular}.`,
      );
      setError(undefined);
    } catch (caught) {
      setError(toFormErrors(caught).general);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.contenido}>
      <ScreenHeader
        title="Periodos"
        subtitle={
          'Semestres o cuatrimestres. Al iniciar uno nuevo, el anterior se archiva completo ' +
          'y queda para consulta.'
        }
        onBack={onVolver}
      />

      <FormError message={error} />
      {notice ? <Text style={styles.aviso}>{notice}</Text> : null}

      {loading ? (
        <Text style={styles.cargando}>Cargando…</Text>
      ) : (
        <>
          {current ? (
            <Card title={`${semesterKindLabel(current.kind).titulo} en curso`}>
              <SemesterRow semester={current} />

              {/* ── Tipo del periodo (Fase 18) ──────────────────────────── */}
              <View style={styles.campo}>
                <Text style={styles.label}>Tipo de periodo</Text>
                <View style={styles.chips}>
                  {SEMESTER_KINDS.map((value) => (
                    <Chip
                      key={value}
                      label={SEMESTER_KIND_LABELS[value].titulo}
                      selected={current.kind === value}
                      disabled={busy}
                      onPress={() => void editarActual({ kind: value })}
                    />
                  ))}
                </View>
                <Text style={styles.disclaimer}>
                  Cambiarlo no toca tus semanas ni tus faltas: solo cómo se llama aquí.
                </Text>
              </View>

              <WeeksField
                kind={current.kind}
                weeks={current.weeks}
                busy={busy}
                onSave={(weeks) => void editarActual({ weeks })}
              />

              <Text style={styles.disclaimer}>{semesterCloseDisclaimer(current.kind)}</Text>
              <Button
                title={`Cerrar ${semesterKindLabel(current.kind).singular} e iniciar uno nuevo`}
                onPress={abrirCierre}
                disabled={busy}
              />
            </Card>
          ) : null}

          {effect ? (
            <Card title="Antes de cerrar, lee esto">
              {semesterCloseWarnings(
                effect.semester.name,
                effect.semester.contents,
                newKind,
              ).map((line) => (
                <View key={line} style={styles.avisoFila}>
                  <Text style={styles.avisoPunto}>•</Text>
                  <Text style={styles.avisoTexto}>{line}</Text>
                </View>
              ))}

              <Field
                label={`Nombre del ${semesterKindLabel(newKind).singular} nuevo`}
                value={newName}
                onChangeText={setNewName}
                error={nameError}
                hint="Puedes cambiarlo: es solo una etiqueta para reconocerlo."
                autoCapitalize="none"
              />

              <View style={styles.campo}>
                <Text style={styles.label}>Tipo del periodo nuevo</Text>
                <View style={styles.chips}>
                  {SEMESTER_KINDS.map((value) => (
                    <Chip
                      key={value}
                      label={SEMESTER_KIND_LABELS[value].titulo}
                      selected={newKind === value}
                      disabled={busy}
                      onPress={() => {
                        setNewKind(value);
                        // Al cambiar de régimen, las semanas del anterior dejan de valer:
                        // arrastrar 16 de un semestre a un cuatrimestre daría un límite de
                        // faltas un tercio más alto del que le toca.
                        setNewWeeks(
                          String(
                            value === effect.suggestedKind
                              ? effect.suggestedWeeks
                              : defaultWeeksForKind(value),
                          ),
                        );
                      }}
                    />
                  ))}
                </View>
              </View>

              <Field
                label="Semanas"
                value={newWeeks}
                onChangeText={setNewWeeks}
                keyboardType="number-pad"
                hint={`Sugerido: ${defaultWeeksForKind(newKind)}. Ajústalo a tu calendario.`}
              />

              <Button
                title={`Cerrar «${effect.semester.name}» y empezar`}
                onPress={confirmarCierre}
                loading={busy}
                variant="danger"
              />
              <Button
                title="Cancelar"
                onPress={() => setEffect(undefined)}
                disabled={busy}
                variant="secondary"
              />
            </Card>
          ) : null}

          <Card title={`Archivados (${archived.length})`}>
            {archived.length === 0 ? (
              <Text style={styles.vacio}>
                Todavía no has cerrado ningún periodo. Cuando lo hagas, aparecerá aquí para
                siempre.
              </Text>
            ) : (
              archived.map((semester) => (
                <View key={semester.id} style={styles.archivado}>
                  <SemesterRow semester={semester} />
                  {/* Nombra el tipo con el que se cerró, no el del periodo en curso: un
                      archivado se cursó bajo el régimen que tenía. */}
                  <Text style={styles.soloLectura}>
                    {semesterArchivedMessage(semester.kind)}
                  </Text>
                </View>
              ))
            )}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

/**
 * Una opción de tipo de periodo.
 *
 * Chips y no un desplegable por lo mismo que en el formulario de agenda: son dos opciones,
 * caben en una fila, y un desplegable escondería tras un toque una elección que se lee de un
 * vistazo.
 */
function Chip({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={[styles.chip, selected ? styles.chipSel : null, disabled ? styles.chipOff : null]}
    >
      <Text style={[styles.chipTexto, selected ? styles.chipTextoSel : null]}>{label}</Text>
    </Pressable>
  );
}

/**
 * Las semanas del periodo, confirmadas con un botón (FR-013, Fase 18).
 *
 * Se guardan al pulsar y no al teclear porque cada cambio recalcula el límite sugerido de
 * todas las materias: guardando por pulsación, escribir "12" pasaría antes por "1" y el
 * estudiante vería su límite desplomarse un instante.
 *
 * El límite que sale de aquí sigue siendo **orientativo** (Principio VII): el aviso de
 * confirmarlo con el profesor vive en el panel de faltas, que es donde se lee el número.
 */
function WeeksField({
  kind,
  weeks,
  busy,
  onSave,
}: {
  kind: SemesterKind;
  weeks: number;
  busy: boolean;
  onSave: (weeks: number) => void;
}) {
  const [value, setValue] = useState(String(weeks));

  // Sincroniza con lo que guardó el servidor: al cambiar el tipo, el periodo se recarga y
  // las semanas pueden venir distintas.
  useEffect(() => {
    setValue(String(weeks));
  }, [weeks]);

  const parsed = Number(value);
  const valido =
    Number.isInteger(parsed) && parsed >= MIN_SEMESTER_WEEKS && parsed <= MAX_SEMESTER_WEEKS;

  return (
    <View style={styles.campo}>
      <Field
        label={`Semanas del ${semesterKindLabel(kind).singular}`}
        value={value}
        onChangeText={setValue}
        keyboardType="number-pad"
        hint={`Sugerido para un ${semesterKindLabel(kind).singular}: ${defaultWeeksForKind(kind)}. Ajústalo al calendario de tu plantel.`}
      />
      <Button
        title="Guardar semanas"
        variant="secondary"
        disabled={busy || !valido || parsed === weeks}
        onPress={() => onSave(parsed)}
      />
    </View>
  );
}

/** Una fila de periodo: nombre, estado, tipo, fechas y qué contiene. */
function SemesterRow({ semester }: { semester: Semester }) {
  return (
    <View style={styles.fila}>
      <View style={styles.filaCabecera}>
        <Text style={styles.nombre}>{semester.name}</Text>
        <View
          style={[
            styles.etiqueta,
            // El color del estado viene de `shared` para que la web lo pinte igual.
            { backgroundColor: `${SEMESTER_STATUS_COLORS[semester.status]}22` },
          ]}
        >
          <Text
            style={[styles.etiquetaTexto, { color: SEMESTER_STATUS_COLORS[semester.status] }]}
          >
            {SEMESTER_STATUS_LABELS[semester.status]}
          </Text>
        </View>
      </View>
      <Text style={styles.periodo}>
        {semesterKindLabel(semester.kind).titulo} de {semester.weeks} semanas
      </Text>
      <Text style={styles.periodo}>
        {semesterPeriod(semester.startedAt, semester.closedAt)}
      </Text>
      <Text style={styles.periodo}>
        {semesterContentsTotal(semester.contents) === 0
          ? 'Sin contenido todavía'
          : semesterContentsSummary(semester.contents)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: { ...base.contenido, paddingTop: SPACE.md },
  volver: { color: c.tinta3, fontSize: TEXT.sm, fontFamily: fuente.cuerpo },
  encabezado: { gap: 4 },
  titulo: { ...base.titulo },
  subtitulo: { ...base.cuerpo },
  cargando: { color: colors.textoSuave, fontSize: TEXT.md },
  disclaimer: { color: colors.textoTenue, fontSize: TEXT.sm },
  aviso: {
    color: colors.exito,
    backgroundColor: c.papel3,
    borderColor: c.exito,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 12,
    fontSize: TEXT.md,
  },
  avisoFila: { flexDirection: 'row', gap: 8 },
  avisoPunto: { color: colors.textoTenue, fontSize: TEXT.md },
  avisoTexto: { color: colors.texto, fontSize: TEXT.md, flex: 1 },
  fila: { gap: 4 },
  filaCabecera: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  nombre: { color: colors.textoFuerte, fontSize: TEXT.md, fontWeight: '600' },
  etiqueta: { borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2 },
  etiquetaTexto: { fontSize: TEXT.sm, fontWeight: '600' },
  periodo: { color: colors.textoSuave, fontSize: TEXT.md },
  vacio: { color: colors.textoTenue, fontSize: TEXT.md },
  archivado: {
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 6,
  },
  soloLectura: { color: colors.textoTenue, fontSize: TEXT.sm },
  campo: { gap: 8 },
  label: { color: colors.texto, fontSize: TEXT.md, fontWeight: '500' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
    // Alto cómodo para el pulgar, el mismo que usan los chips del formulario de agenda.
    minHeight: 40,
    justifyContent: 'center',
  },
  chipSel: { backgroundColor: colors.acento, borderColor: colors.acento },
  chipOff: { opacity: 0.5 },
  chipTexto: { color: colors.textoSuave, fontSize: TEXT.md },
  chipTextoSel: { color: colors.textoFuerte, fontWeight: '600' },
});
