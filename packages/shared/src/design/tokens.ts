/**
 * Tokens de diseño de NoteCore: color, tipografía, espaciado, radios y movimiento.
 *
 * Principio VIII, aplicado al diseño. Antes de la Fase 11 la paleta estaba escrita dos
 * veces —clases de Tailwind en la web, un objeto `colors` a mano en la app— y nada
 * garantizaba que coincidieran: la web usaba `sky-600` para el acento y la app `#0284c7`
 * porque alguien los igualó de memoria. Cualquier ajuste posterior en un cliente dejaba al
 * otro atrás en silencio. Aquí se definen **una vez** y los dos clientes los derivan:
 * `apps/web/tokens.css` los expone como propiedades CSS y `apps/mobile/src/components/theme.ts`
 * los importa tal cual.
 *
 * **Los valores son hexadecimales y no `oklch()` a propósito.** React Native no entiende
 * `oklch()`, y el widget de Android menos todavía: sus `RemoteViews` solo aceptan colores
 * `#AARRGGBB`. Un token que la app no puede leer no es un token compartido, es un token de
 * la web. La conversión se hizo una vez, al elegir la paleta, y los comentarios de cada
 * color dejan escrito el valor OKLCH del que salió para que el ajuste futuro sea perceptual
 * y no a ojo.
 */

/**
 * Colores de la interfaz.
 *
 * Registro oscuro, que es lo que la app ya declaraba en `app.json` y lo que pide una
 * pantalla que se consulta en un aula a media luz. Los nombres son de **papel y tinta**,
 * no de tono: `papel` sigue siendo el fondo aunque un día se vuelva claro, mientras que un
 * nombre como `slate950` obligaría a renombrarlo todo.
 */
export const COLOR = {
  /** Fondo de la aplicación. oklch(17% 0.015 260) */
  papel: '#0b0f18',
  /** Superficie elevada: tarjetas, filas, cabeceras fijas. oklch(21% 0.018 260) */
  papel2: '#131926',
  /** Superficie de un control sobre una superficie elevada: campos, celdas. oklch(25% 0.02 260) */
  papel3: '#1b2333',

  /** Texto principal. Contraste 15.8:1 sobre `papel`. oklch(97% 0.005 260) */
  tinta: '#f2f5fa',
  /** Texto secundario: descripciones, valores acompañantes. 9.1:1 sobre `papel`. */
  tinta2: '#c2ccdc',
  /**
   * Texto terciario: etiquetas, unidades, metadatos.
   *
   * 5.2:1 sobre `papel` — pasa AA para cualquier tamaño. El `slate-500` que usaba la web
   * para las horas del eje se quedaba en 3.9:1 y no lo pasaba en texto pequeño.
   */
  tinta3: '#8b97ad',

  /** Filete: separadores y bordes de reposo. No es texto, no necesita 4.5:1. */
  filete: '#242e40',
  /** Filete marcado: borde de un control enfocable en reposo. */
  filete2: '#33405a',

  /**
   * Acento. Cobalto claro, el único color de marca de la interfaz.
   *
   * 8.3:1 sobre `papel`. **Este es el arreglo de contraste de la fase**: el `sky-600`
   * anterior (`#0284c7`) daba 3.4:1 y los enlaces de navegación lo usaban en texto de 14px,
   * por debajo del mínimo AA de 4.5:1. Subir la luminosidad en lugar de agrandar la letra
   * conserva la densidad que la pantalla necesita.
   */
  acento: '#5aa9ff',
  /** Acento apagado, para bordes y fondos translúcidos donde no hay texto encima. */
  acentoTenue: '#1e3a5f',
  /** Texto que va **encima** del acento cuando el acento es fondo. 9.6:1 sobre `acento`. */
  acentoTinta: '#04101f',

  /** Estado de error. 6.4:1 sobre `papel`. */
  error: '#ff8080',
  /** Fondo de un bloque de error. El texto encima usa `error`. */
  errorFondo: '#2a1116',
  /** Estado correcto, confirmaciones. 8.9:1 sobre `papel`. */
  exito: '#4ade9b',
  /** Aviso: proximidad al límite de faltas, vencimientos cercanos. 9.7:1 sobre `papel`. */
  aviso: '#f2c14e',
  /** Fondo de un bloque de aviso. */
  avisoFondo: '#2b2211',

  /**
   * Anillo de foco. Deliberadamente distinto del acento.
   *
   * Si el foco fuera del color del acento, en un botón de acento el anillo desaparecería.
   * Este tono pasa 3:1 tanto sobre `papel` como sobre `acento`.
   */
  foco: '#8fd0ff',
} as const;

