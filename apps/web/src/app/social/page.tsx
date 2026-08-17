'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ApiError,
  CONTACT_VIEWPOINT_COLORS,
  CONTACT_VIEWPOINT_LABELS,
  PROFILE_VISIBILITY_HINTS,
  PROFILE_VISIBILITY_LABELS,
  PROFILE_VISIBILITIES,
  BIO_MAX_LENGTH,
  POST_MAX_LENGTH,
  pendingRequestsSummary,
  profileCountsSummary,
  relativeTime,
  sortContacts,
  usernameFromProfileInput,
  type Contact,
  type ContactActionName,
  type ContactLists,
  type OwnProfile,
  type Post,
  type ProfileVisibility,
  type UserSearchResult,
} from '@notecore/shared';
import { socialApi } from '@/lib/api';
import { RequireSession } from '@/components/require-session';
import { Button, Card, Field, FormError } from '@/components/ui';
import { QrCode } from '@/components/qr-code';

/**
 * Sección social: perfil, contactos y publicaciones (FR-039 a FR-042, FR-045).
 *
 * Principio II: esta pantalla no decide nada. Qué botón se puede pintar viene en `actions`,
 * resuelto por el servidor, y si un perfil enseña sus datos lo dice `detailsVisible`. Aquí
 * solo se presenta.
 */
export default function SocialPage() {
  return (
    <RequireSession>
      <Social />
    </RequireSession>
  );
}

type Pestana = 'perfil' | 'buscar' | 'contactos' | 'publicaciones';

