/**
 * Reglas del horario: horas de reloj, solapes y disposición de la rejilla semanal.
 *
 * Principio II: la API valida con estas mismas funciones. Los clientes las usan para
 * presentar y para dar feedback inmediato, nunca para decidir por su cuenta.
 */

import type { ClockTime, ScheduleEntry, Subject } from '../types/schedule.js';
import { SUBJECT_COLORS } from '../types/schedule.js';
import { WEEKDAYS, type Weekday } from '../types/common.js';

/** Minutos transcurridos desde medianoche. Facilita comparar y ordenar horas. */
export function minutesOfDay(time: ClockTime): number {
  const [hours, minutes] = time.split(':');
  return Number(hours) * 60 + Number(minutes);
}

/** Vuelve de minutos a `HH:MM`, con el cero delante donde haga falta. */
export function clockTimeFromMinutes(minutes: number): ClockTime {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

/**
 * Normaliza una hora escrita de las muchas formas en que la IA puede devolverla.
 *
 * Acepta `7:00`, `07:00`, `07:00:00` y `7.00`, y devuelve siempre `HH:MM`. Devuelve `null`
 * si no es una hora válida —incluido `25:00` o `07:75`, que tienen la forma correcta pero
 * no existen—. La v1 no hacía nada de esto y metía en la base de datos lo que llegara.
 */
export function normalizeClockTime(value: unknown): ClockTime | null {
  if (typeof value !== 'string') return null;

  const match = /^(\d{1,2})[:.](\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) return null;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Nombres de día que se aceptan al importar, mapeados al valor canónico.
 *
 * La IA escribe el día como le parece: con acento o sin él, en mayúsculas o no, a veces
 * abreviado o como número (1 = lunes, como en el horario del TecNM).
 */
const WEEKDAY_ALIASES: Readonly<Record<string, Weekday>> = {
  lunes: 'lunes',
  lun: 'lunes',
  l: 'lunes',
  '1': 'lunes',
  martes: 'martes',
  mar: 'martes',
  '2': 'martes',
  miercoles: 'miercoles',
  mie: 'miercoles',
  mier: 'miercoles',
  x: 'miercoles',
  '3': 'miercoles',
  jueves: 'jueves',
  jue: 'jueves',
  j: 'jueves',
  '4': 'jueves',
  viernes: 'viernes',
  vie: 'viernes',
  v: 'viernes',
  '5': 'viernes',
  sabado: 'sabado',
  sab: 'sabado',
  s: 'sabado',
  '6': 'sabado',
};

/**
 * Interpreta el día de la semana venga como venga.
 *
 * Quita los acentos antes de buscar, así que "Miércoles" y "miercoles" resuelven igual.
 * Devuelve `null` si no reconoce el valor —incluido el domingo, que no es día de clase—.
 */
export function normalizeWeekday(value: unknown): Weekday | null {
  if (typeof value === 'number') {
    return WEEKDAY_ALIASES[String(value)] ?? null;
  }

  if (typeof value !== 'string') return null;

  const clean = value
    .trim()
    .toLowerCase()
    // Descompone las vocales acentuadas y descarta la tilde: "miércoles" → "miercoles".
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.$/, '');

  return WEEKDAY_ALIASES[clean] ?? null;
}

/** Nombre del día tal como se muestra en la interfaz. */
export const WEEKDAY_LABELS: Readonly<Record<Weekday, string>> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
};

/** Abreviatura de tres letras, para las cabeceras estrechas de la app. */
export const WEEKDAY_SHORT_LABELS: Readonly<Record<Weekday, string>> = {
  lunes: 'Lun',
  martes: 'Mar',
  miercoles: 'Mié',
  jueves: 'Jue',
  viernes: 'Vie',
  sabado: 'Sáb',
};

/**
 * Color que le toca a la materia número `index`.
 *
 * Rota sobre la paleta, así que materias creadas seguidas nunca salen del mismo color
 * (FR-010). Al pasar de la última vuelve a empezar.
 */
export function subjectColorForIndex(index: number): string {
  const palette = SUBJECT_COLORS;
  // El módulo de un negativo es negativo en JavaScript; se normaliza para no indexar fuera.
  const position = ((index % palette.length) + palette.length) % palette.length;
  return palette[position] as string;
}

/** Dos sesiones se solapan si comparten día y sus rangos horarios se cruzan. */
export function blocksOverlap(
  a: { weekday: Weekday; startTime: ClockTime; endTime: ClockTime },
  b: { weekday: Weekday; startTime: ClockTime; endTime: ClockTime },
): boolean {
  if (a.weekday !== b.weekday) return false;

  // Se comparan con `<` estricto para que una clase que acaba a las 09:00 y otra que
  // empieza a las 09:00 no cuenten como solape: son consecutivas, no simultáneas.
  return minutesOfDay(a.startTime) < minutesOfDay(b.endTime)
    && minutesOfDay(b.startTime) < minutesOfDay(a.endTime);
}

