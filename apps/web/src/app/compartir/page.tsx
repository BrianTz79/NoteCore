'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  SHARE_KIND_LABELS,
  SHARE_STATUS_COLORS,
  SHARE_STATUS_LABELS,
  formatShareCode,
  normalizeShareCode,
  sortShares,
  toFormErrors,
  type AgendaItem,
  type Share,
  type ShareKind,
  type Subject,
} from '@notecore/shared';
import { agendaApi, scheduleApi, shareApi } from '@/lib/api';
import { RequireSession } from '@/components/require-session';
import { QrCode } from '@/components/qr-code';
import { Button, Card, Field, FormError, ScreenHeader } from '@/components/ui';

/**
 * Compartir horario y actividades (FR-028 a FR-033).
 *
 * Tres cosas en una pantalla: generar un compartido eligiendo el contenido (FR-029), ver los
 * ya generados con su estado y revocarlos (FR-033), y abrir uno recibido tecleando su código.
 *
 * Toda la regla vive en la API —qué se congela, cuándo caduca, qué se copia—: aquí solo se
 * presenta y se confirma (Principio II).
 */
export default function CompartirPage() {
  return (
    <RequireSession>
      <Compartir />
    </RequireSession>
  );
}

type Panel =
  | { kind: 'ninguno' }
  | { kind: 'nuevo'; shareKind: ShareKind }
  | { kind: 'generado'; share: Share };

