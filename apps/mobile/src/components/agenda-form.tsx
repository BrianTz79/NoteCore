import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  AGENDA_KINDS,
  AGENDA_KIND_LABELS,
  addDays,
  createAgendaItemSchema,
  formatCalendarDateShort,
  toFormErrors,
  todayCalendarDate,
  type AgendaItem,
  type AgendaKind,
  type FormErrors,
  type Subject,
} from '@notecore/shared';
import { Button, Field, FormError, colors } from './ui';

/**
 * Alta y edición de una actividad en la app (FR-018, FR-019).
 *
 * Equivalente al formulario de la web: mismos campos y las mismas validaciones de `shared`.
 * Cambia la presentación, que aquí usa controles táctiles en vez de `<select>` y
 * `<input type="date">`.
 *
 * El plan pide una "alta rápida pensada para usarse durante la clase": por eso el título es
 * lo primero y lo único obligatorio, y la fecha se elige con atajos —hoy, mañana, en una
 * semana— en lugar de abrir un calendario. Anotar "entregar el reporte el viernes" sale en
 * dos toques.
 */

/** Atajos de fecha límite, los plazos con los que un profesor deja tarea. */
const DUE_SHORTCUTS = [
  { label: 'Hoy', days: 0 },
  { label: 'Mañana', days: 1 },
  { label: 'En 3 días', days: 3 },
  { label: 'En una semana', days: 7 },
] as const;

export function AgendaForm({
  subjects,
  item,
  onSubmit,
  onCancel,
}: {
  subjects: readonly Subject[];
  /** Actividad a editar. Ausente para el alta. */
  item?: AgendaItem;
  onSubmit: (input: {
    title: string;
    description: string | null;
    kind: AgendaKind;
    subjectId: string | null;
    dueDate: string | null;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [kind, setKind] = useState<AgendaKind>(item?.kind ?? 'tarea');
  const [subjectId, setSubjectId] = useState<string | null>(item?.subjectId ?? null);
  const [dueDate, setDueDate] = useState<string | null>(item?.dueDate ?? null);
  const [errors, setErrors] = useState<FormErrors>({ fields: {} });
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    setErrors({ fields: {} });

    const candidate = {
      title,
      description: description.trim() === '' ? null : description.trim(),
      kind,
      subjectId,
      dueDate,
    };

    const parsed = createAgendaItemSchema.safeParse(candidate);
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
      await onSubmit(candidate);
    } catch (error) {
      setErrors(toFormErrors(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.form}>
      <FormError message={errors.general} />

      <Field
        label="¿Qué hay que hacer?"
        value={title}
        onChangeText={setTitle}
        error={errors.fields.title}
        placeholder="Entregar el reporte de laboratorio"
        autoFocus
      />

      <View style={styles.field}>
        <Text style={styles.label}>Detalles (opcional)</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Portada, marco teórico y conclusiones."
          placeholderTextColor={colors.textoTenue}
          multiline
          numberOfLines={3}
          style={[styles.input, styles.textarea]}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Tipo</Text>
        <View style={styles.chips}>
          {AGENDA_KINDS.map((value) => (
            <Chip
              key={value}
              label={AGENDA_KIND_LABELS[value]}
              selected={kind === value}
              onPress={() => setKind(value)}
            />
          ))}
        </View>
      </View>

      {/* FR-018: la materia es opcional, así que "sin materia" es una opción de verdad. */}
      {subjects.length > 0 ? (
        <View style={styles.field}>
          <Text style={styles.label}>Materia (opcional)</Text>
          <View style={styles.chips}>
            <Chip
              label="Sin materia"
              selected={subjectId === null}
              onPress={() => setSubjectId(null)}
            />
            {subjects.map((subject) => (
              <Chip
                key={subject.id}
                label={subject.name}
                color={subject.color}
                selected={subjectId === subject.id}
                onPress={() => setSubjectId(subject.id)}
              />
            ))}
          </View>
          {errors.fields.subjectId ? (
            <Text style={styles.errorText}>{errors.fields.subjectId}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.field}>
        <Text style={styles.label}>Fecha límite (opcional)</Text>
        <View style={styles.chips}>
          <Chip
            label="Sin fecha"
            selected={dueDate === null}
            onPress={() => setDueDate(null)}
          />
          {DUE_SHORTCUTS.map((shortcut) => {
            const value = addDays(todayCalendarDate(), shortcut.days);
            return (
              <Chip
                key={shortcut.label}
                label={shortcut.label}
                selected={dueDate === value}
                onPress={() => setDueDate(value)}
              />
            );
          })}
        </View>

        {/* Los atajos cubren lo habitual; para el resto se ajusta día a día sin salir de
            la pantalla, que es más rápido que abrir un calendario completo. */}
        {dueDate !== null ? (
          <View style={styles.dateRow}>
            <Pressable
              onPress={() => setDueDate(addDays(dueDate, -1))}
              hitSlop={10}
              style={styles.dateArrow}
            >
              <Text style={styles.dateArrowText}>‹</Text>
            </Pressable>
            <Text style={styles.dateValue}>{formatCalendarDateShort(dueDate)}</Text>
            <Pressable
              onPress={() => setDueDate(addDays(dueDate, 1))}
              hitSlop={10}
              style={styles.dateArrow}
            >
              <Text style={styles.dateArrowText}>›</Text>
            </Pressable>
          </View>
        ) : null}

        {errors.fields.dueDate ? (
          <Text style={styles.errorText}>{errors.fields.dueDate}</Text>
        ) : null}
      </View>

      <Button
        title={item ? 'Guardar cambios' : 'Añadir a mi agenda'}
        onPress={() => void handleSubmit()}
        loading={saving}
      />
      <Button title="Cancelar" variant="secondary" onPress={onCancel} disabled={saving} />
    </View>
  );
}

/** Opción táctil de una sola pulsación, con el color de la materia cuando lo tiene. */
function Chip({
  label,
  selected,
  color,
  onPress,
}: {
  label: string;
  selected: boolean;
  color?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={[styles.chip, selected ? styles.chipSelected : null]}
    >
      {color ? <View style={[styles.chipDot, { backgroundColor: color }]} /> : null}
      <Text style={[styles.chipText, selected ? styles.chipTextSelected : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  field: { gap: 8 },
  label: { color: colors.texto, fontSize: 14, fontWeight: '500' },
  input: {
    backgroundColor: colors.fondo,
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textoFuerte,
    fontSize: 16,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  errorText: { color: colors.error, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    // Alto cómodo para el pulgar sin que la fila de opciones ocupe media pantalla.
    minHeight: 40,
  },
  chipSelected: { backgroundColor: colors.acento, borderColor: colors.acento },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { color: colors.textoSuave, fontSize: 14 },
  chipTextSelected: { color: colors.textoFuerte, fontWeight: '600' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateArrow: {
    backgroundColor: colors.borde,
    borderRadius: 10,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateArrowText: { color: colors.textoFuerte, fontSize: 24, lineHeight: 26 },
  dateValue: { color: colors.textoFuerte, fontSize: 15, fontWeight: '600' },
});
