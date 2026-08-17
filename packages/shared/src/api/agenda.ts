/**
 * Llamadas de la agenda, tipadas.
 *
 * Principio VIII: web y app llaman a estas funciones en lugar de escribir cada una sus
 * rutas y sus tipos de respuesta.
 */

import type {
  AgendaQuery,
  CreateAgendaItemInput,
  UpdateAgendaItemInput,
} from '../schemas/agenda.js';
import type { AgendaItem, AgendaList } from '../types/agenda.js';
import type { ApiClient } from './client.js';

export const AGENDA_ROUTES = {
  items: '/agenda/items',
} as const;

/** Convierte los filtros en cadena de query, omitiendo lo que no venga. */
function agendaQuery(query: AgendaQuery = {}): string {
  const params = new URLSearchParams();
  if (query.subjectId) params.set('subjectId', query.subjectId);
  if (query.kind) params.set('kind', query.kind);
  // Solo se manda cuando se pide excluirlas: el valor por defecto del servidor ya es `true`.
  if (query.includeCompleted === false) params.set('includeCompleted', 'false');
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

export function createAgendaApi(client: ApiClient) {
  return {
    /**
     * La agenda: pendientes ordenadas por vencimiento y completadas aparte (FR-022).
     *
     * El orden y la urgencia llegan resueltos del servidor; el cliente solo pinta.
     */
    list(query: AgendaQuery = {}): Promise<AgendaList> {
      return client.get<AgendaList>(`${AGENDA_ROUTES.items}${agendaQuery(query)}`);
    },

    /** Una actividad concreta, para la pantalla de detalle o edición. */
    get(id: string): Promise<AgendaItem> {
      return client.get<AgendaItem>(`${AGENDA_ROUTES.items}/${id}`);
    },

    /**
     * Crea una actividad (FR-018).
     *
     * Toma el tipo de **entrada** del esquema: solo el título es obligatorio, que es lo que
     * hace viable la alta rápida durante la clase.
     */
    create(input: CreateAgendaItemInput): Promise<AgendaItem> {
      return client.post<AgendaItem>(AGENDA_ROUTES.items, input);
    },

    /**
     * Edita cualquier campo de una actividad (FR-019), o la completa y reabre (FR-020).
     *
     * Con el tipo de entrada, completar manda solo `completed` sin repetir lo demás.
     */
    update(id: string, input: UpdateAgendaItemInput): Promise<AgendaItem> {
      return client.patch<AgendaItem>(`${AGENDA_ROUTES.items}/${id}`, input);
    },

    /** Elimina una actividad por acción explícita del usuario (FR-021). */
    delete(id: string): Promise<void> {
      return client.delete<void>(`${AGENDA_ROUTES.items}/${id}`);
    },
  };
}

export type AgendaApi = ReturnType<typeof createAgendaApi>;
