'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/app-shell';

/**
 * Envoltura de las páginas que exigen sesión.
 *
 * Es una comodidad de interfaz, no una medida de seguridad: quien la sortee solo verá una
 * pantalla vacía, porque los datos los sirve la API y esa sí comprueba la sesión de verdad
 * (Principio III).
 *
 * **Fase 14**: también es donde entra `AppShell`, la barra lateral de escritorio. Es el
 * único punto por el que pasan las doce pantallas con sesión —más `u/[username]` y
 * `compartido/[code]`—, así que ponerla aquí le da la barra a todas de una vez, incluidas
 * las que se añadan después, sin que cada `page.tsx` tenga que acordarse de importarla.
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/entrar');
  }, [loading, user, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-tinta3">Cargando…</p>
      </main>
    );
  }

  if (!user) return null;

  return <AppShell>{children}</AppShell>;
}