function Compartir() {
  const [shares, setShares] = useState<readonly Share[]>([]);
  const [subjects, setSubjects] = useState<readonly Subject[]>([]);
  const [items, setItems] = useState<readonly AgendaItem[]>([]);
  const [panel, setPanel] = useState<Panel>({ kind: 'ninguno' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const load = useCallback(async () => {
    try {
      setShares(await shareApi.list());
      setError(undefined);
    } catch (caught) {
      setError(toFormErrors(caught).general);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await Promise.all([
        load(),
        (async () => {
          try {
            setSubjects(await scheduleApi.subjects());
          } catch {
            // Sin horario no se puede compartir horario, pero la pantalla sigue sirviendo
            // para la agenda y para recibir.
          }
        })(),
        (async () => {
          try {
            const agenda = await agendaApi.list();
            setItems(agenda.pending);
          } catch {
            // Igual que arriba.
          }
        })(),
      ]);
      setLoading(false);
    })();
  }, [load]);

  async function revocar(share: Share) {
    if (
      !window.confirm(
        `¿Revocar "${share.title}"? Quien tenga el código o el enlace dejará de poder aceptarlo.`,
      )
    ) {
      return;
    }

    setBusy(true);
    try {
      await shareApi.revoke(share.id);
      await load();
      setNotice(`"${share.title}" quedó revocado.`);
    } catch (caught) {
      setError(toFormErrors(caught).general);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-nc-lg py-nc-3xl lg:max-w-5xl lg:px-nc-2xl">
        <p className="text-tinta3">Cargando…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-nc-xl px-nc-lg py-nc-3xl lg:max-w-5xl lg:px-nc-2xl">
      <ScreenHeader
        title="Compartir"
        subtitle="Pasa tu horario o tus actividades a un compañero. Recibe una copia suya, que puede editar sin afectar a la tuya."
        back={{ href: '/', label: 'Inicio' }}
      />

      <FormError message={error} />
      {notice ? (
        <p className="rounded-lg border border-exito/40 bg-exito/10 px-nc-sm py-nc-xs text-sm text-exito">
          {notice}
        </p>
      ) : null}

      <RecibirCard onAceptado={(mensaje) => { setNotice(mensaje); void load(); }} />

      {panel.kind === 'generado' ? (
        <ShareGenerado share={panel.share} onCerrar={() => setPanel({ kind: 'ninguno' })} />
      ) : panel.kind === 'nuevo' ? (
        <NuevoShareForm
          shareKind={panel.shareKind}
          subjects={subjects}
          items={items}
          onCancelar={() => setPanel({ kind: 'ninguno' })}
          onCreado={(share) => {
            setPanel({ kind: 'generado', share });
            void load();
          }}
        />
      ) : (
        <Card title="Compartir algo tuyo">
          <p className="text-tinta2">
            Elige qué quieres compartir. Al generarlo se guarda una copia de lo que elijas, así
            que lo que edites después no cambia lo que reciba tu compañero.
          </p>
          <div className="flex flex-wrap gap-nc-sm">
            <Button
              onClick={() => setPanel({ kind: 'nuevo', shareKind: 'horario' })}
              disabled={subjects.length === 0}
            >
              Compartir horario
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPanel({ kind: 'nuevo', shareKind: 'agenda' })}
              disabled={items.length === 0}
            >
              Compartir actividades
            </Button>
          </div>
          {subjects.length === 0 ? (
            <p className="text-sm text-tinta3">
              Todavía no tienes materias.{' '}
              <Link href="/horario" className="text-acento hover:text-foco">
                Captura tu horario
              </Link>{' '}
              para poder compartirlo.
            </p>
          ) : null}
        </Card>
      )}

      <ListaShares shares={shares} busy={busy} onRevocar={revocar} />
    </main>
  );
}

/* ─────────────────────────── Recibir ─────────────────────────── */

/**
 * Abrir un compartido por su código (FR-028).
 *
 * El código se normaliza en el cliente antes de enviarlo —quita el guion, sube a mayúsculas,
 * corrige la I por 1— con la misma función que usa el servidor, así que lo que se teclea al
 * dictado funciona sin que el usuario tenga que fijarse en el formato.
 */
function RecibirCard({ onAceptado }: { onAceptado: (mensaje: string) => void }) {
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string>();

  const normalizado = normalizeShareCode(codigo);

  return (
    <Card title="¿Te compartieron algo?">
      <p className="text-tinta2">
        Escribe el código que te pasaron, o abre directamente el enlace que te enviaron.
      </p>
      <form
        className="flex flex-wrap items-end gap-nc-sm"
        onSubmit={(event) => {
          event.preventDefault();
          if (!normalizado) {
            setError('Ese código no tiene la forma correcta. Son 8 caracteres.');
            return;
          }
          onAceptado('');
          window.location.href = `/compartido/${normalizado}`;
        }}
      >
        <div className="min-w-[14rem] flex-1">
          <Field
            label="Código"
            name="codigo"
            value={codigo}
            onChange={(event) => {
              setCodigo(event.target.value);
              setError(undefined);
            }}
            placeholder="ABCD-2345"
            autoComplete="off"
            error={error}
            hint={normalizado ? `Se abrirá ${formatShareCode(normalizado)}` : undefined}
          />
        </div>
        <Button type="submit" disabled={!normalizado}>
          Ver qué es
        </Button>
      </form>
    </Card>
  );
}

/* ─────────────────────────── Generar ─────────────────────────── */

/** Selección del contenido a compartir (FR-029). */
function NuevoShareForm({
  shareKind,
  subjects,
  items,
  onCancelar,
  onCreado,
}: {
  shareKind: ShareKind;
  subjects: readonly Subject[];
  items: readonly AgendaItem[];
  onCancelar: () => void;
  onCreado: (share: Share) => void;
}) {
  const [title, setTitle] = useState(
    shareKind === 'horario' ? 'Mi horario' : 'Mis actividades',
  );
  // Arranca con todo marcado: el caso habitual es compartir el horario entero, y desmarcar lo
  // que sobra es menos trabajo que marcar seis materias una por una.
  const [seleccion, setSeleccion] = useState<readonly string[]>(() =>
    shareKind === 'horario' ? subjects.map((s) => s.id) : items.map((i) => i.id),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [fieldError, setFieldError] = useState<string>();

  function alternar(id: string) {
    setSeleccion((actual) =>
      actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id],
    );
  }

  async function enviar(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setFieldError(undefined);

    try {
      const share = await shareApi.create({
        kind: shareKind,
        title,
        ...(shareKind === 'horario'
          ? { subjectIds: [...seleccion] }
          : { itemIds: [...seleccion] }),
      });
      onCreado(share);
    } catch (caught) {
      const errores = toFormErrors(caught);
      setError(errores.general);
      setFieldError(errores.fields.subjectIds ?? errores.fields.itemIds);
    } finally {
      setBusy(false);
    }
  }

  const opciones =
    shareKind === 'horario'
      ? subjects.map((s) => ({
          id: s.id,
          etiqueta: s.name,
          detalle: `${s.blocks.length} ${s.blocks.length === 1 ? 'sesión' : 'sesiones'}`,
          color: s.color,
        }))
      : items.map((i) => ({
          id: i.id,
          etiqueta: i.title,
          detalle: i.subjectName ?? 'Sin materia',
          color: i.subjectColor ?? '#64748b',
        }));

  return (
    <Card title={`Compartir ${SHARE_KIND_LABELS[shareKind].toLowerCase()}`}>
      <form onSubmit={enviar} className="space-y-nc-md">
        <FormError message={error} />

        <Field
          label="Título"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          hint="Para reconocerlo en tu lista de compartidos"
        />

        <fieldset className="space-y-nc-xs">
          <legend className="text-sm font-medium text-tinta2">
            Qué incluir ({seleccion.length} de {opciones.length})
          </legend>

          <div className="flex gap-nc-xs pb-nc-2xs">
            <button
              type="button"
              onClick={() => setSeleccion(opciones.map((o) => o.id))}
              className="text-xs text-acento hover:text-foco"
            >
              Todo
            </button>
            <button
              type="button"
              onClick={() => setSeleccion([])}
              className="text-xs text-tinta3 hover:text-tinta2"
            >
              Nada
            </button>
          </div>

          <ul className="space-y-nc-2xs">
            {opciones.map((opcion) => (
              <li key={opcion.id}>
                <label className="flex cursor-pointer items-center gap-nc-sm rounded-lg border border-filete bg-papel2 px-nc-sm py-nc-xs hover:border-filete2">
                  <input
                    type="checkbox"
                    checked={seleccion.includes(opcion.id)}
                    onChange={() => alternar(opcion.id)}
                    className="size-4 accent-sky-500"
                  />
                  <span
                    className="size-3 shrink-0 rounded-pill"
                    style={{ backgroundColor: opcion.color }}
                    aria-hidden
                  />
                  <span className="flex-1 text-tinta">{opcion.etiqueta}</span>
                  <span className="text-sm text-tinta3">{opcion.detalle}</span>
                </label>
              </li>
            ))}
          </ul>

          {fieldError ? <p className="text-sm text-error">{fieldError}</p> : null}
        </fieldset>

        <div className="flex gap-nc-sm">
          <Button type="submit" loading={busy} disabled={seleccion.length === 0}>
            Generar
          </Button>
          <Button type="button" variant="secondary" onClick={onCancelar}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}

/**
 * El compartido recién generado, con sus tres modalidades (FR-028).
 *
 * Las tres se muestran juntas y salen del mismo código: el QR codifica el enlace y el enlace
 * lleva el código. Es lo que garantiza que entreguen lo mismo (FR-032).
 */
function ShareGenerado({ share, onCerrar }: { share: Share; onCerrar: () => void }) {
  const [copiado, setCopiado] = useState<'codigo' | 'enlace' | null>(null);

  async function copiar(texto: string, cual: 'codigo' | 'enlace') {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(cual);
      window.setTimeout(() => setCopiado(null), 2000);
    } catch {
      // Sin permiso de portapapeles el texto sigue visible para copiarlo a mano.
    }
  }

  return (
    <Card title="Listo para compartir">
      <p className="text-tinta2">
        Las tres formas llevan a lo mismo. Usa la que le venga mejor a tu compañero.
      </p>

      <div className="flex flex-col items-center gap-nc-md sm:flex-row sm:items-start">
        <div className="shrink-0">
          <QrCode value={share.url} size={200} label={`Código QR de ${share.title}`} />
          <p className="pt-nc-xs text-center text-xs text-tinta3">Que lo escanee con la app</p>
        </div>

        <div className="w-full space-y-nc-md">
          <div className="space-y-nc-2xs">
            <p className="text-sm font-medium text-tinta2">Código corto</p>
            <div className="flex items-center gap-nc-xs">
              <code className="flex-1 rounded-lg border border-filete bg-papel px-nc-sm py-nc-xs font-mono text-lg tracking-widest text-foco">
                {formatShareCode(share.code)}
              </code>
              <Button variant="secondary" onClick={() => void copiar(share.code, 'codigo')}>
                {copiado === 'codigo' ? '✓' : 'Copiar'}
              </Button>
            </div>
          </div>

          <div className="space-y-nc-2xs">
            <p className="text-sm font-medium text-tinta2">Enlace</p>
            <div className="flex items-center gap-nc-xs">
              <code className="flex-1 truncate rounded-lg border border-filete bg-papel px-nc-sm py-nc-xs text-sm text-tinta2">
                {share.url}
              </code>
              <Button variant="secondary" onClick={() => void copiar(share.url, 'enlace')}>
                {copiado === 'enlace' ? '✓' : 'Copiar'}
              </Button>
            </div>
          </div>

          <p className="text-sm text-tinta3">
            Caduca el {new Date(share.expiresAt).toLocaleDateString('es-MX', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            . Puedes revocarlo antes desde la lista de abajo.
          </p>
        </div>
      </div>

      <Button variant="secondary" onClick={onCerrar}>
        Hecho
      </Button>
    </Card>
  );
}

/* ─────────────────────────── Lista ─────────────────────────── */

/** Los compartidos generados, con su estado y la opción de revocar (FR-033). */
function ListaShares({
  shares,
  busy,
  onRevocar,
}: {
  shares: readonly Share[];
  busy: boolean;
  onRevocar: (share: Share) => void;
}) {
  if (shares.length === 0) {
    return (
      <Card title="Lo que has compartido">
        <p className="text-tinta3">Todavía no has compartido nada.</p>
      </Card>
    );
  }

  return (
    <Card title={`Lo que has compartido (${shares.length})`}>
      <ul className="space-y-nc-sm">
        {sortShares(shares).map((share) => (
          <li
            key={share.id}
            className="flex flex-wrap items-center gap-nc-sm rounded-lg border border-filete bg-papel2 px-nc-md py-nc-sm"
          >
            <div className="min-w-0 flex-1 space-y-nc-2xs">
              <div className="flex items-center gap-nc-xs">
                <span className="truncate font-medium text-tinta">{share.title}</span>
                <span
                  className="shrink-0 rounded-pill px-nc-xs py-nc-3xs text-xs font-medium"
                  style={{
                    backgroundColor: `${SHARE_STATUS_COLORS[share.status]}22`,
                    color: SHARE_STATUS_COLORS[share.status],
                  }}
                >
                  {SHARE_STATUS_LABELS[share.status]}
                </span>
              </div>
              <p className="text-sm text-tinta3">
                {SHARE_KIND_LABELS[share.kind]} · {share.itemCount}{' '}
                {share.kind === 'horario'
                  ? share.itemCount === 1
                    ? 'materia'
                    : 'materias'
                  : share.itemCount === 1
                    ? 'actividad'
                    : 'actividades'}
                {share.acceptedCount > 0
                  ? ` · aceptado ${share.acceptedCount} ${
                      share.acceptedCount === 1 ? 'vez' : 'veces'
                    }`
                  : ''}
              </p>
            </div>

            <code className="font-mono text-sm tracking-widest text-tinta2">
              {formatShareCode(share.code)}
            </code>

            {share.status === 'activo' ? (
              <Button variant="danger" disabled={busy} onClick={() => onRevocar(share)}>
                Revocar
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
