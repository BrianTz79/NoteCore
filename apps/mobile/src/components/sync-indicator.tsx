import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  SYNC_OPERATION_LABELS,
  shouldShowSyncIndicator,
  syncStatusMessage,
  syncStatusTone,
  type SyncTone,
} from '@notecore/shared';
import { useSync } from '../lib/sync-context';
import { colors } from './ui';

/**
 * Indicador de estado de sincronización (FR-050).
 *
 * El texto sale entero de `syncStatusMessage`, en `shared`: la web enseña exactamente el
 * mismo, palabra por palabra. Aquí solo se decide cómo se pinta, porque la paleta de la app
 * y la de la web no son la misma.
 *
 * Se esconde cuando no hay nada que decir. Una barra permanente de "todo bien" es ruido que
 * el usuario deja de leer, y entonces tampoco lee el aviso que sí importa.
 */

const TONE_STYLES: Readonly<Record<SyncTone, { fondo: string; borde: string; texto: string }>> = {
  atencion: { fondo: colors.errorFondo, borde: colors.error, texto: colors.error },
  espera: { fondo: '#1e293b', borde: '#334155', texto: colors.textoSuave },
  ok: { fondo: '#052e16', borde: '#166534', texto: colors.exito },
};

export function SyncIndicator({ onPress }: { onPress?: () => void }) {
  const { state } = useSync();

  if (!shouldShowSyncIndicator(state)) return null;

  const tone = TONE_STYLES[syncStatusTone(state)];
  const message = syncStatusMessage(state);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={message}
      style={[styles.barra, { backgroundColor: tone.fondo, borderColor: tone.borde }]}
    >
      <Text style={[styles.texto, { color: tone.texto }]}>{message}</Text>
      {state.conflicts > 0 && onPress ? (
        <Text style={[styles.accion, { color: tone.texto }]}>Ver</Text>
      ) : null}
    </Pressable>
  );
}

/**
 * Lista de lo que está pendiente de subir, con sus conflictos (FR-050).
 *
 * FR-050 pide que el usuario vea **qué** está pendiente, no solo cuántos: "3 cambios" no le
 * dice si lo que falta por subir es la falta de hoy o la tarea de ayer.
 */
export function SyncQueuePanel() {
  const { queue, retry, discard, discardConflicts, state, sync } = useSync();

  if (queue.length === 0) {
    return (
      <View style={styles.panel}>
        <Text style={styles.vacio}>No hay cambios pendientes de subir.</Text>
      </View>
    );
  }

  const conflicts = queue.filter((entry) => entry.status === 'conflicto');
  const pending = queue.filter((entry) => entry.status !== 'conflicto');

  return (
    <View style={styles.panel}>
      {pending.length > 0 ? (
        <View style={styles.grupo}>
          <Text style={styles.grupoTitulo}>Por subir ({pending.length})</Text>
          {pending.map((entry) => (
            <View key={entry.id} style={styles.fila}>
              <Text style={styles.filaTitulo}>{entry.label}</Text>
              <Text style={styles.filaTipo}>{SYNC_OPERATION_LABELS[entry.operation]}</Text>
            </View>
          ))}
          {state.online ? (
            <Pressable onPress={() => void sync()} style={styles.boton}>
              <Text style={styles.botonTexto}>Subir ahora</Text>
            </Pressable>
          ) : (
            <Text style={styles.nota}>Se subirán solos cuando vuelva la conexión.</Text>
          )}
        </View>
      ) : null}

      {conflicts.length > 0 ? (
        <View style={styles.grupo}>
          <Text style={[styles.grupoTitulo, styles.grupoTituloError]}>
            No se pudieron subir ({conflicts.length})
          </Text>
          {conflicts.map((entry) => (
            <View key={entry.id} style={[styles.fila, styles.filaError]}>
              <Text style={styles.filaTitulo}>{entry.label}</Text>
              <Text style={styles.filaTipo}>{SYNC_OPERATION_LABELS[entry.operation]}</Text>
              {entry.error ? <Text style={styles.filaError2}>{entry.error}</Text> : null}
              <View style={styles.acciones}>
                <Pressable onPress={() => void retry(entry.id)} style={styles.botonPeq}>
                  <Text style={styles.botonPeqTexto}>Reintentar</Text>
                </Pressable>
                <Pressable onPress={() => void discard(entry.id)} style={styles.botonPeq}>
                  <Text style={styles.botonPeqTexto}>Descartar</Text>
                </Pressable>
              </View>
            </View>
          ))}
          <Pressable onPress={() => void discardConflicts()} style={styles.boton}>
            <Text style={styles.botonTexto}>Descartar todos</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  texto: { fontSize: 13, fontWeight: '500', flexShrink: 1 },
  accion: { fontSize: 13, fontWeight: '700' },
  panel: { gap: 16 },
  vacio: { color: colors.textoSuave, fontSize: 14 },
  grupo: { gap: 8 },
  grupoTitulo: { color: colors.textoFuerte, fontSize: 15, fontWeight: '600' },
  grupoTituloError: { color: colors.error },
  fila: {
    backgroundColor: colors.tarjeta,
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  filaError: { borderColor: colors.error },
  filaTitulo: { color: colors.texto, fontSize: 14, fontWeight: '500' },
  filaTipo: { color: colors.textoTenue, fontSize: 12 },
  filaError2: { color: colors.error, fontSize: 12 },
  acciones: { flexDirection: 'row', gap: 8, marginTop: 4 },
  boton: {
    backgroundColor: colors.acento,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  botonTexto: { color: '#f8fafc', fontWeight: '600', fontSize: 14 },
  botonPeq: {
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  botonPeqTexto: { color: colors.texto, fontSize: 13 },
  nota: { color: colors.textoTenue, fontSize: 12 },
});
