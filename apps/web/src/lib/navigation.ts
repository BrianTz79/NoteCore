/**
 * Las nueve secciones de la aplicación, en el orden en que se navegan.
 *
 * Un solo lugar para dos consumidores: la rejilla "Ir a" del inicio (`page.tsx`, visible solo
 * en móvil desde la Fase 14) y la barra lateral fija de escritorio (`AppShell`). Antes de la
 * Fase 14 esta lista solo existía dentro de `page.tsx`; separarla es lo que evita que las dos
 * navegaciones diverjan en silencio si algún día se añade o se renombra una sección.
 */
export const SECCIONES = [
  { href: '/horario', nombre: 'Horario', nota: 'Tu semana' },
  { href: '/faltas', nombre: 'Faltas', nota: 'Conteo y límites' },
  { href: '/agenda', nombre: 'Agenda', nota: 'Tareas y entregas' },
  { href: '/calendario', nombre: 'Calendario', nota: 'Clases y vencimientos' },
  { href: '/compartir', nombre: 'Compartir', nota: 'Por QR, código o enlace' },
  { href: '/semestres', nombre: 'Periodos', nota: 'Semestres y archivo' },
  { href: '/social', nombre: 'Contactos', nota: 'Perfil y compañeros' },
  { href: '/mensajes', nombre: 'Mensajes', nota: 'Con tus contactos' },
  { href: '/perfil', nombre: 'Mi cuenta', nota: 'Perfil y dispositivos' },
] as const;
