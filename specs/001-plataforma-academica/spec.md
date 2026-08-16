# Feature Specification: Plataforma Académica Multiplataforma

**Feature Directory**: `specs/001-plataforma-academica`

**Created**: 2026-08-16

**Status**: Draft

**Input**: Reconstrucción completa de NoteCore como plataforma multiusuario con app Android
(principal) y web (PC/móvil): horario visual, control de faltas, agenda de tareas, compartición por
QR/código/enlace, gestión de semestres, notificaciones, offline y sección social con perfiles y
mensajería.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capturar el horario de clases (Priority: P1)

Un estudiante que empieza el semestre necesita ver su horario de forma visual. Puede capturarlo de
dos maneras: pegando el JSON que una IA generó a partir de una foto de su horario (usando un prompt
que la propia aplicación le proporciona), o creando cada materia y sesión a mano. Una vez cargado,
ve su semana completa con las materias por día y hora.

**Why this priority**: Es la razón de existir del producto y la precondición de todo lo demás —sin
horario no hay faltas, ni agenda vinculada a materias, ni compartición.

**Independent Test**: Se prueba capturando un horario por ambos métodos y verificando que la vista
semanal lo refleja correctamente en app y web. Entrega valor completo por sí sola.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado sin materias, **When** pega un JSON válido de horario generado
   por IA, **Then** el sistema crea las materias con sus sesiones y muestra la semana completa.
2. **Given** un usuario autenticado, **When** crea una materia manualmente y le añade sesiones
   (día, hora inicio, hora fin, aula), **Then** la materia aparece en la vista semanal en los
   bloques correspondientes.
3. **Given** un JSON con formato inválido o incompleto, **When** el usuario intenta importarlo,
   **Then** el sistema explica qué está mal sin descartar lo que el usuario ya tenía capturado.
4. **Given** un horario ya capturado, **When** el usuario edita o elimina una materia o sesión,
   **Then** los cambios se reflejan de inmediato en ambas plataformas.

---

### User Story 2 - Llevar el conteo de faltas (Priority: P1)

Un estudiante que faltó a clase registra su inasistencia: elige el día, indica si faltó al día
completo o selecciona las materias/horas específicas a las que no asistió. La aplicación lleva el
conteo por materia y le avisa cuando se acerca a su límite de faltas.

**Why this priority**: Es la funcionalidad que originó el proyecto y el problema más doloroso que
resuelve: perder una materia por acumular faltas sin darse cuenta.

**Independent Test**: Se prueba registrando faltas sobre un horario existente y verificando el
conteo, el porcentaje y la alerta al aproximarse al límite.

**Acceptance Scenarios**:

1. **Given** un horario capturado, **When** el usuario marca una falta eligiendo día y materia,
   **Then** el conteo de esa materia aumenta y se refleja en sus estadísticas.
2. **Given** un día con varias materias, **When** el usuario indica que faltó al día completo,
   **Then** se registra una falta en cada materia que tenía sesión ese día.
3. **Given** una materia con faltas acumuladas cerca del límite, **When** el usuario consulta sus
   faltas, **Then** ve una alerta destacada indicando su proximidad al límite.
4. **Given** una materia recién creada, **When** el usuario consulta su límite de faltas, **Then**
   ve un valor sugerido calculado como el 20% de sus sesiones totales del semestre, acompañado de
   la recomendación explícita de confirmarlo con su profesor.
5. **Given** un límite sugerido, **When** el usuario lo modifica manualmente, **Then** el sistema
   usa el valor del usuario para todas las alertas de esa materia.
6. **Given** una falta registrada, **When** el usuario la marca como justificada o la elimina,
   **Then** el conteo se recalcula.

---

### User Story 3 - Agenda de tareas y actividades (Priority: P1)

Durante una clase, el profesor deja una tarea. El estudiante la anota en la agenda desde su
teléfono: la asocia a la materia, le pone título, descripción y una fecha límite opcional. También
puede registrar actividades que no pertenecen a ninguna materia, como una salida con compañeros.
Todo es editable después.

**Why this priority**: Es la ampliación principal que el usuario pidió y transforma el producto de
"consulta de horario" a "herramienta de organización académica".

**Independent Test**: Se prueba creando actividades con y sin materia asociada, con y sin fecha
límite, y editándolas posteriormente.

