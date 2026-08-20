import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, SafeAreaView, StatusBar as RNStatusBar, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CACHE_KEYS, toScheduleEntries, type Subject } from '@notecore/shared';
import { AuthProvider, useAuth } from './lib/auth-context';
import { SyncProvider, useSyncActions } from './lib/sync-context';
import { actualizarWidget } from './lib/widget';
import { EntrarScreen } from './screens/EntrarScreen';
import { RegistroScreen } from './screens/RegistroScreen';
import { InicioScreen } from './screens/InicioScreen';
import { HorarioScreen } from './screens/HorarioScreen';
import { FaltasScreen } from './screens/FaltasScreen';
import { AgendaScreen } from './screens/AgendaScreen';
import { CalendarioScreen } from './screens/CalendarioScreen';
import { CompartirScreen } from './screens/CompartirScreen';
import { SemestresScreen } from './screens/SemestresScreen';
import { SocialScreen } from './screens/SocialScreen';
import { MensajesScreen } from './screens/MensajesScreen';
import { colors } from './components/ui';

/**
 * Raíz de la app.
 *
 * La navegación sigue siendo un cambio de estado entre pantallas. La Fase 4 anotó que
 * `expo-router` entraría aquí, por dos motivos que al construir la fase no se han
 * materializado:
 *
 * - **El detalle del día no es una ruta**: se abre dentro del propio calendario, bajo la
 *   rejilla, porque el usuario alterna entre días y perdería el contexto del mes si cada
 *   toque lo llevara a otra pantalla. No hay anidación que resolver.
 * - **La notificación aún no abre una actividad concreta**: FR-026 pide que el aviso llegue,
 *   y llega. El identificador viaja en `data` para cuando exista esa pantalla de detalle,
 *   pero abrir la app en una actividad que todavía no tiene vista propia no es funcionalidad
 *   que ninguna fase haya pedido.
 *
 * **La Fase 6 tampoco lo ha necesitado**, contra lo que preveía la Fase 5. El motivo es que
 * el enlace de compartición no lo abre la app: lo abre la web, que sí tiene rutas. En el
 * teléfono, el compartido llega por la cámara o tecleando el código, y ambos caminos
 * desembocan en un panel dentro de la propia pantalla de compartir —no en una ruta—.
 *
 * **La Fase 8 tampoco, y era la que lo había reservado.** Se preveía que compartir perfiles
 * por enlace lo exigiría, y ha pasado exactamente lo mismo que en la Fase 6: el enlace de un
 * perfil (`/u/@usuario`) lo abre **la web**, que sí tiene rutas. En el teléfono, el perfil
 * ajeno se alcanza escaneando el QR o tocando un resultado de la búsqueda, y ambos caminos
 * abren un panel dentro de la propia pantalla social —el mismo patrón que el detalle del día
 * en el calendario—.
 *
 * Lo que de verdad haría falta para justificarlo es un **enlace profundo del sistema**: que
 * tocar `notecore://u/ana` en WhatsApp abra la app directamente en ese perfil. Eso exige
 * registrar un esquema en el manifiesto de Android y un `prebuild`, y ninguna fase lo ha
 * pedido todavía. Entra cuando se pida, no antes: hasta entonces sería andamiaje sin uso.
 */
export default function App() {
  return (
    <AuthProvider>
      {/*
       * El proveedor de sincronización va **dentro** del de sesión y no al revés: el motor
       * se construye con el identificador del usuario, porque sus claves lo llevan dentro
       * y así ninguna cuenta ve el cache ni la cola de otra en el mismo teléfono.
       */}
      <SyncProvider>
        <SafeAreaView style={styles.safe}>
          <StatusBar style="light" />
          <Root />
        </SafeAreaView>
      </SyncProvider>
    </AuthProvider>
  );
}

/**
 * Mantiene el widget al día mientras la app vive (FR-051).
 *
 * La pantalla del horario ya lo actualiza al leer, pero eso solo cubre el caso de que
 * alguien la abra. **El tiempo pasa aunque nadie toque nada**: un widget que dice «En 25
 * min» a las siete sigue diciéndolo a las once si nadie lo repinta. Así que se recalcula
 * también cada vez que la app vuelve al primer plano, con el horario que ya está en el
 * cache —sin pedirle nada a la API, que puede no estar disponible—.
 *
 * El widget además se refresca solo cada media hora por su cuenta, declarado en
 * `updatePeriodMillis`. Eso cubre los días en que la app no se abre.
 */
function useWidgetAlDia(hayUsuario: boolean) {
  const sync = useSyncActions();
  // Referencia y no estado: esto no pinta nada, y guardarlo en estado provocaría un
  // renderizado de toda la app cada vez que el teléfono se desbloquea.
  const ultimoRefresco = useRef(0);

  useEffect(() => {
    if (!hayUsuario) return;

    async function refrescar() {
      // Un mínimo de un minuto entre refrescos: Android manda varios eventos de
      // `active` seguidos al desbloquear, y no hace falta reescribir el archivo en cada uno.
      const ahora = Date.now();
      if (ahora - ultimoRefresco.current < 60_000) return;
      ultimoRefresco.current = ahora;

      const guardado = await sync.readCache<readonly Subject[]>(CACHE_KEYS.schedule);
      if (guardado) await actualizarWidget(toScheduleEntries(guardado.data));
    }

    void refrescar();

    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void refrescar();
    });

    return () => suscripcion.remove();
  }, [hayUsuario, sync]);
}

