/**
 * Publicación de versiones de la app Android (FR-052, Fase 17).
 *
 * Principio II: **la decisión de si hay actualización no vive aquí ni en el cliente**, vive
 * en `hayActualizacion()` de `@notecore/shared`. Este servicio solo responde cuál es la
 * versión publicada; comparar es de la regla compartida.
 *
 * ## Por qué son archivos y no una tabla
 *
 * Publicar una versión es copiar el APK y su `.sha256` a un directorio y escribir un
 * `latest.json` de seis campos. Una tabla en PostgreSQL exigiría una migración, un modelo, y
 * un panel de administración para editarla —tres cosas que mantener para un dato que cambia
 * cuando se publica una versión, o sea, casi nunca—. Además el actualizador entero tiene que
 * **poder desaparecer** el día que la app suba a Play Store, y borrar un módulo es más fácil
 * que revertir una migración de un esquema en producción.
 *
 * ## Lo que se lee de disco en cada petición, y por qué
 *
 * `latest.json` se relee en cada llamada en lugar de cachearse al arrancar. Publicar una
 * versión es copiar archivos en el volumen, sin reiniciar el contenedor: con caché, la API
 * seguiría anunciando la versión anterior hasta el siguiente despliegue, que es justo el
 * escenario para el que se construyó esto. El archivo son 300 bytes y la ruta se consulta una
 * vez por arranque de la app.
 */

