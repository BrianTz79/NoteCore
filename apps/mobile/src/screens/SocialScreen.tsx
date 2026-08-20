import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  ApiError,
  areConnected,
  BIO_MAX_LENGTH,
  CONTACT_VIEWPOINT_COLORS,
  CONTACT_VIEWPOINT_LABELS,
  POST_MAX_LENGTH,
  PROFILE_VISIBILITIES,
  PROFILE_VISIBILITY_HINTS,
  PROFILE_VISIBILITY_LABELS,
  pendingRequestsSummary,
  profileCountsSummary,
  profileHiddenMessage,
  profileSummary,
  relativeTime,
  sortContacts,
  usernameFromProfileInput,
  type Contact,
  type ContactActionName,
  type ContactLists,
  type OwnProfile,
  type Post,
  type ProfileVisibility,
  type PublicProfile,
  type UserSearchResult,
} from '@notecore/shared';
import { socialApi } from '../lib/api';
import { useBotonAtras } from '../lib/boton-atras';
import { Button, Card, Field, FormError, RADIUS, SPACE, ScreenHeader, TEXT, base, c, colors, fuente } from '../components/ui';
import { QrCode } from '../components/qr-code';
import { QrScanner } from '../components/qr-scanner';

/**
 * Sección social: perfil, contactos y publicaciones (FR-039 a FR-042, FR-045).
 *
 * Principio I: la misma funcionalidad que la web, con los mismos textos —todos vienen de
 * `shared`—. Lo único que la app añade es escanear el QR de un perfil con la cámara, que es
 * una capacidad del dispositivo y no una diferencia funcional.
 *
 * Principio II: aquí no se decide nada. Los botones salen de `actions` y lo que un perfil
 * enseña lo dice `detailsVisible`, ambos resueltos por el servidor.
 */

type Pestana = 'perfil' | 'buscar' | 'contactos' | 'publicaciones';

