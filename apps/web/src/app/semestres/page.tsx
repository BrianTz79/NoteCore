'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
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
import { semesterApi } from '@/lib/api';
import { RequireSession } from '@/components/require-session';
import { Button, Card, Field, FormError } from '@/components/ui';

/**
 * Semestres (FR-034 a FR-038).
 *
 * Dos mitades: el semestre en curso —con el cierre, que es la acción de la pantalla— y la
 * lista de archivados, consultables indefinidamente y en solo lectura.
 *
 * Lo que se archiva y con qué nombre arranca el siguiente lo decide la API; aquí solo se
 * presenta (Principio II).
 */
export default function SemestresPage() {
  return (
    <RequireSession>
      <Semestres />
    </RequireSession>
  );
}

function Semestres() {
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
   * Abre el diálogo de cierre pidiendo antes el efecto a la API (FR-038).
   *
   * El aviso se consulta al servidor en lugar de componerlo aquí con lo que ya está en
   * pantalla: es el único sitio donde se sabe de verdad cuánto se va a archivar, y los
   * conteos pueden haber cambiado desde que se cargó la lista.
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
      // `confirmed` viaja en `true` porque llegar aquí exige haber pasado por el diálogo con
      // el efecto delante: es la confirmación que el servidor también exige (FR-038).
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

  if (loading) {
    return <p className="text-slate-400">Cargando…</p>;
  }

  const ordered = sortSemesters(semesters);
  const current = ordered.find((semester) => semester.status === 'activo');
  const archived = ordered.filter((semester) => semester.status === 'archivado');

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href="/" className="text-sm text-sky-400 hover:text-sky-300">
          ← Inicio
        </Link>
        <h1 className="text-2xl font-semibold text-slate-100">Semestres</h1>
        <p className="text-sm text-slate-400">
          Al iniciar un semestre nuevo, el anterior se archiva completo y queda para consulta.
        </p>
      </header>

      <FormError message={error} />
      {notice ? (
        <p
          role="status"
          className="rounded-lg border border-emerald-900/60 bg-emerald-950/40 px-3.5 py-2.5 text-sm text-emerald-300"
        >
          {notice}
        </p>
      ) : null}

      {current ? (
        <Card title="Semestre en curso">
          <SemesterRow semester={current} />
          <p className="text-sm text-slate-500">{SEMESTER_CLOSE_DISCLAIMER}</p>
          <Button onClick={abrirCierre} disabled={busy}>
            Cerrar semestre e iniciar uno nuevo
          </Button>
        </Card>
      ) : null}

      {effect ? (
        <CloseDialog
          effect={effect}
          name={newName}
          nameError={nameError}
          busy={busy}
          onName={setNewName}
          onCancel={() => setEffect(undefined)}
          onConfirm={confirmarCierre}
        />
      ) : null}

      <Card title={`Archivados (${archived.length})`}>
        {archived.length === 0 ? (
          <p className="text-sm text-slate-500">
            Todavía no has cerrado ningún semestre. Cuando lo hagas, aparecerá aquí para
            siempre.
          </p>
        ) : (
          <ul className="space-y-3">
            {archived.map((semester) => (
              <li key={semester.id} className="rounded-lg border border-slate-800 p-4">
                <SemesterRow semester={semester} />
                <p className="mt-2 text-xs text-slate-500">{SEMESTER_ARCHIVED_MESSAGE}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/** Una fila de semestre: nombre, estado, periodo y qué contiene. */
function SemesterRow({ semester }: { semester: Semester }) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base font-medium text-slate-100">{semester.name}</span>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-medium"
          // El color del estado viene de `shared` para que la app lo pinte igual.
          style={{
            color: SEMESTER_STATUS_COLORS[semester.status],
            backgroundColor: `${SEMESTER_STATUS_COLORS[semester.status]}1a`,
          }}
        >
          {SEMESTER_STATUS_LABELS[semester.status]}
        </span>
      </div>
      <p className="text-sm text-slate-400">
        {semesterPeriod(semester.startedAt, semester.closedAt)}
      </p>
      <p className="text-sm text-slate-400">
        {semesterContentsTotal(semester.contents) === 0
          ? 'Sin contenido todavía'
          : semesterContentsSummary(semester.contents)}
      </p>
    </div>
  );
}

/**
 * Explica el efecto del cierre y solo entonces pide confirmación (FR-038).
 *
 * Los avisos salen de `semesterCloseWarnings`, en `shared`, para que la app advierta
 * exactamente lo mismo: una advertencia que difiera entre clientes es una en la que no se
 * puede confiar.
 */
function CloseDialog({
  effect,
  name,
  nameError,
  busy,
  onName,
  onCancel,
  onConfirm,
}: {
  effect: SemesterCloseEffect;
  name: string;
  nameError: string | undefined;
  busy: boolean;
  onName: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Card title="Antes de cerrar, lee esto">
      <ul className="space-y-2">
        {semesterCloseWarnings(effect.semester.name, effect.semester.contents).map((line) => (
          <li key={line} className="flex gap-2 text-sm text-slate-300">
            <span aria-hidden className="text-slate-600">
              •
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <Field
        label="Nombre del semestre nuevo"
        name="name"
        value={name}
        onChange={(event) => onName(event.target.value)}
        error={nameError}
        hint="Puedes cambiarlo: es solo una etiqueta para reconocerlo."
      />

      <div className="flex flex-wrap gap-3">
        <Button onClick={onConfirm} loading={busy} variant="danger">
          Cerrar «{effect.semester.name}» y empezar
        </Button>
        <Button onClick={onCancel} disabled={busy} variant="secondary">
          Cancelar
        </Button>
      </div>
    </Card>
  );
}
