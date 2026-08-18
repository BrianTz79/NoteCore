/**
 * Reglas de la cola de sincronización y del indicador de estado (FR-048 a FR-050).
 *
 * Principio VIII: todo lo que app y web dicen sobre el estado de la sincronización sale de
 * aquí. Es justo la clase de texto que se afina en un cliente y se olvida en el otro, y
 * entonces el mismo estado se lee distinto según el dispositivo.
 *
 * Funciones puras: no tocan almacenamiento ni red. Eso lo hace cada cliente con su API
 * (`AsyncStorage` en la app, `localStorage` en la web), pero **qué** se guarda y **qué** se
 * dice de ello se decide una sola vez, aquí.
 */

import type { EntityId } from '../types/common.js';
import type { Instant } from '../types/auth.js';
import type {
  SyncEntry,
  SyncOperation,
  SyncState,
} from '../types/offline.js';
import { relativeTime } from './social.js';

/**
 * Qué operaciones actúan sobre una entidad que quizá **todavía no existe** en el servidor.
 *
 * Es lo que permite plegar la cola: editar algo creado sin conexión no necesita viajar como
 * edición aparte, porque la creación que aún no ha subido puede llevar ya el valor nuevo.
 */
const CREATE_OPERATIONS: ReadonlySet<SyncOperation> = new Set([
  'agenda_crear',
  'falta_marcar',
]);

const DELETE_OPERATIONS: ReadonlySet<SyncOperation> = new Set([
  'agenda_borrar',
  'falta_borrar',
]);

export function isCreateOperation(operation: SyncOperation): boolean {
  return CREATE_OPERATIONS.has(operation);
}

export function isDeleteOperation(operation: SyncOperation): boolean {
  return DELETE_OPERATIONS.has(operation);
}

/**
 * Nombre de cada operación, en singular y en el idioma del usuario.
 *
 * FR-050 pide que el usuario vea qué está pendiente. Ve esto, no el verbo HTTP.
 */
export const SYNC_OPERATION_LABELS: Readonly<Record<SyncOperation, string>> = {
  agenda_crear: 'Actividad creada',
  agenda_editar: 'Actividad editada',
  agenda_borrar: 'Actividad eliminada',
  falta_marcar: 'Falta registrada',
  falta_editar: 'Falta editada',
  falta_borrar: 'Falta eliminada',
};

/**
 * Pliega la cola antes de enviarla.
 *
 * Sin esto, marcar y desmarcar una tarea cinco veces sin conexión mandaría cinco peticiones
 * que se pisan, y el resultado dependería del orden de llegada. Las reglas son tres, y todas
 * salen de que el identificador lo genera el cliente:
 *
 * 1. **Crear + editar = crear con lo editado.** La creación todavía no ha subido, así que
 *    puede llevar el valor final. Una sola petición en vez de dos.
 * 2. **Crear + borrar = nada.** Lo que se creó y se borró sin conexión nunca existió para el
 *    servidor. Mandar las dos sería pedirle que cree una fila para borrarla acto seguido.
 * 3. **Editar + editar = la última.** Los `PATCH` son de campos sueltos, así que se fusionan
 *    los cuerpos: editar el título y luego la fecha manda ambos, no solo la fecha.
 *
 * Lo que **no** se pliega: operaciones sobre entidades distintas, y cualquier cosa en
 * conflicto —esa espera al usuario, y plegarla escondería el problema que hay que enseñarle—.
 *
 * El orden relativo de lo que sobrevive se conserva: las faltas y las actividades se suben en
 * el orden en que el estudiante las hizo.
 */
export function collapseQueue(entries: readonly SyncEntry[]): readonly SyncEntry[] {
  const result: SyncEntry[] = [];

  for (const entry of entries) {
    // Un conflicto no se toca: es del usuario hasta que lo resuelva.
    if (entry.status === 'conflicto') {
      result.push(entry);
      continue;
    }

    const previousIndex = result.findIndex(
      (candidate) =>
        candidate.entityId === entry.entityId && candidate.status !== 'conflicto',
    );

    if (previousIndex === -1) {
      result.push(entry);
      continue;
    }

    const previous = result[previousIndex]!;

    // Regla 2: lo creado y borrado sin conexión no llega a existir.
    if (isDeleteOperation(entry.operation) && isCreateOperation(previous.operation)) {
      result.splice(previousIndex, 1);
      continue;
    }

    // Un borrado sobre algo que sí existe en el servidor sustituye a lo demás: editar y
    // luego borrar solo necesita el borrado.
    if (isDeleteOperation(entry.operation)) {
      result.splice(previousIndex, 1, entry);
      continue;
    }

    // Regla 1: la creación pendiente absorbe la edición y sigue siendo una creación.
    if (isCreateOperation(previous.operation)) {
      result.splice(previousIndex, 1, {
        ...previous,
        payload: mergePayloads(previous.payload, entry.payload),
        // La etiqueta se actualiza: si se renombró la actividad, lo pendiente es el nombre
        // nuevo, que es el que el usuario reconoce.
        label: entry.label,
      });
      continue;
    }

    // Regla 3: dos ediciones se funden en una.
    result.splice(previousIndex, 1, {
      ...entry,
      payload: mergePayloads(previous.payload, entry.payload),
    });
  }

  return result;
}

