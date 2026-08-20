import { StyleSheet } from 'react-native';
import {
  COLOR,
  DURATION,
  FONT_FAMILY,
  RADIUS,
  RULE,
  SPACE,
  TEXT,
  WEIGHT,
} from '@notecore/shared';

/**
 * El sistema de diseño en React Native (design.md).
 *
 * Los valores **no se escriben aquí**: se reexportan de `@notecore/shared`, que es la misma
 * fuente que alimenta `apps/web/tokens.css`. Antes de la Fase 11 este archivo era un objeto
 * `colors` copiado a mano y nada impedía que se separara de la web —de hecho lo estaba: el
 * acento de la web y el de la app eran el mismo tono por casualidad, no por construcción—.
 *
 * Lo que sí vive aquí son los **estilos base**, que no pueden compartirse: React Native no
 * tiene CSS, así que la cascada, el `:focus-visible` y las utilidades de Tailwind se
 * sustituyen por estos objetos.
 */

export { COLOR, DURATION, FONT_FAMILY, RADIUS, RULE, SPACE, TEXT, WEIGHT };

/**
 * Alias corto de los colores.
 *
 * Las pantallas escriben `c.tinta3` cientos de veces; `COLOR.tinta3` sería más explícito y
 * también más ruidoso en una hoja de estilos densa.
 */
export const c = COLOR;

/**
 * Las familias, resueltas a lo que Android tiene instalado.
 *
 * **La app usa la tipografía del sistema y la web las tres familias de `FONT`.** Es una
 * desviación deliberada del sistema, no un descuido:
 *
 * - El rol que de verdad importa es el **mono tabular** —que las cifras no bailen al
 *   cambiar de valor—, y `monospace` en Android resuelve a Roboto Mono, que lo cumple.
 * - `sans-serif` resuelve a Roboto: una grotesca neutra del mismo registro que Space
 *   Grotesk e Inter, no algo que desentone.
 * - Empaquetar tres familias con sus pesos son unos 700 KB en un APK que se instala a
 *   mano, y obliga a otro `expo prebuild`. Esta fase ya toca el proyecto Android para el
 *   widget; acumular dos cambios nativos en la misma compilación complica aislar un fallo.
 *
 * La paridad del Principio I no se rompe porque **es de información y de estructura, no de
 * archivo tipográfico**: los dos clientes muestran lo mismo, con la misma jerarquía y los
 * mismos tres roles. `FONT_FAMILY` sigue exportándose desde `shared` para el día en que la
 * app empaquete las fuentes; entonces solo cambia este objeto.
 *
 * React Native no acepta una pila de reserva —`fontFamily` es un nombre y solo uno—, así
 * que cada peso se pide con su `fontWeight` aparte, en los estilos.
 */
export const fuente = {
  display: 'sans-serif-medium',
  displayFuerte: 'sans-serif',
  cuerpo: 'sans-serif',
  cuerpoMedio: 'sans-serif-medium',
  cuerpoSemi: 'sans-serif-medium',
  mono: 'monospace',
} as const;

/**
 * Estilos que se repiten en todas las pantallas.
 *
 * Cada uno corresponde a una regla de `design.md`; el comentario dice a cuál, para que
 * cambiar el sistema y cambiar la app sean el mismo movimiento.
 */
export const base = StyleSheet.create({
  /** Fondo de pantalla completo. */
  pantalla: {
    flex: 1,
    backgroundColor: c.papel,
  },

  /** Relleno horizontal estándar del contenido. */
  contenido: {
    paddingHorizontal: SPACE.md,
    paddingBottom: SPACE['2xl'],
    gap: SPACE.md,
  },

  /** Superficie elevada: panel, fila destacada. Filete, nunca sombra. */
  superficie: {
    backgroundColor: c.papel2,
    borderColor: c.filete,
    borderWidth: RULE,
    borderRadius: RADIUS.lg,
  },

  /** Separador de un píxel: la única línea del sistema. */
  filete: {
    height: RULE,
    backgroundColor: c.filete,
  },

  /* ---- Texto ----------------------------------------------------------- */

  /** Título de pantalla. */
  titulo: {
    fontFamily: fuente.display,
    fontSize: TEXT['2xl'],
    color: c.tinta,
    letterSpacing: -0.5,
  },

  /** Título de panel o de sección. */
  subtitulo: {
    fontFamily: fuente.display,
    fontSize: TEXT.lg,
    color: c.tinta,
    letterSpacing: -0.3,
  },

  /** Cuerpo por defecto. */
  cuerpo: {
    fontFamily: fuente.cuerpo,
    fontSize: TEXT.md,
    color: c.tinta2,
    lineHeight: TEXT.md * 1.55,
  },

  /** Texto secundario: metadatos, pies, unidades. */
  tenue: {
    fontFamily: fuente.cuerpo,
    fontSize: TEXT.sm,
    color: c.tinta3,
  },

  /**
   * Cifra que se compara con otra: horas, faltas, días.
   *
   * `fontVariant` con `tabular-nums` es lo que evita que las cifras bailen al cambiar de
   * valor —el motivo entero de que exista el rol mono en el sistema—.
   */
  cifra: {
    fontFamily: fuente.mono,
    fontVariant: ['tabular-nums'],
    color: c.tinta,
  },

  /** Etiqueta de un dato, sobre la cifra. */
  etiqueta: {
    fontFamily: fuente.cuerpoMedio,
    fontSize: TEXT.xs,
    color: c.tinta3,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});

/**
 * Altura táctil mínima (design.md § Voz de los controles).
 *
 * 48 puntos es la recomendación de accesibilidad de Android y el ancho aproximado de un
 * pulgar. Todo lo pulsable de la app la respeta.
 */
export const TOQUE_MINIMO = 48;
