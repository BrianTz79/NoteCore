/**
 * Motor de sincronización: cache local y cola de escrituras (FR-048 a FR-050).
 *
 * Principio VIII: la mecánica —qué se cachea, cómo se pliega la cola, cuándo se reintenta y
 * qué se le dice al usuario— se escribe UNA vez aquí. App y web solo difieren en **dónde**
 * guardan (`AsyncStorage` en React Native, `localStorage` en el navegador), y eso se inyecta
 * como `OfflineStorage`.
 *
 * Es el mismo patrón que `ApiClient` con `TokenStore`: la parte que cambia por plataforma es
 * una interfaz pequeña, y todo lo que se puede equivocar vive en un solo sitio.
 */

import type { Instant } from '../types/auth.js';
import type { EntityId } from '../types/common.js';
import type {
  CachedPayload,
  SyncEntry,
  SyncOperation,
  SyncResult,
  SyncState,
} from '../types/offline.js';
import {
  countConflicts,
  countPending,
  entriesToSync,
  generateEntityId,
  isConflictStatus,
  newSyncEntry,
} from './offline.js';

/**
 * Almacenamiento persistente del dispositivo.
 *
 * Deliberadamente mínimo —leer, escribir, borrar una clave de texto— porque es lo único que
 * `AsyncStorage` y `localStorage` tienen en común. Todo lo demás se construye encima.
 */
export interface OfflineStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** Qué se cachea para consultar sin conexión (FR-048). */
export const CACHE_KEYS = {
  schedule: 'horario',
  agenda: 'agenda',
  attendance: 'faltas',
  semesters: 'semestres',
} as const;

export type CacheKey = (typeof CACHE_KEYS)[keyof typeof CACHE_KEYS];

/**
 * Prefijo de toda clave guardada, con el usuario dentro.
 *
 * **El identificador del usuario forma parte de la clave** (Principio III): sin él, cerrar
 * sesión y entrar con otra cuenta en el mismo teléfono enseñaría el horario del anterior
 * mientras no hubiera red para refrescarlo. Es el aislamiento de datos aplicado al
 * dispositivo, donde no hay ningún `WHERE` que lo garantice.
 */
function cacheKey(userId: EntityId, key: CacheKey): string {
  return `notecore:${userId}:cache:${key}`;
}

function queueKey(userId: EntityId): string {
  return `notecore:${userId}:cola`;
}

function lastSyncKey(userId: EntityId): string {
  return `notecore:${userId}:ultima-sync`;
}

/** Cómo se envía cada operación de la cola. Lo aporta el cliente con su `ApiClient`. */
export interface SyncTransport {
  /** Ejecuta una entrada. Devuelve el estado HTTP; lanza solo si no hubo respuesta. */
  send(entry: SyncEntry): Promise<void>;
}

export interface SyncEngineOptions {
  readonly storage: OfflineStorage;
  readonly transport: SyncTransport;
  /** Se avisa a la interfaz de cada cambio de estado para repintar el indicador. */
  readonly onStateChange?: (state: SyncState) => void;
  /** Reloj inyectable: las pruebas no dependen de la hora real. */
  readonly now?: () => Date;
}

/**
 * Cache y cola de un usuario concreto.
 *
 * Se construye con el `userId` porque todas las claves lo llevan: una instancia no puede
 * tocar los datos de otra cuenta ni por error.
 */
export class SyncEngine {
  private readonly options: SyncEngineOptions;
  private readonly userId: EntityId;

  /** Envío en curso, si lo hay. Dos disparos a la vez comparten una sola pasada. */
  private syncing: Promise<SyncResult> | null = null;

  private online = true;
  private lastSyncedAt: Instant | null = null;
  private queueCache: SyncEntry[] | null = null;

  constructor(userId: EntityId, options: SyncEngineOptions) {
    this.userId = userId;
    this.options = options;
  }

  private now(): Date {
    return this.options.now?.() ?? new Date();
  }

  // ------------------------------------------------------------------ cache (FR-048)

  /**
   * Guarda lo que se acaba de leer de la API para poder consultarlo sin conexión.
   *
   * Se llama tras cada lectura con éxito. Un fallo al guardar **no se propaga**: que el
   * disco esté lleno no debe romper una pantalla que ya tiene sus datos en memoria.
   */
  async cache<T>(key: CacheKey, data: T): Promise<void> {
    const payload: CachedPayload<T> = {
      data,
      cachedAt: this.now().toISOString(),
    };
    try {
      await this.options.storage.setItem(cacheKey(this.userId, key), JSON.stringify(payload));
    } catch {
      // Sin cache se sigue funcionando con red; romper aquí sería peor que no cachear.
    }
  }

