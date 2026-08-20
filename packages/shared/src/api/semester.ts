/**
 * Llamadas de los semestres, tipadas.
 *
 * Principio VIII: web y app llaman a estas funciones en lugar de escribir cada una sus
 * rutas y sus tipos de respuesta.
 */

import type { CloseSemesterInput, RenameSemesterInput } from '../schemas/semester.js';
import type {
  Semester,
  SemesterCloseEffect,
  SemesterCloseResult,
} from '../types/semester.js';
import type { ApiClient } from './client.js';

export const SEMESTER_ROUTES = {
  root: '/semesters',
  /** El semestre en curso, que es el único donde se escribe. */
  current: '/semesters/current',
  /**
   * Lo que pasará al cerrar, para explicarlo ANTES de confirmar (FR-038).
   *
   * Es `GET` y no parte del `POST` de cierre a propósito: la explicación se consulta sin
   * comprometerse a nada, que es justo lo que la hace una explicación previa.
   */
  closeEffect: '/semesters/close-effect',
  close: '/semesters/close',
  byId: (id: string) => `/semesters/${id}`,
} as const;

export function createSemesterApi(client: ApiClient) {
  return {
    /** Todos los semestres del usuario, el activo y los archivados (FR-036). */
    list(): Promise<readonly Semester[]> {
      return client.get<readonly Semester[]>(SEMESTER_ROUTES.root);
    },

    /**
     * El semestre en curso.
     *
     * Siempre devuelve uno: si la cuenta no tenía ninguno, el servidor lo crea al vuelo. Así
     * ningún cliente tiene que manejar el caso de "todavía no hay semestre".
     */
    current(): Promise<Semester> {
      return client.get<Semester>(SEMESTER_ROUTES.current);
    },

    /** Qué se archivaría y con qué nombre arrancaría el siguiente (FR-038). */
    closeEffect(): Promise<SemesterCloseEffect> {
      return client.get<SemesterCloseEffect>(SEMESTER_ROUTES.closeEffect);
    },

    /**
     * Cierra el semestre en curso y abre el siguiente (FR-034, FR-035).
     *
     * Archiva lo anterior íntegro —nada se borra ni se copia— y deja el nuevo vacío.
     */
    close(input: CloseSemesterInput): Promise<SemesterCloseResult> {
      return client.post<SemesterCloseResult>(SEMESTER_ROUTES.close, input);
    },

    /**
     * Edita el periodo activo: nombre, tipo o semanas (FR-034, Fase 18).
     *
     * Los archivados no se modifican en nada (FR-037): el servidor lo rechaza, y no es una
     * comprobación que el cliente pueda saltarse.
     */
    update(id: string, input: RenameSemesterInput): Promise<Semester> {
      return client.patch<Semester>(SEMESTER_ROUTES.byId(id), input);
    },
  };
}

export type SemesterApi = ReturnType<typeof createSemesterApi>;
