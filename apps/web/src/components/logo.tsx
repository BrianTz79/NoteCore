import {
  LOGO_ANILLO_D,
  LOGO_ANILLO_GROSOR,
  LOGO_CABEZA,
  LOGO_OJO,
  LOGO_RENGLONES,
  LOGO_RENGLONES_GROSOR,
  LOGO_VIEWBOX,
} from '@notecore/shared';

/**
 * El logo de NoteCore: el ouroboros formando una C (Fase 13).
 *
 * La geometría sale de `shared` —la misma que usa la app—, así que el trazo es idéntico en
 * los dos clientes (Principio VIII); aquí solo cambia el motor de dibujo, igual que en el
 * `QrCode` de la Fase 6. Los colores son las clases de Tailwind que ya expone `tokens.css`,
 * no valores sueltos.
 */
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={LOGO_VIEWBOX}
      role="img"
      aria-label="Logo de NoteCore: una serpiente mordiéndose la cola forma una C alrededor de una hoja con renglones"
      className={className}
    >
      <path
        d={LOGO_ANILLO_D}
        fill="none"
        className="stroke-acento"
        strokeWidth={LOGO_ANILLO_GROSOR}
        strokeLinecap="round"
      />
      <circle cx={LOGO_CABEZA.cx} cy={LOGO_CABEZA.cy} r={LOGO_CABEZA.r} className="fill-acento" />
      <circle cx={LOGO_OJO.cx} cy={LOGO_OJO.cy} r={LOGO_OJO.r} className="fill-papel" />
      {LOGO_RENGLONES.map((renglon) => (
        <line
          key={`${renglon.x1}-${renglon.y1}`}
          x1={renglon.x1}
          y1={renglon.y1}
          x2={renglon.x2}
          y2={renglon.y2}
          className="stroke-tinta"
          strokeWidth={LOGO_RENGLONES_GROSOR}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