**Acceptance Scenarios**:

1. **Given** un usuario en cualquier pantalla, **When** crea una actividad indicando materia,
   título y fecha límite, **Then** la actividad queda registrada y visible en su agenda.
2. **Given** una actividad sin fecha límite, **When** el usuario la guarda, **Then** el sistema la
   acepta y la muestra como actividad sin vencimiento.
3. **Given** una actividad existente, **When** el usuario edita cualquier campo (título, notas,
   fecha límite, materia), **Then** los cambios se guardan y se propagan a ambas plataformas.
4. **Given** una actividad completada, **When** el usuario la marca como hecha, **Then** deja de
   aparecer entre las pendientes sin borrarse del historial.
5. **Given** una actividad no asociada a materia alguna, **When** el usuario la crea, **Then** el
   sistema la acepta como actividad general.

---

### User Story 4 - Vista de calendario (Priority: P2)

El estudiante consulta un calendario donde ve, junto al horario de clases, las fechas límite de sus
tareas y actividades. Al tocar un día ve el detalle completo de lo que tiene ese día.

**Why this priority**: Es la vista que integra horario y agenda en una sola lectura; depende de que
ambos existan.

**Independent Test**: Se prueba navegando el calendario con horario y actividades cargadas,
verificando que ambos aparecen y que el detalle por día es correcto.

**Acceptance Scenarios**:

1. **Given** horario y actividades cargados, **When** el usuario abre el calendario, **Then** ve
   los días marcados según las clases y los vencimientos que contienen.
2. **Given** un día con contenido, **When** el usuario lo selecciona, **Then** ve el detalle de
   clases y actividades de ese día.
3. **Given** un mes sin actividades, **When** el usuario lo consulta, **Then** ve únicamente su
   horario de clases recurrente.

---

### User Story 5 - Recordatorios y notificaciones (Priority: P2)

El estudiante activa un recordatorio sobre una actividad de su agenda y recibe una notificación en
su teléfono antes del vencimiento, para no olvidar entregar.

**Why this priority**: Convierte la agenda de registro pasivo en herramienta que actúa. Es un
diferenciador claro de la app frente a la web.

**Independent Test**: Se prueba programando un recordatorio y verificando que la notificación llega
en el momento configurado.

**Acceptance Scenarios**:

1. **Given** una actividad con fecha límite, **When** el usuario activa un recordatorio y elige
   con cuánta anticipación, **Then** el sistema programa la notificación.
2. **Given** un recordatorio programado, **When** llega el momento configurado, **Then** el usuario
   recibe la notificación en su dispositivo.
3. **Given** una actividad con recordatorio, **When** el usuario cambia su fecha límite, **Then**
   el recordatorio se reprograma en consecuencia.
4. **Given** una actividad con recordatorio, **When** el usuario la marca como completada o cancela
   el recordatorio, **Then** la notificación no se emite.

---

### User Story 6 - Compartir horario y actividades (Priority: P2)

Dos compañeros llevan las mismas clases. Uno ya capturó el horario y se lo comparte al otro
mediante un código QR, un código corto o un enlace. El receptor elige aceptarlo y obtiene su propia
copia, que puede editar libremente sin afectar al emisor. Lo mismo aplica para actividades de la
agenda.

**Why this priority**: Elimina el trabajo de captura repetido entre compañeros, que es la principal
fricción de adopción del producto.

**Independent Test**: Se prueba compartiendo desde una cuenta y aceptando desde otra, verificando
que la copia es independiente y que editar una no altera la otra.

**Acceptance Scenarios**:

1. **Given** un horario capturado, **When** el emisor elige qué materias compartir y genera el
   compartido, **Then** el sistema produce un código QR, un código corto y un enlace equivalentes.
2. **Given** un compartido generado, **When** otro usuario lo escanea o lo abre, **Then** ve una
   vista previa de lo que recibirá antes de aceptar.
3. **Given** una vista previa aceptada, **When** el receptor confirma, **Then** el contenido se
   copia a su cuenta como material propio y editable.
4. **Given** un contenido ya copiado, **When** el emisor modifica su versión original, **Then** la
   copia del receptor permanece sin cambios.
