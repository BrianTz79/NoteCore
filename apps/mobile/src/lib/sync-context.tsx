import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import {
  isNetworkError,
  SyncEngine,
  type CacheKey,
  type CachedPayload,
  type Instant,
  type SyncEntry,
  type SyncState,
} from '@notecore/shared';
import { useAuth } from './auth-context';
import { offlineStorage } from './offline-storage';
import { syncTransport } from './sync-transport';

/**
 * Cache y cola de sincronización de la app (FR-048 a FR-050).
 *
 * Envuelve al `SyncEngine` compartido y lo conecta con lo que solo existe en el teléfono:
 * cuándo la app vuelve al primer plano y cuándo hay red.
 */

/**
 * Las acciones del cache y la cola, separadas del estado.
 *
 * **La separación no es cosmética.** Las pantallas cargan sus datos en un `useEffect` que
 * depende de su función de carga, y esa función depende de lo que use del contexto. Si
 * dependiera del objeto entero, cada cambio de estado —y cada lectura provoca uno al informar
 * de si la API respondió— crearía una función nueva, dispararía el efecto, volvería a leer y
 * cambiaría el estado otra vez. En la web ese bucle se manifestó como siete peticiones
 * idénticas por pantalla hasta agotar el límite del servidor; aquí se evita igual.
 */
interface SyncActions {
  /** Sube lo pendiente ahora mismo. */
  sync(): Promise<void>;
  /** Guarda lo leído de la API para poder consultarlo sin conexión. */
  cache<T>(key: CacheKey, data: T): Promise<void>;
  /** Lo último guardado de esa pantalla, con su fecha. */
  readCache<T>(key: CacheKey): Promise<CachedPayload<T> | null>;
  /** Encola una escritura hecha sin conexión. */
  enqueue(params: {
    operation: SyncEntry['operation'];
    entityId: string;
    payload: unknown;
    label: string;
  }): Promise<void>;
  discard(entryId: string): Promise<void>;
  retry(entryId: string): Promise<void>;
  discardConflicts(): Promise<void>;
  /**
   * Registra si la **API** respondió, que no es lo mismo que si hay red.
   *
   * Un teléfono con wifi del campus puede no alcanzar la API —portal cautivo, servidor
   * caído—, así que la única señal honesta de "hay servidor" es haber hablado con él. Al
   * pasar a `true` se sube lo que estuviera esperando.
   */
  reportReachable(reachable: boolean): Promise<void>;
  /** Ejecuta una escritura: la manda si hay red, la encola si no. */
  write(params: {
    operation: SyncEntry['operation'];
    entityId: string;
    payload: unknown;
    label: string;
    send(): Promise<void>;
  }): Promise<{ queued: boolean }>;
}

interface SyncContextValue extends SyncActions {
  readonly state: SyncState;
  readonly queue: readonly SyncEntry[];
}

const SyncContext = createContext<SyncContextValue | null>(null);

/**
 * Contexto aparte para las acciones, estables durante toda la sesión.
 *
 * Quien solo necesite las funciones no se vuelve a renderizar —ni recrea sus callbacks— al
 * cambiar el estado de la conexión o el contenido de la cola.
 */
const SyncActionsContext = createContext<SyncActions | null>(null);

