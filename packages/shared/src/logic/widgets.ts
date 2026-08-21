/**
 * La familia de widgets de pantalla principal (FR-051, Fase 16).
 *
 * ## Por qué existe este módulo aparte de `next-class.ts`
 *
 * La Fase 11 dejó un widget —la próxima clase— y su estado resuelto vive en
 * `widgetSnapshot()`, junto a la regla que lo alimenta. La Fase 16 añade tres widgets más
 * —el día completo, las faltas cerca del límite y lo que vence pronto— y esos **no salen
 * del horario**: salen del panel de faltas y de la agenda, que son otras dos reglas ya
 * escritas en `attendance.ts` y `agenda.ts`. Ponerlos en `next-class.ts` habría convertido
 * un módulo sobre "qué clase toca" en un cajón sobre "qué pinta Android".
 *
 * ## El reparto sigue siendo el mismo, y es lo que importa
 *
 * El widget corre en el proceso del lanzador de Android: no tiene JavaScript, ni sesión, ni
 * forma de llamar a la API. **No decide nada.** La app ejecuta estas funciones al
 * sincronizar y deja el resultado —ya resuelto a texto y a color— donde el Kotlin lo lee y
 * lo pinta. Si un widget nuevo calculara por su cuenta qué falta está cerca del límite, esa
 * regla existiría en dos idiomas y la copia de Kotlin envejecería sin que nadie la
 * revisara. Es el Principio II aplicado fuera de la app, que es donde se olvida.
 *
 * Todo lo que sale de aquí es **plano**: cadenas, números y colores `#RRGGBB`. Ninguna
 * fecha, ningún objeto anidado que Kotlin tenga que interpretar.
 */

import type { AgendaItem, AgendaList } from '../types/agenda.js';
import type { AttendanceSummary } from '../types/attendance.js';
import type { ScheduleEntry } from '../types/schedule.js';
import { AGENDA_URGENCY_COLORS, dueDateMessage } from './agenda.js';
import { ABSENCE_STATUS_COLORS } from './attendance.js';
import { minutesOfDay } from './schedule.js';
import {
  currentWeekMoment,
  nextClass,
  remainingToday,
  widgetSnapshot,
  type WeekMoment,
  type WidgetSnapshot,
} from './next-class.js';
import { COLOR } from '../design/tokens.js';

/**
 * Cuántas filas caben en los widgets de lista.
 *
 * Tres. No es un número redondo elegido al azar: un widget de dos celdas de alto da unos
 * 110dp útiles, y por debajo de ~30dp por fila el nombre de una materia deja de leerse a la
 * distancia a la que se mira una pantalla de inicio —que es de reojo, no de cerca—. Lo que
 * no cabe se resume en la línea del pie ("y 4 más"), que informa sin fingir que caben.
 */
export const WIDGET_MAX_FILAS = 3;

/**
 * Una fila de cualquiera de los widgets de lista.
 *
 * Las tres listas —día, faltas, agenda— comparten forma a propósito: así el Kotlin tiene
 * **un solo layout de fila** y un solo camino de pintado, en lugar de tres que divergen a
 * la primera corrección que se hace en uno y se olvida en los otros.
 */
export interface WidgetRow {
  /** Lo que se lee primero y en grande: la materia, o el título de la actividad. */
  readonly title: string;
  /** El dato de apoyo: la hora, las faltas restantes, cuándo vence. */
  readonly detail: string;
  /** Marca a la derecha, corta: "B101", "3 de 8", "hoy". Vacía si no aplica. */
  readonly trailing: string;
  /** Color de la barra lateral, `#RRGGBB`. Es la señal: materia, o urgencia. */
  readonly color: string;
  /** Si la fila señala algo que exige atención: se pinta el título en el color de alerta. */
  readonly alert: boolean;
}

/**
 * El estado de un widget de lista, resuelto entero.
 *
 * `emptyMessage` no es decoración: un widget sin filas y sin texto es un rectángulo vacío
 * en la pantalla de inicio, y el estudiante no sabe si es que no hay nada o es que la app
 * se rompió. Decirlo con palabras cuesta una cadena.
 */
export interface WidgetListSnapshot {
  /** Encabezado del widget: "HOY", "FALTAS", "VENCE PRONTO". */
  readonly title: string;
  /** Dato de una ojeada junto al título: "4 clases", "2 en riesgo", "3 pendientes". */
  readonly summary: string;
  readonly rows: readonly WidgetRow[];
  /** "y 4 más" cuando la lista no cabe entera. Vacío si cabe. */
  readonly footer: string;
  /** Qué decir cuando no hay ni una fila. */
  readonly emptyMessage: string;
  /** Momento en que la app resolvió esto. */
  readonly generatedAt: string;
}