import { createReadStream } from 'node:fs';
import { stat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { esSha256, normalizarSha256, type AndroidRelease } from '@notecore/shared';
import { config } from '../config.js';

/** Nombre del manifiesto dentro de `RELEASES_DIR`. */
const MANIFIESTO = 'latest.json';

/**
 * Lo que se espera encontrar en `latest.json`.
 *
 * Se escribe a mano al publicar, así que se valida campo a campo: un `versionCode` que
 * llegara como cadena —el error más fácil de cometer en un JSON escrito a mano— haría que
 * la comparación de versiones se hiciera entre texto y número y **nadie** recibiera la
 * actualización, sin ningún error visible en ningún lado.
 */
interface ManifiestoEnDisco {
  versionCode?: unknown;
  versionName?: unknown;
  /** Nombre del APK dentro del directorio. No una ruta: ver `apkPath`. */
  file?: unknown;
  sha256?: unknown;
  notes?: unknown;
  publishedAt?: unknown;
}

/** Motivo por el que no hay versión que anunciar, para el registro del servidor. */
export type MotivoSinRelease =
  | 'apagado'
  | 'sin_manifiesto'
  | 'manifiesto_invalido'
  | 'apk_ausente';

export interface ResultadoRelease {
  readonly release: AndroidRelease | null;
  readonly motivo: MotivoSinRelease | null;
}

/**
 * Resuelve el nombre del APK a una ruta dentro del directorio de publicación.
 *
 * **`file` se trata como nombre, no como ruta**, y por eso se le aplica `basename`. El
 * manifiesto lo escribe quien publica, pero un `"file": "../../etc/passwd"` convertiría esta
 * ruta en una lectura arbitraria del sistema de archivos servida por HTTP. Que hoy solo lo
 * escriba el administrador no es una defensa: el archivo vive en un volumen montado, y el
 * coste de acotarlo es una llamada a `basename`.
 */
function apkPath(directorio: string, file: string): string {
  return path.join(directorio, path.basename(file));
}

/**
 * La versión publicada, leída del disco y validada.
 *
 * Devuelve el motivo junto al resultado para que la ruta pueda registrarlo: un actualizador
 * que no anuncia nada tiene cuatro causas posibles y desde fuera se ven todas igual, así que
 * sin el motivo en el registro el diagnóstico sería adivinar.
 *
 * `baseUrl` es de dónde cuelga la descarga. Lo decide la ruta a partir de la configuración o
 * del host de la petición, porque el enlace tiene que ser **absoluto**: lo abre el gestor de
 * descargas de Android, que no tiene origen del que derivar una ruta relativa.
 */
export async function latestAndroidRelease(baseUrl: string): Promise<ResultadoRelease> {
  const directorio = config.releasesDir;
  if (!config.updaterEnabled || directorio === null) {
    return { release: null, motivo: 'apagado' };
  }

  let crudo: string;
  try {
    crudo = await readFile(path.join(directorio, MANIFIESTO), 'utf8');
  } catch {
    // Todavía no se ha publicado nada. No es un error: el actualizador está encendido y
    // esperando su primer APK.
    return { release: null, motivo: 'sin_manifiesto' };
  }

  let datos: ManifiestoEnDisco;
  try {
    datos = JSON.parse(crudo) as ManifiestoEnDisco;
  } catch {
    return { release: null, motivo: 'manifiesto_invalido' };
  }

  const { versionCode, versionName, file, sha256, notes, publishedAt } = datos;

  if (
    !Number.isInteger(versionCode) ||
    (versionCode as number) <= 0 ||
    typeof versionName !== 'string' ||
    versionName.length === 0 ||
    typeof file !== 'string' ||
    file.length === 0 ||
    typeof sha256 !== 'string'
  ) {
    return { release: null, motivo: 'manifiesto_invalido' };
  }

  // Se normaliza antes de validar: lo natural al publicar es pegar el contenido del archivo
  // `.sha256`, que trae el nombre del binario detrás de la suma.
  const suma = normalizarSha256(sha256);
  if (!esSha256(suma)) return { release: null, motivo: 'manifiesto_invalido' };

  /*
   * El APK tiene que estar ahí **antes** de anunciarlo.
   *
   * Sin esta comprobación, un manifiesto que nombre un archivo que no se copió —o que se
   * copió con otro nombre— haría que la app avisara de una versión nueva y la descarga
   * respondiera 404. El usuario vería «hay actualización» y un fallo al bajarla, en bucle
   * cada vez que abre la app, sin forma de quitarse el aviso.
   */
  let tamano: number;
  try {
    const info = await stat(apkPath(directorio, file));
    if (!info.isFile()) return { release: null, motivo: 'apk_ausente' };
    tamano = info.size;
  } catch {
    return { release: null, motivo: 'apk_ausente' };
  }

  return {
    release: {
      versionCode: versionCode as number,
      versionName,
      downloadUrl: `${baseUrl}/releases/android/download`,
      sha256: suma,
      sizeBytes: tamano,
      notes: typeof notes === 'string' ? notes : '',
      publishedAt:
        typeof publishedAt === 'string' ? publishedAt : new Date(0).toISOString(),
    },
    motivo: null,
  };
}

/** El APK publicado, listo para transmitir, junto a lo que la respuesta debe declarar. */
export interface ApkParaDescargar {
  readonly stream: ReturnType<typeof createReadStream>;
  readonly sizeBytes: number;
  readonly filename: string;
}

/**
 * Abre el APK publicado.
 *
 * Devuelve `null` si el actualizador está apagado o no hay nada publicado, para que la ruta
 * responda 404 en lugar de reventar. **Pasa por `latestAndroidRelease`** en vez de leer el
 * manifiesto por su cuenta: así la descarga entrega exactamente el archivo que se anunció, y
 * no puede darse el caso de que la ruta anuncie una versión y la descarga sirva otra.
 */
export async function openPublishedApk(): Promise<ApkParaDescargar | null> {
  const directorio = config.releasesDir;
  if (!config.updaterEnabled || directorio === null) return null;

  // El `baseUrl` no se usa para descargar; se pasa vacío porque lo que interesa de esta
  // llamada es la validación del manifiesto, no el enlace que compone.
  const { release } = await latestAndroidRelease('');
  if (release === null) return null;

  let crudo: string;
  try {
    crudo = await readFile(path.join(directorio, MANIFIESTO), 'utf8');
  } catch {
    return null;
  }

  const file = (JSON.parse(crudo) as ManifiestoEnDisco).file;
  if (typeof file !== 'string') return null;

  const nombre = path.basename(file);
  return {
    stream: createReadStream(path.join(directorio, nombre)),
    sizeBytes: release.sizeBytes,
    filename: nombre,
  };
}
