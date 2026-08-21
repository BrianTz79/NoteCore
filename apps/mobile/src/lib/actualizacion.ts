import { requireOptionalNativeModule } from 'expo';
import {
  hayActualizacion,
  resolverActualizacion,
  tamanoLegible,
  type AndroidRelease,
  type EstadoDeActualizacion,
} from '@notecore/shared';
import { updatesApi } from './api';

/**
 * Actualización de la app fuera de la tienda (FR-052, Fase 17).
 *
 * ## El reparto de trabajo, que es lo mismo que en el widget
 *
 * **La regla decide, el nativo ejecuta.** `hayActualizacion()` vive en `@notecore/shared` y
 * la ejecutan igual la app y la web; aquí solo se le pasan la versión instalada —que sale del
 * paquete, no de una constante— y lo que publicó la API. El Kotlin descarga, verifica y
 * lanza el instalador, y no compara nada.
 *
 * ## Cómo se apaga esto entero
 *
 * `EXPO_PUBLIC_UPDATER_ENABLED` decide **dos cosas a la vez**, y esa es la propiedad que hace
 * que el interruptor sea de verdad:
 *
 * 1. Aquí: sin ella, `actualizadorEncendido` es `false`, no se pregunta a la API y la interfaz
 *    no enseña nada
 * 2. En `plugins/with-actualizador.js`: sin ella, el APK **no lleva** `REQUEST_INSTALL_PACKAGES`
 *    ni el `FileProvider`
 *
 * Al ser la misma variable, no puede darse el caso de una app que avise de actualizaciones sin
 * poder instalarlas, ni de un APK que pida permiso de instalación sin usarlo nunca.
 *
 * Y el servidor tiene su propio interruptor (`UPDATER_ENABLED`): aunque una app antigua siga
 * preguntando, la API responde `disponible: false` y no hay nada que ofrecer. Los dos lados se
 * apagan por separado a propósito — apagar el servidor desactiva el mecanismo para **todos**
 * los teléfonos ya instalados, que es lo que hace falta el día de subir a la tienda.
 *
 * **Para quitarlo del todo**: borrar este archivo, `modules/actualizador/`,
 * `plugins/with-actualizador.js`, su línea en `app.json`, y el banner de `InicioScreen`.
 */

/** Si esta compilación trae el actualizador encendido. */
export const actualizadorEncendido =
  process.env.EXPO_PUBLIC_UPDATER_ENABLED === 'true' ||
  process.env.EXPO_PUBLIC_UPDATER_ENABLED === '1';

interface ActualizadorNativo {
  /** El `versionCode` del paquete instalado. Lo lee del sistema, no de una constante. */
  versionInstalada(): number;
  /** Si el usuario ya autorizó a esta app a instalar paquetes (Android 8+). */
  puedeInstalar(): boolean;
  /** Abre los Ajustes donde se concede ese permiso. */
  pedirPermisoDeInstalacion(): Promise<boolean>;
  /** Descarga y **verifica**; devuelve la ruta. Lanza si la suma no coincide. */
  descargar(url: string, sha256: string, nombre: string): Promise<string>;
  /** Lanza el instalador de Android sobre un APK ya verificado. */
  instalar(ruta: string): Promise<boolean>;
  limpiarDescargas(): Promise<boolean>;
}

/**
 * El módulo, si está.
 *
 * `requireOptionalNativeModule` por lo mismo que el widget: en Expo Go no hay compilación
 * nativa propia y el módulo no existe. Sin él, todo lo de aquí no hace nada y el resto de la
 * app sigue igual.
 */
const nativo = requireOptionalNativeModule<ActualizadorNativo>('Actualizador');

/** `true` si esta compilación puede comprobar e instalar actualizaciones. */
export const actualizadorDisponible = actualizadorEncendido && nativo !== null;

/** El `versionCode` que está corriendo ahora mismo, o `0` si no se puede saber. */
export function versionInstalada(): number {
  if (!nativo) return 0;
  try {
    return nativo.versionInstalada();
  } catch {
    return 0;
  }
}

/**
 * Pregunta a la API si hay una versión más nueva que la instalada.
 *
 * Devuelve `null` cuando no hay nada que ofrecer, que agrupa cuatro casos que a la interfaz
 * le dan igual: el actualizador apagado en el cliente, apagado en el servidor, sin nada
 * publicado, o publicado algo que no es más nuevo. Distinguirlos es trabajo del registro del
 * servidor, no de una pantalla.
 *
 * **No lanza.** Comprobar actualizaciones es lo primero que se hace al abrir la app y ocurre
 * sin que nadie lo pida: un fallo de red aquí no puede convertirse en un error en pantalla
 * para alguien que solo quería mirar su horario.
 */
