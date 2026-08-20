import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  SUBJECT_COLORS,
  WEEKDAYS,
  WEEKDAY_SHORT_LABELS,
  createSubjectSchema,
  toFormErrors,
  type FormErrors,
  type ScheduleBlockInput,
  type Subject,
  type Weekday,
} from '@notecore/shared';
import { Button, Field, FormError, RADIUS, TEXT, colors } from './ui';

/**
 * Alta y edición de una materia en la app (FR-005).
 *
 * Equivalente al formulario de la web: mismos campos, mismas validaciones de `shared` y el
 * mismo servidor decidiendo. Cambia solo la presentación, que aquí se hace con controles
 * táctiles en vez de `<select>` e `<input type="time">`.
 */

interface BlockDraft {
  weekday: Weekday;
  startTime: string;
  endTime: string;
  room: string;
}

const EMPTY_BLOCK: BlockDraft = {
  weekday: 'lunes',
  startTime: '07:00',
  endTime: '09:00',
  room: '',
};

/**
 * Sube a mensaje general los errores de sesión que no tienen campo donde mostrarse.
 *
 * El servidor señala los solapes en `blocks.N`, pero ninguna entrada del formulario está
 * atada a esa clave: sin esto, el error se guardaría donde nadie lo pinta y el usuario
 * vería cómo su materia no se crea sin que nada se lo explique.
 */
function withBlockMessage(errors: FormErrors): FormErrors {
  if (errors.general !== undefined) return errors;

  const blockMessage = Object.entries(errors.fields).find(([field]) =>
    field.startsWith('blocks'),
  )?.[1];

  return blockMessage === undefined ? errors : { ...errors, general: blockMessage };
}

function toDrafts(subject?: Subject): BlockDraft[] {
  if (!subject || subject.blocks.length === 0) return [{ ...EMPTY_BLOCK }];
  return subject.blocks.map((block) => ({
    weekday: block.weekday,
    startTime: block.startTime,
    endTime: block.endTime,
    room: block.room ?? '',
  }));
}

export function SubjectForm({
  subject,
  onSubmit,
  onCancel,
}: {
  subject?: Subject;
  onSubmit: (input: {
    name: string;
    color: string;
    blocks: ScheduleBlockInput[];
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(subject?.name ?? '');
  const [color, setColor] = useState<string>(subject?.color ?? SUBJECT_COLORS[0]);
  const [blocks, setBlocks] = useState<BlockDraft[]>(() => toDrafts(subject));
  const [errors, setErrors] = useState<FormErrors>({ fields: {} });
  const [saving, setSaving] = useState(false);

  function updateBlock(index: number, patch: Partial<BlockDraft>) {
    setBlocks((current) =>
      current.map((block, position) => (position === index ? { ...block, ...patch } : block)),
    );
  }

  async function handleSubmit() {
    setSaving(true);
    setErrors({ fields: {} });

    const candidate = {
      name,
      color,
      blocks: blocks.map((block) => ({
        weekday: block.weekday,
        startTime: block.startTime,
        endTime: block.endTime,
        room: block.room.trim() === '' ? null : block.room.trim(),
      })),
    };

    const parsed = createSubjectSchema.safeParse(candidate);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[issue.path.join('.')] = issue.message;
      setErrors({
        general: parsed.error.issues[0]?.message ?? 'Revisa los datos.',
        fields,
      });
      setSaving(false);
      return;
    }

    try {
      await onSubmit({ name: parsed.data.name, color, blocks: parsed.data.blocks });
    } catch (error) {
      setErrors(withBlockMessage(toFormErrors(error)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <FormError message={errors.general} />

      <Field
        label="Nombre de la materia"
        value={name}
        onChangeText={setName}
        placeholder="Cálculo Diferencial"
        error={errors.fields.name}
      />

      <View style={styles.section}>
        <Text style={styles.label}>Color</Text>
        <View style={styles.colorRow}>
          {SUBJECT_COLORS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setColor(option)}
              accessibilityLabel={`Color ${option}`}
              accessibilityState={{ selected: color === option }}
              style={[
                styles.colorDot,
                { backgroundColor: option },
                color === option ? styles.colorDotSelected : null,
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Sesiones de la semana</Text>

        {blocks.map((block, index) => (
          <View key={index} style={styles.blockCard}>
            {/* Los días se eligen tocando: en un teléfono es más rápido que un desplegable. */}
            <View style={styles.dayRow}>
              {WEEKDAYS.map((day) => (
                <Pressable
                  key={day}
                  onPress={() => updateBlock(index, { weekday: day })}
                  style={[
                    styles.dayChip,
                    block.weekday === day ? styles.dayChipActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayChipText,
                      block.weekday === day ? styles.dayChipTextActive : null,
                    ]}
                  >
                    {WEEKDAY_SHORT_LABELS[day]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Field
                  label="Inicio"
                  value={block.startTime}
                  onChangeText={(startTime) => updateBlock(index, { startTime })}
                  placeholder="07:00"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
              <View style={styles.timeField}>
                <Field
                  label="Fin"
                  value={block.endTime}
                  onChangeText={(endTime) => updateBlock(index, { endTime })}
                  placeholder="09:00"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
            </View>

            <Field
              label="Aula (opcional)"
              value={block.room}
              onChangeText={(room) => updateBlock(index, { room })}
              placeholder="91L4"
            />

            {blocks.length > 1 ? (
              <Pressable
                onPress={() => setBlocks((current) => current.filter((_, i) => i !== index))}
                hitSlop={8}
              >
                <Text style={styles.removeText}>Quitar esta sesión</Text>
              </Pressable>
            ) : null}
          </View>
        ))}

        <Pressable
          onPress={() => setBlocks((current) => [...current, { ...EMPTY_BLOCK }])}
          hitSlop={8}
        >
          <Text style={styles.addText}>+ Añadir otra sesión</Text>
        </Pressable>
      </View>

      <Button
        title={subject ? 'Guardar cambios' : 'Crear materia'}
        onPress={() => void handleSubmit()}
        loading={saving}
      />
      <Button title="Cancelar" variant="secondary" onPress={onCancel} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16, paddingBottom: 32 },
  section: { gap: 8 },
  label: { color: colors.texto, fontSize: TEXT.md, fontWeight: '500' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorDot: { width: 32, height: 32, borderRadius: RADIUS.lg, opacity: 0.7 },
  colorDotSelected: {
    opacity: 1,
    borderWidth: 2,
    borderColor: colors.textoFuerte,
  },
  blockCard: {
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 12,
    gap: 12,
  },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
    backgroundColor: colors.fondo,
    borderColor: colors.borde,
    borderWidth: 1,
    minWidth: 44,
    alignItems: 'center',
  },
  dayChipActive: { backgroundColor: colors.acento, borderColor: colors.acento },
  dayChipText: { color: colors.textoSuave, fontSize: TEXT.sm },
  dayChipTextActive: { color: colors.textoFuerte, fontWeight: '600' },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeField: { flex: 1 },
  removeText: { color: colors.error, fontSize: TEXT.sm },
  addText: { color: colors.acentoClaro, fontSize: TEXT.md, fontWeight: '500' },
});