function Social() {
  const [pestana, setPestana] = useState<Pestana>('perfil');
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [listas, setListas] = useState<ContactLists | null>(null);
  const [error, setError] = useState<string | undefined>();

  const cargar = useCallback(async () => {
    try {
      const [perfil, contactos] = await Promise.all([
        socialApi.getProfile(),
        socialApi.listContacts(),
      ]);
      setProfile(perfil);
      setListas(contactos);
      setError(undefined);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo cargar tu perfil.');
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const pendientes = pendingRequestsSummary(profile?.pendingRequestCount ?? 0);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-400 hover:text-slate-200">
          ← Volver al inicio
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Perfil y contactos</h1>
        {pendientes ? (
          <p
            data-testid="aviso-pendientes"
            className="rounded-lg border border-sky-900/60 bg-sky-950/40 px-3.5 py-2.5 text-sm text-sky-300"
          >
            Tienes {pendientes} esperando respuesta.
          </p>
        ) : null}
      </header>

      <FormError message={error} />

      <nav className="flex flex-wrap gap-2">
        {(
          [
            ['perfil', 'Mi perfil'],
            ['buscar', 'Buscar'],
            ['contactos', 'Contactos'],
            ['publicaciones', 'Publicaciones'],
          ] as const
        ).map(([clave, etiqueta]) => (
          <button
            key={clave}
            type="button"
            data-testid={`pestana-${clave}`}
            onClick={() => setPestana(clave)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              pestana === clave
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {etiqueta}
            {clave === 'contactos' && (listas?.recibidas.length ?? 0) > 0
              ? ` (${listas?.recibidas.length})`
              : ''}
          </button>
        ))}
      </nav>

      {pestana === 'perfil' ? (
        <PerfilPropio profile={profile} onGuardado={cargar} />
      ) : null}
      {pestana === 'buscar' ? <Buscador onCambio={cargar} /> : null}
      {pestana === 'contactos' ? (
        <Contactos listas={listas} onCambio={cargar} />
      ) : null}
      {pestana === 'publicaciones' ? <Publicaciones onCambio={cargar} /> : null}
    </main>
  );
}

/* ─────────────────────────── Perfil propio ─────────────────────────── */

function PerfilPropio({
  profile,
  onGuardado,
}: {
  profile: OwnProfile | null;
  onGuardado: () => Promise<void>;
}) {
  const [bio, setBio] = useState('');
  const [career, setCareer] = useState('');
  const [school, setSchool] = useState('');
  const [age, setAge] = useState('');
  const [visibility, setVisibility] = useState<ProfileVisibility>('contactos');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [guardado, setGuardado] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setBio(profile.bio ?? '');
    setCareer(profile.career ?? '');
    setSchool(profile.school ?? '');
    setAge(profile.age === null ? '' : String(profile.age));
    setVisibility(profile.visibility);
  }, [profile]);

  if (!profile) return <Card>Cargando…</Card>;

  async function guardar() {
    setGuardando(true);
    setError(undefined);
    setGuardado(false);

    try {
      await socialApi.updateProfile({
        // La cadena vacía viaja tal cual: el esquema la convierte en `null`, que es como se
        // vacía un campo. Mandar `undefined` significaría "déjalo como estaba".
        bio,
        career,
        school,
        age: age.trim() === '' ? null : Number(age),
        visibility,
      });
      await onGuardado();
      setGuardado(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card title="Tu perfil público">
        <p className="text-sm text-slate-400">
          Esto es lo que otras personas pueden ver de ti. Todo es opcional.
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="bio" className="block text-sm font-medium text-slate-300">
              Biografía
            </label>
            <textarea
              id="bio"
              data-testid="campo-bio"
              value={bio}
              maxLength={BIO_MAX_LENGTH}
              onChange={(event) => setBio(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-sky-700 focus:ring-2 focus:ring-sky-900/50"
              placeholder="Cuenta algo de ti"
            />
            <p className="text-sm text-slate-500">
              {bio.length} de {BIO_MAX_LENGTH}
            </p>
          </div>

          <Field
            label="Carrera"
            name="career"
            data-testid="campo-carrera"
            value={career}
            onChange={(event) => setCareer(event.target.value)}
            placeholder="Ingeniería en Sistemas"
          />
          <Field
            label="Escuela"
            name="school"
            data-testid="campo-escuela"
            value={school}
            onChange={(event) => setSchool(event.target.value)}
            placeholder="TecNM"
          />
          <Field
            label="Edad"
            name="age"
            type="number"
            data-testid="campo-edad"
            value={age}
            onChange={(event) => setAge(event.target.value)}
            placeholder="21"
          />
        </div>
      </Card>

      <Card title="Quién puede ver tu perfil">
        <div className="space-y-3">
          {PROFILE_VISIBILITIES.map((opcion) => (
            <label
              key={opcion}
              className={`flex cursor-pointer gap-3 rounded-lg border p-3.5 transition ${
                visibility === opcion
                  ? 'border-sky-700 bg-sky-950/30'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <input
                type="radio"
                name="visibility"
                data-testid={`visibilidad-${opcion}`}
                checked={visibility === opcion}
                onChange={() => setVisibility(opcion)}
                className="mt-1"
              />
              <span className="space-y-1">
                <span className="block text-sm font-medium text-slate-200">
                  {PROFILE_VISIBILITY_LABELS[opcion]}
                </span>
                {/* La explicación viene de `shared`: es la que decide si el usuario entiende
                    qué está haciendo público, y debe ser idéntica en app y web (FR-045). */}
                <span className="block text-sm text-slate-400">
                  {PROFILE_VISIBILITY_HINTS[opcion]}
                </span>
              </span>
            </label>
          ))}
        </div>

        <FormError message={error} />

        <div className="flex items-center gap-3">
          <Button onClick={() => void guardar()} loading={guardando} data-testid="guardar-perfil">
            Guardar
          </Button>
          {guardado ? (
            <span data-testid="perfil-guardado" className="text-sm text-emerald-400">
              Guardado
            </span>
          ) : null}
        </div>
      </Card>

      <Card title="Tu enlace y tu QR de perfil">
        <p className="text-sm text-slate-400">
          Compártelo para que te agreguen sin tener que buscarte.
        </p>
        <p data-testid="resumen-conteos" className="text-slate-300">
          {profileCountsSummary(profile.contactCount, profile.postCount)}
        </p>

        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="rounded-lg bg-white p-3">
            <QrCode value={profile.url} size={160} />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-400">Tu @usuario</p>
            <p data-testid="mi-usuario" className="text-lg font-medium text-slate-100">
              @{profile.username}
            </p>
            <p data-testid="mi-enlace" className="break-all text-sm text-slate-400">
              {profile.url}
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                void navigator.clipboard.writeText(profile.url);
                setCopiado(true);
              }}
            >
              {copiado ? 'Copiado' : 'Copiar enlace'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ─────────────────────────── Buscador ─────────────────────────── */

function Buscador({ onCambio }: { onCambio: () => Promise<void> }) {
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState<readonly UserSearchResult[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function buscar() {
    setError(undefined);

    // Se acepta un enlace de perfil pegado además del @usuario: la gente copia la URL
    // completa del navegador, y exigirle recortarla sería trabajo manual para algo que el
    // programa sabe hacer.
    const consulta = usernameFromProfileInput(texto) ?? texto.trim();

    if (consulta.length < 2) {
      setError('Escribe al menos 2 caracteres para buscar.');
      return;
    }

    setBuscando(true);
    try {
      setResultados(await socialApi.search(consulta));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo buscar.');
    } finally {
      setBuscando(false);
    }
  }

  return (
    <Card title="Buscar personas">
      <p className="text-sm text-slate-400">
        Busca por @usuario o pega un enlace de perfil.
      </p>

      <div className="flex gap-2">
        <input
          data-testid="campo-busqueda"
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void buscar();
          }}
          placeholder="@usuario"
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-sky-700 focus:ring-2 focus:ring-sky-900/50"
        />
        <Button onClick={() => void buscar()} loading={buscando} data-testid="boton-buscar">
          Buscar
        </Button>
      </div>

      <FormError message={error} />

      {resultados === null ? null : resultados.length === 0 ? (
        <p data-testid="sin-resultados" className="text-slate-400">
          No encontramos a nadie con ese nombre.
        </p>
      ) : (
        <ul className="space-y-2" data-testid="resultados">
          {resultados.map((resultado) => (
            <FilaUsuario key={resultado.id} usuario={resultado} onCambio={onCambio} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function FilaUsuario({
  usuario,
  onCambio,
}: {
  usuario: UserSearchResult;
  onCambio: () => Promise<void>;
}) {
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function solicitar() {
    setError(undefined);
    try {
      await socialApi.requestContact({ username: usuario.username });
      setEnviado(true);
      await onCambio();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo enviar.');
    }
  }

  return (
    <li
      data-testid={`usuario-${usuario.username}`}
      className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3.5"
    >
      <div className="min-w-0">
        <Link
          href={`/u/${usuario.username}`}
          className="block truncate font-medium text-slate-100 hover:text-sky-300"
        >
          {usuario.displayName}
        </Link>
        <p className="truncate text-sm text-slate-400">@{usuario.username}</p>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </div>

      {enviado || usuario.viewpoint === 'enviada' ? (
        <span className="shrink-0 text-sm text-amber-400">Solicitud enviada</span>
      ) : usuario.viewpoint === 'aceptada' ? (
        <span className="shrink-0 text-sm text-emerald-400">Contacto</span>
      ) : usuario.viewpoint === 'recibida' ? (
        <Link href={`/u/${usuario.username}`} className="shrink-0 text-sm text-sky-400">
          Te envió solicitud
        </Link>
      ) : (
        <Button onClick={() => void solicitar()} data-testid={`agregar-${usuario.username}`}>
          Agregar
        </Button>
      )}
    </li>
  );
}

/* ─────────────────────────── Contactos ─────────────────────────── */

function Contactos({
  listas,
  onCambio,
}: {
  listas: ContactLists | null;
  onCambio: () => Promise<void>;
}) {
  if (!listas) return <Card>Cargando…</Card>;

  const secciones: readonly (readonly [string, readonly Contact[], string])[] = [
    ['Solicitudes recibidas', listas.recibidas, 'recibidas'],
    ['Solicitudes enviadas', listas.enviadas, 'enviadas'],
    ['Tus contactos', listas.aceptados, 'aceptados'],
    ['Bloqueados', listas.bloqueados, 'bloqueados'],
  ];

  const vacio =
    listas.recibidas.length === 0 &&
    listas.enviadas.length === 0 &&
    listas.aceptados.length === 0 &&
    listas.bloqueados.length === 0;

  if (vacio) {
    return (
      <Card title="Tus contactos">
        <p data-testid="sin-contactos" className="text-slate-400">
          Todavía no tienes contactos. Busca a alguien por su @usuario para agregarlo.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {secciones.map(([titulo, lista, clave]) =>
        lista.length === 0 ? null : (
          <Card key={clave} title={`${titulo} (${lista.length})`}>
            <ul className="space-y-2" data-testid={`lista-${clave}`}>
              {sortContacts(lista).map((contacto) => (
                <FilaContacto key={contacto.id} contacto={contacto} onCambio={onCambio} />
              ))}
            </ul>
          </Card>
        ),
      )}
    </div>
  );
}

function FilaContacto({
  contacto,
  onCambio,
}: {
  contacto: Contact;
  onCambio: () => Promise<void>;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function actuar(action: ContactActionName) {
    setOcupado(true);
    setError(undefined);
    try {
      await socialApi.actOnContact(contacto.id, { action });
      await onCambio();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo completar.');
    } finally {
      setOcupado(false);
    }
  }

  /**
   * Los botones salen de `actions`, que decide el servidor (Principio II).
   *
   * Derivarlos aquí del punto de vista sería una segunda implementación de la misma regla, y
   * la discrepancia se vería como un botón que existe en la pantalla y falla al tocarlo.
   */
  const acciones: readonly (readonly [ContactActionName, string, 'primary' | 'secondary' | 'danger'])[] = [
    ...(contacto.actions.puedeAceptar ? ([['aceptar', 'Aceptar', 'primary']] as const) : []),
    ...(contacto.actions.puedeRechazar ? ([['rechazar', 'Rechazar', 'secondary']] as const) : []),
    ...(contacto.actions.puedeCancelar ? ([['cancelar', 'Cancelar', 'secondary']] as const) : []),
    ...(contacto.actions.puedeEliminar ? ([['eliminar', 'Eliminar', 'secondary']] as const) : []),
    ...(contacto.actions.puedeBloquear ? ([['bloquear', 'Bloquear', 'danger']] as const) : []),
    ...(contacto.actions.puedeDesbloquear
      ? ([['desbloquear', 'Desbloquear', 'secondary']] as const)
      : []),
  ];

  return (
    <li
      data-testid={`contacto-${contacto.user.username}`}
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3.5"
    >
      <div className="min-w-0">
        <Link
          href={`/u/${contacto.user.username}`}
          className="block truncate font-medium text-slate-100 hover:text-sky-300"
        >
          {contacto.user.displayName}
        </Link>
        <p className="truncate text-sm text-slate-400">@{contacto.user.username}</p>
        <p
          className="text-sm"
          style={{ color: CONTACT_VIEWPOINT_COLORS[contacto.viewpoint] }}
        >
          {CONTACT_VIEWPOINT_LABELS[contacto.viewpoint]}
        </p>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        {acciones.map(([action, etiqueta, variant]) => (
          <Button
            key={action}
            variant={variant}
            disabled={ocupado}
            data-testid={`${action}-${contacto.user.username}`}
            onClick={() => void actuar(action)}
          >
            {etiqueta}
          </Button>
        ))}
      </div>
    </li>
  );
}

/* ─────────────────────────── Publicaciones ─────────────────────────── */

function Publicaciones({ onCambio }: { onCambio: () => Promise<void> }) {
  const [posts, setPosts] = useState<readonly Post[] | null>(null);
  const [texto, setTexto] = useState('');
  const [publicando, setPublicando] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const cargar = useCallback(async () => {
    try {
      setPosts(await socialApi.listPosts());
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'No se pudieron cargar tus publicaciones.',
      );
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function publicar() {
    if (texto.trim() === '') {
      setError('Escribe algo para publicar.');
      return;
    }

    setPublicando(true);
    setError(undefined);
    try {
      await socialApi.createPost({ text: texto });
      setTexto('');
      await cargar();
      await onCambio();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo publicar.');
    } finally {
      setPublicando(false);
    }
  }

  async function borrar(id: string) {
    try {
      await socialApi.deletePost(id);
      await cargar();
      await onCambio();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo borrar.');
    }
  }

  return (
    <div className="space-y-6">
      <Card title="Publicar algo">
        <textarea
          data-testid="campo-publicacion"
          value={texto}
          maxLength={POST_MAX_LENGTH}
          onChange={(event) => setTexto(event.target.value)}
          rows={3}
          placeholder="¿Qué quieres compartir?"
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-sky-700 focus:ring-2 focus:ring-sky-900/50"
        />
        <p className="text-sm text-slate-500">
          {texto.length} de {POST_MAX_LENGTH}
        </p>

        <FormError message={error} />

        <Button onClick={() => void publicar()} loading={publicando} data-testid="boton-publicar">
          Publicar
        </Button>
      </Card>

      {posts === null ? (
        <Card>Cargando…</Card>
      ) : posts.length === 0 ? (
        <Card>
          <p data-testid="sin-publicaciones" className="text-slate-400">
            Todavía no has publicado nada.
          </p>
        </Card>
      ) : (
        <Card title={`Tus publicaciones (${posts.length})`}>
          <ul className="space-y-3" data-testid="lista-publicaciones">
            {posts.map((post) => (
              <li
                key={post.id}
                className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/50 p-3.5"
              >
                <p className="whitespace-pre-wrap text-slate-200">{post.text}</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-500">{relativeTime(post.createdAt)}</span>
                  <Button
                    variant="secondary"
                    data-testid={`borrar-post-${post.id}`}
                    onClick={() => void borrar(post.id)}
                  >
                    Borrar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
