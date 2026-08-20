import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { encodeQr, qrToSvgPath, qrViewBox } from '@notecore/shared';
import { RADIUS } from './theme';

/**
 * Código QR de un enlace de compartición (FR-028).
 *
 * La matriz sale de `encodeQr` en `shared`, la misma que usa la web: los dos clientes pintan
 * exactamente el mismo código, así que el QR de la app y el del navegador son idénticos
 * (Principio VIII). Aquí solo cambia la forma de dibujarlo.
 *
 * Se pinta con una sola `Path` en lugar de un rectángulo por módulo: un QR de versión 4 tiene
 * más de mil módulos, y otras tantas vistas nativas harían la pantalla perceptiblemente lenta.
 */
export function QrCode({ value, size = 220 }: { value: string; size?: number }) {
  // Codificar es lo más caro de la pantalla y el enlace no cambia mientras esté abierta.
  const matrix = useMemo(() => encodeQr(value), [value]);

  return (
    // El fondo blanco es parte del código: sobre el fondo oscuro de la app, un QR sin su
    // zona clara alrededor no lo lee ninguna cámara.
    <View style={{ backgroundColor: '#ffffff', borderRadius: RADIUS.lg, padding: 8 }}>
      <Svg width={size} height={size} viewBox={qrViewBox(matrix)}>
        <Rect
          x={-4}
          y={-4}
          width={matrix.size + 8}
          height={matrix.size + 8}
          fill="#ffffff"
        />
        <Path d={qrToSvgPath(matrix)} fill="#000000" />
      </Svg>
    </View>
  );
}
