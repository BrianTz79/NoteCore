import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  CACHE_KEYS,
  describeUpcoming,
  formatDateTime,
  nextClass,
  pendingSummary,
  remainingToday,
  toFormErrors,
  toScheduleEntries,
  unreadSummary,
  updateProfileSchema,
  type AgendaList,
  type AttendanceSummary,
  type FormErrors,
  type SessionInfo,
  type Subject,
  type UnreadSummary,
  type UpcomingClass,
} from '@notecore/shared';
import { agendaApi, attendanceApi, authApi, messagingApi, scheduleApi } from '../lib/api';
import { actualizarWidget } from '../lib/widget';
import { useAuth } from '../lib/auth-context';
import { loadWithCache, useSync, useSyncActions } from '../lib/sync-context';
import {
  Button,
  Card,
  EmptyState,
  Field,
  FormError,
  RADIUS,
  RULE,
  SPACE,
  TEXT,
  Tag,
  base,
  c,
  colors,
  fuente,
} from '../components/ui';
import { SyncIndicator, SyncQueuePanel } from '../components/sync-indicator';
// Fase 17. Con el actualizador apagado no renderiza nada y no pregunta a la API. Se quita
// borrando esta línea y su uso de abajo; ver `src/lib/actualizacion.ts`.
import { AvisoDeActualizacion } from '../components/aviso-actualizacion';

/**
 * Inicio con sesión abierta (Fase 11 · macroestructura Stat-Led de `design.md`).
 *
 * **Qué cambió y por qué.** Hasta la Fase 10 esta pantalla eran nueve tarjetas iguales, cada
 * una con su párrafo explicativo y su botón. En un teléfono eso son varias pantallas de
 * desplazamiento para llegar a lo que se quería, leyendo textos que solo sirven la primera
 * vez. Es el mismo cambio que en la web —y por eso las dos pantallas se parecen ahora más
 * entre sí que antes—: arriba **qué clase toca**, luego solo lo que exige atención, y al
 * final la navegación en rejilla.
 *
 * El perfil y los dispositivos siguen aquí, al fondo, porque no tienen pantalla propia en la
 * app y quitarlos sería perder funcionalidad —no es lo que pide una pasada de diseño—.
 */
