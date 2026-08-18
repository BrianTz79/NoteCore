'use client';

import {
  cacheAgeMessage,
  shouldShowSyncIndicator,
  syncStatusMessage,
  syncStatusTone,
  type Instant,
  type SyncTone,
} from '@notecore/shared';
import { useSync } from '@/lib/sync-context';

/**
 * Indicador de estado de la conexión (FR-050).
 *
 * El texto sale entero de `syncStatusMessage`, en `shared`: la app enseña exactamente el
 * mismo, palabra por palabra. Aquí solo se decide cómo se pinta, porque la paleta de la web
 * y la de la app no son la misma (Principio VIII).
 *
 * Se esconde cuando no hay nada que decir, por lo mismo que en la app: una barra permanente
 * de "todo bien" es ruido que el usuario deja de leer.
 */

const TONE_CLASSES: Readonly<Record<SyncTone, string>> = {
  atencion: 'border-red-900 bg-red-950/60 text-red-300',
  espera: 'border-slate-700 bg-slate-900 text-slate-300',
  ok: 'border-emerald-900 bg-emerald-950/40 text-emerald-300',
};

export function SyncIndicator() {
  const { state } = useSync();

  if (!shouldShowSyncIndicator(state)) return null;

  return (
    <p
      // `role="status"` hace que un lector de pantalla anuncie el cambio de conexión sin
      // robar el foco, que es justo lo que se quiere de un aviso de estado.
      role="status"
      className={`rounded-lg border px-3.5 py-2 text-sm ${TONE_CLASSES[syncStatusTone(state)]}`}
    >
      {syncStatusMessage(state)}
    </p>
  );
}

/**
 * Aviso de que lo que se está viendo viene de lo guardado, y de cuándo es (FR-048).
 *
 * Consultar sin red está bien mientras se sepa de cuándo es lo que se lee: un horario de hace
 * una hora es el horario, y uno de hace tres semanas puede haber cambiado.
 */
export function CacheNotice({ cachedAt }: { cachedAt: Instant | null }) {
  if (!cachedAt) return null;

  return (
    <p className="text-sm text-slate-500">
      {cacheAgeMessage(cachedAt)} · sin conexión con el servidor
    </p>
  );
}