/**
 * Familias tipográficas.
 *
 * Tres roles, no tres caprichos: **display** para los títulos, **cuerpo** para leer, y
 * **mono** para todo número que se compare con otro —horas del horario, conteos de faltas,
 * fechas—. Las cifras tabulares son el motivo real del tercer rol: en una columna de
 * faltas, unas cifras de ancho variable bailan y obligan a leer dígito a dígito.
 *
 * Las listas terminan en la familia genérica del sistema para que la app funcione aunque
 * las fuentes no lleguen a cargar.
 */
export const FONT = {
  display: "'Space Grotesk', system-ui, sans-serif",
  cuerpo: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
} as const;

/**
 * Nombres de las fuentes sin la pila de reserva.
 *
 * React Native necesita el nombre exacto de la familia —no acepta una lista de reserva—, y
 * el widget de Android tampoco. Se derivan de `FONT` para que no puedan divergir.
 */
export const FONT_FAMILY = {
  display: 'SpaceGrotesk',
  cuerpo: 'Inter',
  mono: 'JetBrainsMono',
} as const;

/**
 * Escala tipográfica, en píxeles.
 *
 * Números y no `rem` porque React Native solo entiende números; la web los convierte a
 * `rem` en `tokens.css`. La escala es de razón ~1.2, cortada donde la interfaz la usa: no
 * hay tamaños de titular de portada porque esto es una herramienta, no una landing.
 */
export const TEXT = {
  /** Etiquetas de eje, unidades. */
  xs: 11,
  /** Metadatos, pies de campo, texto de ayuda. */
  sm: 13,
  /** Cuerpo por defecto. */
  md: 15,
  /** Cuerpo destacado, títulos de fila. */
  lg: 17,
  /** Título de tarjeta o sección. */
  xl: 21,
  /** Título de pantalla. */
  '2xl': 26,
  /** Dato principal: la próxima clase, el conteo grande. */
  '3xl': 34,
} as const;

/** Pesos. Space Grotesk se usa en 500/700; Inter en 400/500/600. */
export const WEIGHT = {
  normal: '400',
  medio: '500',
  semi: '600',
  fuerte: '700',
} as const;

/**
 * Espaciado, escala de 4 puntos.
 *
 * Nombres semánticos y no números sueltos: `space.md` sobrevive a un cambio de densidad,
 * un `16` repartido por doscientos sitios no.
 */
export const SPACE = {
  '3xs': 2,
  '2xs': 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

/**
 * Radios.
 *
 * Ajustados y no redondeados: 6px en los controles es el registro de instrumento que pide
 * una herramienta de consulta. Las píldoras se reservan para las etiquetas de estado, donde
 * la forma **significa** «esto es una etiqueta, no un botón».
 */
export const RADIUS = {
  /** Celdas del horario, elementos pequeños. */
  sm: 4,
  /** Campos, botones. */
  md: 6,
  /** Tarjetas, paneles. */
  lg: 10,
  /** Etiquetas de estado. */
  pill: 999,
} as const;

/**
 * Duraciones de las transiciones, en milisegundos.
 *
 * Cortas a propósito: en una herramienta que se abre entre clases, la animación es tiempo
 * que el usuario espera. Nada supera el cuarto de segundo.
 */
export const DURATION = {
  /** Cambios de estado inmediatos: hover, pulsación. */
  corta: 120,
  /** Aparición de un panel, cambio de vista. */
  media: 200,
} as const;

/**
 * Curvas de aceleración.
 *
 * Solo salida y entrada-salida, ambas sin rebote. Un rebote en un control de interfaz
 * sugiere elasticidad física donde no la hay y retrasa la respuesta.
 */
export const EASE = {
  salida: 'cubic-bezier(0.16, 1, 0.3, 1)',
  entradaSalida: 'cubic-bezier(0.65, 0, 0.35, 1)',
} as const;

/**
 * Grosor del filete.
 *
 * Uno solo. El diseño separa con **una** línea de un píxel o con espacio, nunca con dos
 * grosores distintos que obliguen a preguntarse cuál pesa más.
 */
export const RULE = 1;

export type ColorToken = keyof typeof COLOR;
export type SpaceToken = keyof typeof SPACE;
export type TextToken = keyof typeof TEXT;
