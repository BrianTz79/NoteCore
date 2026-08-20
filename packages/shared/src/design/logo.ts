/**
 * Geometría del logo de NoteCore: el ouroboros formando una C.
 *
 * La serpiente mordiéndose la cola dibuja la C de *Core*; el hueco que deja el anillo abierto
 * enseña tres renglones —una hoja de apuntes— dentro. Se eligió sobre un monograma NC en una
 * demo comparada a los tres tamaños en que de verdad se ve (128, 48 y 16px): el ouroboros es
 * el que sigue leyéndose en la pestaña de un navegador.
 *
 * Como `logic/qr.ts`, esto es **solo geometría**: números, no JSX. `shared` no exporta
 * componentes React —los dos motores de dibujo (`react-native-svg` en la app, `<svg>` nativo
 * en la web) son distintos—, así que cada cliente pinta esta misma forma con su propio
 * componente en `components/logo.tsx`. Los colores tampoco están aquí: cada cliente los toma
 * de `COLOR` (mobile) o de las variables ya generadas en `tokens.css` (web), igual que el
 * resto de la interfaz. Fijarlos aquí habría sido otra copia del mismo dato, la clase de
 * duplicación que este archivo existe para evitar.
 */

/** Lienzo cuadrado sobre el que están calculadas todas las coordenadas de abajo. */
export const LOGO_VIEWBOX = '0 0 64 64';

/**
 * El anillo abierto: la C.
 *
 * El arco no se cierra —el hueco arriba a la derecha es donde la cabeza alcanza la cola— y es
 * lo que impide que se lea como una O. Grosor de trazo recomendado: 7 en el lienzo de 64.
 */
export const LOGO_ANILLO_D = 'M 46 15.5 A 21 21 0 1 0 52 30';

/** Grosor de trazo del anillo, en las unidades del `viewBox` de 64. */
export const LOGO_ANILLO_GROSOR = 7;

/**
 * Cabeza de la serpiente: un engrosamiento en la punta del trazo, no una figura aparte.
 * A 16px se funde con el anillo y sigue leyéndose como cabeza.
 */
export const LOGO_CABEZA = { cx: 52, cy: 30, r: 5.2 } as const;

/** Ojo, pintado en el color de fondo para no depender de una capa extra que lo recorte. */
export const LOGO_OJO = { cx: 53.6, cy: 28.6, r: 1.35 } as const;

/**
 * Renglones de la hoja dentro del anillo: tres, de largo decreciente, para que se lean como
 * texto y no como una rejilla.
 */
export const LOGO_RENGLONES = [
  { x1: 23, y1: 26, x2: 41, y2: 26 },
  { x1: 23, y1: 34, x2: 41, y2: 34 },
  { x1: 23, y1: 42, x2: 34, y2: 42 },
] as const;

/** Grosor de trazo de los renglones, en las unidades del `viewBox` de 64. */
export const LOGO_RENGLONES_GROSOR = 3.6;
