import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
// Verificación de la Fase 0: la app consume los mismos tipos y reglas que web y api,
// definidos una sola vez en `packages/shared` (Principio VIII).
import {
  calculateAbsenceLimit,
  ABSENCE_LIMIT_DISCLAIMER,
  WEEKDAYS,
} from '@notecore/shared';

export default function App() {
  const ejemplo = calculateAbsenceLimit(80);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>NoteCore</Text>
        <Text style={styles.subtitle}>
          El núcleo de tu vida académica. Fase 0 — cimientos en marcha.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Código compartido en funcionamiento</Text>
          <Text style={styles.body}>
            Con {ejemplo.totalSessions} sesiones en el semestre, el límite sugerido es de{' '}
            <Text style={styles.strong}>{ejemplo.suggested} faltas</Text>.
          </Text>
          <Text style={styles.caption}>{ABSENCE_LIMIT_DISCLAIMER}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Días de clase</Text>
          <View style={styles.chips}>
            {WEEKDAYS.map((dia) => (
              <View key={dia} style={styles.chip}>
                <Text style={styles.chipText}>{dia}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 24, gap: 24 },
  title: { color: '#f8fafc', fontSize: 32, fontWeight: '600' },
  subtitle: { color: '#94a3b8', fontSize: 15, marginTop: -16 },
  card: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    gap: 10,
  },
  cardTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  body: { color: '#e2e8f0', fontSize: 16 },
  strong: { color: '#ffffff', fontWeight: '600' },
  caption: { color: '#94a3b8', fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#1e293b', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
  chipText: { color: '#e2e8f0', fontSize: 13, textTransform: 'capitalize' },
});
