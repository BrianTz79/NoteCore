'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';

/**
 * Envoltura de las páginas que exigen sesión.
 *
 * Es una comodidad de interfaz, no una medida de seguridad: quien la sortee solo verá una
 * pantalla vacía, porque los datos los sirve la API y esa sí comprueba la sesión de verdad
 * (Principio III).
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
        <p className="text-slate-500">Cargando…</p>
      </main>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
