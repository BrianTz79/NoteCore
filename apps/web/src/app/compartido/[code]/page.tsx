'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  AGENDA_KIND_LABELS,
  SHARE_KIND_LABELS,
  WEEKDAY_LABELS,
  formatCalendarDateShort,
  formatShareCode,
  sharePayloadSummary,
  toFormErrors,
  type ShareAcceptMode,
  type ShareAcceptResult,
  type SharePreview,
} from '@notecore/shared';
import { shareApi } from '@/lib/api';
import { RequireSession } from '@/components/require-session';
import { Button, Card, FormError } from '@/components/ui';

/**
 * Recibir un compartido: vista previa y aceptación (FR-030, FR-031).
 *
 * Es la página a la que lleva el enlace y a la que apunta el QR, así que las tres modalidades
 * terminan aquí —y por eso entregan lo mismo (FR-032)—.
 *
 * Exige sesión como el resto: el receptor necesita una cuenta donde copiar el contenido.
 */
export default function CompartidoPage() {
  return (
    <RequireSession>
      <Compartido />
    </RequireSession>
  );
}

function Compartido() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code;

  const [preview, setPreview] = useState<SharePreview>();
  const [resultado, setResultado] = useState<ShareAcceptResult>();
  const [mode, setMode] = useState<ShareAcceptMode>('añadir');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const cargar = useCallback(async () => {
    try {
      setPreview(await shareApi.preview(code));
      setError(undefined);
    } catch (caught) {
      // El mensaje ya viene resuelto del servidor y distingue revocado, caducado e
      // inexistente (FR-033): mostrarlo tal cual es lo correcto.
      const errores = toFormErrors(caught);
      setError(errores.general ?? errores.fields.code);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function aceptar() {
    setBusy(true);
    try {
      setResultado(await shareApi.accept(code, { mode }));
      setError(undefined);
    } catch (caught) {
      const errores = toFormErrors(caught);
      setError(errores.general ?? errores.fields.code);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-16">
        <p className="text-slate-500">Cargando…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Te compartieron algo</h1>
          <p className="font-mono text-sm tracking-widest text-slate-500">
            {formatShareCode(code.toUpperCase())}
          </p>
        </div>
        <Link href="/compartir" className="shrink-0 text-sm text-sky-400 hover:text-sky-300">
          ← Compartir
        </Link>
      </header>

      {error ? (
        <Card>
          <FormError message={error} />
          <p className="text-slate-400">
            Pídele a quien te lo envió que genere uno nuevo, o revisa que el código esté bien
            escrito.
          </p>
          <Link href="/compartir" className="text-sm text-sky-400 hover:text-sky-300">
            Volver a compartir →
          </Link>
        </Card>
      ) : resultado ? (
        <Resultado resultado={resultado} onIr={(ruta) => router.push(ruta)} />
      ) : preview ? (
        <>
          <Vista preview={preview} />

          {preview.isOwn ? (
            <Card>
              <p className="text-slate-300">
                Este compartido es tuyo, así que ya tienes su contenido. Pásale el código o el
                enlace a quien quieras.
              </p>
              <Link href="/compartir" className="text-sm text-sky-400 hover:text-sky-300">
                Ver mis compartidos →
              </Link>
            </Card>
          ) : (
            <Card title="¿Lo aceptas?">
              <p className="text-slate-300">
                Vas a obtener <strong>tu propia copia</strong>. Podrás editarla libremente, y
                lo que {preview.fromDisplayName} cambie en la suya no la afectará.
              </p>

              {preview.kind === 'horario' ? (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-slate-300">
                    ¿Qué hago con tu horario actual?
                  </legend>
                  {(
                    [
                      ['añadir', 'Añadir', 'Se suma a lo que ya tienes.'],
                      ['reemplazar', 'Reemplazar', 'Borra tu horario actual y deja solo este.'],
                    ] as const
                  ).map(([valor, etiqueta, detalle]) => (
                    <label
                      key={valor}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2.5 hover:border-slate-700"
                    >
                      <input
                        type="radio"
                        name="mode"
                        checked={mode === valor}
                        onChange={() => setMode(valor)}
                        className="mt-0.5 size-4 accent-sky-500"
                      />
                      <span className="space-y-0.5">
                        <span className="block text-slate-200">{etiqueta}</span>
                        <span className="block text-sm text-slate-500">{detalle}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              ) : (
                <p className="text-sm text-slate-500">
                  Las actividades se suman a tu agenda. No se borra nada de lo tuyo.
                </p>
              )}

              <Button onClick={() => void aceptar()} loading={busy}>
                Aceptar y copiar a mi cuenta
              </Button>
            </Card>
          )}
        </>
      ) : null}
    </main>
  );
}

/** La vista previa del contenido, antes de decidir (FR-030). */
function Vista({ preview }: { preview: SharePreview }) {
  return (
    <Card title={preview.title}>
      <p className="text-slate-400">
        De <strong className="text-slate-200">{preview.fromDisplayName}</strong> (@
        {preview.fromUsername}) · {SHARE_KIND_LABELS[preview.kind]} ·{' '}
        {sharePayloadSummary(preview.payload)}
      </p>

      {preview.payload.kind === 'horario' ? (
        <ul className="space-y-2">
          {preview.payload.subjects.map((subject, index) => (
            <li
              key={`${subject.name}-${index}`}
              className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: subject.color }}
                  aria-hidden
                />
                <span className="font-medium text-slate-100">{subject.name}</span>
              </div>
              <ul className="pt-1.5 text-sm text-slate-400">
                {subject.blocks.map((block, blockIndex) => (
                  <li key={blockIndex}>
                    {WEEKDAY_LABELS[block.weekday]} · {block.startTime}–{block.endTime}
                    {block.room ? ` · ${block.room}` : ''}
                  </li>
                ))}
                {subject.blocks.length === 0 ? <li>Sin sesiones</li> : null}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {preview.payload.items.map((item, index) => (
            <li
              key={`${item.title}-${index}`}
              className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3"
            >
              <p className="font-medium text-slate-100">{item.title}</p>
              <p className="text-sm text-slate-400">
                {AGENDA_KIND_LABELS[item.kind]}
                {item.subjectName ? ` · ${item.subjectName}` : ''}
                {item.dueDate ? ` · vence ${formatCalendarDateShort(item.dueDate)}` : ''}
              </p>
              {item.description ? (
                <p className="pt-1 text-sm text-slate-500">{item.description}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Lo que entró de verdad tras aceptar (FR-031). */
function Resultado({
  resultado,
  onIr,
}: {
  resultado: ShareAcceptResult;
  onIr: (ruta: string) => void;
}) {
  return (
    <Card title="Listo, ya es tuyo">
      {resultado.kind === 'horario' ? (
        <>
          <p className="text-slate-300">
            Se copiaron <strong>{resultado.subjectsCreated}</strong>{' '}
            {resultado.subjectsCreated === 1 ? 'materia' : 'materias'} con{' '}
            <strong>{resultado.blocksCreated}</strong>{' '}
            {resultado.blocksCreated === 1 ? 'sesión' : 'sesiones'}.
            {resultado.subjectsRemoved > 0
              ? ` Se reemplazaron ${resultado.subjectsRemoved} materias que tenías.`
              : ''}
          </p>
          <Button onClick={() => onIr('/horario')}>Ver mi horario</Button>
        </>
      ) : (
        <>
          <p className="text-slate-300">
            Se copiaron <strong>{resultado.itemsCreated}</strong>{' '}
            {resultado.itemsCreated === 1 ? 'actividad' : 'actividades'} a tu agenda.
          </p>
          {resultado.itemsWithoutSubject > 0 ? (
            <p className="text-sm text-slate-500">
              {resultado.itemsWithoutSubject}{' '}
              {resultado.itemsWithoutSubject === 1 ? 'quedó' : 'quedaron'} sin materia porque
              no tienes ninguna con ese nombre. Puedes asociarlas desde la agenda.
            </p>
          ) : null}
          <Button onClick={() => onIr('/agenda')}>Ver mi agenda</Button>
        </>
      )}

      <p className="text-sm text-slate-500">
        Es una copia independiente: si quien te la compartió edita la suya, la tuya no cambia.
      </p>
    </Card>
  );
}
