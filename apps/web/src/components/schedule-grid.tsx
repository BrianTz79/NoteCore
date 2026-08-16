'use client';

import {
  WEEKDAY_LABELS,
  WEEKDAY_SHORT_LABELS,
  entriesForWeekday,
  minutesOfDay,
  scheduleRange,
  type ScheduleEntry,
} from '@notecore/shared';

/**
 * Vista semanal del horario (FR-009).
 *
 * Rejilla de horas × días donde cada clase se posiciona por su hora real, no por su orden
 * en una lista: así los huecos entre clases se ven como huecos, que es justo lo que un
 * estudiante busca al mirar su horario.
 *
 * Cada materia lleva su color (FR-010), el mismo que se ve en la app.
 */

/** Alto en píxeles de una hora de clase. Fija la escala vertical de toda la rejilla. */
const HOUR_HEIGHT = 60;

export function ScheduleGrid({
  entries,
  onSelect,
}: {
  entries: readonly ScheduleEntry[];
  onSelect?: (entry: ScheduleEntry) => void;
}) {
  const range = scheduleRange(entries);
  const hours = Array.from(
    { length: range.endHour - range.startHour },
    (_, index) => range.startHour + index,
  );
  const totalHeight = hours.length * HOUR_HEIGHT;

  return (
    // La rejilla se desplaza en horizontal dentro de su propio contenedor: en una pantalla
    // estrecha se arrastra, y la página nunca se desborda a lo ancho.
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50">
      <div className="min-w-[640px] p-4">
        <div
          className="grid gap-px"
          // La primera columna es el eje de horas, más estrecha que los días.
          style={{ gridTemplateColumns: `3.5rem repeat(${range.weekdays.length}, 1fr)` }}
        >
          <div aria-hidden />
          {range.weekdays.map((day) => (
            <div
              key={day}
              className="pb-2 text-center text-sm font-medium text-slate-300"
            >
              <span className="hidden sm:inline">{WEEKDAY_LABELS[day]}</span>
              <span className="sm:hidden">{WEEKDAY_SHORT_LABELS[day]}</span>
            </div>
          ))}

          <div className="relative" style={{ height: totalHeight }}>
            {hours.map((hour, index) => (
              <div
                key={hour}
                className="absolute right-2 -translate-y-1/2 text-xs tabular-nums text-slate-500"
                style={{ top: index * HOUR_HEIGHT }}
              >
                {String(hour).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {range.weekdays.map((day) => (
            <div
              key={day}
              className="relative border-l border-slate-800"
              style={{ height: totalHeight }}
            >
              {hours.map((hour, index) => (
                <div
                  key={hour}
                  className="absolute inset-x-0 border-t border-slate-800/70"
                  style={{ top: index * HOUR_HEIGHT }}
                />
              ))}

              {entriesForWeekday(entries, day).map((entry) => {
                const top =
                  ((minutesOfDay(entry.startTime) - range.startHour * 60) / 60) * HOUR_HEIGHT;
                const height =
                  ((minutesOfDay(entry.endTime) - minutesOfDay(entry.startTime)) / 60) *
                  HOUR_HEIGHT;

                return (
                  <button
                    key={entry.blockId}
                    type="button"
                    onClick={onSelect ? () => onSelect(entry) : undefined}
                    // El borde izquierdo lleva el color de la materia y el fondo una versión
                    // translúcida: el texto conserva contraste sea cual sea el color.
                    style={{
                      top,
                      height,
                      borderLeftColor: entry.color,
                      backgroundColor: `${entry.color}33`,
                    }}
                    className="absolute inset-x-1 overflow-hidden rounded border-l-4 px-2 py-1 text-left transition hover:brightness-125"
                  >
                    <p className="truncate text-xs font-medium text-slate-100">
                      {entry.subjectName}
                    </p>
                    <p className="truncate text-[11px] tabular-nums text-slate-300">
                      {entry.startTime}–{entry.endTime}
                    </p>
                    {entry.room ? (
                      <p className="truncate text-[11px] text-slate-400">{entry.room}</p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
