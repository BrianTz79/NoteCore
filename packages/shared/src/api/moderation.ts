/**
 * Llamadas de los reportes de contenido (Fase 21), tipadas.
 *
 * Principio VIII: web y app llaman a estas funciones en lugar de escribir cada una sus rutas
 * y sus tipos de respuesta.
 *
 * Las dos mitades del módulo tienen públicos distintos y conviene verlo aquí: `report` la
 * usa cualquiera desde los dos clientes, y `list`/`review` solo quien opera el servicio,
 * desde la web. La API responde **404** a quien no sea administrador en las segundas, con el
 * mismo criterio que el panel de la Fase 25.
 */

import type { CreateReportInput, ReviewReportInput } from '../schemas/moderation.js';
import type { Report, ReportList, ReportReceipt, ReportStatus } from '../types/moderation.js';
import type { ApiClient } from './client.js';

export const MODERATION_ROUTES = {
  /** Reportar contenido. Abierta a cualquier sesión. */
  reports: '/reports',
  /**
   * Los reportes recibidos. **Bajo `/panel`**, no bajo `/reports`.
   *
   * Es la misma superficie de operación que la Fase 25 y comparte su guardián, así que
   * comparte su prefijo: quien lea las rutas ve de un vistazo qué exige ser administrador y
   * qué no, en lugar de tener que recordar que dos rutas con el mismo prefijo tienen
   * permisos distintos.
   */
  panelReports: '/panel/reportes',
  panelReportById: (id: string) => `/panel/reportes/${id}`,
} as const;

export function createModerationApi(client: ApiClient) {
  return {
    /**
     * Reporta una publicación o un mensaje.
     *
     * No devuelve el reporte, solo un acuse: quien reporta no consulta después el estado de
     * su denuncia, porque eso sería información sobre lo que se hizo con un tercero.
     */
    report(input: CreateReportInput): Promise<ReportReceipt> {
      return client.post<ReportReceipt>(MODERATION_ROUTES.reports, input);
    },

    /** Los reportes recibidos, para el panel. Responde 404 a quien no sea administrador. */
    list(status?: ReportStatus): Promise<ReportList> {
      const query = status ? `?status=${status}` : '';
      return client.get<ReportList>(`${MODERATION_ROUTES.panelReports}${query}`);
    },

    /** Marca un reporte como revisado o descartado. */
    review(id: string, input: ReviewReportInput): Promise<Report> {
      return client.patch<Report>(MODERATION_ROUTES.panelReportById(id), input);
    },
  };
}

export type ModerationApi = ReturnType<typeof createModerationApi>;
