/**
 * Llamadas del horario, tipadas.
 *
 * Principio VIII: web y app llaman a estas funciones en lugar de escribir cada una sus
 * rutas y sus tipos de respuesta.
 */

import type {
  CreateSubjectInput,
  ImportConfirmInput,
  ImportPreviewInput,
  UpdateSubjectInput,
} from '../schemas/schedule.js';
import type { ImportPreview, ImportResult, Subject } from '../types/schedule.js';
import type { ApiClient } from './client.js';

export const SCHEDULE_ROUTES = {
  subjects: '/schedule/subjects',
  importPreview: '/schedule/import/preview',
  importConfirm: '/schedule/import',
} as const;

export function createScheduleApi(client: ApiClient) {
  return {
    /** Horario completo del usuario: materias con sus sesiones (FR-009). */
    subjects(): Promise<readonly Subject[]> {
      return client.get<readonly Subject[]>(SCHEDULE_ROUTES.subjects);
    },

    createSubject(input: CreateSubjectInput): Promise<Subject> {
      return client.post<Subject>(SCHEDULE_ROUTES.subjects, input);
    },

    updateSubject(id: string, input: UpdateSubjectInput): Promise<Subject> {
      return client.patch<Subject>(`${SCHEDULE_ROUTES.subjects}/${id}`, input);
    },

    deleteSubject(id: string): Promise<void> {
      return client.delete<void>(`${SCHEDULE_ROUTES.subjects}/${id}`);
    },

    /**
     * Analiza el JSON pegado sin escribir nada (FR-008).
     *
     * Devuelve qué materias entrarían, cuáles chocan con las existentes y qué se descartó,
     * para que el usuario confirme con la información delante.
     */
    previewImport(input: ImportPreviewInput): Promise<ImportPreview> {
      return client.post<ImportPreview>(SCHEDULE_ROUTES.importPreview, input);
    },

    /** Confirma la importación con el modo elegido: añadir o reemplazar (FR-007). */
    confirmImport(input: ImportConfirmInput): Promise<ImportResult> {
      return client.post<ImportResult>(SCHEDULE_ROUTES.importConfirm, input);
    },
  };
}

export type ScheduleApi = ReturnType<typeof createScheduleApi>;
