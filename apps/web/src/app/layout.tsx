import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

export const metadata: Metadata = {
  title: 'NoteCore',
  description:
    'El núcleo de tu vida académica: horario, control de faltas y agenda de tareas.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {/* La sesión se comprueba una vez arriba y la comparten todas las páginas. */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