export function SocialScreen({
  onVolver,
  onEscribirA,
}: {
  onVolver: () => void;
  /** Abre la conversación con esta persona (Fase 10). */
  onEscribirA: (username: string) => void;
}) {
  const [pestana, setPestana] = useState<Pestana>('perfil');
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [listas, setListas] = useState<ContactLists | null>(null);
  const [error, setError] = useState<string | undefined>();

  /** Perfil ajeno abierto, si lo hay. Se muestra encima en lugar de navegar a otra ruta. */
  const [verPerfil, setVerPerfil] = useState<string | null>(null);

  /**
   * Atrás deshace un paso cada vez (Fase 12.2): primero el perfil ajeno, luego la pestaña.
   *
   * La pestaña cuenta como paso porque cambiarla es lo que hizo el usuario para llegar
   * donde está; devolverlo al inicio desde «contactos» se saltaría ese paso. El perfil
   * ajeno recarga al cerrarse, igual que hace su propia flecha, porque desde ahí se pueden
   * mandar o aceptar solicitudes y la lista de detrás quedaría vieja.
   */
  useBotonAtras([
    {
      cuando: verPerfil !== null,
      hacer: () => {
        setVerPerfil(null);
        void cargar();
      },
    },
    { cuando: pestana !== 'perfil', hacer: () => setPestana('perfil') },
    { cuando: true, hacer: onVolver },
  ]);

  const cargar = useCallback(async () => {
    try {
      const [perfil, contactos] = await Promise.all([
        socialApi.getProfile(),
        socialApi.listContacts(),
      ]);
      setProfile(perfil);
      setListas(contactos);
      setError(undefined);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo cargar tu perfil.');
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (verPerfil !== null) {
    return (
      <PerfilAjeno
        username={verPerfil}
        onEscribirA={onEscribirA}
        onVolver={() => {
          setVerPerfil(null);
          void cargar();
        }}
      />
    );
  }

  const pendientes = pendingRequestsSummary(profile?.pendingRequestCount ?? 0);

  return (
    <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <ScreenHeader
        title="Perfil y contactos"
        onBack={onVolver}
      />

      {pendientes ? (
        <View style={styles.aviso}>
          <Text style={styles.avisoTexto}>Tienes {pendientes} esperando respuesta.</Text>
        </View>
      ) : null}

      <FormError message={error} />

      <View style={styles.pestanas}>
        {(
          [
            ['perfil', 'Mi perfil'],
            ['buscar', 'Buscar'],
            ['contactos', 'Contactos'],
            ['publicaciones', 'Publicaciones'],
          ] as const
        ).map(([clave, etiqueta]) => (
          <Pressable
            key={clave}
            onPress={() => setPestana(clave)}
            hitSlop={4}
            style={[styles.pestana, pestana === clave ? styles.pestanaActiva : null]}
          >
            <Text
              style={[
                styles.pestanaTexto,
                pestana === clave ? styles.pestanaTextoActivo : null,
              ]}
            >
              {etiqueta}
              {clave === 'contactos' && (listas?.recibidas.length ?? 0) > 0
                ? ` (${listas?.recibidas.length})`
                : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      {pestana === 'perfil' ? (
        <PerfilPropio profile={profile} onGuardado={cargar} />
      ) : null}
      {pestana === 'buscar' ? (
        <Buscador onCambio={cargar} onAbrirPerfil={setVerPerfil} />
      ) : null}
      {pestana === 'contactos' ? (
        <Contactos listas={listas} onCambio={cargar} onAbrirPerfil={setVerPerfil} />
      ) : null}
      {pestana === 'publicaciones' ? <Publicaciones onCambio={cargar} /> : null}
    </ScrollView>
  );
}

/* ─────────────────────────── Perfil propio ─────────────────────────── */

function PerfilPropio({
  profile,
  onGuardado,
}: {
  profile: OwnProfile | null;
  onGuardado: () => Promise<void>;
}) {
  const [bio, setBio] = useState('');
  const [career, setCareer] = useState('');
  const [school, setSchool] = useState('');
  const [age, setAge] = useState('');
  const [visibility, setVisibility] = useState<ProfileVisibility>('contactos');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [guardado, setGuardado] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setBio(profile.bio ?? '');
    setCareer(profile.career ?? '');
    setSchool(profile.school ?? '');
    setAge(profile.age === null ? '' : String(profile.age));
    setVisibility(profile.visibility);
  }, [profile]);

  if (!profile) {
    return (
      <Card>
        <Text style={styles.texto}>Cargando…</Text>
      </Card>
    );
  }

  async function guardar() {
    setGuardando(true);
    setError(undefined);
    setGuardado(false);

    try {
      await socialApi.updateProfile({
        bio,
        career,
        school,
        age: age.trim() === '' ? null : Number(age),
        visibility,
      });
      await onGuardado();
      setGuardado(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <View style={styles.seccion}>
      <Card title="Tu perfil público">
        <Text style={styles.textoSuave}>
          Esto es lo que otras personas pueden ver de ti. Todo es opcional.
        </Text>

        <View style={styles.campo}>
          <Text style={styles.etiqueta}>Biografía</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            maxLength={BIO_MAX_LENGTH}
            multiline
            numberOfLines={3}
            placeholder="Cuenta algo de ti"
            placeholderTextColor={colors.textoTenue}
            style={styles.areaTexto}
          />
          <Text style={styles.contador}>
            {bio.length} de {BIO_MAX_LENGTH}
          </Text>
        </View>

        <Field label="Carrera" value={career} onChangeText={setCareer} placeholder="Ingeniería en Sistemas" />
        <Field label="Escuela" value={school} onChangeText={setSchool} placeholder="TecNM" />
        <Field
          label="Edad"
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          placeholder="21"
        />
      </Card>

      <Card title="Quién puede ver tu perfil">
        {PROFILE_VISIBILITIES.map((opcion) => (
          <Pressable
            key={opcion}
            onPress={() => setVisibility(opcion)}
            style={[styles.opcion, visibility === opcion ? styles.opcionActiva : null]}
          >
            <Text style={styles.opcionTitulo}>
              {visibility === opcion ? '● ' : '○ '}
              {PROFILE_VISIBILITY_LABELS[opcion]}
            </Text>
            {/* El texto viene de `shared`: es palabra por palabra el mismo que la web. */}
            <Text style={styles.opcionTexto}>{PROFILE_VISIBILITY_HINTS[opcion]}</Text>
          </Pressable>
        ))}

        <FormError message={error} />

        <Button title="Guardar" onPress={() => void guardar()} loading={guardando} />
        {guardado ? <Text style={styles.exito}>Guardado</Text> : null}
      </Card>

      <Card title="Tu enlace y tu QR de perfil">
        <Text style={styles.textoSuave}>
          Compártelo para que te agreguen sin tener que buscarte.
        </Text>
        <Text style={styles.texto}>
          {profileCountsSummary(profile.contactCount, profile.postCount)}
        </Text>

        <View style={styles.qrCentro}>
          <QrCode value={profile.url} size={180} />
        </View>

        <Text style={styles.usuario}>@{profile.username}</Text>
        <Text style={styles.enlace}>{profile.url}</Text>

        <Button
          title={copiado ? 'Copiado' : 'Copiar enlace'}
          variant="secondary"
          onPress={() => {
            void Clipboard.setStringAsync(profile.url);
            setCopiado(true);
          }}
        />
      </Card>
    </View>
  );
}

/* ─────────────────────────── Buscador ─────────────────────────── */

function Buscador({
  onCambio,
  onAbrirPerfil,
}: {
  onCambio: () => Promise<void>;
  onAbrirPerfil: (username: string) => void;
}) {
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState<readonly UserSearchResult[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [escaneando, setEscaneando] = useState(false);

  const buscar = useCallback(
    async (entrada: string) => {
      setError(undefined);

      // Acepta @usuario, nombre pelado o un enlace de perfil completo —que es lo que devuelve
      // el escáner de QR—. Los tres caminos de FR-040 terminan en la misma búsqueda.
      const consulta = usernameFromProfileInput(entrada) ?? entrada.trim();

      if (consulta.length < 2) {
        setError('Escribe al menos 2 caracteres para buscar.');
        return;
      }

      setBuscando(true);
      try {
        setResultados(await socialApi.search(consulta));
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : 'No se pudo buscar.');
      } finally {
        setBuscando(false);
      }
    },
    [],
  );

  if (escaneando) {
    return (
      <QrScanner
        onCancelar={() => setEscaneando(false)}
        onLeido={(leido) => {
          setEscaneando(false);
          const username = usernameFromProfileInput(leido);
          if (username === null) {
            setError('Ese código no es de un perfil de NoteCore.');
            return;
          }
          // El QR lleva a la persona directamente, sin pasar por la lista de resultados.
          onAbrirPerfil(username);
        }}
      />
    );
  }

  return (
    <Card title="Buscar personas">
      <Text style={styles.textoSuave}>
        Busca por @usuario, pega un enlace de perfil o escanea un QR.
      </Text>

      <TextInput
        value={texto}
        onChangeText={setTexto}
        onSubmitEditing={() => void buscar(texto)}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="@usuario"
        placeholderTextColor={colors.textoTenue}
        style={styles.entrada}
      />

      <Button title="Buscar" onPress={() => void buscar(texto)} loading={buscando} />
      <Button title="Escanear QR" variant="secondary" onPress={() => setEscaneando(true)} />

      <FormError message={error} />

      {resultados === null ? null : resultados.length === 0 ? (
        <Text style={styles.textoSuave}>No encontramos a nadie con ese nombre.</Text>
      ) : (
        resultados.map((resultado) => (
          <FilaUsuario
            key={resultado.id}
            usuario={resultado}
            onCambio={onCambio}
            onAbrirPerfil={onAbrirPerfil}
          />
        ))
      )}
    </Card>
  );
}

function FilaUsuario({
  usuario,
  onCambio,
  onAbrirPerfil,
}: {
  usuario: UserSearchResult;
  onCambio: () => Promise<void>;
  onAbrirPerfil: (username: string) => void;
}) {
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function solicitar() {
    setError(undefined);
    try {
      await socialApi.requestContact({ username: usuario.username });
      setEnviado(true);
      await onCambio();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo enviar.');
    }
  }

  return (
    <View style={styles.fila}>
      <Pressable onPress={() => onAbrirPerfil(usuario.username)} hitSlop={4}>
        <Text style={styles.filaNombre}>{usuario.displayName}</Text>
        <Text style={styles.filaUsuario}>@{usuario.username}</Text>
      </Pressable>

      {error ? <Text style={styles.errorLinea}>{error}</Text> : null}

      {enviado || usuario.viewpoint === 'enviada' ? (
        <Text style={[styles.estado, { color: CONTACT_VIEWPOINT_COLORS.enviada }]}>
          Solicitud enviada
        </Text>
      ) : usuario.viewpoint === 'aceptada' ? (
        <Text style={[styles.estado, { color: CONTACT_VIEWPOINT_COLORS.aceptada }]}>
          Contacto
        </Text>
      ) : usuario.viewpoint === 'recibida' ? (
        <Text style={[styles.estado, { color: CONTACT_VIEWPOINT_COLORS.recibida }]}>
          Te envió una solicitud
        </Text>
      ) : (
        <Button title="Agregar" onPress={() => void solicitar()} />
      )}
    </View>
  );
}

/* ─────────────────────────── Contactos ─────────────────────────── */

function Contactos({
  listas,
  onCambio,
  onAbrirPerfil,
}: {
  listas: ContactLists | null;
  onCambio: () => Promise<void>;
  onAbrirPerfil: (username: string) => void;
}) {
  if (!listas) {
    return (
      <Card>
        <Text style={styles.texto}>Cargando…</Text>
      </Card>
    );
  }

  const secciones: readonly (readonly [string, readonly Contact[]])[] = [
    ['Solicitudes recibidas', listas.recibidas],
    ['Solicitudes enviadas', listas.enviadas],
    ['Tus contactos', listas.aceptados],
    ['Bloqueados', listas.bloqueados],
  ];

  const vacio = secciones.every(([, lista]) => lista.length === 0);

  if (vacio) {
    return (
      <Card title="Tus contactos">
        <Text style={styles.textoSuave}>
          Todavía no tienes contactos. Busca a alguien por su @usuario para agregarlo.
        </Text>
      </Card>
    );
  }

  return (
    <View style={styles.seccion}>
      {secciones.map(([titulo, lista]) =>
        lista.length === 0 ? null : (
          <Card key={titulo} title={`${titulo} (${lista.length})`}>
            {sortContacts(lista).map((contacto) => (
              <FilaContacto
                key={contacto.id}
                contacto={contacto}
                onCambio={onCambio}
                onAbrirPerfil={onAbrirPerfil}
              />
            ))}
          </Card>
        ),
      )}
    </View>
  );
}

function FilaContacto({
  contacto,
  onCambio,
  onAbrirPerfil,
}: {
  contacto: Contact;
  onCambio: () => Promise<void>;
  onAbrirPerfil: (username: string) => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function actuar(action: ContactActionName) {
    setOcupado(true);
    setError(undefined);
    try {
      await socialApi.actOnContact(contacto.id, { action });
      await onCambio();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo completar.');
    } finally {
      setOcupado(false);
    }
  }

  // Los botones salen de `actions`, decidido por el servidor (Principio II), igual que en web.
  const acciones: readonly (readonly [ContactActionName, string, 'primary' | 'secondary' | 'danger'])[] = [
    ...(contacto.actions.puedeAceptar ? ([['aceptar', 'Aceptar', 'primary']] as const) : []),
    ...(contacto.actions.puedeRechazar ? ([['rechazar', 'Rechazar', 'secondary']] as const) : []),
    ...(contacto.actions.puedeCancelar ? ([['cancelar', 'Cancelar', 'secondary']] as const) : []),
    ...(contacto.actions.puedeEliminar ? ([['eliminar', 'Eliminar', 'secondary']] as const) : []),
    ...(contacto.actions.puedeBloquear ? ([['bloquear', 'Bloquear', 'danger']] as const) : []),
    ...(contacto.actions.puedeDesbloquear
      ? ([['desbloquear', 'Desbloquear', 'secondary']] as const)
      : []),
  ];

  return (
    <View style={styles.fila}>
      <Pressable onPress={() => onAbrirPerfil(contacto.user.username)} hitSlop={4}>
        <Text style={styles.filaNombre}>{contacto.user.displayName}</Text>
        <Text style={styles.filaUsuario}>@{contacto.user.username}</Text>
      </Pressable>

      <Text style={[styles.estado, { color: CONTACT_VIEWPOINT_COLORS[contacto.viewpoint] }]}>
        {CONTACT_VIEWPOINT_LABELS[contacto.viewpoint]}
      </Text>

      {error ? <Text style={styles.errorLinea}>{error}</Text> : null}

      <View style={styles.acciones}>
        {acciones.map(([action, etiqueta, variant]) => (
          <View key={action} style={styles.accion}>
            <Button
              title={etiqueta}
              variant={variant}
              disabled={ocupado}
              onPress={() => void actuar(action)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

/* ─────────────────────────── Perfil ajeno ─────────────────────────── */

function PerfilAjeno({
  username,
  onVolver,
  onEscribirA,
}: {
  username: string;
  onVolver: () => void;
  onEscribirA: (username: string) => void;
}) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<readonly Post[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [noExiste, setNoExiste] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(undefined);

    try {
      setProfile(await socialApi.getUser(username));
      setPosts(await socialApi.getUserPosts(username));
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) setNoExiste(true);
      else setError(caught instanceof ApiError ? caught.message : 'No se pudo cargar el perfil.');
    } finally {
      setCargando(false);
    }
  }, [username]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function solicitar() {
    setOcupado(true);
    setError(undefined);
    try {
      await socialApi.requestContact({ username });
      await cargar();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo enviar la solicitud.');
    } finally {
      setOcupado(false);
    }
  }

  async function bloquearDirecto() {
    setOcupado(true);
    setError(undefined);
    try {
      await socialApi.blockUser({ username });
      await cargar();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo bloquear.');
    } finally {
      setOcupado(false);
    }
  }

  async function actuar(action: ContactActionName) {
    setOcupado(true);
    setError(undefined);
    try {
      const listas = await socialApi.listContacts();
      const todas = [
        ...listas.aceptados,
        ...listas.recibidas,
        ...listas.enviadas,
        ...listas.bloqueados,
      ];
      const relacion = todas.find((contacto) => contacto.user.username === username);

      if (!relacion) {
        setError('Esa relación ya no existe.');
        return;
      }

      await socialApi.actOnContact(relacion.id, { action });
      await cargar();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo completar.');
    } finally {
      setOcupado(false);
    }
  }

  if (cargando) {
    return (
      <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
        <Card>
          <Text style={styles.texto}>Cargando…</Text>
        </Card>
      </ScrollView>
    );
  }

  if (noExiste || !profile) {
    return (
      <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
        <Pressable onPress={onVolver} hitSlop={8}>
          <Text style={styles.volver}>← Volver</Text>
        </Pressable>
        <Card title="No encontramos a esa persona">
          <Text style={styles.texto}>Revisa que el @usuario esté bien escrito.</Text>
        </Card>
      </ScrollView>
    );
  }

  const resumen = profileSummary(profile);

  return (
    <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <Pressable onPress={onVolver} hitSlop={8}>
        <Text style={styles.volver}>← Volver a contactos</Text>
      </Pressable>

      <Card>
        <Text style={styles.titulo}>{profile.displayName}</Text>
        <Text style={styles.filaUsuario}>@{profile.username}</Text>
        <Text style={[styles.estado, { color: CONTACT_VIEWPOINT_COLORS[profile.viewpoint] }]}>
          {CONTACT_VIEWPOINT_LABELS[profile.viewpoint]}
        </Text>

        <FormError message={error} />

        {/*
          Escribir se ofrece **solo a los contactos aceptados** (FR-043, FR-044).

          Se decide con `areConnected` sobre el punto de vista que el servidor ya resolvió, no
          con una comprobación propia. Ofrecerlo ante quien no puede recibir mensajes llevaría
          a una pantalla que solo sabe explicar que no se puede escribir.
        */}
        {areConnected(profile.viewpoint) ? (
          <Button title="Enviar mensaje" onPress={() => onEscribirA(profile.username)} />
        ) : null}
        {profile.actions.puedeSolicitar ? (
          <Button title="Agregar a contactos" onPress={() => void solicitar()} disabled={ocupado} />
        ) : null}
        {profile.actions.puedeAceptar ? (
          <Button title="Aceptar solicitud" onPress={() => void actuar('aceptar')} disabled={ocupado} />
        ) : null}
        {profile.actions.puedeRechazar ? (
          <Button title="Rechazar" variant="secondary" onPress={() => void actuar('rechazar')} disabled={ocupado} />
        ) : null}
        {profile.actions.puedeCancelar ? (
          <Button title="Cancelar solicitud" variant="secondary" onPress={() => void actuar('cancelar')} disabled={ocupado} />
        ) : null}
        {profile.actions.puedeEliminar ? (
          <Button title="Eliminar contacto" variant="secondary" onPress={() => void actuar('eliminar')} disabled={ocupado} />
        ) : null}
        {profile.actions.puedeBloquear ? (
          <Button
            title="Bloquear"
            variant="danger"
            onPress={() =>
              void (profile.viewpoint === 'ninguna' ? bloquearDirecto() : actuar('bloquear'))
            }
            disabled={ocupado}
          />
        ) : null}
        {profile.actions.puedeDesbloquear ? (
          <Button title="Desbloquear" variant="secondary" onPress={() => void actuar('desbloquear')} disabled={ocupado} />
        ) : null}
      </Card>

      {profile.detailsVisible ? (
        <>
          <Card title="Sobre esta persona">
            {profile.bio ? <Text style={styles.texto}>{profile.bio}</Text> : null}
            {resumen ? <Text style={styles.textoSuave}>{resumen}</Text> : null}
            {!profile.bio && !resumen ? (
              <Text style={styles.textoSuave}>Todavía no llenó su perfil.</Text>
            ) : null}
            {profile.contactCount !== null && profile.postCount !== null ? (
              <Text style={styles.contador}>
                {profileCountsSummary(profile.contactCount, profile.postCount)}
              </Text>
            ) : null}
          </Card>

          <Card title={`Publicaciones (${posts.length})`}>
            {posts.length === 0 ? (
              <Text style={styles.textoSuave}>Todavía no ha publicado nada.</Text>
            ) : (
              posts.map((post) => (
                <View key={post.id} style={styles.publicacion}>
                  <Text style={styles.texto}>{post.text}</Text>
                  <Text style={styles.contador}>{relativeTime(post.createdAt)}</Text>
                </View>
              ))
            )}
          </Card>
        </>
      ) : (
        /* FR-045: se explica que es privado en lugar de pintarlo vacío. El texto sale de
           `shared`, así que es el mismo que muestra la web. */
        <Card title="Perfil privado">
          <Text style={styles.texto}>{profileHiddenMessage(profile.displayName)}</Text>
        </Card>
      )}
    </ScrollView>
  );
}

/* ─────────────────────────── Publicaciones ─────────────────────────── */

function Publicaciones({ onCambio }: { onCambio: () => Promise<void> }) {
  const [posts, setPosts] = useState<readonly Post[] | null>(null);
  const [texto, setTexto] = useState('');
  const [publicando, setPublicando] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const cargar = useCallback(async () => {
    try {
      setPosts(await socialApi.listPosts());
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'No se pudieron cargar tus publicaciones.',
      );
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function publicar() {
    if (texto.trim() === '') {
      setError('Escribe algo para publicar.');
      return;
    }

    setPublicando(true);
    setError(undefined);
    try {
      await socialApi.createPost({ text: texto });
      setTexto('');
      await cargar();
      await onCambio();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo publicar.');
    } finally {
      setPublicando(false);
    }
  }

  async function borrar(id: string) {
    try {
      await socialApi.deletePost(id);
      await cargar();
      await onCambio();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo borrar.');
    }
  }

  return (
    <View style={styles.seccion}>
      <Card title="Publicar algo">
        <TextInput
          value={texto}
          onChangeText={setTexto}
          maxLength={POST_MAX_LENGTH}
          multiline
          numberOfLines={3}
          placeholder="¿Qué quieres compartir?"
          placeholderTextColor={colors.textoTenue}
          style={styles.areaTexto}
        />
        <Text style={styles.contador}>
          {texto.length} de {POST_MAX_LENGTH}
        </Text>

        <FormError message={error} />

        <Button title="Publicar" onPress={() => void publicar()} loading={publicando} />
      </Card>

      {posts === null ? (
        <Card>
          <Text style={styles.texto}>Cargando…</Text>
        </Card>
      ) : posts.length === 0 ? (
        <Card>
          <Text style={styles.textoSuave}>Todavía no has publicado nada.</Text>
        </Card>
      ) : (
        <Card title={`Tus publicaciones (${posts.length})`}>
          {posts.map((post) => (
            <View key={post.id} style={styles.publicacion}>
              <Text style={styles.texto}>{post.text}</Text>
              <Text style={styles.contador}>{relativeTime(post.createdAt)}</Text>
              <Button title="Borrar" variant="secondary" onPress={() => void borrar(post.id)} />
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  contenido: { ...base.contenido, paddingTop: SPACE.md },
  volver: { color: c.tinta3, fontSize: TEXT.sm, fontFamily: fuente.cuerpo },
  titulo: { ...base.titulo },
  seccion: { gap: 16 },
  texto: { color: colors.texto, fontSize: TEXT.md, lineHeight: 21 },
  textoSuave: { color: colors.textoSuave, fontSize: TEXT.md, lineHeight: 20 },
  contador: { color: colors.textoTenue, fontSize: TEXT.sm },
  exito: { color: colors.exito, fontSize: TEXT.md },
  aviso: {
    backgroundColor: c.acentoTenue,
    borderColor: c.acento,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 12,
  },
  avisoTexto: { color: colors.acentoClaro, fontSize: TEXT.md },
  pestanas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pestana: {
    backgroundColor: colors.borde,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pestanaActiva: { backgroundColor: colors.acento },
  pestanaTexto: { color: colors.textoSuave, fontSize: TEXT.md, fontWeight: '500' },
  pestanaTextoActivo: { color: colors.textoFuerte },
  campo: { gap: 6 },
  etiqueta: { color: colors.texto, fontSize: TEXT.md, fontWeight: '500' },
  areaTexto: {
    backgroundColor: colors.fondo,
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textoFuerte,
    fontSize: TEXT.md,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  entrada: {
    backgroundColor: colors.fondo,
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textoFuerte,
    fontSize: TEXT.md,
  },
  opcion: {
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 4,
  },
  opcionActiva: { borderColor: colors.acento, backgroundColor: c.acentoTenue },
  opcionTitulo: { color: colors.textoFuerte, fontSize: TEXT.md, fontWeight: '600' },
  opcionTexto: { color: colors.textoSuave, fontSize: TEXT.sm, lineHeight: 18 },
  qrCentro: { alignItems: 'center' },
  usuario: { color: colors.textoFuerte, fontSize: TEXT.lg, fontWeight: '600' },
  enlace: { color: colors.textoSuave, fontSize: TEXT.sm },
  fila: {
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 8,
  },
  filaNombre: { color: colors.textoFuerte, fontSize: TEXT.md, fontWeight: '600' },
  filaUsuario: { color: colors.textoSuave, fontSize: TEXT.md },
  estado: { fontSize: TEXT.sm, fontWeight: '500' },
  errorLinea: { color: colors.error, fontSize: TEXT.sm },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  accion: { flexGrow: 1, flexBasis: '45%' },
  publicacion: {
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 8,
  },
});
