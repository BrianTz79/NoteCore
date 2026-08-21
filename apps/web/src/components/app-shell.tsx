'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { SECCIONES } from '@/lib/navigation';
import { Button } from '@/components/ui';
import { Logo } from '@/components/logo';

/**
 * Envoltura de escritorio: barra lateral fija + contenido (Fase 14).
 *
 * **Por qué vive aquí y no en cada pantalla.** `RequireSession` ya envuelve las doce
 * pantallas con sesión —y `u/[username]`, `compartido/[code]`—, así que es el único punto
 * por el que pasan todas. Añadir el `AppShell` ahí evita tocar doce archivos y, sobre todo,
 * evita que una pantalla nueva se olvide de la barra: la hereda por estar dentro de
 * `RequireSession`, no por copiar una importación.
 *
 * **Por qué no aparece en móvil.** Antes de esta fase la web ya funcionaba bien en un
 * teléfono: una columna, sin barra, navegación por el inicio. El Principio de esta fase es
 * que en móvil **no empeore** — así que la barra se declara `hidden lg:flex` y por debajo de
 * `lg` (1024px) el árbol es exactamente el de antes, sin ningún elemento nuevo compitiendo
 * por la pantalla.
 *
 * **Por qué `lg` y no `md`.** La barra mide 16rem (256px) y las pantallas más densas
 * (horario, faltas) ya usan `max-w-5xl` (1024px) de contenido. Activarla en `md` (768px)
 * dejaría menos de 512px para el contenido en una tableta en vertical — peor que hoy. En
 * `lg` (1024px) el contenido conserva un ancho útil incluso con la barra descontada.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="lg:flex lg:min-h-screen">
      <Sidebar />
      {/*
       * `lg:pl-64`: el contenido no se posiciona junto a la barra por flexbox — la barra es
       * `lg:fixed` para que no se desplace con el scroll de una pantalla larga (mensajes,
       * semestres archivados). Sin el padding equivalente, el contenido arrancaría debajo de
       * la barra en vez de a su derecha.
       */}
      <div className="lg:min-w-0 lg:flex-1 lg:pl-64">{children}</div>
    </div>
  );
}

function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  return (
    <aside
      aria-label="Secciones"
      className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-filete lg:bg-papel2"
    >
      <Link
        href="/"
        className="flex items-center gap-nc-xs px-nc-md py-nc-lg transition-opacity duration-100 hover:opacity-80"
      >
        <Logo size={28} />
        <span className="text-lg font-medium text-tinta">NoteCore</span>
      </Link>

      <nav className="min-h-0 flex-1 space-y-nc-3xs overflow-y-auto px-nc-sm">
        {SECCIONES.map((seccion) => {
          // La sección activa es la ruta exacta o cualquier subruta suya (p. ej. `/u/alguien`
          // no forma parte de ninguna, pero `/mensajes?con=@x` sí debe marcar «Mensajes»).
          const activa =
            pathname === seccion.href || pathname.startsWith(`${seccion.href}/`);

          return (
            <Link
              key={seccion.href}
              href={seccion.href}
              aria-current={activa ? 'page' : undefined}
              className={`block rounded-md px-nc-sm py-nc-xs text-md font-medium transition-colors duration-100 ${
                activa
                  ? 'bg-acento/15 text-acento'
                  : 'text-tinta2 hover:bg-papel3 hover:text-tinta'
              }`}
            >
              {seccion.nombre}
            </Link>
          );
        })}
      </nav>

      {/*
        La app Android (Fase 17). Va aquí abajo y no en `SECCIONES` a propósito: no es una
        sección del producto sino una descarga, y ponerla en la lista la haría competir con
        el horario y la agenda por la atención de quien ya está trabajando en la web.
      */}
      <Link
        href="/app"
        className="mx-nc-sm rounded-md px-nc-sm py-nc-xs text-sm text-tinta3 transition-colors duration-100 hover:bg-papel3 hover:text-tinta"
      >
        App para Android
      </Link>

      <div className="space-y-nc-xs border-t border-filete px-nc-md py-nc-md">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-tinta">{user.displayName}</p>
          <p className="truncate font-mono text-xs text-tinta3">@{user.username}</p>
        </div>
        <Button variant="ghost" size="sm" className="w-full" onClick={() => void logout()}>
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
