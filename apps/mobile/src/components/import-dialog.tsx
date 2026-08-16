import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  IMPORT_PROMPT,
  WEEKDAY_SHORT_LABELS,
  toFormErrors,
  type ImportMode,
  type ImportPreview,
} from '@notecore/shared';
import { scheduleApi } from '../lib/api';
import { Button, FormError, colors } from './ui';

/**
 * Importación del horario desde el JSON de una IA, en la app (FR-006, FR-007, FR-008).
 *
 * Mismos tres pasos que en la web —copiar el prompt, pegar la respuesta, confirmar sobre
 * la vista previa— porque el Principio I exige que la función exista igual en ambas.
 *
 * En el teléfono el flujo es incluso más natural que en el PC: el prompt se copia al
 * portapapeles con un toque, y la respuesta de la IA se pega desde la misma app.
 */
export function ImportDialog({
  hasSubjects,
  onImported,
  onCancel,
}: {
  hasSubjects: boolean;
  onImported: (message: string) => void;
  onCancel: () => void;
}) {
  const [raw, setRaw] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    await Clipboard.setStringAsync(IMPORT_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /** Pega desde el portapapeles: evita el gesto de mantener pulsado sobre el campo. */
  async function pasteFromClipboard() {
    const text = await Clipboard.getStringAsync();
    if (text) {
      setRaw(text);
      setPreview(null);
    }
  }

  async function analyze() {
    setBusy(true);
    setError(undefined);
    try {
      setPreview(await scheduleApi.previewImport({ raw }));
    } catch (caught) {
      setPreview(null);
      const formErrors = toFormErrors(caught);
      setError(formErrors.general ?? formErrors.fields.raw);
    } finally {
      setBusy(false);
    }
  }

  async function confirm(mode: ImportMode) {
    setBusy(true);
    setError(undefined);
    try {
      const result = await scheduleApi.confirmImport({ raw, mode });
      onImported(
        `Se importaron ${result.subjectsCreated} materias con ${result.blocksCreated} sesiones.` +
          (result.subjectsRemoved > 0
            ? ` Se reemplazaron ${result.subjectsRemoved} materias anteriores.`
            : ''),
      );
    } catch (caught) {
      setError(toFormErrors(caught).general ?? 'No se pudo importar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <FormError message={error} />

      <View style={styles.section}>
        <Text style={styles.stepTitle}>1. Copia este texto</Text>
        <Text style={styles.help}>
          Pégalo en tu IA favorita junto con una foto de tu horario.
        </Text>
        <ScrollView style={styles.promptBox} nestedScrollEnabled>
          <Text style={styles.promptText}>{IMPORT_PROMPT}</Text>
        </ScrollView>
        <Button
          title={copied ? 'Copiado' : 'Copiar el texto'}
          variant="secondary"
          onPress={() => void copyPrompt()}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.stepTitle}>2. Pega aquí la respuesta</Text>
        <TextInput
          value={raw}
          onChangeText={(text) => {
            setRaw(text);
            // Cambiar el texto invalida la vista previa anterior.
            setPreview(null);
          }}
          multiline
          numberOfLines={6}
          placeholder="Pega aquí el JSON que te dio la IA…"
          placeholderTextColor={colors.textoTenue}
          style={styles.textarea}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable onPress={() => void pasteFromClipboard()} hitSlop={8}>
          <Text style={styles.pasteText}>Pegar desde el portapapeles</Text>
        </Pressable>
        <Button
          title="Revisar antes de importar"
          onPress={() => void analyze()}
          loading={busy && preview === null}
          disabled={raw.trim() === ''}
        />
      </View>

      {preview ? (
        <View style={styles.section}>
          <Text style={styles.stepTitle}>3. Revisa y confirma</Text>
          <Text style={styles.help}>
            Se detectaron {preview.subjects.length} materias con {preview.totalBlocks}{' '}
            sesiones.
          </Text>

          {preview.subjects.map((subject) => (
            <View key={subject.name} style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewName}>{subject.name}</Text>
                {subject.conflictsWithExisting ? (
                  <Text style={styles.badge}>Ya la tienes</Text>
                ) : null}
              </View>
              <Text style={styles.previewBlocks}>
                {subject.blocks
                  .map(
                    (block) =>
                      `${WEEKDAY_SHORT_LABELS[block.weekday]} ${block.startTime}–${block.endTime}` +
                      (block.room ? ` (${block.room})` : ''),
                  )
                  .join(' · ')}
              </Text>
            </View>
          ))}

          {preview.rejected.length > 0 ? (
            <View style={styles.rejectedBox}>
              <Text style={styles.rejectedTitle}>
                Se descartaron {preview.rejected.length} elementos
              </Text>
              {preview.rejected.map((item, index) => (
                <Text key={index} style={styles.rejectedItem}>
                  · {item.location}: {item.reason}
                </Text>
              ))}
            </View>
          ) : null}

          {hasSubjects ? (
            <View style={styles.section}>
              <Text style={styles.help}>
                Ya tienes materias en tu horario. ¿Qué quieres hacer?
              </Text>
              <Button
                title="Añadir a lo que tengo"
                onPress={() => void confirm('añadir')}
                loading={busy}
              />
              <Button
                title="Reemplazar todo"
                variant="danger"
                onPress={() => void confirm('reemplazar')}
                loading={busy}
              />
            </View>
          ) : (
            <Button
              title="Importar horario"
              onPress={() => void confirm('añadir')}
              loading={busy}
            />
          )}
        </View>
      ) : null}

      <Button title="Cancelar" variant="secondary" onPress={onCancel} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20, paddingBottom: 32 },
  section: { gap: 10 },
  stepTitle: { color: colors.textoFuerte, fontSize: 15, fontWeight: '600' },
  help: { color: colors.textoSuave, fontSize: 14 },
  promptBox: {
    maxHeight: 140,
    backgroundColor: colors.fondo,
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  promptText: { color: colors.textoSuave, fontSize: 11, fontFamily: 'monospace' },
  textarea: {
    backgroundColor: colors.fondo,
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    color: colors.textoFuerte,
    fontSize: 12,
    fontFamily: 'monospace',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  pasteText: { color: colors.acentoClaro, fontSize: 13 },
  previewCard: {
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  previewName: { color: colors.textoFuerte, fontSize: 14, fontWeight: '600', flex: 1 },
  badge: {
    color: '#fcd34d',
    backgroundColor: '#451a03',
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  previewBlocks: { color: colors.textoSuave, fontSize: 12 },
  rejectedBox: {
    borderColor: '#78350f',
    borderWidth: 1,
    backgroundColor: '#451a0333',
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  rejectedTitle: { color: '#fcd34d', fontSize: 13, fontWeight: '600' },
  rejectedItem: { color: '#fde68a', fontSize: 11 },
});
