import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  formatDateTime,
  pendingRequestsSummary,
  pendingSummary,
  toFormErrors,
  updateProfileSchema,
  type FormErrors,
  type SessionInfo,
} from '@notecore/shared';
import { authApi, socialApi } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { useSync } from '../lib/sync-context';
import { Button, Card, Field, FormError, colors } from '../components/ui';
import { SyncIndicator, SyncQueuePanel } from '../components/sync-indicator';

/**
 * Inicio con sesión abierta.
 *
 * Enlaza a lo que ya está disponible —el horario de la Fase 2, las faltas de la Fase 3, la
 * agenda de la Fase 4 y el calendario de la Fase 5— y muestra el perfil y los dispositivos de
 * la Fase 1.
 */
export function InicioScreen({
  onIrAHorario,
  onIrAFaltas,
  onIrAAgenda,
  onIrACalendario,
  onIrACompartir,
  onIrASemestres,
  onIrASocial,
}: {
  onIrAHorario: () => void;
  onIrAFaltas: () => void;
  onIrAAgenda: () => void;
  onIrACalendario: () => void;
  onIrACompartir: () => void;
  onIrASemestres: () => void;
  onIrASocial: () => void;
}) {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Hola, {user.displayName}</Text>
        <Text style={styles.subtitle}>@{user.username}</Text>
      </View>

      {/* Estado de la sincronización (FR-050): solo aparece si hay algo que decir. */}
      <SyncIndicator />

      <Sincronizacion />

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

      <Card title="Tu calendario">
        <Text style={styles.body}>
          Tus clases y tus entregas en la misma vista, día a día, con avisos en este teléfono
          antes de que venza cada cosa.
        </Text>
        <Button title="Ver mi calendario" onPress={onIrACalendario} />
      </Card>

      <Card title="Compartir">
        <Text style={styles.body}>
          Pásale tu horario o tus actividades a un compañero por QR, código o enlace, o escanea
          el suyo para recibir una copia tuya.
        </Text>
        <Button title="Compartir o recibir" onPress={onIrACompartir} />
      </Card>

      <Card title="Semestres">
        <Text style={styles.body}>
          Cuando termine el semestre, ciérralo: se archiva completo —horario, faltas y agenda—
          y lo puedes consultar siempre. El nuevo empieza vacío.
        </Text>
        <Button title="Ver mis semestres" onPress={onIrASemestres} />
      </Card>

      <Social onIrASocial={onIrASocial} />

      <DatosDelPerfil />
      <Dispositivos />

      <Card title="Lo que viene">
        <Text style={styles.body}>· Mensajes con tus contactos</Text>
        <Text style={styles.body}>· Widget con tu semana en la pantalla de inicio</Text>
      </Card>

      <Button title="Cerrar sesión" variant="secondary" onPress={() => void logout()} />
    </ScrollView>
  );
}

/**
 * Tarjeta de lo que está pendiente de subir (FR-050).
 *
 * Solo aparece cuando hay algo que contar. Con todo sincronizado no dice nada: una tarjeta
 * permanente de "al día" ocuparía sitio en el inicio para no informar de nada, y el usuario
 * dejaría de mirarla justo antes del día en que sí tuviera algo pendiente.
 */
function Sincronizacion() {
  const { state, queue } = useSync();
  const [abierto, setAbierto] = useState(false);

  if (state.pending === 0 && state.conflicts === 0) return null;

  return (
    <Card title="Cambios sin subir">
      <Text style={styles.body}>{pendingSummary(queue)}</Text>

      {state.conflicts > 0 ? (
        <Text style={styles.body}>
          Algunos no se pudieron subir y necesitan que decidas qué hacer.
        </Text>
      ) : null}

      <Button
        title={abierto ? 'Ocultar detalle' : 'Ver qué está pendiente'}
        variant="secondary"
        onPress={() => setAbierto((valor) => !valor)}
      />

      {abierto ? <SyncQueuePanel /> : null}
    </Card>
  );
}

/**
 * Tarjeta de la sección social, con el aviso de solicitudes pendientes (FR-041).
 *
 * El conteo se pide aparte y no se pasa desde arriba porque el inicio no carga nada más de
 * la API: traerlo aquí deja la tarjeta autocontenida y no retrasa el resto de la pantalla si
 * la petición tarda.
 *
 * Un fallo al pedirlo no se muestra: la tarjeta sigue llevando a la sección, que es lo que
 * importa. Pintar un error en el inicio por no poder contar unas solicitudes sería peor que
 * no enseñar el número.
 */
function Social({ onIrASocial }: { onIrASocial: () => void }) {
  const [pendientes, setPendientes] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;

    void socialApi
      .getProfile()
      .then((perfil) => {
        if (vigente) setPendientes(pendingRequestsSummary(perfil.pendingRequestCount));
      })
      .catch(() => {
        // Silencio deliberado: ver el motivo de arriba.
      });

    return () => {
      vigente = false;
    };
  }, []);

  return (
    <Card title="Perfil y contactos">
      <Text style={styles.body}>
        Llena tu perfil, encuentra compañeros por su @usuario o su QR y agrégalos como
        contactos. Tú decides quién ve lo que publicas.
      </Text>
      {pendientes ? (
        <Text style={styles.pendientes}>Tienes {pendientes} esperando respuesta.</Text>
      ) : null}
      <Button title="Ver mi perfil y mis contactos" onPress={onIrASocial} />
    </Card>
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
  pendientes: { color: colors.acentoClaro, fontSize: 14, fontWeight: '500' },
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