/**
 * Funde dos cuerpos de petición, ganando el segundo campo a campo.
 *
 * Se fusiona en vez de sustituir porque los `PATCH` mandan solo lo que cambia: quedarse con
 * el último perdería el título editado antes de cambiar la fecha.
 */
function mergePayloads(previous: unknown, next: unknown): unknown {
  if (!isPlainObject(previous)) return next;
  if (!isPlainObject(next)) return next;
  return { ...previous, ...next };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Cuántas entradas esperan a subir, sin contar las que están en conflicto. */
export function countPending(entries: readonly SyncEntry[]): number {
  return entries.filter((entry) => entry.status !== 'conflicto').length;
}

/** Cuántas entradas necesitan que el usuario decida. */
export function countConflicts(entries: readonly SyncEntry[]): number {
  return entries.filter((entry) => entry.status === 'conflicto').length;
}

/** Las entradas que toca enviar, en orden y ya plegadas. */
export function entriesToSync(entries: readonly SyncEntry[]): readonly SyncEntry[] {
  return collapseQueue(entries).filter((entry) => entry.status !== 'conflicto');
}

/**
 * El texto del indicador de sincronización (FR-050).
 *
 * Es **la** función de la fase de cara al usuario: lo que la app y la web ponen en la barra
 * de estado sale de aquí, palabra por palabra, para que la misma situación no se lea de dos
 * maneras. El orden de los casos es deliberado —lo más urgente primero—:
 *
 * 1. Un conflicto pide acción y no se resuelve solo.
 * 2. Sin conexión con cambios pendientes es la situación que FR-050 describe.
 * 3. Sin conexión y sin nada pendiente es tranquilizador: todo está guardado.
 * 4. Subiendo ahora mismo.
 * 5. Al día.
 */
export function syncStatusMessage(state: SyncState, now: Date = new Date()): string {
  if (state.conflicts > 0) {
    return state.conflicts === 1
      ? '1 cambio no se pudo subir'
      : `${state.conflicts} cambios no se pudieron subir`;
  }

  if (!state.online) {
    if (state.pending > 0) {
      return state.pending === 1
        ? 'Sin conexión · 1 cambio por subir'
        : `Sin conexión · ${state.pending} cambios por subir`;
    }
    return 'Sin conexión · todo guardado';
  }

  if (state.syncing) return 'Subiendo cambios…';

  if (state.pending > 0) {
    return state.pending === 1
      ? '1 cambio por subir'
      : `${state.pending} cambios por subir`;
  }

  if (state.lastSyncedAt) {
    return `Al día · ${relativeTime(state.lastSyncedAt, now).toLowerCase()}`;
  }

  return 'Al día';
}

/**
 * El tono del indicador, para que cada cliente lo pinte con su propio sistema de color.
 *
 * Se devuelve el **significado** y no un color: la app y la web tienen paletas distintas, y
 * un `#f59e0b` en `shared` obligaría a que ambas usaran exactamente el mismo ámbar.
 */
export type SyncTone = 'atencion' | 'espera' | 'ok';

export function syncStatusTone(state: SyncState): SyncTone {
  if (state.conflicts > 0) return 'atencion';
  if (!state.online || state.pending > 0 || state.syncing) return 'espera';
  return 'ok';
}

/**
 * Si merece la pena enseñar el indicador.
 *
 * Con conexión y sin nada pendiente no hay nada que decir, y una barra permanente de "todo
 * bien" es ruido que el usuario deja de leer —y entonces tampoco lee el aviso que sí
 * importa—.
 */
export function shouldShowSyncIndicator(state: SyncState): boolean {
  return !state.online || state.pending > 0 || state.conflicts > 0 || state.syncing;
}

/**
 * Qué antigüedad tiene lo que se está viendo sin conexión (FR-048).
 *
 * Consultar sin red está bien mientras se sepa de cuándo es lo que se lee: un horario de
 * hace una hora es el horario, y uno de hace tres semanas puede haber cambiado.
 */
export function cacheAgeMessage(cachedAt: Instant | null, now: Date = new Date()): string {
  if (!cachedAt) return 'Sin datos guardados';
  return `Actualizado ${relativeTime(cachedAt, now).toLowerCase()}`;
}

/**
 * Resumen de lo pendiente para la lista de FR-050.
 *
 * Agrupa por operación para no enumerar quince líneas iguales cuando se marcaron quince
 * faltas seguidas.
 */
export function pendingSummary(entries: readonly SyncEntry[]): string {
  const pending = entries.filter((entry) => entry.status !== 'conflicto');
  if (pending.length === 0) return 'No hay cambios pendientes';

  const agenda = pending.filter((entry) => entry.operation.startsWith('agenda_')).length;
  const faltas = pending.filter((entry) => entry.operation.startsWith('falta_')).length;

  const parts: string[] = [];
  if (agenda > 0) {
    parts.push(agenda === 1 ? '1 actividad' : `${agenda} actividades`);
  }
  if (faltas > 0) {
    parts.push(faltas === 1 ? '1 falta' : `${faltas} faltas`);
  }

  return `${parts.join(' · ')} por subir`;
}

/**
 * Si un error del servidor es un conflicto o algo que se arregla reintentando.
 *
 * La distinción es la que decide si la entrada se queda esperando red o pasa a pedirle algo
 * al usuario, y equivocarla tiene las dos consecuencias malas: un conflicto tratado como
 * fallo de red se reintentaría para siempre, y un fallo de red tratado como conflicto le
 * pediría al usuario que resuelva algo que se habría arreglado solo.
 *
 * El criterio es el código HTTP, no el mensaje: el 0 es "no salió del dispositivo" y los 5xx
 * son del servidor —ambos se reintentan—, mientras que un 4xx es una respuesta deliberada
 * sobre esta petición, y volver a mandarla daría exactamente lo mismo.
 *
 * El 401 es la excepción que confirma la regla: es un 4xx que **sí** se recupera solo, porque
 * `ApiClient` renueva el token y reintenta. Si llega hasta aquí es que la sesión ya no se
 * puede renovar, y entonces lo que toca no es resolver un conflicto sino volver a entrar.
 */
export function isConflictStatus(status: number): boolean {
  if (status === 0) return false;
  if (status === 401 || status === 408 || status === 429) return false;
  return status >= 400 && status < 500;
}

/**
 * Bytes aleatorios, con `crypto` cuando lo hay.
 *
 * **`crypto.getRandomValues` no existe en el motor Hermes de React Native**, y ahí estaba el
 * fallo: la app compilada lanzaba al crear una actividad sin conexión —"Ocurrió un error
 * inesperado"— porque el identificador se generaba antes de encolar nada y reventaba en esa
 * primera línea. No se veía ni en Node ni en el navegador, donde `crypto` sí está, así que
 * ninguna suite lo cubría; apareció al probar el APK de release en el emulador.
 *
 * El respaldo con `Math.random()` es aceptable **aquí y solo aquí**: estos identificadores no
 * protegen nada. Sirven para que el teléfono y el servidor se refieran a la misma actividad,
 * y quien los adivinara no obtendría nada, porque toda petición se autoriza por el token y
 * toda consulta filtra por el usuario (Principio III). Es justo lo contrario del código de un
 * compartido (Fase 6), que **es** la credencial que protege el contenido y por eso allí no se
 * admite ningún respaldo: si `crypto` faltara, debe fallar en vez de degradarse en silencio.
 *
 * Con 122 bits aleatorios, la probabilidad de que dos actividades choquen es despreciable
 * incluso con el generador flojo, y el servidor rechazaría el duplicado de todos modos.
 */
function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);

  const fuente =
    typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;

  if (fuente && typeof fuente.getRandomValues === 'function') {
    fuente.getRandomValues(bytes);
    return bytes;
  }

  for (let i = 0; i < length; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

/**
 * Genera un identificador para algo creado en el dispositivo.
 *
 * **La decisión que sostiene toda la fase.** El identificador lo genera el cliente y no el
 * servidor, y de ahí salen dos propiedades que la cola necesita:
 *
 * - **Nada que reescribir al sincronizar.** Una actividad creada sin conexión ya tiene su
 *   identificador definitivo, así que completarla acto seguido encola un `PATCH` sobre ese
 *   mismo identificador. Con uno temporal habría que recorrer la cola sustituyéndolo cuando
 *   la creación subiera, y esa reescritura es justo donde las colas se corrompen.
 * - **Reenviar una creación no duplica.** Si la respuesta se pierde con la petición ya
 *   ejecutada —el caso real de la señal que cae a mitad—, el reintento manda el mismo
 *   identificador y el servidor reconoce la fila que ya escribió. Sin esto, cada corte de red
 *   en el peor momento dejaría una actividad repetida.
 *
 * Se construye un UUID v4 a mano en vez de usar `crypto.randomUUID`, que **no existe en React
 * Native** y dejaría a la app sin poder crear nada sin conexión. Los bytes los da
 * `randomBytes`, que además tolera que no haya `crypto` (ver ahí por qué).
 */
export function generateEntityId(): EntityId {
  const bytes = randomBytes(16);

  // Marca de versión (4) y de variante (RFC 4122), que es lo que valida `entityIdSchema`.
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/** Una entrada nueva de la cola, con sus valores iniciales. */
export function newSyncEntry(params: {
  readonly id: EntityId;
  readonly operation: SyncOperation;
  readonly entityId: EntityId;
  readonly payload: unknown;
  readonly label: string;
  readonly queuedAt: Instant;
}): SyncEntry {
  return {
    id: params.id,
    operation: params.operation,
    entityId: params.entityId,
    payload: params.payload,
    label: params.label,
    queuedAt: params.queuedAt,
    status: 'pendiente',
    attempts: 0,
    error: null,
  };
}
