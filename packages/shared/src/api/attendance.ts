/**
 * Llamadas del control de faltas, tipadas.
 *
 * Principio VIII: web y app llaman a estas funciones en lugar de escribir cada una sus
 * rutas y sus tipos de respuesta.
 */

import type {
  AbsenceHistoryQuery,
  MarkAbsencesInput,
  SetAbsenceLimitInput,
  SetSemesterWeeksInput,
  UpdateAbsenceInput,
} from '../schemas/attendance.js';
import type {
  AbsenceRecord,
  AttendanceSummary,
  CalendarDate,
  DayAttendance,
} from '../types/attendance.js';
import type { ApiClient } from './client.js';

export const ATTENDANCE_ROUTES = {
  summary: '/attendance/summary',
  day: '/attendance/day',
  absences: '/attendance/absences',
  semesterWeeks: '/attendance/semester-weeks',
  /** El límite cuelga de la materia: es un atributo suyo, no de la falta. */
  limit: (subjectId: string) => `/attendance/subjects/${subjectId}/limit`,
} as const;

/** Convierte la consulta de historial en cadena de query, omitiendo lo que no venga. */
function historyQuery(query: AbsenceHistoryQuery = {}): string {
  const params = new URLSearchParams();
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.subjectId) params.set('subjectId', query.subjectId);
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

export function createAttendanceApi(client: ApiClient) {
  return {
    /** Panel de faltas: conteo, límite y estado por materia (FR-012 a FR-016). */
    summary(): Promise<AttendanceSummary> {
      return client.get<AttendanceSummary>(ATTENDANCE_ROUTES.summary);
    },

    /**
     * Clases de una fecha y cuáles están ya marcadas (FR-011).
     *
     * Es el primer paso de marcar falta: elegida la fecha, el usuario ve qué tenía ese día.
     */
    day(date: CalendarDate): Promise<DayAttendance> {
      return client.get<DayAttendance>(`${ATTENDANCE_ROUTES.day}?date=${date}`);
    },

    /**
     * Registra faltas en una fecha (FR-011).
     *
     * El día completo se manda como la lista entera de sesiones de ese día: el servidor
     * guarda siempre una falta por sesión, sin importar cómo se registró.
     */
    mark(input: MarkAbsencesInput): Promise<readonly AbsenceRecord[]> {
      return client.post<readonly AbsenceRecord[]>(ATTENDANCE_ROUTES.absences, input);
    },

    /** Historial de faltas, opcionalmente acotado por fechas o materia. */
    history(query: AbsenceHistoryQuery = {}): Promise<readonly AbsenceRecord[]> {
      return client.get<readonly AbsenceRecord[]>(
        `${ATTENDANCE_ROUTES.absences}${historyQuery(query)}`,
      );
    },

    /**
     * Justifica una falta o cambia su nota, recalculando el conteo (FR-017).
     *
     * Toma el tipo de **entrada** del esquema y no el de salida: quien llama manda el
     * cuerpo tal cual, sin las transformaciones que Zod aplica al validar en el servidor.
     * Con el tipo de salida, `note` sería obligatorio y justificar una falta exigiría
     * repetir la nota que ya tenía.
     */
    updateAbsence(id: string, input: UpdateAbsenceInput): Promise<AbsenceRecord> {
      return client.patch<AbsenceRecord>(`${ATTENDANCE_ROUTES.absences}/${id}`, input);
    },

    /** Elimina una falta registrada por error, recalculando el conteo (FR-017). */
    deleteAbsence(id: string): Promise<void> {
      return client.delete<void>(`${ATTENDANCE_ROUTES.absences}/${id}`);
    },

    /** Fija el límite de una materia, o lo devuelve a la sugerencia con `null` (FR-015). */
    setLimit(subjectId: string, input: SetAbsenceLimitInput): Promise<AttendanceSummary> {
      return client.patch<AttendanceSummary>(ATTENDANCE_ROUTES.limit(subjectId), input);
    },

    /** Ajusta las semanas del semestre sobre las que se estiman los totales (FR-013). */
    setSemesterWeeks(input: SetSemesterWeeksInput): Promise<AttendanceSummary> {
      return client.patch<AttendanceSummary>(ATTENDANCE_ROUTES.semesterWeeks, input);
    },
  };
}

export type AttendanceApi = ReturnType<typeof createAttendanceApi>;
