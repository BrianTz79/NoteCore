import { useState } from 'react';
import { ActivityIndicator, SafeAreaView, StatusBar as RNStatusBar, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './lib/auth-context';
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
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <Root />
      </SafeAreaView>
    </AuthProvider>
  );
}

function Root() {
  const { user, loading } = useAuth();
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
  >('inicio');

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
      return <SocialScreen onVolver={() => setSeccion('inicio')} />;
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
