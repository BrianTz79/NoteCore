'use client';

import { useState } from 'react';
import {
  SUBJECT_COLORS,
  WEEKDAYS,
  WEEKDAY_LABELS,
  createSubjectSchema,
  toFormErrors,
  type FormErrors,
  type ScheduleBlockInput,
  type Subject,
  type Weekday,
} from '@notecore/shared';
import { Button, Field, FormError } from '@/components/ui';

/**
 * Alta y edición de una materia con sus sesiones (FR-005).
 *
 * El mismo formulario sirve para crear y para editar: cambia el contenido inicial y el
 * texto del botón, no la lógica. Valida con el esquema de `shared` para dar feedback
 * inmediato, pero la validación que decide es siempre la del servidor (Principio II).
 */

/** Una fila de sesión mientras se edita. Los campos son texto porque vienen de inputs. */
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
 * atada a esa clave: sin esto, `toFormErrors` guarda el error donde nadie lo pinta y el
 * usuario ve cómo su materia no se crea sin que nada se lo explique.
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
  /** Materia a editar. Si falta, el formulario crea una nueva. */
  subject?: Subject;
  onSubmit: (input: { name: string; color: string; blocks: ScheduleBlockInput[] }) => Promise<void>;
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
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
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
      <FormError message={errors.general} />

      <Field
        label="Nombre de la materia"
        name="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Cálculo Diferencial"
        error={errors.fields.name}
        autoFocus
      />

      <div className="space-y-2">
        <span className="block text-sm font-medium text-slate-300">Color</span>
        <div className="flex flex-wrap gap-2">
          {SUBJECT_COLORS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setColor(option)}
              aria-label={`Color ${option}`}
              aria-pressed={color === option}
              style={{ backgroundColor: option }}
              className={`h-8 w-8 rounded-full transition ${
                color === option
                  ? 'ring-2 ring-slate-100 ring-offset-2 ring-offset-slate-900'
                  : 'opacity-70 hover:opacity-100'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <span className="block text-sm font-medium text-slate-300">Sesiones de la semana</span>

        {blocks.map((block, index) => (
          <div
            key={index}
            className="grid grid-cols-2 gap-2 rounded-lg border border-slate-800 p-3 sm:grid-cols-[1fr_auto_auto_1fr_auto]"
          >
            <label className="sr-only" htmlFor={`weekday-${index}`}>
              Día
            </label>
            <select
              id={`weekday-${index}`}
              value={block.weekday}
              onChange={(event) =>
                updateBlock(index, { weekday: event.target.value as Weekday })
              }
              className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-2 text-sm text-slate-100 outline-none focus:border-sky-700"
            >
              {WEEKDAYS.map((day) => (
                <option key={day} value={day}>
                  {WEEKDAY_LABELS[day]}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor={`start-${index}`}>
              Hora de inicio
            </label>
            <input
              id={`start-${index}`}
              type="time"
              value={block.startTime}
              onChange={(event) => updateBlock(index, { startTime: event.target.value })}
              className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-2 text-sm text-slate-100 outline-none focus:border-sky-700"
            />

            <label className="sr-only" htmlFor={`end-${index}`}>
              Hora de fin
            </label>
            <input
              id={`end-${index}`}
              type="time"
              value={block.endTime}
              onChange={(event) => updateBlock(index, { endTime: event.target.value })}
              className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-2 text-sm text-slate-100 outline-none focus:border-sky-700"
            />

            <label className="sr-only" htmlFor={`room-${index}`}>
              Aula
            </label>
            <input
              id={`room-${index}`}
              value={block.room}
              onChange={(event) => updateBlock(index, { room: event.target.value })}
              placeholder="Aula (opcional)"
              className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-700"
            />

            <button
              type="button"
              onClick={() => setBlocks((current) => current.filter((_, i) => i !== index))}
              // Con una sola sesión no se puede quitar: una materia sin sesiones no
              // aparecería en el horario.
              disabled={blocks.length === 1}
              className="rounded-lg px-2 py-2 text-sm text-slate-400 transition hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Quitar
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setBlocks((current) => [...current, { ...EMPTY_BLOCK }])}
          className="text-sm font-medium text-sky-400 transition hover:text-sky-300"
        >
          + Añadir otra sesión
        </button>
      </div>

      <div className="flex gap-3">
        <Button type="submit" loading={saving}>
          {subject ? 'Guardar cambios' : 'Crear materia'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