export function InicioScreen({
  onIrAHorario,
  onIrAFaltas,
  onIrAAgenda,
  onIrACalendario,
  onIrACompartir,
  onIrASemestres,
  onIrASocial,
  onIrAMensajes,
}: {
  onIrAHorario: () => void;
  onIrAFaltas: () => void;
  onIrAAgenda: () => void;
  onIrACalendario: () => void;
  onIrACompartir: () => void;
  onIrASemestres: () => void;
  onIrASocial: () => void;
  onIrAMensajes: () => void;
}) {
  const { user, logout } = useAuth();
  const sync = useSyncActions();
  const [resumen, setResumen] = useState<Resumen | null>(null);

  /**
   * Todo lo del inicio, en paralelo.
   *
   * `allSettled` y no `all`: si los mensajes fallan, el horario debe salir igual. Es la
   * pantalla que más se abre y la que peor tolera quedarse en blanco por una ruta que no
   * respondió —y en un teléfono, que una de las cuatro peticiones no llegue es lo normal,
   * no la excepción—.
   */
  useEffect(() => {
    let vigente = true;

    async function cargar() {
      const [horario, faltas, agenda, mensajes] = await Promise.allSettled([
        loadWithCache(sync, CACHE_KEYS.schedule, () => scheduleApi.subjects()),
        attendanceApi.summary(),
        agendaApi.list(),
        messagingApi.unread(),
      ]);

      if (!vigente) return;

      const subjects: readonly Subject[] =
        horario.status === 'fulfilled' ? horario.value.data : [];
      const entries = toScheduleEntries(subjects);

      const resumenDeFaltas = faltas.status === 'fulfilled' ? faltas.value : null;
      const listaDeAgenda = agenda.status === 'fulfilled' ? agenda.value : null;

      setResumen({
        // La misma función que usan la web y el widget de Android: los tres dicen lo mismo
        // a la misma hora porque los tres llaman aquí (Principio II).
        proxima: nextClass(entries),
        quedanHoy: remainingToday(entries).length,
        faltas: resumenDeFaltas,
        agenda: listaDeAgenda,
        sinLeer: mensajes.status === 'fulfilled' ? mensajes.value : null,
      });

      /*
       * Los cuatro widgets se reconstruyen desde aquí (Fase 16).
       *
       * Es el único sitio de la app que carga las tres fuentes a la vez —horario, faltas y
       * agenda—, que es justo lo que la familia de widgets necesita. `HorarioScreen`
       * también los actualiza, pero solo tiene el horario y deja los otros dos en `null`;
       * esta pantalla es la que los completa, y es la que más se abre.
       *
       * Va después de `setResumen` y sin `await`: pintar la pantalla no puede esperar a
       * que Android termine de escribir en disco.
       */
      void actualizarWidget(entries, resumenDeFaltas, listaDeAgenda);
    }

    void cargar();
    return () => {
      vigente = false;
    };
  }, [sync]);

  if (!user) return null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={base.titulo}>{user.displayName}</Text>
        <Text style={styles.usuario}>@{user.username}</Text>
      </View>

      {/*
        Versión nueva de la app (Fase 17), lo primero después del nombre.
        Va antes que la sincronización porque una versión nueva puede traer justo el arreglo
        de lo que esté fallando; y no es un diálogo, para no interrumpir a quien abrió la app
        para mirar a qué hora es su próxima clase.
      */}
      <AvisoDeActualizacion />

      {/* Estado de la sincronización (FR-050): solo aparece si hay algo que decir. */}
      <SyncIndicator />
      <Sincronizacion />

      <ProximaClase resumen={resumen} onIrAHorario={onIrAHorario} />

      <Avisos
        resumen={resumen}
        onIrAFaltas={onIrAFaltas}
        onIrAAgenda={onIrAAgenda}
        onIrAMensajes={onIrAMensajes}
      />

      <Navegacion
        destinos={[
          { nombre: 'Horario', nota: 'Tu semana', ir: onIrAHorario },
          { nombre: 'Faltas', nota: 'Conteo y límites', ir: onIrAFaltas },
          { nombre: 'Agenda', nota: 'Tareas y entregas', ir: onIrAAgenda },
          { nombre: 'Calendario', nota: 'Clases y vencimientos', ir: onIrACalendario },
          { nombre: 'Compartir', nota: 'Por QR, código o enlace', ir: onIrACompartir },
          { nombre: 'Periodos', nota: 'Semestres y archivo', ir: onIrASemestres },
          { nombre: 'Contactos', nota: 'Perfil y compañeros', ir: onIrASocial },
          { nombre: 'Mensajes', nota: 'Con tus contactos', ir: onIrAMensajes },
        ]}
      />

      <DatosDelPerfil />
      <Dispositivos />

      <Button title="Cerrar sesión" variant="secondary" onPress={() => void logout()} />
    </ScrollView>
  );
}

/** Lo que el inicio necesita de la API, en un solo objeto. */
interface Resumen {
  readonly proxima: UpcomingClass | null;
  readonly quedanHoy: number;
  readonly faltas: AttendanceSummary | null;
  readonly agenda: AgendaList | null;
  readonly sinLeer: UnreadSummary | null;
}

/* ==========================================================================
 * El dato principal
 * ======================================================================== */

/**
 * Qué clase toca.
 *
 * Es lo que alguien busca al sacar el teléfono entre dos clases, así que ocupa el sitio que
 * le corresponde. El widget de la pantalla de inicio muestra exactamente esto mismo —misma
 * función de `shared`—, para que abrir la app tras mirar el widget no contradiga lo que
 * acababa de leerse.
 */
function ProximaClase({
  resumen,
  onIrAHorario,
}: {
  resumen: Resumen | null;
  onIrAHorario: () => void;
}) {
  if (resumen === null) {
    return <View style={styles.esqueleto} />;
  }

  const { proxima, quedanHoy } = resumen;

  if (proxima === null) {
    return (
      <EmptyState
        message="Todavía no has capturado tu horario."
        action={<Button title="Capturar mi horario" onPress={onIrAHorario} />}
      />
    );
  }

  const { entry } = proxima;
  const enCurso = proxima.timing === 'en_curso';

  return (
    <Pressable
      onPress={onIrAHorario}
      accessibilityRole="button"
      accessibilityLabel={`${entry.subjectName}, ${entry.startTime} a ${entry.endTime}. Ver el horario completo.`}
      style={({ pressed }) => [
        styles.proxima,
        // El color de la materia identifica la clase sin teñir la superficie entera, que a
        // este tamaño sería un bloque de color con texto encima.
        { borderLeftColor: entry.color },
        pressed ? { opacity: 0.8 } : null,
      ]}
    >
      <View style={styles.proximaCabecera}>
        <Text style={base.etiqueta}>{enCurso ? 'Clase en curso' : 'Próxima clase'}</Text>
        <Text style={styles.cuando}>{describeUpcoming(proxima)}</Text>
      </View>

      <Text style={styles.materia} numberOfLines={2}>
        {entry.subjectName}
      </Text>

      <View style={styles.proximaDatos}>
        <Text style={styles.hora}>
          {entry.startTime}–{entry.endTime}
        </Text>
        {entry.room ? <Text style={styles.aula}>Aula {entry.room}</Text> : null}
      </View>

      {quedanHoy > 0 ? (
        <Text style={base.tenue}>
          {quedanHoy === 1 ? 'Queda 1 clase hoy' : `Quedan ${quedanHoy} clases hoy`}
        </Text>
      ) : null}
    </Pressable>
  );
}

