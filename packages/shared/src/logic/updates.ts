/**
 * La regla de si hay que actualizar la app (FR-052, Fase 17).
 *
 * Principio II: **el cliente no decide**. Esta función es la única que compara versiones, y
 * la ejecutan igual la app —que ofrece instalar— y la web —que ofrece descargar—. Escrita
 * dos veces acabaría con una app que se cree al día y una web que dice que no lo está.
 */

import type { AndroidRelease, LatestReleaseResponse } from '../types/updates.js';

/** Bytes a un texto corto: «12.4 MB». Para anunciar la descarga antes de empezarla. */
export function tamanoLegible(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${mb.toFixed(1)} MB`;
}

/**
 * Si la versión publicada es más nueva que la instalada.
 *
 * **Compara `versionCode`, nunca `versionName`.** Es la misma regla que aplica Android al
 * instalar: un APK con un `versionCode` igual o menor que el instalado no es una
 * actualización, y el sistema lo rechaza. Ofrecer una descarga que el instalador va a negar
 * es peor que no ofrecer nada, porque el usuario la baja entera antes de enterarse.
 *
 * Estrictamente mayor, no «distinto»: republicar el mismo `versionCode` con otro binario no
 * es una versión nueva para Android, y tratarlo como tal dejaría a la app pidiendo instalar
 * en bucle algo que nunca se instala.
 */
export function hayActualizacion(
  instalado: number,
  release: AndroidRelease | null,
): release is AndroidRelease {
  if (release === null) return false;
  if (!Number.isInteger(instalado) || instalado < 0) return false;
  return release.versionCode > instalado;
}

/**
 * Resuelve la respuesta de la API a lo único que una pantalla necesita saber.
 *
 * Concentra aquí los dos casos que se confunden —el actualizador apagado y el actualizador
 * encendido sin nada publicado—, para que ninguna pantalla tenga que distinguirlos con un
 * encadenamiento de comprobaciones escrito a su manera.
 */
export function resolverActualizacion(
  instalado: number,
  respuesta: LatestReleaseResponse | null,
): { readonly hay: boolean; readonly release: AndroidRelease | null } {
  if (respuesta === null || !respuesta.disponible) return { hay: false, release: null };
  const release = respuesta.release;
  return { hay: hayActualizacion(instalado, release), release };
}

/**
 * Si un texto tiene la forma de un SHA-256 en hexadecimal.
 *
 * Se valida en los dos extremos: el servidor no publica una suma con forma inválida, y el
 * cliente no compara contra ella. Una suma mal escrita —con espacios, en mayúsculas, o el
 * contenido entero de un `.sha256` con el nombre del archivo detrás— haría que **toda**
 * verificación fallara, y el síntoma sería «la descarga siempre está corrupta», que apunta
 * a la red y no al dato.
 */
export function esSha256(valor: string): boolean {
  return /^[0-9a-f]{64}$/.test(valor);
}

/**
 * Normaliza lo que trae un archivo `.sha256` a la suma sola.
 *
 * `sha256sum` escribe «<suma>  <nombre del archivo>», y en Windows a veces «<suma> *<nombre>».
 * Publicar ese texto entero como `sha256` es el error más fácil de cometer aquí, así que se
 * recorta en un solo sitio en lugar de esperar que quien publique se acuerde.
 */
export function normalizarSha256(contenido: string): string {
  return (contenido.trim().split(/\s+/)[0] ?? '').toLowerCase();
}
