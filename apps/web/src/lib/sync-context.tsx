'use client';

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
import {
  isNetworkError,
  SyncEngine,
  type CacheKey,
  type CachedPayload,
  type Instant,
  type SyncState,
} from '@notecore/shared';
import { useAuth } from './auth-context';
import { offlineStorage } from './offline-storage';

/**
 * Cache de consulta de la web (FR-048).
 *
 * Reutiliza el `SyncEngine` compartido con la app, pero **solo su mitad de lectura**: la web
 * cachea lo ya cargado para poder consultarlo sin conexión y refleja el estado de la
 * conexión, sin encolar escrituras (decisión de alcance de la fase).
 *
 * El transporte es un `SyncTransport` que nunca se usa —no hay cola que enviar— pero la
 * interfaz lo exige; lanza si alguien lo llamara, porque hacerlo sería un error de
 * programación y no una situación que deba tragarse en silencio.
 */

/**
 * Las funciones del cache, separadas del estado.
 *
 * **La separación no es cosmética.** Las pantallas piden los datos dentro de un `useEffect`
 * que depende de su función de carga, y esa función depende de lo que use del contexto. Si
 * dependiera del objeto entero, cada cambio de estado —y `reportReachable` provoca uno en
 * cada lectura— crearía una función nueva, que dispararía el efecto, que volvería a leer, que
 * cambiaría el estado otra vez: un bucle que se manifestó como siete peticiones idénticas por
 * carga de pantalla hasta agotar el límite del servidor.
 *
 * Con las funciones en un objeto estable, `load` se crea una sola vez y el efecto corre una
 * sola vez, mientras el indicador sigue repintándose con el estado por su cuenta.
 */
interface SyncActions {
  cache<T>(key: CacheKey, data: T): Promise<void>;
  readCache<T>(key: CacheKey): Promise<CachedPayload<T> | null>;
  /**
   * Registra si la **API** respondió, que no es lo mismo que si hay red.
   *
   * `navigator.onLine` solo sabe del sistema operativo: con el portal cautivo de la
   * universidad, o con la API caída, dice que hay conexión mientras ninguna petición llega.
   * Lo llama `loadWithCache` con el resultado de cada lectura, que es la única señal honesta.
   */
  reportReachable(reachable: boolean): void;
}

interface SyncContextValue extends SyncActions {
  readonly state: SyncState;
}

const SyncContext = createContext<SyncContextValue | null>(null);

/**
 * Contexto aparte para las acciones.
 *
 * Se separa del anterior para que quien solo necesite las funciones **no se vuelva a
 * renderizar** —ni recree sus callbacks— cada vez que cambia el estado de la conexión.
 */
const SyncActionsContext = createContext<SyncActions | null>(null);

const ESTADO_INICIAL: SyncState = {
  online: true,
  syncing: false,
  pending: 0,
  conflicts: 0,
  lastSyncedAt: null,
};

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<SyncState>(ESTADO_INICIAL);
  const engineRef = useRef<SyncEngine | null>(null);

  // El motor se construye por usuario: sus claves llevan el identificador dentro, así que
  // dos cuentas en el mismo navegador no comparten cache (Principio III).
  useEffect(() => {
    if (!user) {
      engineRef.current = null;
      setState(ESTADO_INICIAL);
      return;
    }

    const engine = new SyncEngine(user.id, {
      storage: offlineStorage,
      transport: {
        send: () => {
          throw new Error('La web no encola escrituras en esta fase');
        },
      },
      onStateChange: setState,
    });

    engineRef.current = engine;

    // Se siembra lo guardado pero **no** el estado de conexión: quien lo sabe es la petición
    // que falla, y pisarlo aquí borraría lo que `reportReachable` acabara de averiguar.
    void engine.state().then((inicial) => {
      setState((actual) => ({ ...inicial, online: actual.online }));
    });
  }, [user]);

  /**
   * Estado de la conexión del navegador.
   *
   * `navigator.onLine` y sus eventos son una señal **del sistema operativo**, no de la API:
   * dicen si hay interfaz de red, no si el servidor responde. Sirven para reaccionar rápido
   * al modo avión, pero quien tiene la última palabra es la petición que falla —igual que en
   * la app—, y por eso `loadWithCache` decide por el error y no por esto.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const actualizar = (online: boolean) => {
      void engineRef.current?.setOnline(online);
      setState((actual) => ({ ...actual, online }));
    };

    const alConectar = () => actualizar(true);
    const alDesconectar = () => actualizar(false);

    window.addEventListener('online', alConectar);
    window.addEventListener('offline', alDesconectar);

    // Estado inicial: la pestaña puede abrirse ya sin conexión.
    setState((actual) => ({ ...actual, online: window.navigator.onLine }));

    return () => {
      window.removeEventListener('online', alConectar);
      window.removeEventListener('offline', alDesconectar);
    };
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

  const reportReachable = useCallback((reachable: boolean) => {
    void engineRef.current?.setOnline(reachable);
    setState((actual) => (actual.online === reachable ? actual : { ...actual, online: reachable }));
  }, []);

  /**
   * Las acciones, estables durante toda la sesión.
   *
   * Es lo que las pantallas ponen en las dependencias de su efecto de carga, y por eso no
   * puede cambiar cuando cambia el estado (ver `SyncActions`).
   */
  const actions = useMemo<SyncActions>(
    () => ({ cache, readCache, reportReachable }),
    [cache, readCache, reportReachable],
  );

  const value = useMemo<SyncContextValue>(
    () => ({ ...actions, state }),
    [actions, state],
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
 * Solo las acciones, sin el estado.
 *
 * Es lo que usan las funciones de carga de las pantallas: depender del contexto entero las
 * recrearía en cada cambio de estado y su efecto volvería a dispararse (ver `SyncActions`).
 */
export function useSyncActions(): SyncActions {
  const context = useContext(SyncActionsContext);
  if (!context) throw new Error('useSyncActions debe usarse dentro de <SyncProvider>');
  return context;
}

/**
 * Lee de la API y cachea, cayendo al cache si no hay red (FR-048).
 *
 * Idéntico en propósito al de la app, y por el mismo motivo: es el patrón que repiten todas
 * las pantallas de consulta. La decisión de caer al cache la toma el **error**, no
 * `navigator.onLine`: un portal cautivo o una API caída dejan al navegador creyendo que hay
 * conexión, y es la petición fallida la que dice la verdad.
 */
export async function loadWithCache<T>(
  sync: SyncActions,
  key: CacheKey,
  fetcher: () => Promise<T>,
): Promise<{ data: T; fromCache: boolean; cachedAt: Instant | null }> {
  try {
    const data = await fetcher();
    await sync.cache(key, data);
    sync.reportReachable(true);
    return { data, fromCache: false, cachedAt: null };
  } catch (error) {
    const isNetwork = isNetworkError(error);
    if (!isNetwork) throw error;

    // La API no contesta: es lo que el indicador debe reflejar, lo diga o no el navegador.
    sync.reportReachable(false);

    const cached = await sync.readCache<T>(key);
    if (!cached) throw error;

    return { data: cached.data, fromCache: true, cachedAt: cached.cachedAt };
  }
}