/* ==========================================================================
 * Lo que exige atención
 * ======================================================================== */

/**
 * Solo lo que hay que atender.
 *
 * **Nada se muestra "por completitud".** Un aviso que aparece siempre deja de leerse, y
 * entonces tampoco se lee el día que de verdad importa. Si no hay faltas cerca del límite,
 * esta sección entera no existe.
 */
function Avisos({
  resumen,
  onIrAFaltas,
  onIrAAgenda,
  onIrAMensajes,
}: {
  resumen: Resumen | null;
  onIrAFaltas: () => void;
  onIrAAgenda: () => void;
  onIrAMensajes: () => void;
}) {
  if (resumen === null) return null;

  const { faltas, agenda, sinLeer } = resumen;

  const enRiesgo = (faltas?.subjects ?? []).filter(
    (materia) => materia.status === 'cerca' || materia.status === 'alcanzado',
  );
  const vencidas = agenda?.overdueCount ?? 0;
  const hoy = agenda?.dueTodayCount ?? 0;
  const mensajes = unreadSummary(sinLeer?.total ?? 0, sinLeer?.conversations ?? 0);

  if (enRiesgo.length === 0 && vencidas === 0 && hoy === 0 && !mensajes) return null;

  return (
    <View style={styles.avisos}>
      <Text style={base.etiqueta}>Requiere tu atención</Text>

      <View style={styles.avisosLista}>
        {enRiesgo.map((materia, indice) => (
          <FilaAviso key={materia.subjectId} primera={indice === 0} onPress={onIrAFaltas}>
            <Tag label={materia.subjectName} color={materia.color} />
            <Text
              style={[
                styles.avisoCifra,
                { color: materia.status === 'alcanzado' ? c.error : c.aviso },
              ]}
            >
              {materia.absences}/{materia.limit} faltas
            </Text>
          </FilaAviso>
        ))}

        {vencidas > 0 ? (
          <FilaAviso primera={enRiesgo.length === 0} onPress={onIrAAgenda}>
            <Text style={styles.avisoTexto}>
              {vencidas === 1 ? '1 entrega vencida' : `${vencidas} entregas vencidas`}
            </Text>
            <Text style={[styles.avisoAccion, { color: c.error }]}>Ver →</Text>
          </FilaAviso>
        ) : null}

        {hoy > 0 ? (
          <FilaAviso primera={enRiesgo.length === 0 && vencidas === 0} onPress={onIrAAgenda}>
            <Text style={styles.avisoTexto}>
              {hoy === 1 ? '1 entrega vence hoy' : `${hoy} entregas vencen hoy`}
            </Text>
            <Text style={[styles.avisoAccion, { color: c.aviso }]}>Ver →</Text>
          </FilaAviso>
        ) : null}

        {mensajes ? (
          <FilaAviso
            primera={enRiesgo.length === 0 && vencidas === 0 && hoy === 0}
            onPress={onIrAMensajes}
          >
            <Text style={styles.avisoTexto}>Tienes {mensajes}</Text>
            <Text style={[styles.avisoAccion, { color: c.acento }]}>Leer →</Text>
          </FilaAviso>
        ) : null}
      </View>
    </View>
  );
}

/** Una fila de la lista de avisos, con su filete de separación. */
function FilaAviso({
  children,
  primera,
  onPress,
}: {
  children: React.ReactNode;
  primera: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.avisoFila,
        // El filete separa filas, así que la primera no lo lleva: si no, quedaría una línea
        // doble contra el borde del contenedor.
        primera ? null : styles.avisoFilaSeparada,
        pressed ? { backgroundColor: c.papel3 } : null,
      ]}
    >
      {children}
    </Pressable>
  );
}

