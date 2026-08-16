import { useState } from 'react';
import { ActivityIndicator, SafeAreaView, StatusBar as RNStatusBar, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './lib/auth-context';
import { EntrarScreen } from './screens/EntrarScreen';
import { RegistroScreen } from './screens/RegistroScreen';
import { InicioScreen } from './screens/InicioScreen';
import { HorarioScreen } from './screens/HorarioScreen';
import { FaltasScreen } from './screens/FaltasScreen';
import { colors } from './components/ui';

/**
 * Raíz de la app.
 *
 * La navegación sigue siendo un cambio de estado entre pantallas. Con tres secciones
 * —inicio, horario y faltas— y vuelta siempre al inicio, `expo-router` seguiría sin ganar
 * nada: no hay rutas anidadas ni enlaces profundos que resolver. Entra cuando la agenda y
 * el calendario (fases 4 y 5) conviertan esto en una barra de pestañas de verdad.
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
  const [seccion, setSeccion] = useState<'inicio' | 'horario' | 'faltas'>('inicio');

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
    return (
      <InicioScreen
        onIrAHorario={() => setSeccion('horario')}
        onIrAFaltas={() => setSeccion('faltas')}
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
