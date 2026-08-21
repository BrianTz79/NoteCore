/**
 * Llamada a la publicación de versiones de la app (FR-052, Fase 17).
 *
 * Principio VIII: la ruta y el tipo de la respuesta se escriben una vez, y los usan la app
 * —que ofrece instalar— y la web —que ofrece descargar el APK—.
 *
 * **No lleva sesión.** Es la única parte del producto que se consulta sin estar dentro, y a
 * propósito: quien tiene una versión vieja instalada puede no poder ni entrar, y en ese caso
 * es justo cuando más necesita saber que hay una nueva. No expone nada de nadie —una versión
 * publicada y su suma de verificación son públicos por definición—, así que no hay aquí
 * ningún dato de usuario que aislar.
 */

import type { LatestReleaseResponse } from '../types/updates.js';
import type { ApiClient } from './client.js';

export const UPDATE_ROUTES = {
  /** La última versión publicada para Android, o el aviso de que esto está apagado. */
  latestAndroid: '/releases/android/latest',
} as const;

export function createUpdatesApi(client: ApiClient) {
  return {
    /** La última versión publicada para Android (Fase 17). */
    latestAndroid(): Promise<LatestReleaseResponse> {
      return client.get<LatestReleaseResponse>(UPDATE_ROUTES.latestAndroid);
    },
  };
}
