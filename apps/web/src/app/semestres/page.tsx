'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { semesterApi } from '@/lib/api';
import { RequireSession } from '@/components/require-session';
import { Button, Card, Field, FormError, ScreenHeader } from '@/components/ui';

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
  /** Tipo y semanas del periodo que arranca. Se precargan con lo que propone la API. */
  const [newKind, setNewKind] = useState<SemesterKind>('semestre');
  const [newWeeks, setNewWeeks] = useState(16);

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
      setNewKind(next.suggestedKind);
      setNewWeeks(next.suggestedWeeks);
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
      const result = await semesterApi.close({
        name: newName,
        kind: newKind,
        weeks: newWeeks,
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

  /**
   * Cambia el tipo o las semanas del periodo en curso.
   *
   * Va contra la API y se recarga desde ella en lugar de tocar el estado local: el tipo
   * decide las etiquetas de toda la pantalla y las semanas mueven el límite de faltas de cada
   * materia, así que lo que se pinta después tiene que ser lo que el servidor guardó
   * (Principio II).
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

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-nc-lg py-nc-2xl lg:max-w-6xl lg:px-nc-2xl">
        <p className="text-tinta2">Cargando…</p>
      </main>
    );
  }

  const ordered = sortSemesters(semesters);
  const current = ordered.find((semester) => semester.status === 'activo');
  const archived = ordered.filter((semester) => semester.status === 'archivado');

  return (
    // Antes de esta fase, esta pantalla no tenía ningún contenedor con ancho máximo: el
    // contenido se estiraba a todo el ancho disponible, sin notarse porque nunca había más
    // de 768px disponibles. Con el ancho de escritorio de la Fase 14 sí se nota, así que
    // entra aquí el mismo `<main>` que ya usan `horario`, `faltas`, `agenda` y `calendario`.
    <main className="mx-auto w-full max-w-5xl px-nc-lg py-nc-2xl lg:max-w-6xl lg:px-nc-2xl">
      <div className="space-y-nc-lg">
        <ScreenHeader
          title="Periodos"
          subtitle="Semestres o cuatrimestres. Al iniciar uno nuevo, el anterior se archiva completo y queda para consulta."
          back={{ href: '/', label: 'Inicio' }}
        />

      <FormError message={error} />
      {notice ? (
        <p
          role="status"
          className="rounded-lg border border-exito/40 bg-exito/10 px-nc-sm py-nc-xs text-sm text-exito"
        >
          {notice}
        </p>
      ) : null}

      {current ? (
        <Card title={`${semesterKindLabel(current.kind).titulo} en curso`}>
          <SemesterRow semester={current} />

          {/* ── Tipo y semanas del periodo en curso (Fase 18) ──────────────── */}
          <div className="grid gap-nc-md sm:grid-cols-2">
            <div className="space-y-nc-2xs">
              <label htmlFor="kind" className="block text-sm font-medium text-tinta2">
                Tipo de periodo
              </label>
              <select
                id="kind"
                value={current.kind}
                disabled={busy}
                onChange={(event) =>
                  void editarActual({ kind: event.target.value as SemesterKind })
                }
                className="w-full rounded-lg border border-filete bg-papel2 px-nc-sm py-nc-xs text-tinta outline-none focus:border-acento focus:ring-2 focus:ring-acento-tenue disabled:opacity-50"
              >
                {SEMESTER_KINDS.map((value) => (
                  <option key={value} value={value}>
                    {SEMESTER_KIND_LABELS[value].titulo}
                  </option>
                ))}
              </select>
              <p className="text-sm text-tinta3">
                Cambiarlo no toca tus semanas ni tus faltas: solo cómo se llama aquí.
              </p>
            </div>

            <WeeksField
              kind={current.kind}
              weeks={current.weeks}
              busy={busy}
              onSave={(weeks) => void editarActual({ weeks })}
            />
          </div>

          <p className="text-sm text-tinta3">{semesterCloseDisclaimer(current.kind)}</p>
          <Button onClick={abrirCierre} disabled={busy}>
            Cerrar {semesterKindLabel(current.kind).singular} e iniciar uno nuevo
          </Button>
        </Card>
      ) : null}

      {effect ? (
        <CloseDialog
          effect={effect}
          name={newName}
          nameError={nameError}
          kind={newKind}
          weeks={newWeeks}
          busy={busy}
          onName={setNewName}
          onKind={setNewKind}
          onWeeks={setNewWeeks}
          onCancel={() => setEffect(undefined)}
          onConfirm={confirmarCierre}
        />
      ) : null}

      <Card title={`Archivados (${archived.length})`}>
        {archived.length === 0 ? (
          <p className="text-sm text-tinta3">
            Todavía no has cerrado ningún periodo. Cuando lo hagas, aparecerá aquí para
            siempre.
          </p>
        ) : (
          <ul className="space-y-nc-sm">
            {archived.map((semester) => (
              <li key={semester.id} className="rounded-lg border border-filete p-nc-md">
                <SemesterRow semester={semester} />
                {/* El mensaje nombra el tipo con el que se cerró, no el del periodo en
                    curso: un archivado se cursó bajo el régimen que tenía. */}
                <p className="mt-nc-xs text-xs text-tinta3">
                  {semesterArchivedMessage(semester.kind)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
      </div>
    </main>
  );
}

/** Una fila de semestre: nombre, estado, periodo y qué contiene. */
function SemesterRow({ semester }: { semester: Semester }) {
  return (
    <div className="space-y-nc-2xs">
      <div className="flex flex-wrap items-center gap-nc-xs">
        <span className="text-base font-medium text-tinta">{semester.name}</span>
        <span
          className="rounded-pill px-nc-xs py-nc-3xs text-xs font-medium"
          // El color del estado viene de `shared` para que la app lo pinte igual.
          style={{
            color: SEMESTER_STATUS_COLORS[semester.status],
            backgroundColor: `${SEMESTER_STATUS_COLORS[semester.status]}1a`,
          }}
        >
          {SEMESTER_STATUS_LABELS[semester.status]}
        </span>
      </div>
      <p className="text-sm text-tinta2">
        {semesterKindLabel(semester.kind).titulo} de {semester.weeks} semanas ·{' '}
        {semesterPeriod(semester.startedAt, semester.closedAt)}
      </p>
      <p className="text-sm text-tinta2">
        {semesterContentsTotal(semester.contents) === 0
          ? 'Sin contenido todavía'
          : semesterContentsSummary(semester.contents)}
      </p>
    </div>
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

  // `key` en el padre no basta: al cambiar el tipo, el periodo se recarga y las semanas
  // pueden venir distintas. Sincroniza el campo con lo que guardó el servidor.
  useEffect(() => {
    setValue(String(weeks));
  }, [weeks]);

  const parsed = Number(value);
  const valido =
    Number.isInteger(parsed) && parsed >= MIN_SEMESTER_WEEKS && parsed <= MAX_SEMESTER_WEEKS;

  return (
    <div className="space-y-nc-2xs">
      <Field
        label={`Semanas del ${semesterKindLabel(kind).singular}`}
        name="weeks"
        type="number"
        min={MIN_SEMESTER_WEEKS}
        max={MAX_SEMESTER_WEEKS}
        value={value}
        mono
        disabled={busy}
        onChange={(event) => setValue(event.target.value)}
        hint={`Sugerido para un ${semesterKindLabel(kind).singular}: ${defaultWeeksForKind(kind)}. Ajústalo al calendario de tu plantel.`}
      />
      <Button
        variant="secondary"
        disabled={busy || !valido || parsed === weeks}
        onClick={() => onSave(parsed)}
      >
        Guardar semanas
      </Button>
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
  kind,
  weeks,
  busy,
  onName,
  onKind,
  onWeeks,
  onCancel,
  onConfirm,
}: {
  effect: SemesterCloseEffect;
  name: string;
  nameError: string | undefined;
  kind: SemesterKind;
  weeks: number;
  busy: boolean;
  onName: (value: string) => void;
  onKind: (value: SemesterKind) => void;
  onWeeks: (value: number) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Card title="Antes de cerrar, lee esto">
      <ul className="space-y-nc-xs">
        {semesterCloseWarnings(effect.semester.name, effect.semester.contents, kind).map((line) => (
          <li key={line} className="flex gap-nc-xs text-sm text-tinta2">
            <span aria-hidden className="text-tinta3">
              •
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <Field
        label={`Nombre del ${semesterKindLabel(kind).singular} nuevo`}
        name="name"
        value={name}
        onChange={(event) => onName(event.target.value)}
        error={nameError}
        hint="Puedes cambiarlo: es solo una etiqueta para reconocerlo."
      />

      <div className="grid gap-nc-md sm:grid-cols-2">
        <div className="space-y-nc-2xs">
          <label htmlFor="newKind" className="block text-sm font-medium text-tinta2">
            Tipo del periodo nuevo
          </label>
          <select
            id="newKind"
            value={kind}
            disabled={busy}
            onChange={(event) => {
              const next = event.target.value as SemesterKind;
              onKind(next);
              // Al cambiar de régimen, las semanas del anterior dejan de valer: arrastrar 16
              // de un semestre a un cuatrimestre daría un límite de faltas un tercio más
              // alto del que le toca. Se propone el del tipo nuevo, y sigue siendo editable.
              onWeeks(
                next === effect.suggestedKind
                  ? effect.suggestedWeeks
                  : defaultWeeksForKind(next),
              );
            }}
            className="w-full rounded-lg border border-filete bg-papel2 px-nc-sm py-nc-xs text-tinta outline-none focus:border-acento focus:ring-2 focus:ring-acento-tenue disabled:opacity-50"
          >
            {SEMESTER_KINDS.map((value) => (
              <option key={value} value={value}>
                {SEMESTER_KIND_LABELS[value].titulo}
              </option>
            ))}
          </select>
        </div>

        <Field
          label="Semanas"
          name="newWeeks"
          type="number"
          min={MIN_SEMESTER_WEEKS}
          max={MAX_SEMESTER_WEEKS}
          value={String(weeks)}
          mono
          disabled={busy}
          onChange={(event) => onWeeks(Number(event.target.value))}
          hint={`Sugerido: ${defaultWeeksForKind(kind)}. Ajústalo a tu calendario.`}
        />
      </div>

      <div className="flex flex-wrap gap-nc-sm">
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
