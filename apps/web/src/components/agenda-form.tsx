'use client';

import { useState } from 'react';
import {
  AGENDA_KINDS,
  AGENDA_KIND_LABELS,
  createAgendaItemSchema,
  toFormErrors,
  type AgendaItem,
  type AgendaKind,
  type FormErrors,
  type Subject,
} from '@notecore/shared';
import { Button, Field, FormError } from '@/components/ui';

/**
 * Alta y edición de una actividad (FR-018, FR-019).
 *
 * El mismo formulario sirve para las dos cosas: FR-019 pide que **todos** los campos sean
 * editables tras la creación, así que el de edición es el de alta con los valores puestos.
 * Duplicarlos habría dejado abierta la posibilidad de que uno se quedara sin un campo.
 *
 * La validación de Zod es la de `shared`, la misma que aplica el servidor; aquí solo
 * adelanta el error para no gastar un viaje a la API (Principio II).
 */
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
  const [subjectId, setSubjectId] = useState(item?.subjectId ?? '');
  const [dueDate, setDueDate] = useState(item?.dueDate ?? '');
  const [errors, setErrors] = useState<FormErrors>({ fields: {} });
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    setErrors({ fields: {} });

    // La cadena vacía del `<select>` y del campo de fecha significa "sin materia" y "sin
    // fecha límite"; se traducen a `null` porque es como lo representa el dominio.
    const input = {
      title,
      description: description.trim() === '' ? null : description,
      kind,
      subjectId: subjectId === '' ? null : subjectId,
      dueDate: dueDate === '' ? null : dueDate,
    };

    const parsed = createAgendaItemSchema.safeParse(input);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[issue.path.join('.')] = issue.message;
      setErrors({ fields });
      setSaving(false);
      return;
    }

    try {
      await onSubmit(input);
    } catch (caught) {
      setErrors(toFormErrors(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <FormError message={errors.general} />

      <Field
        label="¿Qué hay que hacer?"
        name="title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        error={errors.fields.title}
        placeholder="Entregar el reporte de laboratorio"
        autoFocus
      />

      <div className="space-y-1.5">
        <label htmlFor="description" className="block text-sm font-medium text-slate-300">
          Detalles <span className="text-slate-500">(opcional)</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="Portada, marco teórico y conclusiones. Mínimo 5 cuartillas."
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-sky-700 focus:ring-2 focus:ring-sky-900/50"
        />
        {errors.fields.description ? (
          <p className="text-sm text-red-400">{errors.fields.description}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="kind" className="block text-sm font-medium text-slate-300">
            Tipo
          </label>
          <select
            id="kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as AgendaKind)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-slate-100 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-900/50"
          >
            {AGENDA_KINDS.map((value) => (
              <option key={value} value={value}>
                {AGENDA_KIND_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="subjectId" className="block text-sm font-medium text-slate-300">
            Materia <span className="text-slate-500">(opcional)</span>
          </label>
          <select
            id="subjectId"
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-slate-100 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-900/50"
          >
            {/* FR-018: la materia es opcional, así que "ninguna" es una opción de verdad. */}
            <option value="">Sin materia</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          {errors.fields.subjectId ? (
            <p className="text-sm text-red-400">{errors.fields.subjectId}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="dueDate" className="block text-sm font-medium text-slate-300">
            Fecha límite <span className="text-slate-500">(opcional)</span>
          </label>
          <input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-slate-100 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-900/50"
          />
          {errors.fields.dueDate ? (
            <p className="text-sm text-red-400">{errors.fields.dueDate}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={saving}>
          {item ? 'Guardar cambios' : 'Añadir a mi agenda'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
