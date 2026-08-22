/**
 * Llamada del contexto de consejos (Fase 29).
 *
 * Principio VIII: la ruta y el tipo de respuesta se definen una vez y los consumen los dos
 * clientes.
 */

import type { TipContext } from '../logic/tips.js';
import type { ApiClient } from './client.js';

export const TIPS_ROUTES = {
  context: '/tips/context',
} as const;

export function createTipsApi(client: ApiClient) {
  return {
    /**
     * El estado de la cuenta contra el que se eligen los consejos.
     *
     * Una sola petición para seis datos: pedirlos por separado añadiría cinco viajes a la
     * pantalla que más se abre, y todo para pintar lo accesorio.
     */
    context(): Promise<TipContext> {
      return client.get<TipContext>(TIPS_ROUTES.context);
    },
  };
}

export type TipsApi = ReturnType<typeof createTipsApi>;