5. **Given** un compartido, **When** ha caducado o fue revocado por el emisor, **Then** el receptor
   recibe un mensaje claro y no obtiene los datos.

---

### User Story 7 - Gestión de semestres (Priority: P2)

Al terminar el semestre, el estudiante inicia uno nuevo desde la configuración. El semestre anterior
queda archivado con todo su contenido —horario, agenda y faltas— y sigue siendo consultable en
cualquier momento. El semestre nuevo empieza limpio.

**Why this priority**: Sin esto, la aplicación solo sirve un semestre y luego obliga a borrar o a
convivir con datos obsoletos.

**Independent Test**: Se prueba cerrando un semestre con datos, verificando que el nuevo arranca
vacío y que el anterior sigue consultable íntegro.

**Acceptance Scenarios**:

1. **Given** un semestre activo con datos, **When** el usuario inicia un semestre nuevo, **Then**
   el anterior se archiva completo y el nuevo queda activo y vacío.
2. **Given** semestres archivados, **When** el usuario los consulta, **Then** ve su horario,
   agenda y estadísticas de faltas tal como quedaron.
3. **Given** un semestre archivado, **When** el usuario lo consulta, **Then** el sistema deja claro
   que es histórico y no permite alterarlo por accidente.
4. **Given** el proceso de cierre de semestre, **When** el usuario lo inicia, **Then** el sistema
   explica exactamente qué sucederá antes de pedir confirmación.

---

### User Story 8 - Perfil y contactos (Priority: P3)

El estudiante tiene un perfil con nombre mostrado y nombre de usuario único. Puede buscar
compañeros por su nombre de usuario, o agregarlos escaneando el QR de su perfil o abriendo su
enlace. Ambas partes confirman la conexión.

**Why this priority**: Es la base de la sección social y simplifica la compartición entre contactos
ya conocidos, pero el producto entrega valor completo sin ella.

**Independent Test**: Se prueba creando dos cuentas, buscándose por nombre de usuario y por QR, y
completando la conexión.

**Acceptance Scenarios**:

1. **Given** un usuario registrado, **When** define su nombre de usuario, **Then** el sistema
   verifica que sea único y lo asocia a su perfil.
2. **Given** dos usuarios, **When** uno busca al otro por su nombre de usuario, **Then** encuentra
   su perfil público y puede enviarle una solicitud.
3. **Given** una solicitud recibida, **When** el destinatario la acepta, **Then** ambos quedan
   conectados como contactos.
4. **Given** un perfil, **When** el usuario comparte su QR o enlace y otro lo abre, **Then** el
   segundo llega directamente a la vista de ese perfil con la opción de agregarlo.
5. **Given** un contacto existente, **When** el usuario decide eliminarlo o bloquearlo, **Then** la
   conexión se rompe y cesa la visibilidad mutua.

---

### User Story 9 - Mensajería entre contactos (Priority: P3)

Los estudiantes conectados pueden conversar dentro de la aplicación para coordinarse sobre clases y
tareas.

**Why this priority**: Es la funcionalidad más costosa y la que más superficie de privacidad y
moderación abre; el producto es plenamente útil sin ella. Se aborda al final, sobre una base ya
estable.

**Independent Test**: Se prueba intercambiando mensajes entre dos cuentas conectadas y verificando
entrega y persistencia.

**Acceptance Scenarios**:

1. **Given** dos usuarios conectados como contactos, **When** uno envía un mensaje, **Then** el
   otro lo recibe y queda registrado en la conversación.
2. **Given** una conversación existente, **When** el usuario la abre, **Then** ve el historial de
   mensajes ordenado cronológicamente.
3. **Given** un usuario que no es contacto, **When** intenta iniciar una conversación, **Then** el
   sistema lo impide.
4. **Given** un usuario bloqueado, **When** intenta enviar un mensaje, **Then** el mensaje no se
   entrega.

---

### User Story 10 - Consulta sin conexión (Priority: P2)

El estudiante abre la aplicación dentro de la universidad, donde la señal es intermitente, y aun así
consulta su horario, su agenda y sus faltas.

**Why this priority**: El momento de uso más frecuente ocurre justamente donde la conectividad
falla. Una aplicación que no abre sin señal no cumple su propósito.

