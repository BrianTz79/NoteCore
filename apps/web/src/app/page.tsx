// Verificación de la Fase 0: un tipo y una regla definidos en `packages/shared`,
// importados desde la web sin redefinirlos (Principio VIII).
import {
  calculateAbsenceLimit,
  ABSENCE_LIMIT_DISCLAIMER,
  WEEKDAYS,
  type Weekday,
} from '@notecore/shared';

export default function HomePage() {
  const ejemplo = calculateAbsenceLimit(80);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">NoteCore</h1>
        <p className="text-slate-400">
          El núcleo de tu vida académica. Fase 0 — cimientos en marcha.
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
          Código compartido en funcionamiento
        </h2>
        <p className="text-slate-200">
          Con {ejemplo.totalSessions} sesiones en el semestre, el límite sugerido es de{' '}
          <strong className="font-semibold text-white">{ejemplo.suggested} faltas</strong>.
        </p>
        <p className="text-sm text-slate-400">{ABSENCE_LIMIT_DISCLAIMER}</p>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
          Días de clase
        </h2>
        <ul className="flex flex-wrap gap-2">
          {WEEKDAYS.map((dia: Weekday) => (
            <li
              key={dia}
              className="rounded-md bg-slate-800 px-3 py-1 text-sm capitalize text-slate-200"
            >
              {dia}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
