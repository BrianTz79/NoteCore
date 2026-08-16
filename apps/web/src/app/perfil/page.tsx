'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  changePasswordSchema,
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
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-16">
      <header className="space-y-1">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-300">
          ← Volver
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Tu perfil</h1>
        <p className="text-slate-400">{user?.email}</p>
      </header>

      <DatosDelPerfil />
      <CambiarContrasena />
      <Dispositivos />
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
      <form onSubmit={onSubmit} noValidate className="space-y-4">
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

        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving}>
            Guardar cambios
          </Button>
          {saved ? <span className="text-sm text-emerald-400">Guardado</span> : null}
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
      <p className="text-sm text-slate-400">
        Al cambiarla se cerrarán tus sesiones en los demás dispositivos.
      </p>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
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

        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving}>
            Cambiar contraseña
          </Button>
          {done ? <span className="text-sm text-emerald-400">Contraseña actualizada</span> : null}
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
        <p className="text-slate-500">Cargando…</p>
      ) : (
        <ul className="divide-y divide-slate-800">
          {sessions.map((session) => (
            <li key={session.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-slate-200">
                  {session.client === 'mobile' ? 'App Android' : 'Navegador web'}
                  {session.isCurrent ? (
                    <span className="ml-2 rounded bg-emerald-950 px-2 py-0.5 text-xs text-emerald-400">
                      este dispositivo
                    </span>
                  ) : null}
                </p>
                <p className="text-sm text-slate-500">
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
