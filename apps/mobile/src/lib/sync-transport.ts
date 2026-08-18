import {
  AGENDA_ROUTES,
  ATTENDANCE_ROUTES,
  type SyncEntry,
  type SyncTransport,
} from '@notecore/shared';
import { apiClient } from './api';

/**
 * Cómo se envía cada operación encolada (FR-049).
 *
 * Es la única pieza que traduce una entrada de la cola a una llamada HTTP. Se escribe aquí y
 * no en `shared` porque necesita el `ApiClient` ya configurado con los tokens del
 * dispositivo, pero **qué** operaciones existen y **cuándo** se mandan lo decide el motor
 * compartido: aquí no hay ninguna regla, solo el despacho.
 *
 * Las rutas salen de las constantes de `shared` en vez de escribirse a mano, para que un
 * cambio de ruta no deje la cola mandando a una dirección que ya no existe.
 */
export const syncTransport: SyncTransport = {
  async send(entry: SyncEntry): Promise<void> {
    switch (entry.operation) {
      case 'agenda_crear':
        // El cuerpo ya lleva el `id` que generó el cliente: es lo que hace que reenviar
        // esta misma petición no cree una segunda actividad.
        await apiClient.post(AGENDA_ROUTES.items, entry.payload);
        return;

      case 'agenda_editar':
        await apiClient.patch(`${AGENDA_ROUTES.items}/${entry.entityId}`, entry.payload);
        return;

      case 'agenda_borrar':
        await apiClient.delete(`${AGENDA_ROUTES.items}/${entry.entityId}`);
        return;

      case 'falta_marcar':
        // Marcar es idempotente en el servidor desde la Fase 3: las faltas que ya estaban
        // se omiten en lugar de duplicarse, así que el reintento es seguro sin más.
        await apiClient.post(ATTENDANCE_ROUTES.absences, entry.payload);
        return;

      case 'falta_editar':
        await apiClient.patch(
          `${ATTENDANCE_ROUTES.absences}/${entry.entityId}`,
          entry.payload,
        );
        return;

      case 'falta_borrar':
        await apiClient.delete(`${ATTENDANCE_ROUTES.absences}/${entry.entityId}`);
        return;
    }
  },
};
