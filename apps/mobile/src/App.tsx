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
import { colors } from './components/ui';

/**
 * Raíz de la app.
 *
 * La navegación sigue siendo un cambio de estado entre pantallas. Con cuatro secciones
 * —inicio, horario, faltas y agenda— y vuelta siempre al inicio, `expo-router` seguiría sin
 * ganar nada: no hay rutas anidadas ni enlaces profundos que resolver, y cada sección es
 * una pantalla completa que se abre desde el inicio.
 *
 * Entra en la Fase 5: el calendario enlaza con el detalle de un día y con la actividad
 * concreta de ese día, y ahí sí aparece la anidación —y con los recordatorios, la necesidad
 * de abrir la app directamente en una actividad desde una notificación—.
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
  const [seccion, setSeccion] = useState<'inicio' | 'horario' | 'faltas' | 'agenda'>(
    'inicio',
  );

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
    return (
      <InicioScreen
        onIrAHorario={() => setSeccion('horario')}
        onIrAFaltas={() => setSeccion('faltas')}
        onIrAAgenda={() => setSeccion('agenda')}
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
