'use client';

import { useMemo } from 'react';
import { encodeQr, qrToSvgPath, qrViewBox } from '@notecore/shared';

/**
 * Código QR de un enlace de compartición (FR-028).
 *
 * La matriz la calcula `encodeQr` en `shared`, así que este componente y el de la app pintan
 * exactamente el mismo código (Principio VIII). Aquí solo se traduce a SVG.
 *
 * Se pinta con **una sola ruta** y no con un rectángulo por módulo: un QR de versión 4 tiene
 * 1089 módulos, y otros tantos nodos en el DOM harían perceptible el renderizado.
 */
export function QrCode({
  value,
  size = 220,
  label,
}: {
  value: string;
  size?: number;
  label?: string;
}) {
  // Codificar es lo más caro de la pantalla y el enlace no cambia mientras esté abierta.
  const matrix = useMemo(() => encodeQr(value), [value]);

  return (
    <svg
      viewBox={qrViewBox(matrix)}
      width={size}
      height={size}
      role="img"
      aria-label={label ?? `Código QR de ${value}`}
      // El fondo blanco va en el propio SVG: sobre el fondo oscuro de la interfaz, un QR sin
      // su zona clara alrededor no lo lee ninguna cámara.
      className="rounded-lg bg-white p-0"
      shapeRendering="crispEdges"
    >
      <rect
        x={-4}
        y={-4}
        width={matrix.size + 8}
        height={matrix.size + 8}
        fill="#ffffff"
      />
      <path d={qrToSvgPath(matrix)} fill="#000000" />
    </svg>
  );
}