**Independent Test**: Se prueba cargando datos con conexión, desactivándola y verificando que la
consulta sigue funcionando.

**Acceptance Scenarios**:

1. **Given** datos ya consultados con conexión, **When** el usuario abre la app sin red, **Then**
   ve su horario, agenda y faltas.
2. **Given** ausencia de red, **When** el usuario registra una falta o crea una actividad, **Then**
   el cambio se guarda localmente y se sincroniza al recuperar la conexión.
3. **Given** cambios pendientes de sincronizar, **When** el usuario consulta la aplicación,
   **Then** ve con claridad qué está pendiente de subir.

---

### User Story 11 - Widget de pantalla principal (Priority: P4)

El estudiante coloca un widget en la pantalla de su teléfono que le muestra su semana y si tiene
actividades próximas. Al tocarlo entra directo al detalle.

**Why this priority**: Comodidad valiosa pero prescindible; el usuario la clasificó explícitamente
como opcional. Se aborda al final y no condiciona decisiones previas.

**Independent Test**: Se prueba añadiendo el widget y verificando que refleja los datos reales y
que abre la vista correspondiente.

**Acceptance Scenarios**:

1. **Given** la app instalada con datos, **When** el usuario añade el widget, **Then** este muestra
   la vista de la semana con indicación de días con actividades.
2. **Given** el widget colocado, **When** el usuario lo toca, **Then** la aplicación abre la vista
   detallada correspondiente.
3. **Given** cambios en horario o agenda, **When** el widget se actualiza, **Then** refleja la
   información vigente.

---

## Requirements *(mandatory)*

### Functional Requirements

**Cuentas y sesión**

- **FR-001**: El sistema MUST permitir registro e inicio de sesión con cuenta propia.
- **FR-002**: El sistema MUST permitir que una misma cuenta esté activa simultáneamente en la app
  y en la web sin que una sesión invalide la otra.
- **FR-003**: El sistema MUST aislar los datos de cada usuario, sin exponerlos a terceros salvo por
  compartición explícita del propietario.
- **FR-004**: El sistema MUST permitir a cada usuario un nombre mostrado y un nombre de usuario
  único.

**Horario**

- **FR-005**: El sistema MUST permitir crear, editar y eliminar materias y sus sesiones (día, hora
  de inicio, hora de fin, aula).
- **FR-006**: El sistema MUST proporcionar al usuario el texto del prompt destinado a una IA
  externa para convertir la imagen de un horario en el formato estructurado que la aplicación
  importa.
- **FR-007**: El sistema MUST permitir importar un horario completo desde ese formato estructurado.
- **FR-008**: El sistema MUST validar el contenido importado e informar con precisión qué elementos
  son inválidos, sin destruir los datos existentes del usuario ante un fallo.
- **FR-009**: El sistema MUST mostrar el horario en una vista semanal.
- **FR-010**: El sistema MUST distinguir visualmente cada materia.

**Faltas**

- **FR-011**: El sistema MUST permitir registrar una inasistencia seleccionando la fecha y, dentro
  de ella, el día completo o materias/sesiones concretas.
- **FR-012**: El sistema MUST llevar el conteo de faltas por materia y por semestre.
- **FR-013**: El sistema MUST calcular un límite de faltas sugerido equivalente al 20% de las
  sesiones totales de la materia en el semestre, derivado de la norma de 80% de asistencia mínima.
- **FR-014**: El sistema MUST presentar ese límite como sugerencia y mostrar de forma visible la
  recomendación de confirmarlo con el profesor.
- **FR-015**: El sistema MUST permitir al usuario modificar el límite de faltas de cada materia.
- **FR-016**: El sistema MUST alertar al usuario cuando se aproxime al límite de una materia.
- **FR-017**: El sistema MUST permitir marcar faltas como justificadas y eliminarlas, recalculando
  el conteo.

**Agenda**

- **FR-018**: El sistema MUST permitir crear actividades con título, descripción, materia asociada
  opcional y fecha límite opcional.
- **FR-019**: El sistema MUST permitir editar todos los campos de una actividad tras su creación.
- **FR-020**: El sistema MUST permitir marcar actividades como completadas conservando su registro.
- **FR-021**: El sistema MUST permitir eliminar actividades mediante acción explícita del usuario.
- **FR-022**: El sistema MUST mostrar las actividades pendientes ordenadas por proximidad de
  vencimiento.

