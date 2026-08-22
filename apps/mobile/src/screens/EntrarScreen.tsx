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
import { Button, Field, FormError, SPACE, TEXT, base, colors } from '../components/ui';
import { Logo } from '../components/logo';

/**
 * Pantalla de entrada.
 *
 * Lleva enlace a la política de privacidad (Fase 26) porque hasta entonces solo se alcanzaba
 * desde Ajustes, es decir, **con sesión ya iniciada**: quien quería saber qué se guarda de él
 * tenía que entregar sus datos primero para poder leerlo. El texto ya vivía en `shared` y la
 * pantalla ya existía; lo que faltaba era la puerta.
 */
export function EntrarScreen({
  onIrARegistro,
  onIrAPrivacidad,
}: {
  onIrARegistro: () => void;
  onIrAPrivacidad: () => void;
}) {
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
          <View style={styles.marca}>
            <Logo size={28} />
            <Text style={styles.title}>NoteCore</Text>
          </View>
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

        <Pressable onPress={onIrAPrivacidad} hitSlop={12}>
          <Text style={styles.linkTenue}>Política de privacidad</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: SPACE.md, gap: SPACE.xl },
  header: { gap: 6 },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { ...base.titulo, fontSize: TEXT['3xl'] },
  subtitle: { ...base.cuerpo },
  form: { gap: 16 },
  link: { color: colors.textoSuave, fontSize: TEXT.md, textAlign: 'center' },
  linkStrong: { color: colors.acentoClaro, fontWeight: '600' },
  /**
   * Más tenue que el enlace de registro, y a propósito: crear una cuenta es lo que se viene a
   * hacer aquí, leer la política es lo que se puede hacer. Compiten por el mismo sitio y el
   * peso visual dice cuál es cuál.
   */
  linkTenue: { color: colors.textoSuave, fontSize: TEXT.sm, textAlign: 'center' },
});
