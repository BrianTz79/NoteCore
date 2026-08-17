import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  SEMESTER_ARCHIVED_MESSAGE,
  SEMESTER_CLOSE_DISCLAIMER,
  SEMESTER_STATUS_COLORS,
  SEMESTER_STATUS_LABELS,
  semesterCloseWarnings,
  semesterContentsSummary,
  semesterContentsTotal,
  semesterPeriod,
  sortSemesters,
  toFormErrors,
  type Semester,
  type SemesterCloseEffect,
} from '@notecore/shared';
import { semesterApi } from '../lib/api';
import { Button, Card, Field, FormError, colors } from '../components/ui';

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
      const result = await semesterApi.close({ name: newName, confirmed: true });
      setEffect(undefined);
      await load();
      setNotice(
        `Se archivó «${result.archived.name}» y empezó «${result.started.name}», vacío.`,
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

  return (
    <ScrollView contentContainerStyle={styles.contenido}>
      <Pressable onPress={onVolver} hitSlop={8}>
        <Text style={styles.volver}>← Inicio</Text>
      </Pressable>

      <View style={styles.encabezado}>
        <Text style={styles.titulo}>Semestres</Text>
        <Text style={styles.subtitulo}>
          Al iniciar un semestre nuevo, el anterior se archiva completo y queda para consulta.
        </Text>
      </View>

      <FormError message={error} />
      {notice ? <Text style={styles.aviso}>{notice}</Text> : null}

      {loading ? (
        <Text style={styles.cargando}>Cargando…</Text>
      ) : (
        <>
          {current ? (
            <Card title="Semestre en curso">
              <SemesterRow semester={current} />
              <Text style={styles.disclaimer}>{SEMESTER_CLOSE_DISCLAIMER}</Text>
              <Button
                title="Cerrar semestre e iniciar uno nuevo"
                onPress={abrirCierre}
                disabled={busy}
              />
            </Card>
          ) : null}

          {effect ? (
            <Card title="Antes de cerrar, lee esto">
              {semesterCloseWarnings(effect.semester.name, effect.semester.contents).map(
                (line) => (
                  <View key={line} style={styles.avisoFila}>
                    <Text style={styles.avisoPunto}>•</Text>
                    <Text style={styles.avisoTexto}>{line}</Text>
                  </View>
                ),
              )}

              <Field
                label="Nombre del semestre nuevo"
                value={newName}
                onChangeText={setNewName}
                error={nameError}
                hint="Puedes cambiarlo: es solo una etiqueta para reconocerlo."
                autoCapitalize="none"
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
                Todavía no has cerrado ningún semestre. Cuando lo hagas, aparecerá aquí para
                siempre.
              </Text>
            ) : (
              archived.map((semester) => (
                <View key={semester.id} style={styles.archivado}>
                  <SemesterRow semester={semester} />
                  <Text style={styles.soloLectura}>{SEMESTER_ARCHIVED_MESSAGE}</Text>
                </View>
              ))
            )}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

/** Una fila de semestre: nombre, estado, periodo y qué contiene. */
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
  contenido: { padding: 20, gap: 16, paddingBottom: 48 },
  volver: { color: colors.acentoClaro, fontSize: 15 },
  encabezado: { gap: 4 },
  titulo: { color: colors.textoFuerte, fontSize: 24, fontWeight: '600' },
  subtitulo: { color: colors.textoSuave, fontSize: 14 },
  cargando: { color: colors.textoSuave, fontSize: 15 },
  disclaimer: { color: colors.textoTenue, fontSize: 13 },
  aviso: {
    color: colors.exito,
    backgroundColor: '#022c22',
    borderColor: '#065f46',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
  },
  avisoFila: { flexDirection: 'row', gap: 8 },
  avisoPunto: { color: colors.textoTenue, fontSize: 14 },
  avisoTexto: { color: colors.texto, fontSize: 14, flex: 1 },
  fila: { gap: 4 },
  filaCabecera: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  nombre: { color: colors.textoFuerte, fontSize: 16, fontWeight: '600' },
  etiqueta: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  etiquetaTexto: { fontSize: 12, fontWeight: '600' },
  periodo: { color: colors.textoSuave, fontSize: 14 },
  vacio: { color: colors.textoTenue, fontSize: 14 },
  archivado: {
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  soloLectura: { color: colors.textoTenue, fontSize: 12 },
});
