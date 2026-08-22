/**
 * Reglas del aviso de la siguiente clase (Fase 27).
 *
 * Principio II: la hora a la que salta el aviso y el texto que dice se calculan aquí, y la API
 * los resuelve con estas mismas funciones. Los clientes programan y presentan; no restan
 * minutos por su cuenta.
 *
 * ## Por qué vive en su propio módulo y no en `calendar.ts`
 *
 * Porque no es un recordatorio de calendario. Un recordatorio de la Fase 5 apunta a una fecha
 * —una entrega vence una vez— y el cliente lo programa como un disparador de fecha única. Un
 * aviso de clase es **recurrencia semanal**: el mismo día de la semana, la misma hora, todas
 * las semanas mientras el semestre siga abierto. Comparte tipo de dato con el horario
 * (`Weekday` + `ClockTime`), no con el calendario, y mezclarlos habría empujado a tratar la
 * clase como un instante, que es justo lo que la Fase 2 decidió no hacer.
 */

import type { ClockTime, ScheduleEntry } from '../types/schedule.js';
import { WEEKDAYS, type Weekday } from '../types/common.js';
import type {
  ClassAlert,
  ClassAlertLeadMinutes,
  ClassAlertSettings,
} from '../types/calendar.js';
import { clockTimeFromMinutes, minutesOfDay } from './schedule.js';

/**
 * Antelación por defecto: cinco minutos.
 *
 * Es el margen para levantarse y salir hacia el aula. Solo aplica a quien encienda el aviso
 * —arranca apagado (`DEFAULT_CLASS_ALERTS_ENABLED`)—.
 */
export const DEFAULT_CLASS_ALERT_LEAD_MINUTES: ClassAlertLeadMinutes = 5;

/**
 * El aviso de clase arranca **apagado**, y es una decisión, no un descuido.
 *
 * Un horario normal son veinticinco clases a la semana. Encender esto por defecto sería
 * veinticinco notificaciones semanales que nadie pidió, que es precisamente el volumen que
 * lleva a alguien a desactivar los avisos de una app entera —incluidos los recordatorios de
 * entrega, que sí quería—. La Fase 5 ya tomó esta misma decisión para los recordatorios y por
 * el mismo motivo.
 */
export const DEFAULT_CLASS_ALERTS_ENABLED = false;

/** Ajustes de quien nunca ha tocado la pantalla: apagado, con la antelación por defecto. */
export function defaultClassAlertSettings(updatedAt: Date): ClassAlertSettings {
  return {
    enabled: DEFAULT_CLASS_ALERTS_ENABLED,
    leadMinutes: DEFAULT_CLASS_ALERT_LEAD_MINUTES,
    updatedAt,
  };
}

/**
 * A qué hora salta el aviso de una clase que empieza a `startTime`.
 *
 * Devuelve también si restar la antelación cruzó la medianoche. Ese caso solo aparece con una
 * clase que empiece antes de las 00:30 —no es un horario real, pero sí algo que alguien puede
 * teclear—, y hay que distinguirlo porque la hora resultante pertenecería al **día anterior**:
 * programarla tal cual haría saltar el aviso el día equivocado de la semana.
 */
export function classAlertTime(
  startTime: ClockTime,
  leadMinutes: ClassAlertLeadMinutes,
): { alertAt: ClockTime; crossesMidnight: boolean } {
  const inicio = minutesOfDay(startTime);
  const aviso = inicio - leadMinutes;

  if (aviso < 0) {
    // Se devuelve la hora envuelta al día anterior por completitud, pero marcada: quien la
    // consuma decide, y el cliente decide no programarla.
    return { alertAt: clockTimeFromMinutes(aviso + 24 * 60), crossesMidnight: true };
  }

  return { alertAt: clockTimeFromMinutes(aviso), crossesMidnight: false };
}

/**
 * Convierte las sesiones del horario en avisos, ya ordenados.
 *
 * Toma `ScheduleEntry` —la sesión con su materia ya resuelta— porque es lo que tanto la API
 * como los clientes tienen a mano, y evita cruzar dos listas para saber el nombre de la
 * materia que va a decir la notificación.
 */
export function buildClassAlerts(
  entries: readonly ScheduleEntry[],
  leadMinutes: ClassAlertLeadMinutes,
): ClassAlert[] {
  return entries
    .map((entry) => {
      const { alertAt, crossesMidnight } = classAlertTime(entry.startTime, leadMinutes);

      return {
        blockId: entry.blockId,
        subjectId: entry.subjectId,
        subjectName: entry.subjectName,
        weekday: entry.weekday,
        startTime: entry.startTime,
        endTime: entry.endTime,
        room: entry.room,
        alertAt,
        crossesMidnight,
      };
    })
    .sort(
      (a, b) =>
        ordenDeDia(a.weekday) - ordenDeDia(b.weekday) ||
        minutesOfDay(a.startTime) - minutesOfDay(b.startTime) ||
        a.subjectName.localeCompare(b.subjectName),
    );
}

/**
 * Texto de la notificación de clase, igual en cualquier dispositivo (Principio VIII).
 *
 * Dice la materia, cuándo empieza y dónde. El aula es lo que más se agradece en un edificio
 * que no se conoce, así que va en el cuerpo y no se omite cuando existe; cuando no existe no
 * se inventa ni se escribe "sin aula", que solo ocuparía sitio.
 */
export function classAlertMessage(alert: ClassAlert): string {
  const donde = alert.room ? ` · ${alert.room}` : '';
  return `Empieza a las ${alert.startTime}${donde}`;
}

/** Título de la notificación: la materia, que es lo que se lee de un vistazo. */
export function classAlertTitle(alert: ClassAlert): string {
  return alert.subjectName;
}

/**
 * Orden de los días, derivado de `WEEKDAYS` en lugar de escrito a mano.
 *
 * Un mapa literal con los seis días habría sido más corto de leer, pero es una segunda
 * definición del mismo orden: añadir el domingo a `WEEKDAYS` dejaría esto silenciosamente
 * incompleto y los avisos de ese día se ordenarían todos como si fueran el primero.
 */
function ordenDeDia(weekday: Weekday): number {
  return WEEKDAYS.indexOf(weekday);
}