function Root() {
  const { user, loading } = useAuth();
  useWidgetAlDia(user !== null);
  const [pantalla, setPantalla] = useState<'entrar' | 'registro'>('entrar');
  const [seccion, setSeccion] = useState<
    | 'inicio'
    | 'horario'
    | 'faltas'
    | 'agenda'
    | 'calendario'
    | 'compartir'
    | 'semestres'
    | 'social'
    | 'mensajes'
  >('inicio');

  /**
   * Con quién abrir el hilo, cuando se llega desde un perfil.
   *
   * Vive aquí y no dentro de la pantalla de mensajes porque quien lo decide es la sección
   * social —«escribirle a esta persona»—, y la pantalla de destino solo lo recibe.
   */
  const [conversacionInicial, setConversacionInicial] = useState<string | undefined>();

  /**
   * Tocar el widget abre el horario (criterio de verificación de la Fase 11).
   *
   * El widget lanza un intent con `notecore://horario`. Se atiende de dos maneras porque
   * son dos situaciones distintas: `getInitialURL` cubre la app cerrada —el enlace ya
   * estaba puesto cuando el proceso arrancó— y el evento `url` cubre la app en segundo
   * plano, donde nunca hay arranque que consultar.
   *
   * Esto **no es** el `expo-router` que las fases anteriores fueron descartando: no hay
   * árbol de rutas ni historial, solo un enlace del sistema que elige la sección inicial.
   * La razón por la que ahora sí hace falta es la que aquellas notas anticipaban —«un
   * enlace profundo del sistema»—, y llega con el widget, que es código fuera de la app.
   */
  useEffect(() => {
    if (!user) return;

    function abrir(url: string | null) {
      if (url && url.startsWith('notecore://horario')) setSeccion('horario');
    }

    void Linking.getInitialURL().then(abrir);
    const suscripcion = Linking.addEventListener('url', ({ url }) => abrir(url));
    return () => suscripcion.remove();
  }, [user]);

  // Mientras se restaura la sesión guardada, para no parpadear entre pantallas.
  if (loading) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color={colors.acentoClaro} size="large" />
      </View>
    );
  }

  if (user) {
    if (seccion === 'horario') {
      return <HorarioScreen onVolver={() => setSeccion('inicio')} />;
    }
    if (seccion === 'faltas') {
      return <FaltasScreen onVolver={() => setSeccion('inicio')} />;
    }
    if (seccion === 'agenda') {
      return <AgendaScreen onVolver={() => setSeccion('inicio')} />;
    }
    if (seccion === 'calendario') {
      return <CalendarioScreen onVolver={() => setSeccion('inicio')} />;
    }
    if (seccion === 'compartir') {
      return <CompartirScreen onVolver={() => setSeccion('inicio')} />;
    }
    if (seccion === 'semestres') {
      return <SemestresScreen onVolver={() => setSeccion('inicio')} />;
    }
    if (seccion === 'social') {
      return (
        <SocialScreen
          onVolver={() => setSeccion('inicio')}
          onEscribirA={(username) => {
            setConversacionInicial(username);
            setSeccion('mensajes');
          }}
        />
      );
    }
    if (seccion === 'mensajes') {
      return (
        <MensajesScreen
          conversacionInicial={conversacionInicial}
          onVolver={() => {
            // El hilo inicial se olvida al salir: volver a entrar por el menú debe abrir la
            // bandeja, no el último hilo que se miró desde un perfil.
            setConversacionInicial(undefined);
            setSeccion('inicio');
          }}
        />
      );
    }
    return (
      <InicioScreen
        onIrAHorario={() => setSeccion('horario')}
        onIrAFaltas={() => setSeccion('faltas')}
        onIrAAgenda={() => setSeccion('agenda')}
        onIrACalendario={() => setSeccion('calendario')}
        onIrACompartir={() => setSeccion('compartir')}
        onIrASemestres={() => setSeccion('semestres')}
        onIrASocial={() => setSeccion('social')}
        onIrAMensajes={() => {
          setConversacionInicial(undefined);
          setSeccion('mensajes');
        }}
      />
    );
  }

  return pantalla === 'entrar' ? (
    <EntrarScreen onIrARegistro={() => setPantalla('registro')} />
  ) : (
    <RegistroScreen onIrAEntrar={() => setPantalla('entrar')} />
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.fondo,
    // En Android `SafeAreaView` no reserva la barra de estado: se compensa a mano.
    paddingTop: RNStatusBar.currentHeight ?? 0,
  },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
