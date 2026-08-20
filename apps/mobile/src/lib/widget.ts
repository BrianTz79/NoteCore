import { requireOptionalNativeModule } from 'expo';
import {
  widgetSnapshot,
  type ScheduleEntry,
  type WidgetSnapshot,
} from '@notecore/shared';

/**
 * Puente hacia el widget de pantalla principal (FR-051, Fase 11).
 *
 * El reparto de trabajo, que es lo importante de este archivo: **la app decide, el widget
 * pinta**. `widgetSnapshot()` vive en `@notecore/shared` y resuelve qué clase toca; aquí
 * solo se serializa el resultado y se manda al lado nativo. El Kotlin no interpreta nada
 * —si lo hiciera, la regla de qué clase mostrar existiría en dos idiomas y una de las dos
 * copias envejecería sin que nadie lo notara.
 *
 * El módulo nativo lo genera `plugins/with-widget-horario.js` durante el `prebuild`.
 */

interface WidgetNativo {
  guardar(json: string): Promise<boolean>;
  limpiar(): Promise<boolean>;
  /** Pide a Android que coloque el widget. El sistema confirma con su propio diálogo. */
  fijar(): Promise<boolean>;
  /** Si el lanzador de este teléfono admite que la app proponga colocarlo. */
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

/** `true` si esta compilación puede actualizar el widget. */
export const widgetDisponible = nativo !== null;

/**
 * Recalcula el estado del widget y lo manda a Android.
 *
 * Se llama cada vez que el horario puede haber cambiado: al leerlo de la API, al editarlo,
 * y al volver la app al primer plano —porque «En 25 min» deja de ser cierto solo con que
 * pase el tiempo, sin que nadie toque nada—.
 *
 * No lanza: un fallo aquí no puede impedir que la pantalla del horario se muestre. El
 * widget es un accesorio, y quedarse con el dato anterior es mejor que romper la app.
 */
export async function actualizarWidget(
  entries: readonly ScheduleEntry[],
): Promise<WidgetSnapshot | null> {
  if (!nativo) return null;

  try {
    const snapshot = widgetSnapshot(entries);
    await nativo.guardar(JSON.stringify(snapshot));
    return snapshot;
  } catch {
    return null;
  }
}

/**
 * Borra lo que el widget muestra.
 *
 * Se llama al cerrar sesión. El horario de quien se fue no puede quedarse visible en la
 * pantalla de inicio del teléfono: es el Principio III —aislamiento de datos— aplicado
 * fuera de la app, donde es más fácil olvidarlo y donde el dato queda a la vista de
 * cualquiera que mire el teléfono.
 */
export async function limpiarWidget(): Promise<void> {
  if (!nativo) return;
  try {
    await nativo.limpiar();
  } catch {
    // Cerrar sesión no puede fallar porque el widget no responda.
  }
}

/**
 * Si esta compilación y este lanzador permiten proponer la colocación del widget.
 *
 * Se consulta antes de enseñar el botón: ofrecer «Añadir a la pantalla de inicio» en un
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
 * Propone colocar el widget en la pantalla de inicio.
 *
 * Quien decide es Android, con su propio diálogo: la app no puede colocar nada sin que el
 * usuario acepte. Devuelve `false` si el lanzador no admite la petición.
 */
export async function fijarWidget(): Promise<boolean> {
  if (!nativo) return false;
  try {
    return await nativo.fijar();
  } catch {
    return false;
  }
}
