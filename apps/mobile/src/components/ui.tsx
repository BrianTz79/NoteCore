import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import type { ReactNode } from 'react';
import { c, RADIUS, RULE, SPACE, TEXT, TOQUE_MINIMO, base, fuente } from './theme';

/**
 * Piezas de interfaz de la app.
 *
 * Espejo de `apps/web/src/components/ui.tsx`: mismas piezas, mismos nombres, mismos tokens.
 * La paridad del Principio I se comprueba abriendo los dos archivos uno al lado del otro.
 *
 * Fase 11: los valores vienen de `theme.ts`, que los reexporta de `@notecore/shared`. Este
 * archivo ya no define ni un color.
 */

/**
 * El sistema, reexportado desde aquí.
 *
 * Las pantallas ya importaban `colors` de este archivo, así que pedir los tokens al mismo
 * sitio evita que cada una tenga dos imports —uno de `ui` y otro de `theme`— para lo que
 * conceptualmente es una sola cosa: el sistema de diseño.
 */
export { c, base, fuente, COLOR, RADIUS, RULE, SPACE, TEXT, WEIGHT, TOQUE_MINIMO } from './theme';

/**
 * Alias de la paleta con los nombres que usaban las pantallas antes de la Fase 11.
 *
 * Se conserva para que las once pantallas sigan compilando mientras se migran una a una, y
 * porque `colors.acento` sigue leyéndose bien. Lo que cambió debajo es que los valores ya
 * no están escritos aquí: salen de los tokens compartidos, así que la app y la web no
 * pueden volver a separarse.
 */
export const colors = {
  fondo: c.papel,
  tarjeta: c.papel2,
  control: c.papel3,
  borde: c.filete,
  bordeFuerte: c.filete2,
  texto: c.tinta2,
  textoFuerte: c.tinta,
  textoSuave: c.tinta2,
  textoTenue: c.tinta3,
  acento: c.acento,
  acentoClaro: c.foco,
  acentoTenue: c.acentoTenue,
  error: c.error,
  errorFondo: c.errorFondo,
  exito: c.exito,
  aviso: c.aviso,
  avisoFondo: c.avisoFondo,
} as const;

/* ==========================================================================
 * Formularios
 * ======================================================================== */

