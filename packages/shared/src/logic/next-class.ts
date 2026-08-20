/**
 * Qué clase toca ahora y cuál viene después (Fase 11).
 *
 * Lo consumen tres sitios: el inicio de la web, el inicio de la app y el **widget de
 * pantalla principal** de Android (FR-051). Los tres deben decir exactamente lo mismo a la
 * misma hora, así que la regla vive aquí y no en ninguno de ellos —Principio II—.
 *
 * El widget merece una nota: corre en el proceso del lanzador de Android, sin JavaScript.
 * No puede llamar a estas funciones. Lo que hace la app es **ejecutarlas ella** al
 * sincronizar y dejar el resultado ya resuelto donde el widget lo lee. La regla sigue
 * siendo esta y solo esta; lo que cambia es quién la ejecuta y cuándo.
 */

import type { ScheduleEntry } from '../types/schedule.js';
import type { Weekday } from '../types/common.js';
import { WEEKDAYS } from '../types/common.js';
import { minutesOfDay } from './schedule.js';

/**
 * Momento de la semana en que se hace la consulta.
 *
 * Se pasa como parámetro en lugar de leer el reloj dentro: así la función es pura y se
 * puede comprobar a cualquier hora sin tocar el reloj del sistema, que es justo lo que hace
 * falta para verificar el widget sin esperar a que sean las siete de la mañana.
 */
export interface WeekMoment {
  /** Día de la semana. `null` en domingo, que no es día de clase. */
  readonly weekday: Weekday | null;
  /** Minutos desde la medianoche de ese día. */
  readonly minutes: number;
}

/** Lee el momento actual del reloj del dispositivo. */
export function currentWeekMoment(now: Date = new Date()): WeekMoment {
  const day = now.getDay();
  return {
    weekday: day === 0 ? null : (WEEKDAYS[day - 1] as Weekday),
    minutes: now.getHours() * 60 + now.getMinutes(),
  };
}

/**
 * Estado de una clase respecto al momento consultado.
 *
 * - `en_curso`: ha empezado y no ha terminado.
 * - `siguiente`: la próxima que empieza, sea hoy o cualquier día de la semana.
 */
export type ClassTiming = 'en_curso' | 'siguiente';

export interface UpcomingClass {
  readonly entry: ScheduleEntry;
  readonly timing: ClassTiming;
  /**
   * Minutos que faltan para que empiece, o que lleva en curso si ya empezó.
   *
   * Para una clase de otro día incluye el tiempo hasta ese día. Los clientes lo convierten
   * a texto con `describeUpcoming`, que es lo que evita que cada uno redacte lo suyo.
   */
  readonly minutesAway: number;
}

/** Minutos que hay entre dos momentos de la semana, avanzando siempre hacia adelante. */
function minutesUntil(from: WeekMoment, toWeekday: Weekday, toMinutes: number): number {
  const MINUTES_PER_DAY = 24 * 60;

  // El domingo se trata como el día anterior al lunes: `WEEKDAYS.indexOf` daría -1 para un
  // día que no está en la lista, y aquí lo que hace falta es un índice que ordene.
  const fromIndex = from.weekday === null ? -1 : WEEKDAYS.indexOf(from.weekday);
  const toIndex = WEEKDAYS.indexOf(toWeekday);

  const dayDelta = toIndex - fromIndex;
  const raw = dayDelta * MINUTES_PER_DAY + (toMinutes - from.minutes);

  // Si ya pasó esta semana, la siguiente vez que ocurre es dentro de siete días.
  return raw >= 0 ? raw : raw + 7 * MINUTES_PER_DAY;
}

/**
 * La clase en curso si la hay; si no, la próxima que empieza.
 *
 * Devuelve `null` cuando el horario está vacío. **Da la vuelta a la semana**: consultado un
 * viernes por la tarde, responde con la primera clase del lunes en lugar de decir que no
 * hay nada —que es lo que el estudiante quiere saber al mirar el widget el fin de semana—.
 */