  /** Lo último que se guardó de esa pantalla, con su fecha. `null` si nunca se cargó. */
  async readCache<T>(key: CacheKey): Promise<CachedPayload<T> | null> {
    try {
      const raw = await this.options.storage.getItem(cacheKey(this.userId, key));
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !('data' in parsed) ||
        !('cachedAt' in parsed)
      ) {
        return null;
      }
      return parsed as CachedPayload<T>;
    } catch {
      // Un JSON corrupto se trata como "no hay cache": es recuperable con una lectura.
      return null;
    }
  }

  /**
   * Borra el cache del usuario al cerrar sesión.
   *
   * **No borra la cola**: si quedan cambios sin subir, cerrar sesión no debe tirarlos. Se
   * suben cuando esa cuenta vuelva a entrar.
   */
  async clearCache(): Promise<void> {
    for (const key of Object.values(CACHE_KEYS)) {
      try {
        await this.options.storage.removeItem(cacheKey(this.userId, key));
      } catch {
        // Nada que hacer si falla: el cache es material reconstruible.
      }
    }
  }

  // ------------------------------------------------------------------ cola (FR-049)

  /** La cola tal como está guardada, en orden. */
  async queue(): Promise<readonly SyncEntry[]> {
    if (this.queueCache) return this.queueCache;
    try {
      const raw = await this.options.storage.getItem(queueKey(this.userId));
      this.queueCache = raw ? (JSON.parse(raw) as SyncEntry[]) : [];
    } catch {
      this.queueCache = [];
    }
    return this.queueCache;
  }

  private async writeQueue(entries: readonly SyncEntry[]): Promise<void> {
    this.queueCache = [...entries];
    await this.options.storage.setItem(queueKey(this.userId), JSON.stringify(entries));
    await this.emit();
  }

  /**
   * Encola una escritura hecha sin conexión (FR-049).
   *
   * Devuelve la entrada creada para que la pantalla pueda pintar el cambio al instante: el
   * usuario no espera a que haya red para ver lo que acaba de hacer.
   */
  async enqueue(params: {
    readonly operation: SyncOperation;
    readonly entityId: EntityId;
    readonly payload: unknown;
    readonly label: string;
  }): Promise<SyncEntry> {
    const entry = newSyncEntry({
      id: generateEntityId(),
      operation: params.operation,
      entityId: params.entityId,
      payload: params.payload,
      label: params.label,
      queuedAt: this.now().toISOString(),
    });

    await this.writeQueue([...(await this.queue()), entry]);
    return entry;
  }

  /** Descarta una entrada en conflicto: el usuario decide abandonar ese cambio. */
  async discard(entryId: EntityId): Promise<void> {
    const queue = await this.queue();
    await this.writeQueue(queue.filter((entry) => entry.id !== entryId));
  }

  /** Devuelve a la cola una entrada en conflicto para volver a intentarla. */
  async retry(entryId: EntityId): Promise<void> {
    const queue = await this.queue();
    await this.writeQueue(
      queue.map((entry) =>
        entry.id === entryId
          ? { ...entry, status: 'pendiente' as const, error: null, attempts: 0 }
          : entry,
      ),
    );
  }

  /** Descarta todas las entradas en conflicto de una vez. */
  async discardConflicts(): Promise<void> {
    const queue = await this.queue();
    await this.writeQueue(queue.filter((entry) => entry.status !== 'conflicto'));
  }

  // ------------------------------------------------------------------ sincronización

  /** Marca si hay red. Al recuperarla se dispara una pasada (FR-049). */
  async setOnline(online: boolean): Promise<void> {
    const recovered = online && !this.online;
    this.online = online;
    await this.emit();
    if (recovered) await this.sync();
  }

  isOnline(): boolean {
    return this.online;
  }

  /**
   * Sube lo pendiente.
   *
   * Dos disparos simultáneos —el temporizador y la recuperación de red a la vez— comparten
   * una sola pasada: mandar la cola dos veces en paralelo es cómo se duplican las
   * escrituras que tanto cuidado costó hacer idempotentes.
   */
  async sync(): Promise<SyncResult> {
    /**
     * Los dos disparos comparten **la misma promesa**, y por tanto el mismo resultado.
     *
     * Se comprueba y se devuelve la que ya hay antes de crear ninguna: con un `??=` sobre
     * `this.runSync()`, la llamada se evalúa antes de la asignación y el segundo disparo
     * llegaría a entrar en el cuerpo de la pasada. La entrada se enviaría una sola vez
     * —lo impide la cola ya leída— pero ambos contarían la subida, y "se subieron 2
     * cambios" con uno solo es justo el error que el indicador no puede cometer.
     */
    const running = this.syncing;
    if (running) return running;

    /**
     * El estado se vuelve a emitir **después** de soltar `syncing`.
     *
     * `state()` deriva `syncing` de que esta promesa exista, y la última emisión de la pasada
     * —la que hace `writeQueue` al guardar la cola— ocurre todavía dentro de ella. Sin este
     * aviso final, la interfaz se quedaba con el último valor recibido y el indicador decía
     * "Subiendo cambios…" para siempre, aunque la cola ya estuviera vacía. Se vio en el
     * emulador tras subir lo encolado con éxito.
     */
    const started = this.runSync().finally(() => {
      this.syncing = null;
      void this.emit();
    });
    this.syncing = started;
    return started;
  }

  private async runSync(): Promise<SyncResult> {
    const stored = await this.queue();
    const pending = entriesToSync(stored);

    /**
     * **No se sale por estar "sin conexión": intentarlo es la única forma de comprobarlo.**
     *
     * Aquí había un punto muerto. Al fallar una escritura, el motor se marcaba sin conexión;
     * y como `runSync` se negaba a enviar mientras lo estuviera, nada volvía a tocar la red y
     * el estado no podía cambiar nunca. La cola se quedaba con "1 cambio por subir" para
     * siempre aunque la conexión hubiera vuelto —se vio en el emulador, al restaurar la API y
     * volver la app al primer plano—.
     *
     * El intento **es** la comprobación: si sale, se sube y de paso se descubre que hay
     * servidor; si vuelve a fallar por red, la entrada se conserva intacta y se sigue sin
     * conexión, que es exactamente donde estábamos. Lo único que se arriesga es una petición
     * fallida cada vez que algo dispara la sincronización.
     */
    if (pending.length > 0 && !this.online) {
      this.online = true;
    }

    /**
     * Sin nada que enviar, la cola se **guarda plegada** antes de salir.
     *
     * No es un atajo: lo creado y borrado sin conexión se anula al plegar, y esas dos
     * entradas ya no tienen nada que mandar al servidor. Si se volviera aquí sin escribir,
     * se quedarían en el almacenamiento para siempre —no hay envío que las saque— y el
     * indicador diría "2 cambios por subir" de forma permanente, sin manera de resolverlo.
     */
    if (pending.length === 0) {
      const conflicts = stored.filter((entry) => entry.status === 'conflicto');
      if (conflicts.length !== stored.length) {
        await this.writeQueue(conflicts);
      }
      return { uploaded: 0, failed: 0, conflicts: 0 };
    }

    await this.emit(true);

    let uploaded = 0;
    let failed = 0;
    let conflicts = 0;

    // Lo que sobrevive de la cola: los conflictos que ya estaban, más lo que falle ahora.
    const remaining: SyncEntry[] = stored.filter((entry) => entry.status === 'conflicto');

    for (const entry of pending) {
      try {
        await this.options.transport.send(entry);
        uploaded += 1;
        // Se acaba de hablar con el servidor: hay conexión, lo dijera quien lo dijera.
        this.online = true;
      } catch (error) {
        const status = statusOf(error);

        if (isConflictStatus(status)) {
          conflicts += 1;
          remaining.push({
            ...entry,
            status: 'conflicto',
            error: messageOf(error),
            attempts: entry.attempts + 1,
          });
        } else {
          failed += 1;
          remaining.push({
            ...entry,
            status: 'pendiente',
            error: null,
            attempts: entry.attempts + 1,
          });

          // El intento acaba de demostrar que no hay servidor: se refleja en el estado, que
          // es lo que el indicador enseña (FR-050).
          this.online = false;

          // Un fallo de red corta la pasada: lo que viene detrás fallaría igual, y seguir
          // solo sumaría intentos. Se conserva **sin tocar** para el próximo intento.
          const index = pending.indexOf(entry);
          remaining.push(...pending.slice(index + 1));
          break;
        }
      }
    }

    if (uploaded > 0) {
      this.lastSyncedAt = this.now().toISOString();
      try {
        await this.options.storage.setItem(lastSyncKey(this.userId), this.lastSyncedAt);
      } catch {
        // La fecha es informativa; perderla no invalida la sincronización.
      }
    }

    await this.writeQueue(remaining);

    return { uploaded, failed, conflicts };
  }

  // ------------------------------------------------------------------ estado (FR-050)

  /** El estado que lee el indicador. */
  async state(): Promise<SyncState> {
    const queue = await this.queue();
    if (this.lastSyncedAt === null) {
      try {
        this.lastSyncedAt = await this.options.storage.getItem(lastSyncKey(this.userId));
      } catch {
        this.lastSyncedAt = null;
      }
    }

    return {
      online: this.online,
      syncing: this.syncing !== null,
      pending: countPending(queue),
      conflicts: countConflicts(queue),
      lastSyncedAt: this.lastSyncedAt,
    };
  }

  private async emit(syncing = false): Promise<void> {
    if (!this.options.onStateChange) return;
    const state = await this.state();
    this.options.onStateChange(syncing ? { ...state, syncing: true } : state);
  }
}

/** El estado HTTP de un error del cliente de API; 0 si no llegó respuesta. */
function statusOf(error: unknown): number {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const { status } = error as { status: unknown };
    if (typeof status === 'number') return status;
  }
  return 0;
}

function messageOf(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const { message } = error as { message: unknown };
    if (typeof message === 'string' && message.length > 0) return message;
  }
  return 'No se pudo subir este cambio.';
}
