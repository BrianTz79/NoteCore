import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  ApiError,
  REPORT_DETAIL_MAX_LENGTH,
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  REPORT_TARGET_LABELS,
  type ReportReason,
  type ReportTarget,
} from '@notecore/shared';
import { moderationApi } from '../lib/api';
import { Button, FormError, Notice, colors as c } from './ui';

/**
 * Reportar una publicación o un mensaje (Fase 21).
 *
 * Gemelo del `ReportDialog` de la web: mismos motivos, mismos textos y mismo acuse, porque
 * los tres salen de `packages/shared`. Lo que cambia es solo el motor de pintado — que es
 * exactamente el reparto que pide el Principio VIII y el que ya siguen el QR de la Fase 6 y
 * el logo de la Fase 13.
 *
 * ## Por qué la lista de motivos son botones y no un desplegable
 *
 * En un teléfono, un `Picker` abre una hoja del sistema que tapa el formulario y obliga a
 * volver para ver qué se eligió. Seis opciones caben en pantalla y se aciertan con el pulgar
 * a la primera; el desplegable ahorraría alto a cambio de un toque más y de perder de vista
 * lo que se está haciendo.
 */
export function ReportDialog({
  target,
  targetId,
  authorName,
  onClose,
}: {
  target: ReportTarget;
  targetId: string;
  /** A quién se está reportando. Se muestra para que nadie reporte al de al lado por error. */
  authorName: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [enviado, setEnviado] = useState<{ yaReportado: boolean } | null>(null);

  async function enviar() {
    if (reason === null) {
      setError('Elige un motivo.');
      return;
    }

    setEnviando(true);
    setError(undefined);
    try {
      const recibo = await moderationApi.report({ target, targetId, reason, detail });
      setEnviado({ yaReportado: recibo.yaReportado });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo enviar el reporte.');
    } finally {
      setEnviando(false);
    }
  }

  /*
   * Enviado: queda el acuse y no se cierra solo.
   *
   * Quien acaba de reportar algo que le molesta necesita leer que se registró; una ventana
   * que desaparece sola deja la duda de si llegó a mandarse, y esa duda es la que lleva a
   * tocar el botón otra vez.
   */
  if (enviado !== null) {
    return (
      <View style={styles.caja} testID="reporte-enviado">
        <Notice tone="exito">
          {enviado.yaReportado
            ? 'Ya habías reportado esto. Tu aviso sigue registrado.'
            : 'Gracias. Tu reporte quedó registrado y lo revisaremos.'}
        </Notice>
        {/*
          El bloqueo se le recuerda aquí y no antes: reportar no cambia nada de lo que ve, y
          si lo que quiere es dejar de ver a esa persona, esa es la acción que lo hace.
        */}
        <Text style={styles.pista}>
          Reportar no bloquea a {authorName}. Si no quieres ver más su contenido, bloquéala
          desde su perfil.
        </Text>
        <Button title="Cerrar" variant="secondary" onPress={onClose} />
      </View>
    );
  }

  return (
    <View style={styles.caja} testID="dialogo-reporte">
      <Text style={styles.titulo}>
        Reportar {REPORT_TARGET_LABELS[target].toLowerCase()} de {authorName}
      </Text>

      <Text style={styles.pista}>¿Qué pasa con este contenido?</Text>

      <View style={styles.motivos}>
        {REPORT_REASONS.map((valor) => {
          const elegido = reason === valor;
          return (
            <Pressable
              key={valor}
              onPress={() => setReason(valor)}
              testID={`motivo-${valor}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: elegido }}
              hitSlop={4}
              style={[styles.motivo, elegido ? styles.motivoElegido : null]}
            >
              <Text style={[styles.motivoText, elegido ? styles.motivoTextElegido : null]}>
                {REPORT_REASON_LABELS[valor]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        testID="detalle-reporte"
        value={detail}
        onChangeText={setDetail}
        maxLength={REPORT_DETAIL_MAX_LENGTH}
        multiline
        numberOfLines={3}
        placeholder="¿Quieres añadir algo? (opcional)"
        placeholderTextColor={c.textoTenue}
        style={styles.detalle}
      />

      <FormError message={error} />

      <Button
        title="Enviar reporte"
        onPress={() => void enviar()}
        loading={enviando}
      />
      <Button title="Cancelar" variant="secondary" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    gap: 12,
    borderWidth: 1,
    borderColor: c.borde,
    backgroundColor: c.control,
    borderRadius: 12,
    padding: 12,
  },
  titulo: { color: c.textoFuerte, fontSize: 15, fontWeight: '500' },
  pista: { color: c.textoTenue, fontSize: 13 },
  motivos: { gap: 8 },
  motivo: {
    borderWidth: 1,
    borderColor: c.bordeFuerte,
    backgroundColor: c.tarjeta,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  /*
   * El elegido se marca con **borde y fondo de acento**, no solo con color de texto: un
   * cambio de color de texto sobre fondo oscuro es la diferencia que peor se ve a la luz del
   * sol, que es donde la mitad de esta app se usa.
   */
  motivoElegido: { borderColor: c.acento, backgroundColor: c.acentoTenue },
  motivoText: { color: c.texto, fontSize: 14 },
  motivoTextElegido: { color: c.textoFuerte, fontWeight: '500' },
  detalle: {
    borderWidth: 1,
    borderColor: c.bordeFuerte,
    backgroundColor: c.tarjeta,
    borderRadius: 10,
    padding: 12,
    color: c.textoFuerte,
    fontSize: 14,
    minHeight: 72,
    textAlignVertical: 'top',
  },
});
