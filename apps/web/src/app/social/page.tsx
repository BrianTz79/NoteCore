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
import { Button, Card, Field, FormError, ScreenHeader } from '@/components/ui';
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
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-nc-xl px-nc-lg py-nc-3xl lg:max-w-5xl lg:px-nc-2xl">
      <ScreenHeader
        title="Perfil y contactos"
        back={{ href: '/', label: 'Inicio' }}
      />
      {pendientes ? (
        <p
          data-testid="aviso-pendientes"
          className="rounded-lg border border-acento-tenue bg-acento/10 px-nc-sm py-nc-xs text-sm text-foco"
        >
          Tienes {pendientes} esperando respuesta.
        </p>
      ) : null}

      <FormError message={error} />

      <nav className="flex flex-wrap gap-nc-xs">
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
            className={`rounded-lg px-nc-md py-nc-xs text-sm font-medium transition ${
              pestana === clave
                ? 'bg-acento text-white'
                : 'bg-papel3 text-tinta2 hover:bg-filete'
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
    <div className="space-y-nc-lg">
      <Card title="Tu perfil público">
        <p className="text-sm text-tinta2">
          Esto es lo que otras personas pueden ver de ti. Todo es opcional.
        </p>

        <div className="space-y-nc-md">
          <div className="space-y-nc-2xs">
            <label htmlFor="bio" className="block text-sm font-medium text-tinta2">
              Biografía
            </label>
            <textarea
              id="bio"
              data-testid="campo-bio"
              value={bio}
              maxLength={BIO_MAX_LENGTH}
              onChange={(event) => setBio(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-filete bg-papel2 px-nc-sm py-nc-xs text-tinta outline-none transition placeholder:text-tinta3 focus:border-acento focus:ring-2 focus:ring-acento-tenue"
              placeholder="Cuenta algo de ti"
            />
            <p className="text-sm text-tinta3">
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
        <div className="space-y-nc-sm">
          {PROFILE_VISIBILITIES.map((opcion) => (
            <label
              key={opcion}
              className={`flex cursor-pointer gap-nc-sm rounded-lg border p-nc-sm transition ${
                visibility === opcion
                  ? 'border-filete2 bg-acento/10'
                  : 'border-filete hover:border-filete2'
              }`}
            >
              <input
                type="radio"
                name="visibility"
                data-testid={`visibilidad-${opcion}`}
                checked={visibility === opcion}
                onChange={() => setVisibility(opcion)}
                className="mt-nc-2xs"
              />
              <span className="space-y-nc-2xs">
                <span className="block text-sm font-medium text-tinta">
                  {PROFILE_VISIBILITY_LABELS[opcion]}
                </span>
                {/* La explicación viene de `shared`: es la que decide si el usuario entiende
                    qué está haciendo público, y debe ser idéntica en app y web (FR-045). */}
                <span className="block text-sm text-tinta2">
                  {PROFILE_VISIBILITY_HINTS[opcion]}
                </span>
              </span>
            </label>
          ))}
        </div>

        <FormError message={error} />

        <div className="flex items-center gap-nc-sm">
          <Button onClick={() => void guardar()} loading={guardando} data-testid="guardar-perfil">
            Guardar
          </Button>
          {guardado ? (
            <span data-testid="perfil-guardado" className="text-sm text-exito">
              Guardado
            </span>
          ) : null}
        </div>
      </Card>

      <Card title="Tu enlace y tu QR de perfil">
        <p className="text-sm text-tinta2">
          Compártelo para que te agreguen sin tener que buscarte.
        </p>
        <p data-testid="resumen-conteos" className="text-tinta2">
          {profileCountsSummary(profile.contactCount, profile.postCount)}
        </p>

        <div className="flex flex-col items-start gap-nc-md sm:flex-row sm:items-center">
          <div className="rounded-lg bg-white p-nc-sm">
            <QrCode value={profile.url} size={160} />
          </div>
          <div className="space-y-nc-xs">
            <p className="text-sm text-tinta2">Tu @usuario</p>
            <p data-testid="mi-usuario" className="text-lg font-medium text-tinta">
              @{profile.username}
            </p>
            <p data-testid="mi-enlace" className="break-all text-sm text-tinta2">
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
      <p className="text-sm text-tinta2">
        Busca por @usuario o pega un enlace de perfil.
      </p>

      <div className="flex gap-nc-xs">
        <input
          data-testid="campo-busqueda"
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void buscar();
          }}
          placeholder="@usuario"
          className="w-full rounded-lg border border-filete bg-papel2 px-nc-sm py-nc-xs text-tinta outline-none transition placeholder:text-tinta3 focus:border-acento focus:ring-2 focus:ring-acento-tenue"
        />
        <Button onClick={() => void buscar()} loading={buscando} data-testid="boton-buscar">
          Buscar
        </Button>
      </div>

      <FormError message={error} />

      {resultados === null ? null : resultados.length === 0 ? (
        <p data-testid="sin-resultados" className="text-tinta2">
          No encontramos a nadie con ese nombre.
        </p>
      ) : (
        <ul className="space-y-nc-xs" data-testid="resultados">
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
      className="flex items-center justify-between gap-nc-sm rounded-lg border border-filete bg-papel2 p-nc-sm"
    >
      <div className="min-w-0">
        <Link
          href={`/u/${usuario.username}`}
          className="block truncate font-medium text-tinta hover:text-foco"
        >
          {usuario.displayName}
        </Link>
        <p className="truncate text-sm text-tinta2">@{usuario.username}</p>
        {error ? <p className="text-sm text-error">{error}</p> : null}
      </div>

      {enviado || usuario.viewpoint === 'enviada' ? (
        <span className="shrink-0 text-sm text-aviso">Solicitud enviada</span>
      ) : usuario.viewpoint === 'aceptada' ? (
        <span className="shrink-0 text-sm text-exito">Contacto</span>
      ) : usuario.viewpoint === 'recibida' ? (
        <Link href={`/u/${usuario.username}`} className="shrink-0 text-sm text-acento">
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
        <p data-testid="sin-contactos" className="text-tinta2">
          Todavía no tienes contactos. Busca a alguien por su @usuario para agregarlo.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-nc-lg">
      {secciones.map(([titulo, lista, clave]) =>
        lista.length === 0 ? null : (
          <Card key={clave} title={`${titulo} (${lista.length})`}>
            <ul className="space-y-nc-xs" data-testid={`lista-${clave}`}>
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
      className="flex flex-wrap items-center justify-between gap-nc-sm rounded-lg border border-filete bg-papel2 p-nc-sm"
    >
      <div className="min-w-0">
        <Link
          href={`/u/${contacto.user.username}`}
          className="block truncate font-medium text-tinta hover:text-foco"
        >
          {contacto.user.displayName}
        </Link>
        <p className="truncate text-sm text-tinta2">@{contacto.user.username}</p>
        <p
          className="text-sm"
          style={{ color: CONTACT_VIEWPOINT_COLORS[contacto.viewpoint] }}
        >
          {CONTACT_VIEWPOINT_LABELS[contacto.viewpoint]}
        </p>
        {error ? <p className="text-sm text-error">{error}</p> : null}
      </div>

      <div className="flex shrink-0 flex-wrap gap-nc-xs">
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
    <div className="space-y-nc-lg">
      <Card title="Publicar algo">
        <textarea
          data-testid="campo-publicacion"
          value={texto}
          maxLength={POST_MAX_LENGTH}
          onChange={(event) => setTexto(event.target.value)}
          rows={3}
          placeholder="¿Qué quieres compartir?"
          className="w-full rounded-lg border border-filete bg-papel2 px-nc-sm py-nc-xs text-tinta outline-none transition placeholder:text-tinta3 focus:border-acento focus:ring-2 focus:ring-acento-tenue"
        />
        <p className="text-sm text-tinta3">
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
          <p data-testid="sin-publicaciones" className="text-tinta2">
            Todavía no has publicado nada.
          </p>
        </Card>
      ) : (
        <Card title={`Tus publicaciones (${posts.length})`}>
          <ul className="space-y-nc-sm" data-testid="lista-publicaciones">
            {posts.map((post) => (
              <li
                key={post.id}
                className="space-y-nc-xs rounded-lg border border-filete bg-papel2 p-nc-sm"
              >
                <p className="whitespace-pre-wrap text-tinta">{post.text}</p>
                <div className="flex items-center justify-between gap-nc-sm">
                  <span className="text-sm text-tinta3">{relativeTime(post.createdAt)}</span>
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
