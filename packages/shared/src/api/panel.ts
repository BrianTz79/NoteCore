/**
 * Llamada del panel de operación (Fase 25).
 *
 * Solo la consume la web: el panel no existe en la app, por lo dicho en `types/panel.ts`.
 * Vive en `shared` igual que el resto porque el tipo de la respuesta lo comparten quien la
 * produce y quien la pinta, y esa es la razón de `shared` — no que haya dos clientes.
 */

import type { PanelResumen } from '../types/panel.js';
import type { ApiClient } from './client.js';

export const PANEL_ROUTES = {
  /**
   * Bajo `/panel` y no `/admin`: nombra lo que es —un panel de números— sin anunciar que
   * detrás hay privilegios. Nada de esto es seguridad por oscuridad —la ruta responde 404 a
   * quien no sea administrador, se llame como se llame—, pero tampoco hace falta poner un
   * cartel.
   */
  resumen: '/panel/resumen',
} as const;

export function createPanelApi(client: ApiClient) {
  return {
    /**
     * Todos los números del panel.
     *
     * Una sola llamada y no una por sección: son doce consultas de conteo que el servidor
     * lanza juntas, y partirlas en siete peticiones multiplicaría los viajes sin que ninguna
     * sección se pudiera pintar antes que las demás — se miran todas a la vez.
     *
     * Responde **404** a quien no sea administrador, no 403: un 403 confirma que el panel
     * existe.
     */
    resumen(): Promise<PanelResumen> {
      return client.get<PanelResumen>(PANEL_ROUTES.resumen);
    },
  };
}

export type PanelApi = ReturnType<typeof createPanelApi>;