/** Una lista vacía con su mensaje, que es lo único que cambia entre los tres widgets. */
function listaVacia(
  title: string,
  emptyMessage: string,
  now: Date,
): WidgetListSnapshot {
  return {
    title,
    summary: '',
    rows: [],
    footer: '',
    emptyMessage,
    generatedAt: now.toISOString(),
  };
}

/**
 * Recorta a `WIDGET_MAX_FILAS` y redacta el pie con lo que quedó fuera.
 *
 * Se escribe una vez porque los tres widgets lo necesitan igual, y porque "y 1 más" frente
 * a "y 4 más" es exactamente el detalle que se corrige en un sitio y se olvida en los otros
 * dos.
 */
function recortar(filas: readonly WidgetRow[]): {
  rows: readonly WidgetRow[];
  footer: string;
} {
  if (filas.length <= WIDGET_MAX_FILAS) return { rows: filas, footer: '' };

  const sobran = filas.length - WIDGET_MAX_FILAS;
  return {
    rows: filas.slice(0, WIDGET_MAX_FILAS),
    footer: sobran === 1 ? 'y 1 más' : `y ${sobran} más`,
  };
}

/**
 * El día completo: las clases que quedan hoy, en orden (widget «Hoy»).
 *
 * Muestra **lo que queda**, no el día entero desde las siete de la mañana: a las once, las
 * clases de las ocho ya no son información, son historial, y ocuparían las tres filas que
 * necesita lo que viene. `remainingToday` ya aplica ese criterio y lo comparte con el
 * inicio de la app y el de la web.
 *
 * En domingo devuelve la lista vacía con su mensaje: `remainingToday` responde `[]` porque
 * el domingo no es día de clase, y eso aquí se dice en palabras.
 */
export function widgetDia(
  entries: readonly ScheduleEntry[],
  moment: WeekMoment = currentWeekMoment(),
  now: Date = new Date(),
): WidgetListSnapshot {
  const quedan = remainingToday(entries, moment);

  if (quedan.length === 0) {
    // Los tres vacíos dicen cosas distintas a propósito. "No quedan clases hoy" un domingo
    // es verdad y a la vez desinforma: sugiere que hubo clases y ya pasaron. El domingo no
    // es día de clase, y decirlo así evita que el estudiante busque el error en su
    // horario.
    const mensaje =
      entries.length === 0
        ? 'Sin horario todavía'
        : moment.weekday === null
          ? 'Domingo: sin clases'
          : 'No quedan clases hoy';

    return listaVacia('HOY', mensaje, now);
  }

  const filas: WidgetRow[] = quedan.map((entry) => {
    // Una clase ya empezada se marca como tal: entre "10:00–12:00" y saber que es la que
    // está ocurriendo ahora, lo segundo es lo que se busca al mirar el teléfono.
    const enCurso =
      minutesOfDay(entry.startTime) <= moment.minutes &&
      moment.minutes < minutesOfDay(entry.endTime);

    return {
      title: entry.subjectName,
      detail: `${entry.startTime}–${entry.endTime}`,
      trailing: enCurso ? 'ahora' : (entry.room ?? ''),
      color: entry.color,
      alert: false,
    };
  });

  const { rows, footer } = recortar(filas);

  return {
    title: 'HOY',
    summary: quedan.length === 1 ? '1 clase' : `${quedan.length} clases`,
    rows,
    footer,
    emptyMessage: '',
    generatedAt: now.toISOString(),
  };
}

/**
 * Las materias cerca del límite de faltas o ya en él (widget «Faltas»).
 *
 * **No lista todas las materias.** Un widget que enseña las nueve, la mayoría en verde, no
 * dice nada de un vistazo: hay que leerlo entero para descubrir que no pasa nada. Aquí solo
 * entran las que están en `cerca` o `alcanzado` —el estado lo calcula la API con
 * `absenceStatus`, no este archivo—, y cuando ninguna lo está, el widget lo dice en una
 * línea. Es el mismo criterio del inicio: nada se muestra por completitud.
 *
 * El orden pone primero lo peor: las alcanzadas antes que las cercanas, y dentro de cada
 * grupo la que menos margen le queda.
 */
