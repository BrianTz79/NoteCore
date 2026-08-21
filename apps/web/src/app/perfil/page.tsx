'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BORRADO_EXPLICADO,
  DELETE_ACCOUNT_CONFIRMATION,
  changePasswordSchema,
  deleteAccountSchema,
  formatDateTime,
  toFormErrors,
  updateProfileSchema,
  type FormErrors,
  type SessionInfo,
} from '@notecore/shared';
import { authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { RequireSession } from '@/components/require-session';
import { Button, Card, Field, FormError } from '@/components/ui';

export default function PerfilPage() {
  return (
    <RequireSession>
      <Perfil />
    </RequireSession>
  );
}

function Perfil() {
  const { user } = useAuth();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-nc-lg px-nc-lg py-nc-3xl">
      <header className="space-y-nc-2xs">
        <Link href="/" className="text-sm text-tinta3 hover:text-tinta">
          ← Volver
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Tu perfil</h1>
        <p className="text-tinta2">{user?.email}</p>
      </header>

      <DatosDelPerfil />
      <CambiarContrasena />
      <Dispositivos />
      <BorrarCuenta />
    </main>
  );
}

function DatosDelPerfil() {
  const { user, updateProfile } = useAuth();

  const [values, setValues] = useState({
    displayName: user?.displayName ?? '',
    username: user?.username ?? '',
  });
  const [errors, setErrors] = useState<FormErrors>({ fields: {} });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setErrors({ fields: {} });
    setSaved(false);

    const parsed = updateProfileSchema.safeParse(values);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[issue.path.join('.')] = issue.message;
      setErrors({ fields });
      setSaving(false);
      return;
    }

    try {
      await updateProfile(parsed.data);
      setSaved(true);
    } catch (error) {
      setErrors(toFormErrors(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Nombre y usuario">
      <form onSubmit={onSubmit} noValidate className="space-y-nc-md">
        <FormError message={errors.general} />

        <Field
          label="Tu nombre"
          name="displayName"
          value={values.displayName}
          onChange={(event) => setValues((c) => ({ ...c, displayName: event.target.value }))}
          error={errors.fields.displayName}
        />

        <Field
          label="Nombre de usuario"
          name="username"
          value={values.username}
          onChange={(event) => setValues((c) => ({ ...c, username: event.target.value }))}
          error={errors.fields.username}
          hint="Con este nombre te encontrarán tus compañeros."
        />

        <div className="flex items-center gap-nc-sm">
          <Button type="submit" loading={saving}>
            Guardar cambios
          </Button>
          {saved ? <span className="text-sm text-exito">Guardado</span> : null}
        </div>
      </form>
    </Card>
  );
}

function CambiarContrasena() {
  const [values, setValues] = useState({ currentPassword: '', newPassword: '' });
  const [errors, setErrors] = useState<FormErrors>({ fields: {} });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setErrors({ fields: {} });
    setDone(false);

    const parsed = changePasswordSchema.safeParse(values);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[issue.path.join('.')] = issue.message;
      setErrors({ fields });
      setSaving(false);
      return;
    }

    try {
      await authApi.changePassword(parsed.data);
      setValues({ currentPassword: '', newPassword: '' });
      setDone(true);
    } catch (error) {
      setErrors(toFormErrors(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Contraseña">
      <p className="text-sm text-tinta2">
        Al cambiarla se cerrarán tus sesiones en los demás dispositivos.
      </p>

      <form onSubmit={onSubmit} noValidate className="space-y-nc-md">
        <FormError message={errors.general} />

        <Field
          label="Contraseña actual"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          value={values.currentPassword}
          onChange={(event) =>
            setValues((c) => ({ ...c, currentPassword: event.target.value }))
          }
          error={errors.fields.currentPassword}
        />

        <Field
          label="Contraseña nueva"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          value={values.newPassword}
          onChange={(event) => setValues((c) => ({ ...c, newPassword: event.target.value }))}
          error={errors.fields.newPassword}
          hint="Al menos 8 caracteres."
        />

        <div className="flex items-center gap-nc-sm">
          <Button type="submit" loading={saving}>
            Cambiar contraseña
          </Button>
          {done ? <span className="text-sm text-exito">Contraseña actualizada</span> : null}
        </div>
      </form>
    </Card>
  );
}

/** Sesiones abiertas, para que el usuario vea y cierre sus dispositivos (FR-002). */
function Dispositivos() {
  const [sessions, setSessions] = useState<readonly SessionInfo[]>([]);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setSessions(await authApi.sessions());
      setError(undefined);
    } catch (caught) {
      setError(toFormErrors(caught).general);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function revoke(id: string) {
    try {
      await authApi.revokeSession(id);
      await load();
    } catch (caught) {
      setError(toFormErrors(caught).general);
    }
  }

  return (
    <Card title="Tus dispositivos">
      <FormError message={error} />

      {loading ? (
        <p className="text-tinta3">Cargando…</p>
      ) : (
        <ul className="divide-y divide-filete">
          {sessions.map((session) => (
            <li key={session.id} className="flex items-center justify-between gap-nc-md py-nc-sm">
              <div>
                <p className="text-tinta">
                  {session.client === 'mobile' ? 'App Android' : 'Navegador web'}
                  {session.isCurrent ? (
                    <span className="ml-nc-xs rounded bg-exito/10 px-nc-xs py-nc-3xs text-xs text-exito">
                      este dispositivo
                    </span>
                  ) : null}
                </p>
                <p className="text-sm text-tinta3">
                  Última actividad: {formatDateTime(session.lastUsedAt)}
                </p>
              </div>
              {session.isCurrent ? null : (
                <Button variant="danger" onClick={() => void revoke(session.id)}>
                  Cerrar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ==========================================================================
 * Borrar la cuenta (Fase 20)
 * ======================================================================== */

/**
 * La única operación del producto que destruye datos a propósito.
 *
 * ## Por qué está detrás de un despliegue y no a la vista
 *
 * Porque no es una acción de esta pantalla, es una salida del producto. Un botón rojo
 * permanente al final de «Mi cuenta» se convierte en parte del paisaje —se ve cada vez que
 * alguien entra a cambiar su nombre— y lo que se ve cada día se acaba tocando. Plegado, hay
 * que decidir abrirlo antes de poder decidir borrar.
 *
 * ## Por qué pide contraseña *y* una palabra
 *
 * Son dos cosas distintas. La contraseña prueba **quién** es —sin ella, un teléfono
 * desbloqueado sobre una mesa basta para vaciar la cuenta de su dueño—. Escribir BORRAR
 * prueba que **entendió**: un diálogo de «¿seguro?» se acepta por reflejo, y teclear una
 * palabra no. La API exige las dos otra vez por su cuenta (Principio II); esto es lo que
 * evita llegar hasta allí por accidente.
 */
function BorrarCuenta() {
  const { deleteAccount } = useAuth();
  const router = useRouter();

  const [abierto, setAbierto] = useState(false);
  const [values, setValues] = useState({ password: '', confirmation: '' });
  const [errors, setErrors] = useState<FormErrors>({ fields: {} });
  const [borrando, setBorrando] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBorrando(true);
    setErrors({ fields: {} });

    const parsed = deleteAccountSchema.safeParse(values);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[issue.path.join('.')] = issue.message;
      setErrors({ fields });
      setBorrando(false);
      return;
    }

    try {
      await deleteAccount(parsed.data);
      /**
       * `replace` y no `push`: la cuenta ya no existe, así que el botón de atrás no puede
       * devolver a una pantalla que consulta datos de una sesión muerta.
       */
      router.replace('/entrar');
    } catch (error) {
      setErrors(toFormErrors(error));
      setBorrando(false);
    }
  }

  if (!abierto) {
    return (
      <Card title="Borrar mi cuenta">
        <p className="text-sm text-tinta2">
          Elimina tu cuenta y todos tus datos de NoteCore. No se puede deshacer.
        </p>
        <Button variant="ghost" onClick={() => setAbierto(true)}>
          Quiero borrar mi cuenta
        </Button>
      </Card>
    );
  }

  return (
    <Card title="Borrar mi cuenta">
      <div className="rounded-md border border-error/40 bg-error/10 px-nc-md py-nc-sm">
        <p className="text-sm font-medium text-error">
          Esto borra tu cuenta y todos tus datos. No hay vuelta atrás.
        </p>
      </div>

      <ul className="space-y-nc-2xs text-sm text-tinta2">
        {BORRADO_EXPLICADO.map((linea) => (
          <li key={linea} className="flex gap-nc-xs">
            <span aria-hidden className="text-tinta3">
              ·
            </span>
            <span>{linea}</span>
          </li>
        ))}
      </ul>

      <form onSubmit={onSubmit} noValidate className="space-y-nc-md">
        <FormError message={errors.general} />

        <Field
          label="Tu contraseña"
          name="password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={(event) => setValues((c) => ({ ...c, password: event.target.value }))}
          error={errors.fields.password}
        />

        <Field
          label={`Escribe ${DELETE_ACCOUNT_CONFIRMATION} para confirmar`}
          name="confirmation"
          value={values.confirmation}
          onChange={(event) => setValues((c) => ({ ...c, confirmation: event.target.value }))}
          error={errors.fields.confirmation}
        />

        <div className="flex flex-wrap items-center gap-nc-sm">
          <Button type="submit" variant="danger" loading={borrando}>
            Borrar mi cuenta para siempre
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setAbierto(false);
              setValues({ password: '', confirmation: '' });
              setErrors({ fields: {} });
            }}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