export function Field({
  label,
  error,
  hint,
  mono,
  ...props
}: TextInputProps & {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  /** Cifras tabulares: para horas, códigos y cantidades. */
  mono?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={c.tinta3}
        style={[
          styles.input,
          mono ? styles.inputMono : null,
          error ? styles.inputError : null,
        ]}
      />
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}

/* ==========================================================================
 * Controles
 * ======================================================================== */

/**
 * Botón.
 *
 * **Se estira al ancho de su contenedor a propósito**, al revés que en la web. En un
 * teléfono, el botón principal de un formulario es más fácil de acertar con el pulgar
 * cuanto más ancho, y hay uno solo por bloque. Donde acompaña a una fila —«Cerrar» junto a
 * un dispositivo, «Editar» junto a una materia— se pasa `compacto`, que lo deja del tamaño
 * de su texto para que no compite con el contenido de la fila.
 */
export function Button({
  title,
  onPress,
  loading,
  variant = 'primary',
  size = 'md',
  compacto,
  disabled,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  /** Del ancho de su texto, para las acciones que acompañan a una fila. */
  compacto?: boolean;
  disabled?: boolean;
}) {
  const isDisabled = disabled ?? loading ?? false;

  /*
   * Las voces de `design.md § Voz de los controles`, iguales que en la web.
   *
   * `danger` es **discreto**: en una lista de dispositivos o de materias, varios botones
   * rojos rellenos gritan la acción menos frecuente de la pantalla y convierten el rojo en
   * decoración —y entonces el rojo del aviso de faltas, que sí importa, deja de destacar—.
   * El borde marca que es destructivo sin gritarlo, y en el teléfono la pulsación ya da la
   * respuesta que en la web daría el puntero.
   */
  const voz = {
    primary: { fondo: c.acento, texto: c.acentoTinta, borde: c.acento },
    secondary: { fondo: c.papel3, texto: c.tinta, borde: c.filete2 },
    danger: { fondo: 'transparent', texto: c.error, borde: c.error },
    ghost: { fondo: 'transparent', texto: c.tinta2, borde: 'transparent' },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading ?? false }}
      // El área táctil se amplía para que el botón sea fácil de acertar con el pulgar.
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        size === 'sm' ? styles.buttonSm : null,
        compacto ? styles.buttonCompacto : null,
        { backgroundColor: voz.fondo, borderColor: voz.borde },
        pressed ? styles.buttonPressed : null,
        isDisabled ? styles.buttonDisabled : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={voz.texto} size="small" />
      ) : (
        <Text
          style={[
            styles.buttonText,
            size === 'sm' ? styles.buttonTextSm : null,
            { color: voz.texto },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

/* ==========================================================================
 * Mensajes de estado
 * ======================================================================== */

export function FormError({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return (
    <View style={styles.formError} accessibilityRole="alert">
      <Text style={styles.formErrorText}>{message}</Text>
    </View>
  );
}

/** Aviso que no es un error: proximidad al límite, semestre archivado, sin conexión. */
export function Notice({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'aviso' | 'exito';
}) {
  const tono = {
    info: { fondo: c.acentoTenue, borde: c.acentoTenue, texto: c.tinta2 },
    aviso: { fondo: c.avisoFondo, borde: c.aviso, texto: c.aviso },
    exito: { fondo: c.papel3, borde: c.exito, texto: c.exito },
  }[tone];

  return (
    <View
      style={[styles.notice, { backgroundColor: tono.fondo, borderColor: tono.borde }]}
    >
      {typeof children === 'string' ? (
        <Text style={[styles.noticeText, { color: tono.texto }]}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

/**
 * Etiqueta de estado.
 *
 * Radio de píldora, y **nunca sobre algo pulsable**: la forma significa «esto es una
 * etiqueta», y si además se pudiera pulsar dejaría de significarlo.
 */
export function Tag({
  label,
  color,
  tone = 'neutro',
}: {
  label: string;
  /** Color de materia. Manda sobre `tone` cuando viene. */
  color?: string | undefined;
  tone?: 'neutro' | 'acento' | 'aviso' | 'error' | 'exito';
}) {
  if (color) {
    return (
      <View
        style={[
          styles.tag,
          // El color de la materia es dato, no decoración: viene de la base de datos.
          { backgroundColor: `${color}26`, borderColor: `${color}66` },
        ]}
      >
        <View style={[styles.tagPunto, { backgroundColor: color }]} />
        <Text style={[styles.tagText, { color: c.tinta }]}>{label}</Text>
      </View>
    );
  }

  const tono = {
    neutro: { fondo: c.papel3, borde: c.filete2, texto: c.tinta2 },
    acento: { fondo: c.acentoTenue, borde: c.acentoTenue, texto: c.acento },
    aviso: { fondo: c.avisoFondo, borde: c.aviso, texto: c.aviso },
    error: { fondo: c.errorFondo, borde: c.error, texto: c.error },
    exito: { fondo: c.papel3, borde: c.exito, texto: c.exito },
  }[tone];

  return (
    <View
      style={[styles.tag, { backgroundColor: tono.fondo, borderColor: tono.borde }]}
    >
      <Text style={[styles.tagText, { color: tono.texto }]}>{label}</Text>
    </View>
  );
}

/* ==========================================================================
 * Superficies
 * ======================================================================== */

/**
 * Panel de contenido.
 *
 * Se separa con **filete**, nunca con sombra: `design.md` lo prohíbe porque una sombra
 * sobre fondo oscuro es un halo sucio, no una elevación.
 */
export function Card({
  children,
  title,
  action,
}: {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.card}>
      {title || action ? (
        <View style={styles.cardHeader}>
          {title ? <Text style={styles.cardTitle}>{title}</Text> : <View />}
          {action}
        </View>
      ) : null}
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

/**
 * Cabecera de pantalla.
 *
 * Flecha de vuelta arriba, título en display, acción principal a la derecha, filete debajo.
 * En la web la equivalente es fija; aquí no hace falta porque cada pantalla es su propia
 * vista y la vuelta también está en el botón físico de Android.
 */
export function ScreenHeader({
  title,
  subtitle,
  action,
  onBack,
  backLabel = 'Inicio',
}: {
  title: string;
  subtitle?: string | undefined;
  action?: ReactNode;
  onBack?: (() => void) | undefined;
  backLabel?: string;
}) {
  return (
    <View style={styles.screenHeader}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={`Volver a ${backLabel}`}
          hitSlop={12}
          style={({ pressed }) => [styles.backLink, pressed ? { opacity: 0.6 } : null]}
        >
          <Text style={styles.backText}>← {backLabel}</Text>
        </Pressable>
      ) : null}
      <View style={styles.screenHeaderRow}>
        <View style={styles.screenHeaderTitles}>
          <Text style={base.titulo} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.screenSubtitle}>{subtitle}</Text> : null}
        </View>
        {action}
      </View>
    </View>
  );
}

/**
 * Estado vacío.
 *
 * Una línea que dice qué falta y **un solo** control que lo resuelve. Sin ilustración:
 * ocupa el espacio donde debería estar el contenido y no ayuda a que aparezca.
 */
export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{message}</Text>
      {action}
    </View>
  );
}

/** Un dato con su etiqueta. El valor en mono tabular, porque casi todos son cifras. */
export function Stat({
  label,
  value,
  tone = 'neutro',
  hint,
}: {
  label: string;
  value: string;
  tone?: 'neutro' | 'acento' | 'aviso' | 'error' | 'exito';
  hint?: string | undefined;
}) {
  const color = {
    neutro: c.tinta,
    acento: c.acento,
    aviso: c.aviso,
    error: c.error,
    exito: c.exito,
  }[tone];

  return (
    <View style={styles.stat}>
      <Text style={base.etiqueta}>{label}</Text>
      <Text style={[base.cifra, styles.statValue, { color }]}>{value}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
  );
}

/** Separador. La única línea del sistema: un filete de un píxel. */
export function Rule() {
  return <View style={base.filete} />;
}

/**
 * Cuerpo desplazable de una pantalla, con el relleno del sistema.
 *
 * Evita que cada pantalla repita el mismo `ScrollView` con las mismas medidas —que es como
 * antes de esta fase unas tenían 16 de relleno y otras 20 sin motivo—.
 */
export function ScreenBody({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      style={base.pantalla}
      contentContainerStyle={base.contenido}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  /* ---- Formulario ---- */
  field: { gap: SPACE['2xs'] },
  label: {
    fontFamily: fuente.cuerpoMedio,
    color: c.tinta2,
    fontSize: TEXT.sm,
  },
  input: {
    backgroundColor: c.papel3,
    borderColor: c.filete2,
    borderWidth: RULE,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACE.sm,
    paddingVertical: SPACE.sm,
    color: c.tinta,
    fontFamily: fuente.cuerpo,
    fontSize: TEXT.md,
    minHeight: TOQUE_MINIMO,
  },
  inputMono: { fontFamily: fuente.mono },
  inputError: { borderColor: c.error },
  errorText: { color: c.error, fontSize: TEXT.sm, fontFamily: fuente.cuerpo },
  hintText: { color: c.tinta3, fontSize: TEXT.sm, fontFamily: fuente.cuerpo },

  /* ---- Botón ---- */
  button: {
    borderRadius: RADIUS.md,
    borderWidth: RULE,
    paddingVertical: SPACE.sm,
    paddingHorizontal: SPACE.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TOQUE_MINIMO,
  },
  buttonSm: {
    paddingVertical: SPACE['2xs'],
    paddingHorizontal: SPACE.sm,
    minHeight: 36,
  },
  buttonCompacto: { alignSelf: 'flex-start' },
  buttonPressed: { opacity: 0.75 },
  buttonDisabled: { opacity: 0.45 },
  buttonText: {
    fontFamily: fuente.cuerpoSemi,
    fontSize: TEXT.md,
  },
  buttonTextSm: { fontSize: TEXT.sm },

  /* ---- Mensajes ---- */
  formError: {
    backgroundColor: c.errorFondo,
    borderColor: c.error,
    borderWidth: RULE,
    borderRadius: RADIUS.md,
    padding: SPACE.sm,
  },
  formErrorText: { color: c.error, fontSize: TEXT.sm, fontFamily: fuente.cuerpo },
  notice: {
    borderWidth: RULE,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACE.sm,
    paddingVertical: SPACE.xs,
  },
  noticeText: { fontSize: TEXT.sm, fontFamily: fuente.cuerpo },

  /* ---- Etiqueta ---- */
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE['2xs'],
    borderWidth: RULE,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.xs,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  tagPunto: { width: 7, height: 7, borderRadius: RADIUS.pill },
  tagText: { fontSize: TEXT.xs, fontFamily: fuente.cuerpoMedio },

  /* ---- Superficies ---- */
  card: {
    backgroundColor: c.papel2,
    borderColor: c.filete,
    borderWidth: RULE,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.sm,
    borderBottomColor: c.filete,
    borderBottomWidth: RULE,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
  },
  cardTitle: {
    fontFamily: fuente.display,
    color: c.tinta,
    fontSize: TEXT.lg,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  cardBody: { padding: SPACE.md, gap: SPACE.sm },

  /* ---- Cabecera de pantalla ---- */
  /*
   * Sin relleno horizontal propio: la cabecera vive **dentro** del contenedor de la
   * pantalla, que ya lo aporta. Añadirlo aquí la sangraría el doble que el contenido de
   * debajo, y el filete inferior no llegaría a los bordes.
   */
  screenHeader: {
    paddingBottom: SPACE.sm,
    marginBottom: SPACE['2xs'],
    borderBottomColor: c.filete,
    borderBottomWidth: RULE,
    gap: SPACE['2xs'],
  },
  backLink: { alignSelf: 'flex-start' },
  backText: { color: c.tinta3, fontSize: TEXT.sm, fontFamily: fuente.cuerpo },
  screenHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.sm,
  },
  screenHeaderTitles: { flexShrink: 1, gap: 2 },
  screenSubtitle: { color: c.tinta3, fontSize: TEXT.sm, fontFamily: fuente.cuerpo },

  /* ---- Vacío y datos ---- */
  empty: {
    borderColor: c.filete2,
    borderWidth: RULE,
    borderStyle: 'dashed',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.lg,
    gap: SPACE.sm,
    alignItems: 'flex-start',
  },
  emptyText: { color: c.tinta3, fontSize: TEXT.md, fontFamily: fuente.cuerpo },
  stat: { gap: 2 },
  statValue: { fontSize: TEXT['2xl'] },
  statHint: { color: c.tinta3, fontSize: TEXT.xs, fontFamily: fuente.cuerpo },
});
