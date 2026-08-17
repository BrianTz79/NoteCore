'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  CONTACT_VIEWPOINT_COLORS,
  CONTACT_VIEWPOINT_LABELS,
  profileCountsSummary,
  profileHiddenMessage,
  profileSummary,
  relativeTime,
  type ContactActionName,
  type Post,
  type PublicProfile,
} from '@notecore/shared';
import { socialApi } from '@/lib/api';
import { RequireSession } from '@/components/require-session';
import { Button, Card, FormError } from '@/components/ui';

/**
 * Perfil público de alguien (FR-040, FR-045).
 *
 * Es la página a la que lleva el enlace de perfil y a la que apunta el QR, así que los tres
 * caminos de FR-040 —búsqueda, enlace y QR— terminan aquí.
 *
 * Principio II: esta pantalla **no decide** qué se puede ver. El servidor manda los campos ya
 * filtrados y `detailsVisible` dice si hay algo que enseñar; aquí solo se presenta lo que
 * llegó. Si el filtrado viviera aquí, bastaría abrir las herramientas del navegador para leer
 * lo que el perfil dice no mostrar.
 */
export default function PerfilPublicoPage() {
  return (
    <RequireSession>
      <PerfilPublico />
    </RequireSession>
  );
}

function PerfilPublico() {
  const params = useParams<{ username: string }>();
  const username = params.username;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<readonly Post[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [noExiste, setNoExiste] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(undefined);

    try {
      const perfil = await socialApi.getUser(username);
      setProfile(perfil);
      // Las publicaciones se piden aparte: si el perfil es privado, la API devuelve una lista
      // vacía en lugar de un error, así que no hay caso especial que distinguir aquí.
      setPosts(await socialApi.getUserPosts(username));
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) {
        setNoExiste(true);
      } else {
        setError(caught instanceof ApiError ? caught.message : 'No se pudo cargar el perfil.');
      }
    } finally {
      setCargando(false);
    }
  }, [username]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function solicitar() {
    setOcupado(true);
    setError(undefined);
    try {
      await socialApi.requestContact({ username });
      await cargar();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo enviar la solicitud.');
    } finally {
      setOcupado(false);
    }
  }

  async function bloquear() {
    setOcupado(true);
    setError(undefined);
    try {
      await socialApi.blockUser({ username });
      await cargar();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo bloquear.');
    } finally {
      setOcupado(false);
    }
  }

  async function actuar(action: ContactActionName) {
    if (!profile) return;

    setOcupado(true);
    setError(undefined);
    try {
      // La relación se resuelve desde las listas: el perfil no trae su identificador porque
      // una relación puede no existir todavía.
      const listas = await socialApi.listContacts();
      const todas = [
        ...listas.aceptados,
        ...listas.recibidas,
        ...listas.enviadas,
        ...listas.bloqueados,
      ];
      const relacion = todas.find((contacto) => contacto.user.username === username);

      if (!relacion) {
        setError('Esa relación ya no existe.');
        return;
      }

      await socialApi.actOnContact(relacion.id, { action });
      await cargar();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo completar.');
    } finally {
      setOcupado(false);
    }
  }

  if (cargando) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-16">
        <Card>Cargando…</Card>
      </main>
    );
  }

  if (noExiste || !profile) {
    return (
      <main className="mx-auto w-full max-w-2xl space-y-6 px-6 py-16">
        <Link href="/social" className="text-sm text-slate-400 hover:text-slate-200">
          ← Volver
        </Link>
        <Card title="No encontramos a esa persona">
          <p data-testid="perfil-no-existe" className="text-slate-300">
            Revisa que el @usuario esté bien escrito.
          </p>
        </Card>
      </main>
    );
  }

  const resumen = profileSummary(profile);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-16">
      <Link href="/social" className="text-sm text-slate-400 hover:text-slate-200">
        ← Volver a contactos
      </Link>

      <Card>
        <div className="space-y-2">
          <h1 data-testid="perfil-nombre" className="text-3xl font-semibold tracking-tight">
            {profile.displayName}
          </h1>
          <p data-testid="perfil-usuario" className="text-slate-400">
            @{profile.username}
          </p>
          <p
            data-testid="perfil-relacion"
            className="text-sm"
            style={{ color: CONTACT_VIEWPOINT_COLORS[profile.viewpoint] }}
          >
            {CONTACT_VIEWPOINT_LABELS[profile.viewpoint]}
          </p>
        </div>

        <FormError message={error} />

        <div className="flex flex-wrap gap-2">
          {profile.actions.puedeSolicitar ? (
            <Button onClick={() => void solicitar()} disabled={ocupado} data-testid="boton-agregar">
              Agregar a contactos
            </Button>
          ) : null}
          {profile.actions.puedeAceptar ? (
            <Button onClick={() => void actuar('aceptar')} disabled={ocupado} data-testid="boton-aceptar">
              Aceptar solicitud
            </Button>
          ) : null}
          {profile.actions.puedeRechazar ? (
            <Button variant="secondary" onClick={() => void actuar('rechazar')} disabled={ocupado}>
              Rechazar
            </Button>
          ) : null}
          {profile.actions.puedeCancelar ? (
            <Button variant="secondary" onClick={() => void actuar('cancelar')} disabled={ocupado} data-testid="boton-cancelar">
              Cancelar solicitud
            </Button>
          ) : null}
          {profile.actions.puedeEliminar ? (
            <Button variant="secondary" onClick={() => void actuar('eliminar')} disabled={ocupado} data-testid="boton-eliminar">
              Eliminar contacto
            </Button>
          ) : null}
          {profile.actions.puedeBloquear ? (
            <Button
              variant="danger"
              onClick={() => void (profile.viewpoint === 'ninguna' ? bloquear() : actuar('bloquear'))}
              disabled={ocupado}
              data-testid="boton-bloquear"
            >
              Bloquear
            </Button>
          ) : null}
          {profile.actions.puedeDesbloquear ? (
            <Button variant="secondary" onClick={() => void actuar('desbloquear')} disabled={ocupado} data-testid="boton-desbloquear">
              Desbloquear
            </Button>
          ) : null}
        </div>
      </Card>

      {profile.detailsVisible ? (
        <>
          <Card title="Sobre esta persona">
            {profile.bio ? (
              <p data-testid="perfil-bio" className="whitespace-pre-wrap text-slate-200">
                {profile.bio}
              </p>
            ) : null}
            {resumen ? (
              <p data-testid="perfil-resumen" className="text-slate-400">
                {resumen}
              </p>
            ) : null}
            {!profile.bio && !resumen ? (
              <p className="text-slate-400">Todavía no llenó su perfil.</p>
            ) : null}
            {profile.contactCount !== null && profile.postCount !== null ? (
              <p data-testid="perfil-conteos" className="text-sm text-slate-500">
                {profileCountsSummary(profile.contactCount, profile.postCount)}
              </p>
            ) : null}
          </Card>

          <Card title={`Publicaciones (${posts.length})`}>
            {posts.length === 0 ? (
              <p data-testid="perfil-sin-publicaciones" className="text-slate-400">
                Todavía no ha publicado nada.
              </p>
            ) : (
              <ul className="space-y-3" data-testid="perfil-publicaciones">
                {posts.map((post) => (
                  <li
                    key={post.id}
                    className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/50 p-3.5"
                  >
                    <p className="whitespace-pre-wrap text-slate-200">{post.text}</p>
                    <span className="text-sm text-slate-500">{relativeTime(post.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : (
        /* FR-045: se explica que el perfil es privado en lugar de pintarlo vacío, que se
           leería como "esta persona no puso nada" —una conclusión distinta y equivocada—. */
        <Card title="Perfil privado">
          <p data-testid="perfil-privado" className="text-slate-300">
            {profileHiddenMessage(profile.displayName)}
          </p>
        </Card>
      )}
    </main>
  );
}
