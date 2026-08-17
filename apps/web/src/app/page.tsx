'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { RequireSession } from '@/components/require-session';
import { Button, Card } from '@/components/ui';

/**
 * Inicio, ya con sesión.
 *
 * Enlaza a lo que hay disponible: el horario (Fase 2), las faltas (Fase 3), la agenda
 * (Fase 4) y el perfil. El calendario llega en la Fase 5.
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

      <Card title="Tu horario">
        <p className="text-slate-300">
          Captura tus clases a mano o pega el horario que te genere una IA a partir de una
          foto, y consúltalo en la vista semanal.
        </p>
        <Link
          href="/horario"
          className="inline-block text-sm font-medium text-sky-400 hover:text-sky-300"
        >
          Ver mi horario →
        </Link>
      </Card>

      <Card title="Tus faltas">
        <p className="text-slate-300">
          Marca las clases a las que faltaste y lleva el conteo por materia, con un límite
          sugerido que puedes ajustar.
        </p>
        <Link
          href="/faltas"
          className="inline-block text-sm font-medium text-sky-400 hover:text-sky-300"
        >
          Ver mis faltas →
        </Link>
      </Card>

      <Card title="Tu agenda">
        <p className="text-slate-300">
          Anota tareas, proyectos y exámenes con su materia y su fecha de entrega, y
          consúltalos ordenados por lo que vence antes.
        </p>
        <Link
          href="/agenda"
          className="inline-block text-sm font-medium text-sky-400 hover:text-sky-300"
        >
          Ver mi agenda →
        </Link>
      </Card>

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
          <li>· El calendario con recordatorios</li>
          <li>· Compartir tu horario con tus compañeros</li>
        </ul>
      </Card>
    </main>
  );
}