/** Aplana las materias a sesiones sueltas listas para pintar, ordenadas por día y hora. */
export function toScheduleEntries(subjects: readonly Subject[]): readonly ScheduleEntry[] {
  const entries: ScheduleEntry[] = [];

  for (const subject of subjects) {
    for (const block of subject.blocks) {
      entries.push({
        blockId: block.id,
        subjectId: subject.id,
        subjectName: subject.name,
        color: subject.color,
        weekday: block.weekday,
        startTime: block.startTime,
        endTime: block.endTime,
        room: block.room,
      });
    }
  }

  return entries.sort((a, b) => {
    const byDay = WEEKDAYS.indexOf(a.weekday) - WEEKDAYS.indexOf(b.weekday);
    if (byDay !== 0) return byDay;
    return minutesOfDay(a.startTime) - minutesOfDay(b.startTime);
  });
}

/** Las sesiones de un día concreto, ya ordenadas por hora. */
export function entriesForWeekday(
  entries: readonly ScheduleEntry[],
  weekday: Weekday,
): readonly ScheduleEntry[] {
  return entries.filter((entry) => entry.weekday === weekday);
}

/**
 * Franja horaria que debe cubrir la rejilla semanal.
 *
 * Se ajusta al horario real del estudiante en lugar de pintar las 24 horas: quien entra a
 * las 07:00 y sale a las 14:00 no necesita ver la madrugada. Las horas se redondean a la
 * hora en punto para que las etiquetas del eje queden limpias.
 */
export interface ScheduleRange {
  /** Hora de la primera línea de la rejilla. */
  readonly startHour: number;
  /** Hora de la última línea, exclusiva. */
  readonly endHour: number;
  /** Días con al menos una clase; si no hay ninguna, la semana de lunes a viernes. */
  readonly weekdays: readonly Weekday[];
}

/** Franja por defecto cuando aún no hay clases que enmarcar. */
const DEFAULT_RANGE: ScheduleRange = {
  startHour: 7,
  endHour: 15,
  weekdays: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
};

export function scheduleRange(entries: readonly ScheduleEntry[]): ScheduleRange {
  if (entries.length === 0) return DEFAULT_RANGE;

  let earliest = Number.POSITIVE_INFINITY;
  let latest = Number.NEGATIVE_INFINITY;
  const days = new Set<Weekday>();

  for (const entry of entries) {
    earliest = Math.min(earliest, minutesOfDay(entry.startTime));
    latest = Math.max(latest, minutesOfDay(entry.endTime));
    days.add(entry.weekday);
  }

  // El sábado solo aparece si hay clase ese día; el resto de la semana se muestra siempre
  // hasta el viernes para que la rejilla no cambie de ancho al borrar una materia.
  const weekdays = WEEKDAYS.filter(
    (day) => day !== 'sabado' || days.has('sabado'),
  );

  return {
    startHour: Math.floor(earliest / 60),
    // Se redondea hacia arriba para que la última clase quepa entera en la rejilla.
    endHour: Math.ceil(latest / 60),
    weekdays,
  };
}

/**
 * Prompt que el estudiante copia y pega en la IA junto a la foto de su horario (FR-006).
 *
 * Vive en `shared` porque web y app deben entregar exactamente el mismo texto: si
 * divergieran, cada cliente aceptaría un JSON distinto y la importación dejaría de ser
 * equivalente entre plataformas.
 *
 * Pide explícitamente formato de 24 horas y JSON sin envolver en Markdown, que son los dos
 * fallos que más repetía la IA en la v1.
 */
export const IMPORT_PROMPT = `Actúa como un extractor de datos estructurados.

Analiza la imagen adjunta de mi horario universitario. Ignora los elementos de interfaz de la página y extrae únicamente la información de las clases.

Responde EXCLUSIVAMENTE con un arreglo JSON, sin texto antes ni después y sin bloques de código Markdown, con esta estructura:

[
  {
    "materia": "Nombre de la materia",
    "sesiones": [
      { "dia": "Lunes", "hora_inicio": "07:00", "hora_fin": "09:00", "aula": "91L4" }
    ]
  }
]

Reglas:
- Agrupa TODAS las sesiones de una misma materia dentro de su arreglo "sesiones".
- Las horas van en formato de 24 horas "HH:MM" (por ejemplo "15:00", nunca "3:00 PM").
- "dia" es uno de: Lunes, Martes, Miércoles, Jueves, Viernes, Sábado.
- Si una sesión no indica aula, omite el campo "aula" o déjalo en null.
- No inventes materias ni sesiones que no aparezcan en la imagen.`;