**Calendario y recordatorios**

- **FR-023**: El sistema MUST ofrecer una vista de calendario que combine clases y vencimientos.
- **FR-024**: El sistema MUST permitir consultar el detalle de un día concreto.
- **FR-025**: El sistema MUST permitir activar recordatorios sobre actividades con anticipación
  configurable.
- **FR-026**: El sistema MUST emitir notificaciones en el dispositivo del usuario al cumplirse el
  momento programado.
- **FR-027**: El sistema MUST reprogramar o cancelar los recordatorios cuando la actividad cambia
  de fecha, se completa o se elimina.

**Compartir**

- **FR-028**: El sistema MUST permitir compartir horario y actividades mediante código QR, código
  corto y enlace, ofreciendo las tres modalidades.
- **FR-029**: El sistema MUST permitir al emisor seleccionar qué contenido incluye antes de generar
  el compartido.
- **FR-030**: El sistema MUST mostrar al receptor una vista previa del contenido antes de aceptar.
- **FR-031**: El sistema MUST entregar al receptor una copia independiente y editable, sin vínculo
  posterior con el original.
- **FR-032**: El sistema MUST garantizar que las tres modalidades entreguen exactamente el mismo
  contenido.
- **FR-033**: El sistema MUST permitir al emisor revocar un compartido y MUST informar al receptor
  cuando esté revocado o caducado.

**Semestres**

- **FR-034**: El sistema MUST permitir iniciar un semestre nuevo desde la configuración.
- **FR-035**: El sistema MUST archivar el semestre anterior íntegro —horario, agenda, faltas y
  estadísticas— al iniciar uno nuevo.
- **FR-036**: El sistema MUST mantener los semestres archivados consultables de forma indefinida.
- **FR-037**: El sistema MUST proteger los semestres archivados frente a modificaciones
  accidentales.
- **FR-038**: El sistema MUST explicar el efecto de cerrar un semestre antes de pedir confirmación.

**Social**

- **FR-039**: El sistema MUST permitir buscar usuarios por nombre de usuario.
- **FR-040**: El sistema MUST permitir agregar contactos por búsqueda, por QR de perfil y por
  enlace de perfil.
- **FR-041**: El sistema MUST requerir aceptación del destinatario para establecer una conexión.
- **FR-042**: El sistema MUST permitir eliminar y bloquear contactos.
- **FR-043**: El sistema MUST permitir intercambiar mensajes entre usuarios conectados.
- **FR-044**: El sistema MUST impedir la mensajería entre usuarios no conectados o bloqueados.
- **FR-045**: El sistema MUST limitar el perfil visible a terceros a la información que el usuario
  destina a ser pública.

**Disponibilidad y plataformas**

- **FR-046**: El sistema MUST ofrecer las mismas funcionalidades en app Android y en web, salvo las
  que dependen intrínsecamente de capacidades del dispositivo.
- **FR-047**: La web MUST ser usable en pantalla de escritorio y de móvil.
- **FR-048**: La app MUST permitir consultar sin conexión la información previamente cargada.
- **FR-049**: La app MUST encolar los cambios hechos sin conexión y sincronizarlos al recuperar
  red.
- **FR-050**: El sistema MUST indicar al usuario qué cambios están pendientes de sincronizar.
- **FR-051**: La app MUST poder ofrecer un widget de pantalla principal con la vista semanal.

### Key Entities

- **Usuario**: persona con cuenta propia. Nombre mostrado, nombre de usuario único, credenciales y
  preferencias. Propietario de todo su contenido académico.
- **Semestre**: periodo académico que agrupa el horario, la agenda y las faltas de un usuario.
  Puede estar activo o archivado.
- **Materia**: asignatura dentro de un semestre. Nombre, identificador visual y límite de faltas
  propio.
- **Sesión de horario**: bloque recurrente de una materia. Día de la semana, hora de inicio, hora
  de fin y aula.
- **Registro de falta**: inasistencia de un usuario a una sesión en una fecha concreta. Puede estar
  justificada y admite notas.
- **Actividad de agenda**: tarea, proyecto o evento. Título, descripción, materia asociada
  opcional, fecha límite opcional y estado de completado.
