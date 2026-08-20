import { useEffect, useRef } from 'react';
import { BackHandler, ToastAndroid } from 'react-native';

/**
 * El botón atrás de Android (Fase 12.2).
 *
 * **Por qué hace falta esto.** La navegación de la app es un cambio de estado, no un árbol
 * de rutas —las Fases 4 a 11 fueron explicando por qué `expo-router` no entraba—. Android no
 * sabe nada de ese estado: si nadie atiende el botón atrás, aplica lo suyo, que es cerrar la
 * actividad. El resultado era que pulsar atrás en Horario te sacaba al escritorio del
 * teléfono, perdiendo lo que estuvieras haciendo.
 *
 * **Qué significa "atrás" aquí.** Lo mismo que significa la flecha de la cabecera: deshacer
 * el último paso que dio el usuario. Como esa flecha, se resuelve de dentro hacia afuera y
 * en un solo salto por pulsación:
 *
 * 1. Si hay una capa abierta dentro de la pantalla —un formulario, el detalle de un día, un
 *    hilo de conversación, un perfil ajeno—, atrás **la cierra** y deja la pantalla donde
 *    estaba. Es lo que espera quien abrió esa capa, y evita perder el contexto.
 * 2. Sin capas abiertas, atrás **vuelve al inicio**.
 * 3. En el inicio, atrás **sale de la app**, pero pidiendo una segunda pulsación
 *    (`useSalirDeLaApp`): un toque accidental en el borde de la pantalla no debe echar a
 *    nadie de la sesión que estaba mirando.
 *
 * **Cómo se usa.** Cada pantalla declara su propia escalera con las condiciones que conoce.
 * El orden importa: se ejecuta el primer paso cuya condición se cumple.
 *
 * ```ts
 * useBotonAtras([
 *   { cuando: panel.kind !== 'ninguno', hacer: () => setPanel({ kind: 'ninguno' }) },
 *   { cuando: true, hacer: onVolver },
 * ]);
 * ```
 *
 * El hook **siempre** consume el evento: cualquier pantalla que lo use deja de poder cerrar
 * la app por accidente. Solo el inicio decide otra cosa, y lo hace con el hook de abajo.
 *
 * **Por eso la escalera de una pantalla tiene que estar completa**, terminada en `onVolver`.
 * Android consulta los escuchas en orden inverso al registro y se para en el primero que
 * devuelve `true`; como los efectos de un hijo corren antes que los del padre, el de la
 * pantalla queda registrado antes y por tanto se consulta **después**. Un escalón que
 * faltara aquí no lo recogería la raíz: se tragaría la pulsación sin hacer nada.
 */

/** Un paso de la escalera: si `cuando` se cumple, se ejecuta `hacer` y la pulsación termina. */
export interface PasoAtras {
  readonly cuando: boolean;
  readonly hacer: () => void;
}

export function useBotonAtras(pasos: readonly PasoAtras[]): void {
  /**
   * Los pasos se leen desde una referencia, no desde el cierre del `useEffect`.
   *
   * Sus condiciones dependen del estado de la pantalla y cambian en casi cada renderizado.
   * Si el efecto dependiera de ellas, se estaría dando de baja y de alta el escucha de
   * Android continuamente —varias veces por pulsación de tecla en un formulario—. Con la
   * referencia, el escucha se registra una vez y siempre lee los pasos vigentes.
   */
  const vigentes = useRef(pasos);
  vigentes.current = pasos;

  useEffect(() => {
    const suscripcion = BackHandler.addEventListener('hardwareBackPress', () => {
      const paso = vigentes.current.find((candidato) => candidato.cuando);
      if (paso === undefined) {
        /**
         * Ningún paso aplica: la pulsación **no es de esta escalera** y se deja pasar.
         *
         * Devolver `true` aquí parecía lo prudente —"por si acaso, que no se cierre la
         * app"— y era justo el error: React Native solo llama a `exitApp()` cuando
         * **ningún** escucha devuelve `true`, así que una escalera que no hacía nada pero
         * consumía el evento **bloqueaba la salida por completo**. Se detectó en el
         * emulador: la segunda pulsación en la pantalla de entrar no cerraba la app,
         * porque la escalera de `App.tsx` —cuyo único paso es el registro— devolvía `true`
         * sin haber hecho nada y le ganaba a `useSalirDeLaApp`.
         *
         * Quien decide si se sale es `useSalirDeLaApp`, y solo puede hacerlo si los demás
         * escuchas dejan pasar lo que no les toca.
         */
        return false;
      }

      paso.hacer();
      // Se hizo algo, así que la pulsación termina aquí: devolver `false` dejaría que
      // Android cerrara la actividad **además** de lo que se acaba de hacer.
      return true;
    });

    return () => suscripcion.remove();
  }, []);
}

/** Cuánto tiempo cuenta la primera pulsación antes de olvidarse. */
const VENTANA_SALIDA_MS = 2000;

/**
 * Atrás en el inicio: dos pulsaciones para salir.
 *
 * El inicio **sí** debe poder cerrar la app —es el final del camino, y quedarse atrapado
 * dentro sería peor—, pero no a la primera. El borde inferior de un teléfono es donde más
 * roces accidentales hay, y perder de golpe la pantalla que estabas leyendo por un toque que
 * no querías dar es exactamente el fallo que esta fase venía a arreglar.
 *
 * El aviso va en un `Toast` de Android y no en un diálogo: un diálogo exige una decisión y
 * roba el foco por algo que en la mayoría de los casos fue un accidente; el toast se explica
 * solo y desaparece si no vuelves a pulsar.
 */
export function useSalirDeLaApp(activo: boolean): void {
  // Referencia y no estado: esto no pinta nada, y guardarlo en estado repintaría el inicio
  // entero —la pantalla más pesada de la app— en cada pulsación de atrás.
  const primeraPulsacion = useRef(0);

  useEffect(() => {
    if (!activo) return;

    const suscripcion = BackHandler.addEventListener('hardwareBackPress', () => {
      const ahora = Date.now();

      if (ahora - primeraPulsacion.current < VENTANA_SALIDA_MS) {
        // Segunda pulsación dentro de la ventana: se deja pasar a Android, que cierra la
        // actividad. Es la única ruta de toda la app por la que se sale.
        return false;
      }

      primeraPulsacion.current = ahora;
      ToastAndroid.show('Pulsa atrás otra vez para salir', ToastAndroid.SHORT);
      return true;
    });

    return () => suscripcion.remove();
  }, [activo]);
}
