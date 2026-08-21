import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  formatDateTime,
  toFormErrors,
  updateProfileSchema,
  type FormErrors,
  type SessionInfo,
} from '@notecore/shared';
import { authApi } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { useBotonAtras } from '../lib/boton-atras';
import {
  Button,
  Card,
  Field,
  FormError,
  RULE,
  SPACE,
  ScreenHeader,
  TEXT,
  base,
  c,
  colors,
  fuente,
} from '../components/ui';

/**
 * Ajustes de la cuenta: nombre, usuario, sesiones abiertas y salir.
 *
 * **Por qué existe esta pantalla.** Hasta ahora el perfil y los dispositivos vivían al fondo
 * del inicio, por la razón que anotaba la Fase 11: no tenían pantalla propia y quitarlos
 * habría sido perder funcionalidad. El coste era que el inicio terminaba en dos formularios
 * de configuración que casi nunca se tocan —el nombre se cambia una vez, las sesiones se
 * revisan cuando se sospecha algo— por debajo de lo que sí se mira a diario. Ahora tienen
 * sitio propio, y el inicio termina en la navegación.
 *
 * Es una pantalla de configuración, no de consulta: nada de aquí se refresca solo ni alimenta
 * los widgets, y por eso no participa en el ciclo de sincronización del resto de la app.
 */
export function AjustesScreen({
  onVolver,
  onIrAPrivacidad,
  onIrABorrarCuenta,
}: {
  onVolver: () => void;
  onIrAPrivacidad: () => void;
  onIrABorrarCuenta: () => void;
}) {
  const { user, logout } = useAuth();

  useBotonAtras([{ cuando: true, hacer: onVolver }]);

  if (!user) return null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenHeader title="Ajustes" subtitle={`@${user.username}`} onBack={onVolver} />

      <DatosDelPerfil />
      <Dispositivos />

      {/*
        Tus datos (Fase 19 y 20). Las dos cosas que Google exige que estén dentro de la app y
        que hasta ahora no tenían sitio: qué se guarda de ti, y cómo irte. Van juntas porque
        se leen juntas —nadie borra su cuenta sin antes preguntarse qué había en ella—, y
        antes de «cerrar sesión» porque son decisiones sobre la cuenta, no sobre este rato.
      */}
      <Card title="Tus datos">
        <Text style={base.tenue}>
          Qué guarda NoteCore de ti, para qué, y cómo llevarte o borrar todo.
        </Text>
        <Button title="Política de privacidad" variant="secondary" onPress={onIrAPrivacidad} />
        <Button title="Borrar mi cuenta" variant="danger" onPress={onIrABorrarCuenta} />
      </Card>

      {/*
        Salir va al final y separado de lo demás: es la única acción de esta pantalla que
        termina la sesión, y encontrarla entre dos formularios de edición invitaría a tocarla
        por error mientras se guarda un nombre.
      */}
      <Button title="Cerrar sesión" variant="secondary" onPress={() => void logout()} />
    </ScrollView>
  );
}

function DatosDelPerfil() {
  const { user, updateProfile } = useAuth();

  const [values, setValues] = useState({
    displayName: user?.displayName ?? '',
    username: user?.username ?? '',
  });
  const [errors, setErrors] = useState<FormErrors>({ fields: {} });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onSubmit() {
    setSaving(true);
    setErrors({ fields: {} });
    setSaved(false);

    const parsed = updateProfileSchema.safeParse(values);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[issue.path.join('.')] = issue.message;
      setErrors({ fields });
      setSaving(false);
      return;
    }

    try {
      await updateProfile(parsed.data);
      setSaved(true);
    } catch (error) {
      setErrors(toFormErrors(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Nombre y usuario">
      <FormError message={errors.general} />

      <Field
        label="Tu nombre"
        value={values.displayName}
        onChangeText={(displayName) => setValues((valores) => ({ ...valores, displayName }))}
        error={errors.fields.displayName}
      />

      <Field
        label="Nombre de usuario"
        value={values.username}
        onChangeText={(username) => setValues((valores) => ({ ...valores, username }))}
        error={errors.fields.username}
        autoCapitalize="none"
      />

      <Button title="Guardar cambios" onPress={() => void onSubmit()} loading={saving} />
      {saved ? <Text style={styles.ok}>Guardado</Text> : null}
    </Card>
  );
}

/** Sesiones abiertas: la de este teléfono y la del navegador, a la vez (FR-002). */
function Dispositivos() {
  const [sessions, setSessions] = useState<readonly SessionInfo[]>([]);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setSessions(await authApi.sessions());
      setError(undefined);
    } catch (caught) {
      setError(toFormErrors(caught).general);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function revoke(id: string) {
    try {
      await authApi.revokeSession(id);
      await load();
    } catch (caught) {
      setError(toFormErrors(caught).general);
    }
  }

  return (
    <Card title="Tus dispositivos">
      <FormError message={error} />

      {loading ? (
        <Text style={base.tenue}>Cargando…</Text>
      ) : (
        sessions.map((session) => (
          <View key={session.id} style={styles.sessionRow}>
            <View style={styles.sessionInfo}>
              <Text style={base.cuerpo}>
                {session.client === 'mobile' ? 'App Android' : 'Navegador web'}
                {session.isCurrent ? ' · este dispositivo' : ''}
              </Text>
              <Text style={base.tenue}>
                Última actividad: {formatDateTime(session.lastUsedAt)}
              </Text>
            </View>
            {session.isCurrent ? null : (
              <Button
                title="Cerrar"
                variant="danger"
                size="sm"
                compacto
                onPress={() => void revoke(session.id)}
              />
            )}
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { ...base.contenido, paddingTop: SPACE.md },
  ok: { color: c.exito, fontFamily: fuente.cuerpo, fontSize: TEXT.md },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.sm,
    borderTopColor: colors.borde,
    borderTopWidth: RULE,
    paddingTop: SPACE.sm,
  },
  sessionInfo: { flex: 1, gap: 2 },
});
