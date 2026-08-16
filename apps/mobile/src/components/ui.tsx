import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import type { ReactNode } from 'react';

/**
 * Piezas de interfaz de la app, equivalentes a las de la web.
 *
 * React Native no comparte CSS con la web, así que los estilos se escriben aparte; lo que
 * sí se comparte es todo lo que hay detrás (tipos, validación, llamadas y textos).
 * La pasada de diseño integral llega en la Fase 11.
 */

export const colors = {
  fondo: '#020617',
  tarjeta: '#0f172a',
  borde: '#1e293b',
  texto: '#e2e8f0',
  textoFuerte: '#f8fafc',
  textoSuave: '#94a3b8',
  textoTenue: '#64748b',
  acento: '#0284c7',
  acentoClaro: '#38bdf8',
  error: '#f87171',
  errorFondo: '#450a0a',
  exito: '#34d399',
} as const;

export function Field({
  label,
  error,
  hint,
  ...props
}: TextInputProps & { label: string; error?: string | undefined; hint?: string | undefined }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={colors.textoTenue}
        style={[styles.input, error ? styles.inputError : null]}
      />
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function Button({
  title,
  onPress,
  loading,
  variant = 'primary',
  disabled,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  const isDisabled = disabled ?? loading ?? false;

  const background = {
    primary: colors.acento,
    secondary: colors.borde,
    danger: '#7f1d1d',
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      // El área táctil se amplía para que el botón sea fácil de acertar con el pulgar.
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background },
        pressed ? styles.buttonPressed : null,
        isDisabled ? styles.buttonDisabled : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.textoFuerte} size="small" />
      ) : (
        <Text style={styles.buttonText}>{title}</Text>
      )}
    </Pressable>
  );
}

export function FormError({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return (
    <View style={styles.formError}>
      <Text style={styles.formErrorText}>{message}</Text>
    </View>
  );
}

export function Card({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { color: colors.texto, fontSize: 14, fontWeight: '500' },
  input: {
    backgroundColor: colors.tarjeta,
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textoFuerte,
    fontSize: 16,
  },
  inputError: { borderColor: '#991b1b' },
  errorText: { color: colors.error, fontSize: 13 },
  hintText: { color: colors.textoTenue, fontSize: 13 },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonPressed: { opacity: 0.75 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.textoFuerte, fontSize: 15, fontWeight: '600' },
  formError: {
    backgroundColor: colors.errorFondo,
    borderColor: '#991b1b',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  formErrorText: { color: '#fca5a5', fontSize: 14 },
  card: {
    backgroundColor: colors.tarjeta,
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  cardTitle: { color: colors.textoFuerte, fontSize: 17, fontWeight: '600' },
});