export async function buscarActualizacion(): Promise<AndroidRelease | null> {
  if (!actualizadorDisponible) return null;

  try {
    const respuesta = await updatesApi.latestAndroid();
    const { hay, release } = resolverActualizacion(versionInstalada(), respuesta);

    /*
     * Si lo publicado ya no es más nuevo, se tira lo descargado.
     *
     * Es el momento exacto en que un APK en caché dejó de servir para algo: o se instaló —y
     * ahora la versión instalada es esa— o se publicó algo distinto. Son decenas de
     * megabytes en el caché del teléfono, y nadie más los va a borrar.
     */
    if (!hay) {
      void nativo?.limpiarDescargas().catch(() => {});
      return null;
    }

    return release;
  } catch {
    return null;
  }
}

/** Si el usuario ya autorizó a esta app a instalar paquetes. */
export function puedeInstalar(): boolean {
  if (!nativo) return false;
  try {
    return nativo.puedeInstalar();
  } catch {
    return false;
  }
}

/**
 * Lleva al usuario a los Ajustes donde se concede el permiso de instalación.
 *
 * No se puede conceder desde la app: lo otorga la persona en una pantalla del sistema. Lo
 * único que está en nuestra mano es llevarla directamente en lugar de pedirle que la busque.
 */
export async function pedirPermisoDeInstalacion(): Promise<void> {
  if (!nativo) return;
  try {
    await nativo.pedirPermisoDeInstalacion();
  } catch {
    // Que no se abran los Ajustes no puede romper la pantalla desde la que se pulsó.
  }
}

/** Nombre con el que se guarda el APK. Lleva la versión para que se reconozca en el caché. */
function nombreDeArchivo(release: AndroidRelease): string {
  return `NoteCore-${release.versionName}-${release.versionCode}.apk`;
}

/** Lo que la pantalla necesita saber del intento de actualizar. */
export interface ResultadoDeActualizacion {
  readonly estado: EstadoDeActualizacion;
  /** Qué salió mal, en un texto que se puede enseñar tal cual. */
  readonly error?: string;
}

/**
 * Descarga la versión, comprueba su suma e invoca al instalador de Android.
 *
 * Los tres pasos van juntos y en este orden **a propósito**: la verificación no es opcional ni
 * se puede saltar desde la interfaz. El módulo nativo la hace dentro de `descargar()`, así que
 * lo que llega a `instalar()` o coincide con lo publicado o no existe.
 *
 * `onEstado` sirve para que la pantalla cuente lo que está pasando. Una descarga de decenas de
 * megabytes sin ninguna señal se lee como una app colgada.
 *
 * A partir de `instalar()` **decide Android y decide el usuario**: el sistema muestra su
 * diálogo y esta app ni puede saltárselo ni sabe cómo termina. Por eso el estado final es
 * `instalando` y no `instalado`: afirmar lo segundo sería inventarse un resultado que no se
 * conoce.
 */
export async function descargarEInstalar(
  release: AndroidRelease,
  onEstado?: (estado: EstadoDeActualizacion) => void,
): Promise<ResultadoDeActualizacion> {
  if (!nativo) {
    return { estado: 'error', error: 'Esta versión de la app no puede actualizarse sola.' };
  }

  /*
   * El permiso se comprueba **antes** de descargar.
   *
   * Sin esto, el usuario bajaría treinta megabytes y solo entonces se encontraría con que el
   * instalador no aparece —falla en silencio, que es lo peor que puede hacer—. Comprobarlo
   * primero convierte eso en una petición de permiso antes de gastar su plan de datos.
   */
  if (!puedeInstalar()) {
    await pedirPermisoDeInstalacion();
    return {
      estado: 'error',
      error:
        'Autoriza a NoteCore a instalar aplicaciones en la pantalla que se abrió, y vuelve ' +
        'a intentarlo.',
    };
  }

  try {
    onEstado?.('descargando');
    // `descargar` verifica antes de devolver: si la suma no coincide, lanza y borra el
    // archivo. No hay camino que llegue a instalar con un binario sin comprobar.
    const ruta = await nativo.descargar(
      release.downloadUrl,
      release.sha256,
      nombreDeArchivo(release),
    );

    onEstado?.('instalando');
    await nativo.instalar(ruta);
    return { estado: 'instalando' };
  } catch (error) {
    const mensaje =
      error instanceof Error && error.message.length > 0
        ? error.message
        : 'No se pudo completar la actualización.';
    onEstado?.('error');
    return { estado: 'error', error: mensaje };
  }
}

/** Re-exportado para que las pantallas no importen de dos sitios para lo mismo. */
export { hayActualizacion, tamanoLegible };
