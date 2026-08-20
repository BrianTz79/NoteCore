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
import { registerSchema, toFormErrors, type FormErrors } from '@notecore/shared';
import { useAuth } from '../lib/auth-context';
import { Button, Field, FormError, SPACE, TEXT, base, colors } from '../components/ui';

export function RegistroScreen({ onIrAEntrar }: { onIrAEntrar: () => void }) {
  const { register } = useAuth();

  const [values, setValues] = useState({
    displayName: '',
    username: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({ fields: {} });
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setSubmitting(true);
    setErrors({ fields: {} });

    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[issue.path.join('.')] = issue.message;
      setErrors({ fields });
      setSubmitting(false);
      return;
    }

    try {
      await register(parsed.data);
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
          <Text style={styles.title}>Crea tu cuenta</Text>
          <Text style={styles.subtitle}>
            Tu horario, tus faltas y tu agenda en un solo lugar.
          </Text>
        </View>

        <View style={styles.form}>
          <FormError message={errors.general} />

          <Field
            label="Tu nombre"
            value={values.displayName}
            onChangeText={(displayName) => setValues((c) => ({ ...c, displayName }))}
            error={errors.fields.displayName}
            placeholder="Ana Pérez"
            autoComplete="name"
          />

          <Field
            label="Nombre de usuario"
            value={values.username}
            onChangeText={(username) => setValues((c) => ({ ...c, username }))}
            error={errors.fields.username}
            hint="Así te encontrarán tus compañeros."
            placeholder="ana_perez"
            autoCapitalize="none"
            autoComplete="username"
          />

          <Field
            label="Correo electrónico"
            value={values.email}
            onChangeText={(email) => setValues((c) => ({ ...c, email }))}
            error={errors.fields.email}
            placeholder="ana@ejemplo.mx"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Field
            label="Contraseña"
            value={values.password}
            onChangeText={(password) => setValues((c) => ({ ...c, password }))}
            error={errors.fields.password}
            hint="Al menos 8 caracteres."
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
          />

          <Button title="Crear cuenta" onPress={() => void onSubmit()} loading={submitting} />
        </View>

        <Pressable onPress={onIrAEntrar} hitSlop={12}>
          <Text style={styles.link}>
            ¿Ya tienes cuenta? <Text style={styles.linkStrong}>Inicia sesión</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: SPACE.md, gap: SPACE.xl },
  header: { gap: 6 },
  title: { ...base.titulo, fontSize: TEXT['3xl'] },
  subtitle: { ...base.cuerpo },
  form: { gap: 16 },
  link: { color: colors.textoSuave, fontSize: TEXT.md, textAlign: 'center' },
  linkStrong: { color: colors.acentoClaro, fontWeight: '600' },
});
