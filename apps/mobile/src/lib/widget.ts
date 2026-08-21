import { requireOptionalNativeModule } from 'expo';
import {
  widgetColorCuando,
  widgetCuandoCorto,
  widgetFamily,
  widgetLineaCompacta,
  widgetMateriaCorta,
  type AgendaList,
  type AttendanceSummary,
  type ScheduleEntry,
  type WidgetFamilySnapshot,
} from '@notecore/shared';

/**
 * Puente hacia la familia de widgets de pantalla principal (FR-051, Fases 11 y 16).
 *
 * El reparto de trabajo, que es lo importante de este archivo: **la app decide, el widget
 * pinta**. `widgetFamily()` vive en `@notecore/shared` y resuelve los cuatro estados —qué
 * clase toca, qué queda hoy, qué materia está cerca del límite, qué vence pronto—; aquí
 * solo se serializa el resultado y se manda al lado nativo. El Kotlin no interpreta nada
 * —si lo hiciera, esas reglas existirían en dos idiomas y una de las dos copias
 * envejecería sin que nadie lo notara.
 *
 * Los colores del widget los genera `plugins/with-widget-horario.js` durante el `prebuild`
 * a partir de los tokens compartidos.
 */

/** Cuál de los cuatro widgets. El nombre viaja al Kotlin, que lo traduce a una clase. */
export type ClaseDeWidget = 'horario' | 'dia' | 'faltas' | 'agenda';

/** Los cuatro, en el orden en que se ofrecen. */
export const CLASES_DE_WIDGET: readonly ClaseDeWidget[] = [
  'horario',
  'dia',
  'faltas',
  'agenda',
];

/**
 * Cómo se presenta cada widget en la pantalla que los ofrece.
 *
 * Vive aquí y no en `shared` a propósito: es texto de **una pantalla de la app**, no una
 * regla que la web tenga que decir igual —la web no tiene widgets—. Lo que sí está en
 * `shared` es todo lo que el widget muestra.
 */
export const WIDGETS: Readonly<
  Record<ClaseDeWidget, { readonly nombre: string; readonly descripcion: string }>
> = {
  horario: {
    nombre: 'Próxima clase',
    descripcion: 'La clase en curso o la que sigue, en una línea.',
  },
  dia: { nombre: 'Hoy', descripcion: 'Las clases que te quedan hoy.' },
  faltas: { nombre: 'Faltas', descripcion: 'Las materias cerca del límite.' },
  agenda: { nombre: 'Vence pronto', descripcion: 'Lo vencido y lo de esta semana.' },
};

interface WidgetNativo {
  /** Guarda el estado del compacto y el de los tres de lista, y los repinta los cuatro. */
  guardar(compacto: string, familia: string): Promise<boolean>;
  limpiar(): Promise<boolean>;
  /** Pide a Android que coloque un widget. El sistema confirma con su propio diálogo. */
  fijar(cual: ClaseDeWidget): Promise<boolean>;
  /** Si el lanzador de este teléfono admite que la app proponga colocarlos. */
  sePuedeFijar(): Promise<boolean>;
}

/**
 * El módulo, si está.
 *
 * `requireOptionalNativeModule` y no `requireNativeModule`: en Expo Go el módulo no existe
 * porque no hay compilación nativa propia, y la app entera no puede caerse por eso. Sin
 * módulo, las funciones de abajo no hacen nada y el resto sigue funcionando igual.
 */
const nativo = requireOptionalNativeModule<WidgetNativo>('WidgetHorario');

/** `true` si esta compilación puede actualizar los widgets. */
export const widgetDisponible = nativo !== null;

/**
 * Lo último que se supo de cada fuente, para no perderlo en una actualización parcial.
 *
 * ## Por qué hace falta, que no es evidente
 *
 * Los cuatro widgets se guardan **juntos**, en una sola escritura, porque los cuatro salen
 * del mismo `widgetFamily()`. Pero no todas las pantallas tienen las tres fuentes:
 * `InicioScreen` carga horario, faltas y agenda; `HorarioScreen` solo el horario. Sin esta
 * memoria, entrar al horario después del inicio llamaría con `attendance = null` y
 * **borraría** las listas de faltas y agenda que el inicio acababa de escribir —los
 * widgets pasarían a decir «Sin materias todavía» sin que nada haya cambiado—.
 *
 * Es un módulo, no un estado de React: quien escribe son pantallas distintas en momentos
 * distintos, y lo que se recuerda no pinta nada.
 *
 * Se vacía al cerrar sesión, junto con lo que los widgets muestran: es el mismo dato del
 * usuario anterior, solo que en memoria.
 */
const ultimoConocido: {
  entries: readonly ScheduleEntry[];
  attendance: AttendanceSummary | null;
  agenda: AgendaList | null;
} = { entries: [], attendance: null, agenda: null };