/* ==========================================================================
 * Navegación
 * ======================================================================== */

/**
 * Las secciones, en rejilla de dos columnas.
 *
 * Sin párrafo explicativo: «Faltas» y «Agenda» se entienden por su nombre. La nota de una
 * línea se queda solo donde el nombre no basta por sí solo.
 */
function Navegacion({
  destinos,
}: {
  destinos: readonly { nombre: string; nota: string; ir: () => void }[];
}) {
  return (
    <View style={styles.navegacion}>
      <Text style={base.etiqueta}>Ir a</Text>
      <View style={styles.rejilla}>
        {destinos.map((destino) => (
          <Pressable
            key={destino.nombre}
            onPress={destino.ir}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.destino,
              pressed ? { backgroundColor: c.papel3, borderColor: c.filete2 } : null,
            ]}
          >
            <Text style={styles.destinoNombre}>{destino.nombre}</Text>
            <Text style={styles.destinoNota} numberOfLines={1}>
              {destino.nota}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/* ==========================================================================
 * Sincronización, perfil y dispositivos
 * ======================================================================== */

/**
 * Lo que está pendiente de subir (FR-050).
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
      <Text style={base.cuerpo}>{pendingSummary(queue)}</Text>

      {state.conflicts > 0 ? (
        <Text style={base.cuerpo}>
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
  content: {
    paddingHorizontal: SPACE.md,
    paddingTop: SPACE.md,
    paddingBottom: SPACE['3xl'],
    gap: SPACE.md,
  },
  header: { gap: 2 },
  usuario: { fontFamily: fuente.mono, fontSize: TEXT.sm, color: c.tinta3 },

  /* ---- Próxima clase ---- */
  // Alto reservado mientras cargan los datos, para que la pantalla no salte al llegar.
  esqueleto: {
    height: 128,
    borderRadius: RADIUS.lg,
    borderWidth: RULE,
    borderColor: c.filete,
    backgroundColor: c.papel2,
  },
  proxima: {
    backgroundColor: c.papel2,
    borderColor: c.filete,
    borderWidth: RULE,
    borderLeftWidth: 3,
    borderRadius: RADIUS.lg,
    padding: SPACE.md,
    gap: SPACE['2xs'],
  },
  proximaCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.xs,
  },
  cuando: { fontFamily: fuente.mono, fontSize: TEXT.sm, color: c.acento },
  materia: {
    fontFamily: fuente.display,
    fontSize: TEXT['2xl'],
    color: c.tinta,
    letterSpacing: -0.4,
  },
  proximaDatos: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  hora: {
    fontFamily: fuente.mono,
    fontVariant: ['tabular-nums'],
    fontSize: TEXT.lg,
    color: c.tinta2,
  },
  aula: { fontFamily: fuente.cuerpo, fontSize: TEXT.md, color: c.tinta3 },

  /* ---- Avisos ---- */
  avisos: { gap: SPACE['2xs'] },
  avisosLista: {
    backgroundColor: c.papel2,
    borderColor: c.filete,
    borderWidth: RULE,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  avisoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.xs,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
    minHeight: 52,
  },
  avisoFilaSeparada: { borderTopColor: c.filete, borderTopWidth: RULE },
  avisoTexto: { fontFamily: fuente.cuerpo, fontSize: TEXT.md, color: c.tinta, flexShrink: 1 },
  avisoCifra: {
    fontFamily: fuente.mono,
    fontVariant: ['tabular-nums'],
    fontSize: TEXT.sm,
  },
  avisoAccion: { fontFamily: fuente.cuerpoMedio, fontSize: TEXT.sm },

  /* ---- Navegación ---- */
  navegacion: { gap: SPACE['2xs'] },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs },
  destino: {
    // Dos columnas: la mitad del ancho menos la separación entre ellas.
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: c.papel2,
    borderColor: c.filete,
    borderWidth: RULE,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACE.sm,
    paddingVertical: SPACE.xs,
    minHeight: 56,
    justifyContent: 'center',
    gap: 1,
  },
  destinoNombre: { fontFamily: fuente.cuerpoSemi, fontSize: TEXT.md, color: c.tinta },
  destinoNota: { fontFamily: fuente.cuerpo, fontSize: TEXT.xs, color: c.tinta3 },

  /* ---- Perfil y dispositivos ---- */
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