export function nextClass(
  entries: readonly ScheduleEntry[],
  moment: WeekMoment = currentWeekMoment(),
): UpcomingClass | null {
  if (entries.length === 0) return null;

  // Una clase en curso gana siempre: es la información más útil a esa hora, y solo puede
  // haber una porque la API rechaza los solapes al guardar.
  if (moment.weekday !== null) {
    for (const entry of entries) {
      if (entry.weekday !== moment.weekday) continue;
      const start = minutesOfDay(entry.startTime);
      const end = minutesOfDay(entry.endTime);
      if (start <= moment.minutes && moment.minutes < end) {
        return { entry, timing: 'en_curso', minutesAway: moment.minutes - start };
      }
    }
  }

  let mejor: UpcomingClass | null = null;

  for (const entry of entries) {
    const away = minutesUntil(moment, entry.weekday, minutesOfDay(entry.startTime));
    if (mejor === null || away < mejor.minutesAway) {
      mejor = { entry, timing: 'siguiente', minutesAway: away };
    }
  }

  return mejor;
}

/** Las clases que quedan hoy después del momento consultado, en orden. */
export function remainingToday(
  entries: readonly ScheduleEntry[],
  moment: WeekMoment = currentWeekMoment(),
): readonly ScheduleEntry[] {
  if (moment.weekday === null) return [];

  return entries
    .filter(
      (entry) =>
        entry.weekday === moment.weekday && minutesOfDay(entry.endTime) > moment.minutes,
    )
    .sort((a, b) => minutesOfDay(a.startTime) - minutesOfDay(b.startTime));
}

/**
 * Cuánto falta, en palabras.
 *
 * Redacta en la escala que corresponde: minutos hasta la hora, horas hasta el día, y el
 * nombre del día a partir de ahí. Decir «faltan 3 420 minutos» es información sin
 * traducir; decir «el lunes» es la respuesta.
 */
export function describeUpcoming(upcoming: UpcomingClass): string {
  if (upcoming.timing === 'en_curso') {
    return 'Ahora mismo';
  }

  const minutos = upcoming.minutesAway;

  if (minutos < 1) return 'Empieza ya';
  if (minutos < 60) return `En ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 12) {
    const resto = minutos % 60;
    return resto === 0 ? `En ${horas} h` : `En ${horas} h ${resto} min`;
  }

  // A partir de medio día de distancia, el nombre del día informa más que las horas.
  const LABELS: Readonly<Record<Weekday, string>> = {
    lunes: 'el lunes',
    martes: 'el martes',
    miercoles: 'el miércoles',
    jueves: 'el jueves',
    viernes: 'el viernes',
    sabado: 'el sábado',
  };

  return `Empieza ${LABELS[upcoming.entry.weekday]}`;
}

/**
 * Lo que el widget de Android muestra, ya resuelto a texto.
 *
 * Es deliberadamente plano y sin fechas: al otro lado hay Kotlin leyendo JSON, y cuanto
 * menos tenga que interpretar, menos regla se duplica en un lenguaje donde nadie la
 * revisaría después.
 */
export interface WidgetSnapshot {
  /** Nombre de la materia en curso o próxima. `null` si no hay horario. */
  readonly subjectName: string | null;
  /** Color de la materia, `#RRGGBB`. `null` si no hay horario. */
  readonly color: string | null;
  /** "07:00–09:00". Cadena vacía si no hay horario. */
  readonly timeRange: string;
  /** Aula, si la materia la tiene. */
  readonly room: string | null;
  /** "Ahora mismo", "En 25 min", "Empieza el lunes". */
  readonly whenLabel: string;
  /** Cuántas clases quedan hoy contando la actual. */
  readonly remainingToday: number;
  /** Momento en que la app resolvió esto, para que el widget muestre su antigüedad. */
  readonly generatedAt: string;
}

/**
 * Resuelve el estado del widget a partir del horario.
 *
 * La ejecuta la app —no el widget— y deja el resultado donde Android lo lee. Ver la nota
 * de cabecera del módulo.
 */
export function widgetSnapshot(
  entries: readonly ScheduleEntry[],
  moment: WeekMoment = currentWeekMoment(),
  now: Date = new Date(),
): WidgetSnapshot {
  const upcoming = nextClass(entries, moment);
  const quedan = remainingToday(entries, moment);

  if (upcoming === null) {
    return {
      subjectName: null,
      color: null,
      timeRange: '',
      room: null,
      whenLabel: 'Sin horario todavía',
      remainingToday: 0,
      generatedAt: now.toISOString(),
    };
  }

  return {
    subjectName: upcoming.entry.subjectName,
    color: upcoming.entry.color,
    timeRange: `${upcoming.entry.startTime}–${upcoming.entry.endTime}`,
    room: upcoming.entry.room,
    whenLabel: describeUpcoming(upcoming),
    remainingToday: quedan.length,
    generatedAt: now.toISOString(),
  };
}