/**
 * Recalcula el estado de los cuatro widgets y lo manda a Android.
 *
 * Se llama cada vez que algo de lo que muestran puede haber cambiado: al leer el horario de
 * la API, al editarlo, al marcar una falta, al completar una entrega, y al volver la app al
 * primer plano —porque «En 25 min» y «Vence en 3 días» dejan de ser ciertos solo con que
 * pase el tiempo, sin que nadie toque nada—.
 *
 * **Omitir un parámetro, o pasarlo `null`, conserva lo que se supiera de esa fuente**, no
 * la borra: una pantalla que solo conoce el horario no puede dejar en blanco los widgets de
 * faltas y agenda, ni la de faltas dejar sin clase al de la próxima. Ver la nota de
 * `ultimoConocido`.
 *
 * Eso cubre además el caso de `allSettled`: que el panel de faltas no respondiera esta vez
 * no significa que el estudiante ya no tenga materias, significa que la petición falló.
 *
 * No lanza: un fallo aquí no puede impedir que la pantalla se muestre. Los widgets son un
 * accesorio, y quedarse con el dato anterior es mejor que romper la app.
 */
export async function actualizarWidget(
  entries: readonly ScheduleEntry[] | null = null,
  attendance: AttendanceSummary | null = null,
  agenda: AgendaList | null = null,
): Promise<WidgetFamilySnapshot | null> {
  if (!nativo) return null;

  // Las tres se tratan igual: lo que llega sustituye, lo que no llega se conserva. Que el
  // horario también admita `null` no es simetría por gusto —la pantalla de faltas y la de
  // agenda no lo tienen, y pasarles `[]` habría dejado el widget de la próxima clase
  // diciendo «Sin horario todavía» cada vez que alguien mira sus faltas—.
  if (entries !== null) ultimoConocido.entries = entries;
  if (attendance !== null) ultimoConocido.attendance = attendance;
  if (agenda !== null) ultimoConocido.agenda = agenda;

  try {
    const familia = widgetFamily(
      ultimoConocido.entries,
      ultimoConocido.attendance,
      ultimoConocido.agenda,
    );

    /*
     * El compacto viaja con dos campos de más, resueltos aquí.
     *
     * `compactLine` y `whenColor` no están en `WidgetSnapshot` porque ese tipo lo comparten
     * la web y la app —el inicio de los dos lo usa— y son cosas que solo necesita el
     * layout de una celda de alto de Android. Las funciones que los calculan sí viven en
     * `shared`, que es lo que importa: el Kotlin sigue sin decidir qué recortar ni de qué
     * color pintar un reloj.
     */
    const compacto = {
      ...familia.proxima,
      compactLine: widgetLineaCompacta(familia.proxima),
      whenColor: widgetColorCuando(ultimoConocido.entries),
      // `whenLabel` se conserva intacto para quien lo lea entero; el compacto pinta esta
      // versión corta, que es la que cabe junto a una materia a 24sp.
      whenShort: widgetCuandoCorto(familia.proxima),
      // Lo mismo para el hueco de la materia cuando no hay horario: a 24sp «Sin horario
      // todavía» no cabe. Ver `widgetMateriaCorta`.
      subjectShort: widgetMateriaCorta(familia.proxima),
    };

    await nativo.guardar(JSON.stringify(compacto), JSON.stringify(familia));
    return familia;
  } catch {
    return null;
  }
}

/**
 * Borra lo que los widgets muestran.
 *
 * Se llama al cerrar sesión. El horario, las faltas y las entregas de quien se fue no
 * pueden quedarse visibles en la pantalla de inicio del teléfono: es el Principio III
 * —aislamiento de datos— aplicado fuera de la app, donde es más fácil olvidarlo y donde el
 * dato queda a la vista de cualquiera que mire el teléfono.
 */
export async function limpiarWidget(): Promise<void> {
  // Se vacía siempre, haya módulo nativo o no: es el dato del usuario que se fue, y dejarlo
  // en memoria haría que la primera actualización parcial de quien entre después mezclara
  // sus faltas con las del anterior.
  ultimoConocido.entries = [];
  ultimoConocido.attendance = null;
  ultimoConocido.agenda = null;

  if (!nativo) return;
  try {
    await nativo.limpiar();
  } catch {
    // Cerrar sesión no puede fallar porque el widget no responda.
  }
}

/**
 * Si esta compilación y este lanzador permiten proponer la colocación de un widget.
 *
 * Se consulta antes de enseñar los botones: ofrecer «Añadir a la pantalla de inicio» en un
 * teléfono cuyo lanzador no lo admite es prometer algo que al pulsarlo no pasa.
 */
export async function sePuedeFijarWidget(): Promise<boolean> {
  if (!nativo) return false;
  try {
    return await nativo.sePuedeFijar();
  } catch {
    return false;
  }
}

/**
 * Propone colocar un widget en la pantalla de inicio.
 *
 * Quien decide es Android, con su propio diálogo: la app no puede colocar nada sin que el
 * usuario acepte. Devuelve `false` si el lanzador no admite la petición.
 */
export async function fijarWidget(cual: ClaseDeWidget): Promise<boolean> {
  if (!nativo) return false;
  try {
    return await nativo.fijar(cual);
  } catch {
    return false;
  }
}