- **Recordatorio**: aviso programado asociado a una actividad, con su anticipación configurada.
- **Compartido**: paquete de contenido publicado por un usuario para ser copiado por otros.
  Contiene lo seleccionado por el emisor y tiene estado de vigencia.
- **Contacto**: relación aceptada entre dos usuarios.
- **Mensaje**: comunicación enviada entre usuarios conectados.

## Success Criteria *(mandatory)*

- **SC-001**: Un estudiante captura su horario completo mediante importación asistida por IA en
  menos de 3 minutos desde que abre la aplicación.
- **SC-002**: Un estudiante registra una falta en menos de 15 segundos desde la pantalla principal.
- **SC-003**: Un estudiante anota una tarea durante la clase en menos de 30 segundos.
- **SC-004**: Un estudiante que recibe un horario compartido lo incorpora a su cuenta en menos de
  1 minuto desde que escanea el código.
- **SC-005**: El 100% de las funcionalidades no dependientes del dispositivo están disponibles y
  verificadas tanto en la app como en la web antes de cerrar cada fase.
- **SC-006**: La aplicación muestra horario, agenda y faltas sin conexión en el 100% de los casos
  en que esos datos ya fueron consultados con conexión.
- **SC-007**: Los recordatorios activados se entregan dentro del minuto posterior al momento
  programado.
- **SC-008**: Un semestre archivado conserva el 100% de su horario, agenda y registros de faltas y
  permanece consultable tras iniciar semestres posteriores.
- **SC-009**: Ningún usuario accede a datos de otro usuario salvo por compartición explícita:
  cero incidencias de fuga entre cuentas.
- **SC-010**: Una copia recibida por compartición permanece inalterada cuando el emisor edita su
  versión original, en el 100% de los casos.
- **SC-011**: El límite de faltas sugerido va acompañado de la recomendación de confirmar con el
  profesor en el 100% de las pantallas donde se presenta.

## Assumptions

- **A-001**: La conversión de la imagen del horario a formato estructurado la realiza el estudiante
  en una herramienta de IA externa; la aplicación proporciona el prompt y consume el resultado. No
  se integra ningún servicio de IA dentro del producto.
- **A-002**: El límite de faltas por defecto se deriva de la norma TecNM de 80% de asistencia
  mínima —por debajo de la cual el profesor registra NP— aplicada como 20% de las sesiones totales
  del semestre. La duración del semestre en semanas es un parámetro ajustable por el usuario.
- **A-003**: Los semestres se archivan pero nunca se eliminan automáticamente; el crecimiento de
  datos históricos por usuario es acotado (unos pocos semestres por año).
- **A-004**: iOS queda fuera de alcance. Los usuarios de iPhone utilizan la web, que debe ser
  plenamente funcional en navegador móvil.
- **A-005**: La distribución inicial de la app es por archivo `.apk` de instalación directa; la
  publicación en tiendas es un objetivo posterior sin fecha.
- **A-006**: El horario se organiza por sesiones semanales recurrentes de lunes a sábado. Eventos
  académicos no recurrentes se registran como actividades de agenda, no como sesiones de horario.
- **A-007**: La mensajería es texto entre contactos; no incluye archivos adjuntos, llamadas ni
  grupos en esta especificación.
- **A-008**: El contenido compartido se copia en el momento de la aceptación; no existe
  sincronización posterior entre emisor y receptor por decisión de diseño.

## Dependencies

- **D-001**: Los recordatorios dependen del permiso de notificaciones concedido por el usuario en
  su dispositivo.
- **D-002**: La compartición y el agregado de contactos por QR dependen del permiso de cámara.
- **D-003**: La importación de horario depende de que el estudiante tenga acceso a una herramienta
  de IA externa para procesar la imagen.
- **D-004**: El widget depende de las capacidades de la plataforma Android del dispositivo.

## Out of Scope

- Aplicación nativa para iOS.
- Integración directa con sistemas escolares oficiales para obtener horarios o calificaciones.
- Registro de calificaciones y cálculo de promedios.
- Toma de asistencia por parte de profesores; el registro de faltas es autorreportado por el
  estudiante.
- Mensajería grupal, envío de archivos y llamadas.
- Sincronización bidireccional continua de contenido compartido.