const OFFLINE_STATE: SyncState = {
  online: true,
  syncing: false,
  pending: 0,
  conflicts: 0,
  lastSyncedAt: null,
};

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<SyncState>(OFFLINE_STATE);
  const [queue, setQueue] = useState<readonly SyncEntry[]>([]);
  const engineRef = useRef<SyncEngine | null>(null);

  /**
   * El motor se construye **por usuario**: sus claves llevan el identificador dentro, así
   * que cambiar de cuenta cambia de motor y ninguna ve el cache ni la cola de la otra
   * (Principio III aplicado al dispositivo, donde no hay `WHERE` que lo garantice).
   */
  useEffect(() => {
    if (!user) {
      engineRef.current = null;
      setState(OFFLINE_STATE);
      setQueue([]);
      return;
    }

    const engine = new SyncEngine(user.id, {
      storage: offlineStorage,
      transport: syncTransport,
      onStateChange: (next) => {
        setState(next);
        void engine.queue().then(setQueue);
      },
    });

    engineRef.current = engine;

    void (async () => {
      /**
       * Se siembra la cola, **no el estado de conexión**.
       *
       * Sembrar el estado entero aquí pisaba lo que las pantallas ya habían averiguado: su
       * primera lectura falla y llama a `reportReachable(false)`, pero este efecto resolvía
       * después y devolvía `online: true` —el valor con el que nace el motor—, así que el
       * indicador desaparecía justo cuando debía aparecer. Se vio en el emulador: los datos
       * salían del cache y aun así no había aviso de "sin conexión".
       *
       * Quien sabe si hay servidor es la petición, así que el estado se deja en manos de
       * `reportReachable` y aquí solo se carga lo que estaba guardado.
       */
      const guardada = await engine.queue();
      const inicial = await engine.state();
      setQueue(guardada);
      // Se conserva el `online` que ya se supiera; lo demás sí sale de lo guardado.
      setState((actual) => ({ ...inicial, online: actual.online }));

      // Al entrar se sube lo que quedara de la sesión anterior.
      await engine.sync();
    })();
  }, [user]);

  /**
   * Se reintenta al volver al primer plano.
   *
   * Es el momento en que el estudiante saca el teléfono del bolsillo, que suele coincidir
   * con salir del aula donde no había señal. No hay sondeo en segundo plano: gastaría
   * batería para adelantarse a un momento que el usuario provoca al mirar la pantalla.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') void engineRef.current?.sync();
    });
    return () => subscription.remove();
  }, []);

  const sync = useCallback(async () => {
    await engineRef.current?.sync();
  }, []);

  const cache = useCallback(async <T,>(key: CacheKey, data: T) => {
    await engineRef.current?.cache(key, data);
  }, []);

  const readCache = useCallback(
    async <T,>(key: CacheKey): Promise<CachedPayload<T> | null> => {
      const result = await engineRef.current?.readCache<T>(key);
      return result ?? null;
    },
    [],
  );

  const enqueue = useCallback(
    async (params: {
      operation: SyncEntry['operation'];
      entityId: string;
      payload: unknown;
      label: string;
    }) => {
      await engineRef.current?.enqueue(params);
    },
    [],
  );

  const discard = useCallback(async (entryId: string) => {
    await engineRef.current?.discard(entryId);
  }, []);

  const retry = useCallback(async (entryId: string) => {
    await engineRef.current?.retry(entryId);
    await engineRef.current?.sync();
  }, []);

  const discardConflicts = useCallback(async () => {
    await engineRef.current?.discardConflicts();
  }, []);

  const reportReachable = useCallback(async (reachable: boolean) => {
    // `setOnline` dispara la sincronización sola al recuperar la conexión (FR-049).
    await engineRef.current?.setOnline(reachable);
  }, []);

  /**
   * El camino que usan las pantallas para escribir.
   *
   * **La conexión se detecta intentando**, no consultando el estado de la red. Es
   * deliberado: que el teléfono tenga wifi no significa que la API responda —el portal
   * cautivo de la universidad es exactamente ese caso—, así que el único indicador honesto
   * de "hay servidor" es haber hablado con él. `ApiClient` ya distingue el fallo de red
   * (`status` 0) de una respuesta del servidor, y eso es lo que se mira aquí.
   *
   * Un error con respuesta —un 400, un 404— **no se encola**: el servidor contestó, así que
   * hay conexión y el problema es la petición. Se propaga para que la pantalla lo enseñe
   * como siempre, igual que antes de esta fase.
   */
  const write = useCallback(
    async (params: {
      operation: SyncEntry['operation'];
      entityId: string;
      payload: unknown;
      label: string;
      send(): Promise<void>;
    }): Promise<{ queued: boolean }> => {
      const engine = engineRef.current;

      // Sin motor (sin sesión) se manda tal cual: no hay dónde encolar.
      if (!engine) {
        await params.send();
        return { queued: false };
      }

      /**
       * Con cambios ya en cola, lo nuevo se encola también **sin intentar mandarlo**.
       *
       * Mandarlo directo lo adelantaría a lo que espera desde antes, y el orden importa:
       * completar una actividad cuya creación sigue en la cola llegaría al servidor antes
       * que la actividad misma, y fallaría con un 404 que se marcaría como conflicto.
       */
      const pending = await engine.queue();
      if (pending.some((entry) => entry.status !== 'conflicto')) {
        await engine.enqueue(params);
        void engine.sync();
        return { queued: true };
      }

      try {
        await params.send();
        await engine.setOnline(true);
        return { queued: false };
      } catch (error) {
        const isNetwork = isNetworkError(error);
        if (!isNetwork) throw error;

        await engine.enqueue(params);
        await engine.setOnline(false);
        return { queued: true };
      }
    },
    [],
  );

  /** Las acciones, estables: es lo que las pantallas ponen en sus dependencias. */
  const actions = useMemo<SyncActions>(
    () => ({
      sync,
      cache,
      readCache,
      enqueue,
      discard,
      retry,
      discardConflicts,
      reportReachable,
      write,
    }),
    [
      sync,
      cache,
      readCache,
      enqueue,
      discard,
      retry,
      discardConflicts,
      reportReachable,
      write,
    ],
  );

  const value = useMemo<SyncContextValue>(
    () => ({ ...actions, state, queue }),
    [actions, state, queue],
  );

  return (
    <SyncActionsContext.Provider value={actions}>
      <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
    </SyncActionsContext.Provider>
  );
}

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync debe usarse dentro de <SyncProvider>');
  return context;
}

/**
 * Solo las acciones, sin el estado ni la cola.
 *
 * Es lo que usan las funciones de carga de las pantallas: depender del contexto entero las
 * recrearía en cada cambio y su efecto volvería a dispararse (ver `SyncActions`).
 */
export function useSyncActions(): SyncActions {
  const context = useContext(SyncActionsContext);
  if (!context) throw new Error('useSyncActions debe usarse dentro de <SyncProvider>');
  return context;
}

/**
 * Lee de la API y cachea, cayendo al cache si no hay red (FR-048).
 *
 * Es el patrón que repiten todas las pantallas de consulta, así que se escribe una vez.
 * Devuelve además si lo que se está enseñando viene del cache y de cuándo es, que es lo que
 * la pantalla necesita para avisar de que puede estar desactualizado.
 */
export async function loadWithCache<T>(
  sync: SyncActions,
  key: CacheKey,
  fetcher: () => Promise<T>,
): Promise<{ data: T; fromCache: boolean; cachedAt: Instant | null }> {
  try {
    const data = await fetcher();
    await sync.cache(key, data);
    // Se acaba de hablar con la API: si algo estaba encolado, este es el momento de subirlo.
    await sync.reportReachable(true);
    return { data, fromCache: false, cachedAt: null };
  } catch (error) {
    const isNetwork = isNetworkError(error);
    if (!isNetwork) throw error;

    // La API no contesta: es lo que el indicador debe reflejar, lo diga o no el sistema.
    await sync.reportReachable(false);

    const cached = await sync.readCache<T>(key);
    if (!cached) throw error;

    return { data: cached.data, fromCache: true, cachedAt: cached.cachedAt };
  }
}
