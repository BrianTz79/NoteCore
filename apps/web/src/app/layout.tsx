import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { SyncProvider } from '@/lib/sync-context';
import './globals.css';

/**
 * Las tres familias del sistema (design.md § Tipografía).
 *
 * `next/font` las descarga en tiempo de compilación y las sirve desde el propio dominio: no
 * hay petición a Google en tiempo de ejecución, así que la web sigue cargando su tipografía
 * en el wifi del campus detrás de un portal cautivo. `display: 'swap'` deja que el texto se
 * lea con la fuente del sistema mientras llega la definitiva, en lugar de dejar la pantalla
 * en blanco.
 */
const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-display-cargada',
  display: 'swap',
});

const cuerpo = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-cuerpo-cargada',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono-cargada',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'NoteCore',
  description:
    'El núcleo de tu vida académica: horario, control de faltas y agenda de tareas.',
};

/**
 * `themeColor` pinta la barra del navegador del color del papel: en el móvil, una franja
 * blanca sobre una aplicación oscura se ve como un fallo de carga.
 */
export const viewport: Viewport = {
  themeColor: '#0b0f18',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="es"
      className={`${display.variable} ${cuerpo.variable} ${mono.variable}`}
      style={{
        // Las variables del sistema apuntan a las fuentes que `next/font` acaba de cargar.
        // Los tokens siguen siendo los de `tokens.css`; esto solo rellena la familia real
        // detrás del nombre, que en compilación aún no se conoce.
        ['--font-display' as string]: `var(--font-display-cargada), system-ui, sans-serif`,
        ['--font-cuerpo' as string]: `var(--font-cuerpo-cargada), system-ui, sans-serif`,
        ['--font-mono' as string]: `var(--font-mono-cargada), ui-monospace, monospace`,
      }}
    >
      <body className="min-h-screen bg-papel text-tinta antialiased">
        {/* La sesión se comprueba una vez arriba y la comparten todas las páginas. */}
        <AuthProvider>
          {/*
           * El cache va dentro de la sesión: sus claves llevan el identificador del usuario
           * para que dos cuentas en el mismo navegador no compartan lo guardado.
           */}
          <SyncProvider>{children}</SyncProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
