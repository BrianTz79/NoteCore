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
import { Button, Card, Field, FormError, colors } from '../components/ui';

/**
 * Inicio con sesión abierta.
 *
 * Enlaza a lo que ya está disponible —el horario de la Fase 2, las faltas de la Fase 3 y la
 * agenda de la Fase 4— y muestra el perfil y los dispositivos de la Fase 1. El calendario
 * llega en la Fase 5.
 */
export function InicioScreen({
  onIrAHorario,
  onIrAFaltas,
  onIrAAgenda,
}: {
  onIrAHorario: () => void;
  onIrAFaltas: () => void;
  onIrAAgenda: () => void;
}) {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Hola, {user.displayName}</Text>
        <Text style={styles.subtitle}>@{user.username}</Text>
      </View>

      <Card title="Tu horario">
        <Text style={styles.body}>
          Captura tus clases a mano o pega el horario que te genere una IA a partir de una
          foto, y consúltalo en la vista semanal.
        </Text>
        <Button title="Ver mi horario" onPress={onIrAHorario} />
      </Card>

      <Card title="Tus faltas">
        <Text style={styles.body}>
          Marca las clases a las que faltaste y lleva el conteo por materia, con un límite
          sugerido que puedes ajustar.
        </Text>
        <Button title="Ver mis faltas" onPress={onIrAFaltas} />
      </Card>

      <Card title="Tu agenda">
        <Text style={styles.body}>
          Anota tareas, proyectos y exámenes con su materia y su fecha de entrega, y
          consúltalos ordenados por lo que vence antes.
        </Text>
        <Button title="Ver mi agenda" onPress={onIrAAgenda} />
      </Card>

      <DatosDelPerfil />
      <Dispositivos />

      <Card title="Lo que viene">
        <Text style={styles.body}>· El calendario con recordatorios</Text>
        <Text style={styles.body}>· Compartir tu horario con tus compañeros</Text>
      </Card>

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
        onChangeText={(displayName) => setValues((c) => ({ ...c, displayName }))}
        error={errors.fields.displayName}
      />

      <Field
        label="Nombre de usuario"
        value={values.username}
        onChangeText={(username) => setValues((c) => ({ ...c, username }))}
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
        <Text style={styles.muted}>Cargando…</Text>
      ) : (
        sessions.map((session) => (
          <View key={session.id} style={styles.sessionRow}>
            <View style={styles.sessionInfo}>
              <Text style={styles.body}>
                {session.client === 'mobile' ? 'App Android' : 'Navegador web'}
                {session.isCurrent ? ' · este dispositivo' : ''}
              </Text>
              <Text style={styles.muted}>
                Última actividad: {formatDateTime(session.lastUsedAt)}
              </Text>
            </View>
            {session.isCurrent ? null : (
              <Button title="Cerrar" variant="danger" onPress={() => void revoke(session.id)} />
            )}
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 20, paddingBottom: 48 },
  header: { gap: 4 },
  title: { color: colors.textoFuerte, fontSize: 28, fontWeight: '700' },
  subtitle: { color: colors.textoSuave, fontSize: 15 },
  body: { color: colors.texto, fontSize: 15 },
  muted: { color: colors.textoTenue, fontSize: 13 },
  ok: { color: colors.exito, fontSize: 14 },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopColor: colors.borde,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  sessionInfo: { flex: 1, gap: 2 },
});
