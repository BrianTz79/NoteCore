'use client';

import { useState } from 'react';
import {
  IMPORT_PROMPT,
  WEEKDAY_SHORT_LABELS,
  toFormErrors,
  type ImportMode,
  type ImportPreview,
} from '@notecore/shared';
import { scheduleApi } from '@/lib/api';
import { Button, FormError } from '@/components/ui';

/**
 * Importación del horario desde el JSON que genera una IA (FR-006, FR-007, FR-008).
 *
 * Tres pasos: copiar el prompt, pegar la respuesta, y confirmar sobre una vista previa.
 * El paso de vista previa es lo que corrige el flujo de la v1, donde el pegado entraba
 * directo a la base de datos y reimportar duplicaba el horario sin avisar.
 */
export function ImportDialog({
  hasSubjects,
  onImported,
  onCancel,
}: {
  /** Si ya hay horario, hay que elegir entre añadir y reemplazar. */
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
    try {
      await navigator.clipboard.writeText(IMPORT_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso de portapapeles el usuario todavía puede seleccionar el texto a mano.
      setError('No se pudo copiar. Selecciona el texto y cópialo manualmente.');
    }
  }

  async function analyze() {
    setBusy(true);
    setError(undefined);
    try {
      setPreview(await scheduleApi.previewImport({ raw }));
    } catch (caught) {
      setPreview(null);
      setError(toFormErrors(caught).general ?? toFormErrors(caught).fields.raw);
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
    <div className="space-y-5">
      <FormError message={error} />

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-slate-300">1. Copia este texto</h3>
        <p className="text-sm text-slate-400">
          Pégalo en tu IA favorita junto con una foto de tu horario.
        </p>
        <div className="relative">
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400">
            {IMPORT_PROMPT}
          </pre>
          <button
            type="button"
            onClick={() => void copyPrompt()}
            className="absolute right-2 top-2 rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-200 transition hover:bg-slate-700"
          >
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-slate-300">2. Pega aquí la respuesta</h3>
        <textarea
          value={raw}
          onChange={(event) => {
            setRaw(event.target.value);
            // Al cambiar el texto, la vista previa anterior deja de corresponderse.
            setPreview(null);
          }}
          rows={6}
          placeholder="Pega aquí el JSON que te dio la IA…"
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2.5 font-mono text-xs text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-sky-700 focus:ring-2 focus:ring-sky-900/50"
        />
        <Button
          type="button"
          onClick={() => void analyze()}
          loading={busy && preview === null}
          disabled={raw.trim() === ''}
        >
          Revisar antes de importar
        </Button>
      </section>

      {preview ? (
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-slate-300">3. Revisa y confirma</h3>

          <p className="text-sm text-slate-400">
            Se detectaron <strong className="text-slate-200">{preview.subjects.length}</strong>{' '}
            materias con{' '}
            <strong className="text-slate-200">{preview.totalBlocks}</strong> sesiones.
          </p>

          <ul className="space-y-2">
            {preview.subjects.map((subject) => (
              <li
                key={subject.name}
                className="rounded-lg border border-slate-800 bg-slate-900/60 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-slate-100">{subject.name}</p>
                  {subject.conflictsWithExisting ? (
                    <span className="shrink-0 rounded bg-amber-950/60 px-2 py-0.5 text-xs text-amber-300">
                      Ya la tienes
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {subject.blocks
                    .map(
                      (block) =>
                        `${WEEKDAY_SHORT_LABELS[block.weekday]} ${block.startTime}–${block.endTime}` +
                        (block.room ? ` (${block.room})` : ''),
                    )
                    .join(' · ')}
                </p>
              </li>
            ))}
          </ul>

          {preview.rejected.length > 0 ? (
            <details className="rounded-lg border border-amber-900/60 bg-amber-950/20 p-3">
              <summary className="cursor-pointer text-sm text-amber-300">
                Se descartaron {preview.rejected.length} elementos
              </summary>
              <ul className="mt-2 space-y-1">
                {preview.rejected.map((item, index) => (
                  <li key={index} className="text-xs text-amber-200/80">
                    <span className="font-medium">{item.location}</span>: {item.reason}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {hasSubjects ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-400">
                Ya tienes materias en tu horario. ¿Qué quieres hacer?
              </p>
              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={() => void confirm('añadir')} loading={busy}>
                  Añadir a lo que tengo
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => void confirm('reemplazar')}
                  loading={busy}
                >
                  Reemplazar todo
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" onClick={() => void confirm('añadir')} loading={busy}>
              Importar horario
            </Button>
          )}
        </section>
      ) : null}

      <Button type="button" variant="secondary" onClick={onCancel}>
        Cancelar
      </Button>
    </div>
  );
}