export function widgetFaltas(
  summary: AttendanceSummary | null,
  now: Date = new Date(),
): WidgetListSnapshot {
  if (summary === null || summary.subjects.length === 0) {
    return listaVacia('FALTAS', 'Sin materias todavía', now);
  }

  const enRiesgo = summary.subjects
    .filter((s) => s.status !== 'bien')
    .sort((a, b) => {
      // "alcanzado" pesa más que "cerca": es el que ya no tiene margen.
      if (a.status !== b.status) return a.status === 'alcanzado' ? -1 : 1;
      return a.remaining - b.remaining;
    });

  if (enRiesgo.length === 0) {
    return listaVacia('FALTAS', 'Ninguna materia en riesgo', now);
  }

  const filas: WidgetRow[] = enRiesgo.map((s) => ({
    title: s.subjectName,
    detail:
      s.status === 'alcanzado'
        ? 'Límite alcanzado'
        : s.remaining === 1
          ? 'Queda 1 falta'
          : `Quedan ${s.remaining} faltas`,
    trailing: `${s.absences}/${s.limit}`,
    color: ABSENCE_STATUS_COLORS[s.status],
    // Solo la materia que ya pasó el límite se pinta en rojo. Si también se marcara la
    // que está cerca, las dos se leerían igual de graves y la distinción se perdería.
    alert: s.status === 'alcanzado',
  }));

  const { rows, footer } = recortar(filas);

  return {
    title: 'FALTAS',
    summary: enRiesgo.length === 1 ? '1 en riesgo' : `${enRiesgo.length} en riesgo`,
    rows,
    footer,
    emptyMessage: '',
    generatedAt: now.toISOString(),
  };
}

/**
 * Lo que vence pronto (widget «Agenda»).
 *
 * Entran las pendientes **vencidas, de hoy y de la próxima semana** —las urgencias
 * `vencida`, `hoy` y `proxima` de `agendaUrgency`—. Lo lejano no cabe en tres filas y
 * tampoco es lo que se consulta de reojo: un examen dentro de un mes no cambia lo que se
 * hace esta tarde. La urgencia la trae ya calculada cada actividad desde la API.
 *
 * Lo vencido va primero y luego lo que antes vence, que es el mismo criterio de la pantalla
 * de agenda —una entrega que ya pasó es lo más urgente que hay, no algo a esconder al
 * final—.
 */
export function widgetAgenda(
  list: AgendaList | null,
  now: Date = new Date(),
): WidgetListSnapshot {
  if (list === null) {
    return listaVacia('VENCE PRONTO', 'Abre NoteCore para ver tu agenda', now);
  }

  const urgentes = [...list.pending]
    .filter(
      (item: AgendaItem) =>
        item.urgency === 'vencida' || item.urgency === 'hoy' || item.urgency === 'proxima',
    )
    /*
     * Se ordena por `daysUntilDue` y no con `sortByDueDate`.
     *
     * No es un capricho: `sortByDueDate` compara la cadena `dueDate`, que es la fecha
     * **límite**, y en la pantalla de agenda eso basta porque ahí se ve la fecha entera.
     * El widget muestra "Venció hace 2 días" / "Vence en 3 días", es decir `daysUntilDue`,
     * y ordenar por un dato distinto del que se lee produce una lista que parece
     * desordenada aunque no lo esté. Al haber filtrado ya las tres urgencias con fecha,
     * `daysUntilDue` nunca es `null` aquí, pero se trata igual por si la API cambiara.
     */
    .sort((a, b) => (a.daysUntilDue ?? 0) - (b.daysUntilDue ?? 0));

  if (urgentes.length === 0) {
    return listaVacia(
      'VENCE PRONTO',
      list.pending.length === 0 ? 'Nada pendiente' : 'Nada urgente esta semana',
      now,
    );
  }

  const filas: WidgetRow[] = urgentes.map((item) => ({
    title: item.title,
    detail: dueDateMessage(item.daysUntilDue),
    // La materia va a la derecha y no en el detalle: es contexto, no la razón por la que
    // esa línea está en el widget. La razón es la fecha.
    trailing: item.subjectName ?? '',
    color: item.subjectColor ?? AGENDA_URGENCY_COLORS[item.urgency],
    alert: item.urgency === 'vencida',
  }));

  const { rows, footer } = recortar(filas);

  const vencidas = urgentes.filter((i) => i.urgency === 'vencida').length;

  return {
    title: 'VENCE PRONTO',
    // Lo vencido manda el resumen cuando lo hay: es el dato que cambia la tarde.
    summary:
      vencidas > 0
        ? vencidas === 1
          ? '1 vencida'
          : `${vencidas} vencidas`
        : urgentes.length === 1
          ? '1 pendiente'
          : `${urgentes.length} pendientes`,
    rows,
    footer,
    emptyMessage: '',
    generatedAt: now.toISOString(),
  };
}

/**
 * Todo lo que los cuatro widgets necesitan, en una sola estructura.
 *
 * Es lo que la app serializa y guarda de una vez. Va junto y no en cuatro llamadas porque
 * los cuatro widgets se repintan a la vez —el lanzador los actualiza en el mismo
 * broadcast—, y guardarlos por separado abriría la ventana en la que el widget del día ya
 * cambió de semestre y el de faltas todavía no.
 */
