/**
 * Tipos de la cola de sincronización y del estado de conexión (FR-048 a FR-050).
 *
 * Principio VIII: definidos UNA vez aquí y consumidos por `api`, `web` y `mobile`.
 *
 * La app encola escrituras y la web solo consulta lo cacheado (decisión de la fase), pero
 * los **tipos del estado** son comunes: el indicador de FR-050 dice lo mismo en los dos
 * clientes porque lee la misma estructura y la misma función de texto.
 */

import type { EntityId } from './common.js';
import type { Instant } from './auth.js';

/**
 * Qué operación encolada es.
 *
 * Se nombra por su efecto de dominio —"marcar falta"— y no por su verbo HTTP, porque es lo
 * que hay que **contarle al usuario**: FR-050 pide que vea qué está pendiente de subir, y
 * "1 falta por subir" es legible mientras que "1 POST /attendance/absences" no lo es.
 *
 * El alcance es agenda y faltas: lo que se hace dentro del aula, que es donde falla la
 * señal. El horario se consulta sin conexión pero se captura con red, porque capturarlo es
 * una sesión larga que se hace una vez y en casa.
 */
export const SYNC_OPERATIONS = [
  'agenda_crear',
  'agenda_editar',
  'agenda_borrar',
  'falta_marcar',
  'falta_editar',
  'falta_borrar',
] as const;
export type SyncOperation = (typeof SYNC_OPERATIONS)[number];

/**
 * En qué estado está una operación de la cola.
 *
 * - `pendiente`: esperando a que haya red.
 * - `sincronizando`: se está enviando ahora mismo.
 * - `conflicto`: el servidor la rechazó por una razón que **no** se arregla reintentando
 *   (la actividad ya no existe, el semestre se archivó, el cuerpo no valida). Necesita que
 *   el usuario decida, y por eso se distingue de un fallo de red.
 *
 * No hay estado `completada`: al subir, la operación **sale de la cola**. Guardar el
 * historial de lo ya sincronizado haría crecer el almacenamiento local sin límite para
 * responder a una pregunta que nadie hace.
 */
export const SYNC_STATUSES = ['pendiente', 'sincronizando', 'conflicto'] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

/**
 * Una escritura hecha sin conexión, esperando a subir (FR-049).
 *
 * `entityId` es el identificador **definitivo**, no uno temporal: lo genera el cliente al
 * crear (decisión de la fase). Por eso una operación posterior sobre lo mismo —completar la
 * actividad que se acaba de crear— puede referirse a él directamente, sin que nada tenga
 * que reescribirse cuando la creación suba.
 */
export interface SyncEntry {
  /** Identificador de la entrada en la cola. Distinto del de la entidad que toca. */
  readonly id: EntityId;
  readonly operation: SyncOperation;
  /** La entidad afectada: la actividad creada, la falta marcada. */
  readonly entityId: EntityId;
  /** Cuerpo tal como se mandará a la API. `null` en los borrados, que no llevan. */
  readonly payload: unknown;
  readonly status: SyncStatus;
  /** Cuándo se hizo el cambio en el dispositivo, no cuándo se subió. */
  readonly queuedAt: Instant;
  /** Intentos de envío fallidos por red. Se reintenta; no es un conflicto. */
  readonly attempts: number;
  /**
   * Por qué quedó en conflicto, en el idioma del usuario. `null` mientras no lo esté.
   *
   * Se guarda el mensaje ya resuelto —no el código— porque quien lo lee es la pantalla, y
   * el motivo del rechazo lo explica el servidor mejor que una tabla de códigos en el
   * cliente (Principio II).
   */
  readonly error: string | null;
  /**
   * Descripción corta de lo que el usuario hizo: "Reporte de laboratorio", "Cálculo · 3 de
   * septiembre". Es lo que se enseña en la lista de pendientes (FR-050).
   *
   * Se guarda al encolar y no se deriva al pintar: para derivarla haría falta la entidad, y
   * la entidad de un borrado ya no está.
   */
  readonly label: string;
}

/**
 * Estado de la sincronización, tal como lo lee el indicador (FR-050).
 *
 * Lo consumen los dos clientes: en la app refleja la cola real; en la web, que no encola,
 * `pending` y `conflicts` valen siempre 0 y solo `online` cambia. Así el mismo componente
 * de estado sirve para ambos sin ramificar por plataforma.
 */
export interface SyncState {
  /** Si hay conexión con la API ahora mismo. */
  readonly online: boolean;
  /** Si se está subiendo algo en este momento. */
  readonly syncing: boolean;
  /** Cuántas escrituras esperan a subir. */
  readonly pending: number;
  /** Cuántas quedaron en conflicto y necesitan decisión del usuario. */
  readonly conflicts: number;
  /** Cuándo se sincronizó con éxito por última vez. `null` si nunca. */
  readonly lastSyncedAt: Instant | null;
}

/**
 * Resultado de una pasada de sincronización.
 *
 * Se devuelve para poder avisar de lo ocurrido —"Se subieron 3 cambios"— sin que la
 * pantalla tenga que comparar el antes y el después de la cola.
 */
export interface SyncResult {
  readonly uploaded: number;
  readonly failed: number;
  readonly conflicts: number;
}

/**
 * Datos cacheados de una pantalla, con su fecha (FR-048).
 *
 * La fecha es la que permite decir "Actualizado hace 2 horas" al consultar sin conexión: un
 * horario sin fecha no distingue lo cargado hace un minuto de lo cargado la semana pasada, y
 * es justo la diferencia que importa cuando no hay red para comprobarlo.
 */
export interface CachedPayload<T> {
  readonly data: T;
  readonly cachedAt: Instant;
}
