import Svg, { Circle, Line, Path } from 'react-native-svg';
import {
  LOGO_ANILLO_D,
  LOGO_ANILLO_GROSOR,
  LOGO_CABEZA,
  LOGO_OJO,
  LOGO_RENGLONES,
  LOGO_RENGLONES_GROSOR,
  LOGO_VIEWBOX,
} from '@notecore/shared';
import { c } from './theme';

/**
 * El logo de NoteCore: el ouroboros formando una C (Fase 13).
 *
 * La geometría sale de `shared` —la misma que usa la web—, así que el trazo es idéntico en
 * los dos clientes (Principio VIII); aquí solo cambia el motor de dibujo, igual que en
 * `qr-code.tsx`. Los colores sí son de cada cliente: `c.acento`, `c.papel` y `c.tinta` son el
 * mismo sistema de diseño, tomado directamente en vez de copiado a mano.
 */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox={LOGO_VIEWBOX}
      role="img"
      accessibilityLabel="Logo de NoteCore: una serpiente mordiéndose la cola forma una C alrededor de una hoja con renglones"
    >
      <Path
        d={LOGO_ANILLO_D}
        fill="none"
        stroke={c.acento}
        strokeWidth={LOGO_ANILLO_GROSOR}
        strokeLinecap="round"
      />
      <Circle cx={LOGO_CABEZA.cx} cy={LOGO_CABEZA.cy} r={LOGO_CABEZA.r} fill={c.acento} />
      <Circle cx={LOGO_OJO.cx} cy={LOGO_OJO.cy} r={LOGO_OJO.r} fill={c.papel} />
      {LOGO_RENGLONES.map((renglon) => (
        <Line
          key={`${renglon.x1}-${renglon.y1}`}
          x1={renglon.x1}
          y1={renglon.y1}
          x2={renglon.x2}
          y2={renglon.y2}
          stroke={c.tinta}
          strokeWidth={LOGO_RENGLONES_GROSOR}
          strokeLinecap="round"
        />
      ))}
    </Svg>
  );
}
