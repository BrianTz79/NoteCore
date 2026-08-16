import { useState } from 'react';
import { ActivityIndicator, SafeAreaView, StatusBar as RNStatusBar, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './lib/auth-context';
import { EntrarScreen } from './screens/EntrarScreen';
import { RegistroScreen } from './screens/RegistroScreen';
import { InicioScreen } from './screens/InicioScreen';
import { colors } from './components/ui';

/**
 * Raíz de la app.
 *
 * La navegación es un simple cambio de estado entre tres pantallas: con las que hay en la
 * Fase 1 no compensa traer una librería de navegación. Cuando lleguen el horario, la
 * agenda y el calendario (fases 2 a 5) se introducirá `expo-router` con pestañas.
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

  // Mientras se restaura la sesión guardada, para no parpadear entre pantallas.
  if (loading) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color={colors.acentoClaro} size="large" />
      </View>
    );
  }

  if (user) return <InicioScreen />;

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
