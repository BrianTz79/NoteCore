'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { RequireSession } from '@/components/require-session';
import { Button, Card } from '@/components/ui';

/**
 * Inicio, ya con sesión.
 *
 * La Fase 1 solo entrega cuenta y sesión: aquí se confirma quién eres y se enlaza al
 * perfil. El horario, las faltas y la agenda llegan en las fases 2 a 4.
 */
export default function HomePage() {
  return (
    <RequireSession>
      <Inicio />
    </RequireSession>
  );
}

function Inicio() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            Hola, {user.displayName}
          </h1>
          <p className="text-slate-400">@{user.username}</p>
        </div>
        <Button variant="secondary" onClick={() => void logout()}>
          Cerrar sesión
        </Button>
      </header>

      <Card title="Tu cuenta está lista">
        <p className="text-slate-300">
          Ya puedes entrar desde la app y desde la web a la vez: cada dispositivo mantiene su
          propia sesión.
        </p>
        <Link
          href="/perfil"
          className="inline-block text-sm font-medium text-sky-400 hover:text-sky-300"
        >
          Ver mi perfil y mis dispositivos →
        </Link>
      </Card>

      <Card title="Lo que viene">
        <ul className="space-y-2 text-slate-400">
          <li>· Tu horario semanal de clases</li>
          <li>· El control de faltas por materia</li>
          <li>· La agenda de tareas y actividades</li>
        </ul>
      </Card>
    </main>
  );
}
