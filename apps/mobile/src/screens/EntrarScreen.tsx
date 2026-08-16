import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { loginSchema, toFormErrors, type FormErrors } from '@notecore/shared';
import { useAuth } from '../lib/auth-context';
import { Button, Field, FormError, colors } from '../components/ui';

export function EntrarScreen({ onIrARegistro }: { onIrARegistro: () => void }) {
  const { login } = useAuth();

  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({ fields: {} });
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setSubmitting(true);
    setErrors({ fields: {} });

    // Mismo esquema que valida el servidor (Principio VIII).
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[issue.path.join('.')] = issue.message;
      setErrors({ fields });
      setSubmitting(false);
      return;
    }

    try {
      await login(parsed.data);
      // No hace falta navegar: al haber sesión, App muestra la pantalla de inicio.
    } catch (error) {
      setErrors(toFormErrors(error));
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>NoteCore</Text>
          <Text style={styles.subtitle}>Entra para ver tu horario y tu agenda.</Text>
        </View>

        <View style={styles.form}>
          <FormError message={errors.general} />

          <Field
            label="Correo electrónico"
            value={values.email}
            onChangeText={(email) => setValues((c) => ({ ...c, email }))}
            error={errors.fields.email}
            placeholder="ana@ejemplo.mx"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />

          <Field
            label="Contraseña"
            value={values.password}
            onChangeText={(password) => setValues((c) => ({ ...c, password }))}
            error={errors.fields.password}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
          />

          <Button title="Entrar" onPress={() => void onSubmit()} loading={submitting} />
        </View>

        <Pressable onPress={onIrARegistro} hitSlop={12}>
          <Text style={styles.link}>
            ¿Aún no tienes cuenta? <Text style={styles.linkStrong}>Crea una</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 28 },
  header: { gap: 6 },
  title: { color: colors.textoFuerte, fontSize: 32, fontWeight: '700' },
  subtitle: { color: colors.textoSuave, fontSize: 15 },
  form: { gap: 16 },
  link: { color: colors.textoSuave, fontSize: 14, textAlign: 'center' },
  linkStrong: { color: colors.acentoClaro, fontWeight: '600' },
});
