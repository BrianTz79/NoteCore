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
  atencion: 'border-error/40 bg-error-fondo text-error',
  espera: 'border-filete2 bg-papel2 text-tinta2',
  ok: 'border-exito/40 bg-exito/10 text-exito',
};

export function SyncIndicator() {
  const { state } = useSync();

  if (!shouldShowSyncIndicator(state)) return null;

  return (
    <p
      // `role="status"` hace que un lector de pantalla anuncie el cambio de conexión sin
      // robar el foco, que es justo lo que se quiere de un aviso de estado.
      role="status"
      className={`rounded-lg border px-nc-sm py-nc-xs text-sm ${TONE_CLASSES[syncStatusTone(state)]}`}
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
    <p className="text-sm text-tinta3">
      {cacheAgeMessage(cachedAt)} · sin conexión con el servidor
    </p>
  );
}