export interface WidgetFamilySnapshot {
  /** El widget original: la clase en curso o la próxima. */
  readonly proxima: WidgetSnapshot;
  readonly dia: WidgetListSnapshot;
  readonly faltas: WidgetListSnapshot;
  readonly agenda: WidgetListSnapshot;
}

/**
 * Resuelve el estado de los cuatro widgets a la vez.
 *
 * La ejecuta la app, nunca el widget. Acepta `null` en faltas y agenda porque la app carga
 * las tres fuentes con `allSettled`: si el panel de faltas no responde, el widget del
 * horario debe seguir mostrando la clase correcta en lugar de quedarse todo en blanco.
 */
export function widgetFamily(
  entries: readonly ScheduleEntry[],
  attendance: AttendanceSummary | null,
  agenda: AgendaList | null,
  moment: WeekMoment = currentWeekMoment(),
  now: Date = new Date(),
): WidgetFamilySnapshot {
  return {
    proxima: widgetSnapshot(entries, moment, now),
    dia: widgetDia(entries, moment, now),
    faltas: widgetFaltas(attendance, now),
    agenda: widgetAgenda(agenda, now),
  };
}

/**
 * El "cuándo" del widget compacto, acortado.
 *
 * ## Por qué existe en lugar de usar `whenLabel` tal cual
 *
 * El compacto mide una celda de alto y tres de ancho, y el nombre de la materia va a 24sp
 * porque leerlo de una ojeada es el propósito entero de la fase. Medido en el emulador,
 * «Ahora mismo» a 12sp ocupa ~80dp del ancho y deja «Cálculo Integral» en «Cálculo Int…»:
 * el reloj se come el dato al que se subordina.
 *
 * «Ahora» dice exactamente lo mismo en la mitad del espacio. El resto de etiquetas —«En 25
 * min», «Empieza el lunes»— ya son cortas o se parten en dos líneas sin estorbar, así que
 * pasan sin tocar.
 *
 * Vive aquí y no en Kotlin porque es una decisión de redacción, y las decisiones de
 * redacción del widget están todas en este archivo. En el inicio de la app y en el de la
 * web sigue apareciendo «Ahora mismo», donde sí hay sitio.
 */
export function widgetCuandoCorto(snapshot: WidgetSnapshot): string {
  return snapshot.whenLabel === 'Ahora mismo' ? 'Ahora' : snapshot.whenLabel;
}

/**
 * Lo que el compacto pone donde iría el nombre de la materia cuando no hay ninguna.
 *
 * Ese hueco va a 24sp y mide tres celdas de ancho: «Sin horario todavía» se cortaba en
 * «Sin horario tod…», que además de feo pierde justo la palabra que informa. Dos palabras
 * caben y dicen lo mismo. El texto largo sigue existiendo en `whenLabel` para el inicio de
 * la app y el de la web, donde sí hay sitio.
 */
export function widgetMateriaCorta(snapshot: WidgetSnapshot): string {
  if (snapshot.subjectName !== null) return snapshot.subjectName;
  return snapshot.whenLabel === 'Sin horario todavía' ? 'Sin horario' : snapshot.whenLabel;
}

/**
 * La línea corta del widget compacto: materia, hora y cuándo, sin nada más.
 *
 * El widget de «Próxima clase» encogió en la Fase 16 —de cuatro celdas de alto a dos, con
 * el nombre de la materia al doble de tamaño— y en ese espacio el aula y el pie de "quedan
 * N clases" ya no caben sin robarle sitio al dato que se mira. Esta función redacta lo que
 * sí cabe, para que el Kotlin no tenga que decidir qué recortar.
 */
export function widgetLineaCompacta(snapshot: WidgetSnapshot): string {
  if (snapshot.subjectName === null) return snapshot.whenLabel;

  const partes = [snapshot.timeRange, snapshot.room].filter(
    (p): p is string => typeof p === 'string' && p.length > 0,
  );

  return partes.join(' · ');
}

/**
 * Color con el que pintar el reloj del widget compacto.
 *
 * Verde cuando la clase está ocurriendo, acento cuando aún no. Se decide aquí y no en
 * Kotlin porque es la misma señal que usa el inicio de la app: si un día cambia, cambia en
 * los dos sitios a la vez.
 */
export function widgetColorCuando(
  entries: readonly ScheduleEntry[],
  moment: WeekMoment = currentWeekMoment(),
): string {
  const upcoming = nextClass(entries, moment);
  if (upcoming === null) return COLOR.tinta3;
  return upcoming.timing === 'en_curso' ? COLOR.exito : COLOR.acento;
}
