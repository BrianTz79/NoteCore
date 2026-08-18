# NoteCore — Estado del Proyecto

> **Documento vivo.** Se actualiza al cerrar cada fase.
> Última actualización: **2026-08-17** (Fase 10 cerrada)

---

## 🚀 Para empezar una conversación nueva

> **Lee esta sección primero si acabas de abrir una conversación.**

Este proyecto avanza **una fase por conversación**. Para continuar:

1. Lee este documento completo (estado, fases, decisiones)
2. Lee la especificación y el plan enlazados en la [sección 5](#5-documentos-de-referencia)
3. Ejecuta `/speckit-tasks` para desglosar la fase en tareas, o continúa directamente si la
   fase ya tiene tareas definidas
4. Al terminar: actualiza este documento y haz commit

**Frase de arranque sugerida**: _"Continúa con la Fase N"_

**Reglas que no se negocian** (detalle en la [constitución](.specify/memory/constitution.md)):
- Una fase no se cierra hasta verificarse **en app Android Y en web**
- Toda la lógica de negocio vive en la API, nunca duplicada en los clientes
- Ningún usuario puede ver datos de otro
- Commit al cerrar cada fase, con `Co-Authored-By` y el usuario como autor
- **Nunca subir `.env` ni `_respaldo_v1_*/`** al repositorio

---

## 1. Reporte Resumen

| | |
|---|---|
| **Estado general** | Horario, faltas, agenda, calendario con recordatorios, compartición por QR/código/enlace, ciclo de semestres con archivo histórico, sección social —perfil ampliado, contactos y publicaciones—, consulta sin conexión con cola de cambios y **mensajería entre contactos con entrega en tiempo real**, funcionando en app y web |
| **Fases completadas** | 10 de 12 |
| **Fase actual** | Fase 11 — Widget y pulido visual (no iniciada) |
| **Bloqueos** | Ninguno |
| **Repositorio** | https://github.com/BrianTz79/NoteCore |

**Avance**: `██████████░░` 83%

> **Nota de entorno**: compilar el APK exige un **JDK 21**. Durante esta fase solo estaba el JRE y
> hubo que instalarlo (`sudo apt install openjdk-21-jdk-headless`). Si Gradle sigue diciendo que el
> *toolchain* no tiene `JAVA_COMPILER` después de instalarlo, es el **demonio en caché**: `./gradlew
> --stop` y volver a compilar.

### Qué se ha hecho

- **Constitución** con 8 principios rectores del proyecto
- **Especificación**: 11 historias de usuario, 51 requisitos funcionales, 11 criterios de éxito
- **Plan** de 12 fases verticales
- **Repositorio Git** inicializado, con secretos protegidos y verificados
- **v1 eliminada**: contenedores, volumen de base de datos y código retirados. Queda un respaldo
  local fuera del repositorio
- **Fase 0 cerrada**: monorepo con las cuatro capas compilando en TypeScript estricto, PostgreSQL
  con migraciones versionadas, API respondiendo y bundle de Android generado
- **Fase 1 cerrada**: registro, login y perfil con `@usuario` único; sesión simultánea en app y
  web verificada sobre un emulador Android real y un navegador real; aislamiento de datos
  comprobado con cuentas cruzadas
- **Fase 2 cerrada**: materias y sesiones con alta manual e importación desde el JSON de una IA,
  con vista previa antes de escribir; vista semanal idéntica en app y web, verificada con el
  mismo horario en emulador Android y navegador a la vez
- **Fase 3 cerrada**: registro de faltas por sesión o día completo, conteo por materia con
  límite sugerido editable y alerta de proximidad; verificada marcando en la web y leyendo en el
  emulador Android, y al revés
- **Fase 4 cerrada**: agenda de tareas, proyectos y exámenes con materia y fecha límite
  opcionales, ordenada por proximidad de vencimiento; verificada creando en la web y leyendo en
  el emulador Android, y al revés
- **Fase 5 cerrada**: calendario mensual que combina clases y vencimientos, detalle por día, y
  recordatorios con anticipación y hora configurables; la notificación local se verificó
  programada en el sistema Android y cancelándose al completar la actividad desde la web
- **Fase 6 cerrada**: compartición de horario y actividades por QR, código corto y enlace, con
  selección del contenido, vista previa antes de aceptar y copia independiente; el QR se genera
  con un codificador propio en `shared` y se verificó **decodificando la pantalla real del
  emulador**; la independencia de la copia se comprobó editando y borrando el original mientras
  el receptor mantenía la suya intacta
- **Fase 7 cerrada**: ciclo de semestres con archivo histórico. El semestre es el **ámbito** de lo
  académico, no una copia: cerrar uno no borra ni duplica una sola fila, solo cambia su estado y
  lo deja en solo lectura. Verificada cerrando desde el **emulador Android** y leyendo el archivo
  desde el navegador, con las materias, faltas y actividades intactas en la base de datos

- **Fase 8 cerrada**: perfil público ampliado —biografía, carrera, escuela y edad, todo opcional—
  con un ajuste de visibilidad que decide quién lo ve; búsqueda por `@usuario`; solicitudes de
  contacto con aceptación, rechazo, eliminación y bloqueo; enlace y QR de perfil; y publicaciones
  de texto. Lo que la visibilidad no alcanza **no se manda**: se comprobó que la biografía de un
  perfil restringido no aparece **ni en el HTML de la web ni en la jerarquía de vistas de Android**

- **Fase 9 cerrada**: consulta sin conexión del horario, la agenda y las faltas, cola de cambios
  hechos sin red y sincronización automática al recuperarla. El identificador lo **genera el
  cliente**, que es lo que hace la creación idempotente: reenviar una petición cuya respuesta se
  perdió no duplica la actividad. Se verificó el ciclo entero en el emulador —crear sin API,
  reiniciar la app, y ver la fila aparecer en PostgreSQL al volver la conexión—

- **Fase 10 cerrada**: mensajería entre contactos aceptados, con entrega **en tiempo real** por
  WebSocket y la restricción de FR-044 aplicada en cada envío. Poder escribir no se guarda en
  ninguna columna: **es el estado de la relación**, consultado a `contacts` en el momento, y por
  eso bloquear surte efecto en el acto sobre una pantalla ya abierta. Se verificó en el emulador
  Android con la conversación abierta: el mensaje escrito desde fuera **apareció solo**, el acuse
  pasó a «Leído» solo, y al bloquear **el campo de texto desapareció solo** dejando en su sitio
  «Solo puedes escribir a tus contactos.» —la palabra «bloqueo» no aparece en ninguna parte de la
  jerarquía de vistas de Android, porque a quien bloquean no se le dice—

### Próximo paso

**Fase 11 — Widget y pulido visual**: widget de pantalla principal con la vista semanal (FR-051) y
pasada de diseño integral con **hallmark** sobre el producto ya funcional. Es la última fase del
plan: cierra el producto en lugar de añadirle superficie.

---

## 2. Fases

**Leyenda**: ✅ Hecha · 🔄 En curso · 🔍 En revisión · ⬜ Pendiente · ⏸️ Bloqueada

| # | Fase | Prio | Estado | API | Web | App |
|---|------|------|--------|-----|-----|-----|
| 0 | Cimientos | — | ✅ | ✅ | ✅ | ✅ |
| 1 | Cuentas y sesión | P1 | ✅ | ✅ | ✅ | ✅ |
| 2 | Horario | P1 | ✅ | ✅ | ✅ | ✅ |
| 3 | Control de faltas | P1 | ✅ | ✅ | ✅ | ✅ |
| 4 | Agenda | P1 | ✅ | ✅ | ✅ | ✅ |
| 5 | Calendario y recordatorios | P2 | ✅ | ✅ | ✅ | ✅ |
| 6 | Compartir | P2 | ✅ | ✅ | ✅ | ✅ |
| 7 | Semestres | P2 | ✅ | ✅ | ✅ | ✅ |
| 8 | Social: perfiles y contactos | P3 | ✅ | ✅ | ✅ | ✅ |
| 9 | Offline y sincronización | P2 | ✅ | ✅ | ✅ | ✅ |
| 10 | Mensajería | P3 | ✅ | ✅ | ✅ | ✅ |
| 11 | Widget y pulido visual | P4 | ⬜ | ⬜ | ⬜ | ⬜ |

### Regla de cierre

Una fase se cierra cuando funciona **en app y en web**. Al cerrarla:
1. Marcar ✅ en esta tabla
2. Registrar la fecha y la verificación en el historial de abajo
3. Actualizar el reporte resumen
4. Hacer commit: `feat(faseN): descripción`

### Historial de cierres

#### Fase 10 — Mensajería · cerrada el 2026-08-17

**Entregado**: conversaciones de texto entre contactos aceptados, con entrega en tiempo real
(FR-043); y la imposibilidad de escribirse entre quienes no son contactos o hay un bloqueo de por
medio (FR-044). Con acuse de leído, conteo de no leídos, paginación del hilo y borrado de mensajes
propios.

**Poder escribir no es un dato: es el estado de una relación.** La decisión que gobierna la fase.
No existe ninguna columna `permitida` en `conversations`; FR-044 se resuelve preguntando a
`contacts` —la tabla de la Fase 8— **en cada envío**, con la misma `messagingBlockedReason` que los
clientes usan para decidir si pintan el campo de texto. Guardar una copia de ese estado habría
significado que un bloqueo puesto hace un segundo no surtiera efecto hasta que algo refrescara esa
copia, y eso es exactamente el momento en que el requisito importa. Es también lo que hizo la fase
mucho más barata de lo previsto: FR-044 cuelga entero de `contactViewpoint`, que la Fase 8 ya había
dejado resuelto —y por escrito, anotado como «la pregunta de la que cuelga FR-044 en la Fase 10»—.

**La conversación es un solo hecho, con el par ordenado.** Igual que la relación de la Fase 8, y
con el mismo `orderedPair`: sin él, dos personas escribiéndose por primera vez en el mismo instante
crearían dos hilos —uno en cada orden— que ningún índice único podría rechazar, y cada una vería la
mitad de lo dicho.

**Decisiones de diseño**:

| Decisión | Por qué |
|---|---|
| **No se guarda si se puede escribir**: se pregunta a `contacts` en cada envío | Una copia del estado de contacto quedaría vieja en cuanto alguien bloqueara, y el bloqueo dejaría de surtir efecto justo cuando más importa |
| A quien **fue bloqueado** se le responde `no_contacto`, lo mismo que a un desconocido | Distinguirlo le diría que lo bloquearon, que es lo que empuja a buscar otra vía para insistir. Es la regla de la Fase 8, y aquí pesa más que en ninguna otra pantalla |
| **Tiempo real por WebSocket**, con el protocolo tipado en `shared` | Un canal WebSocket no tiene rutas ni códigos de estado que obliguen a ponerse de acuerdo: sin un tipo común, el servidor emitiría `{tipo:'mensaje'}` y un cliente esperaría `{type:'message'}` **sin que nada fallara al compilar** |
| El token del canal viaja en un **frame**, no en la query de la URL | El handshake del navegador no admite cabeceras. Una URL acaba en los registros del servidor, en el historial y en cualquier proxy; un frame no. La web ni siquiera lo manda: su cookie `httpOnly` viaja sola en el handshake |
| El canal se da por vivo con el evento **`listo`**, no con el `onopen` | Entre abrir el socket y verificar la sesión hay un hueco en el que el servidor todavía puede cerrarlo por token inválido. Darlo por bueno antes dejaría el indicador diciendo «en vivo» justo antes de caerse |
| El canal **acelera**, no es la fuente | Todo se lee por HTTP primero y lo del canal se mezcla encima. Un canal que fuera la única vía convertiría cualquier corte en mensajes que no aparecen nunca |
| Los mensajes se **mezclan por identificador**, no se añaden | Hay dos caminos para el mismo mensaje —la respuesta del envío y el aviso del canal, que emite también al autor— y sin deduplicar el usuario vería el suyo dos veces |
| Leer se guarda como **una marca por lado**, no una columna por mensaje | Leer es siempre «hasta aquí»: abrir un hilo de mil mensajes pasa de ser una escritura de mil filas a una de una |
| El acuse solo viaja en los mensajes **propios** | De los ajenos, quien leyó es uno mismo, y el momento en que uno lee su propio hilo no es información para nadie |
| Cambiar de relación **avisa por el canal**, con una versión por lado | Sin ese aviso, quien tuviera el hilo abierto seguiría viendo el campo de texto tras el bloqueo y se enteraría al fallar el envío. A quien bloquea le llega `bloqueada_por_mi`; al bloqueado, `no_contacto` |
| El identificador del mensaje lo puede **proponer el cliente** | La mecánica de la Fase 9: reenviar un mensaje cuya respuesta se perdió encuentra el que ya existe. Un mensaje duplicado en un hilo es de los errores más visibles que hay |
| Borrar **deja el hueco** y vacía el texto | Un hilo del que desaparecen renglones se lee mal —las respuestas quedan colgando de nada— y quien ya lo leyó no puede desleerlo. Lo que el autor retiró sí deja de estar guardado |
| Las conversaciones con **ex contactos siguen listadas**, cerradas | Eliminar un contacto no debe borrar de la vista lo que dos personas se dijeron: eso es historial, y no le toca destruirlo a una operación de rutina |
| La conversación **no se crea al abrirla**, solo al enviar | Escribir una fila por mirar dejaría un hilo vacío por cada visita a un perfil |
| Se pagina por **cursor**, no por número de página | El hilo crece por abajo mientras se lee: «la página 2» significa cosas distintas entre una petición y la siguiente, y se repetirían o se saltarían mensajes |
| Se pide **uno más** de los que caben, para responder `hasMore` | Una página exactamente llena y el final del hilo son indistinguibles desde fuera, y el cliente pintaría «cargar anteriores» sobre un hilo entero |
| Cerrar sesión **corta los canales** de esa cuenta | El canal verifica la sesión una sola vez, en el handshake, y no vuelve a comprobarla: sin esto seguiría entregando conversación privada a un dispositivo del que el usuario acaba de salir |
| `en_vivo` **no dice nada** en el indicador | Una etiqueta permanente de «conectado» es ruido que se deja de leer, y entonces tampoco se lee el aviso que sí importa. Misma decisión que el indicador de la Fase 9 |

**El límite conocido, dicho claro**: el registro de canales vive **en el proceso**. Con dos
instancias de la API detrás de un balanceador, un usuario conectado a una no recibiría lo que
publica la otra. La salida es un canal externo (`LISTEN/NOTIFY` de PostgreSQL, que ya está en el
proyecto, o Redis). No se hizo porque el despliegue es **una sola instancia** detrás de un túnel de
Cloudflare, y coordinar entre procesos antes de tener dos procesos sería infraestructura sin uso.
Queda anotado en `services/live.ts`, que es donde se buscará: `publish` es el único punto que
cambiaría, y su firma no.

**Verificación ejecutada** — 191 comprobaciones automáticas, todas en verde, más la pasada a mano
en Android:

| Suite | Qué prueba | Resultado |
|---|---|---|
| Lógica compartida (Node) | La **tabla de FR-044 entera**, recorriendo `CONTACT_VIEWPOINTS` en lugar de una lista escrita a mano —si algún día se añade un punto de vista, la prueba falla en vez de ignorarlo—; que a quien bloquean se le dé el **mismo motivo y el mismo texto** que a un desconocido; deduplicado de mensajes por los dos caminos; acuse por fecha; agrupado; un **barrido de 900 combinaciones** de conteos exigiendo que ninguna diga «1 mensajes»; espera creciente con su tope y su jitter; y validación de **todos** los eventos del canal, incluidos los malformados | **60/60** |
| API (`fetch` contra la API real) | Envío entre contactos; rechazo a desconocidos, a solicitudes pendientes y a bloqueados, **cada uno con su motivo**; que al bloqueado se le diga `no_contacto`; reenvío idempotente que no duplica; **secuestro del identificador de otra cuenta rechazado**; aislamiento de hilos entre tres cuentas; acuse; borrado con el texto **comprobado vacío en PostgreSQL**; paginación por cursor sin solapes; y que eliminar un contacto conserve el hilo | **82/82** |
| Canal en vivo (WebSockets reales) | Autenticación por frame, y que un token inválido o ausente **no reciba `listo`**; entrega en **6 ms**; que una tercera cuenta con el canal abierto **no reciba nada** de una conversación ajena; que el autor reciba lo suyo para mantener sus otras sesiones; acuse y borrado en vivo; el bloqueo llegando a **los dos lados con su propia versión**; y el canal cerrándose al cerrar sesión | **23/23** |
| Web (Playwright, dos navegadores reales) | Dos personas de verdad con su sesión: el mensaje de una **aparece en la pantalla de la otra en 33 ms sin recargar**; acuse que pasa a «Leído»; y el bloqueo haciendo **desaparecer solo** el campo de texto de quien fue bloqueada, con un texto que **no menciona el bloqueo** y es byte a byte el de `shared`. Sin un solo error de JavaScript | **26/26** |

Además se reejecutó una **regresión de las fases 1 a 9** (**40/40**), porque esta fase tocó
`services/auth.ts` —cerrar sesión ahora corta canales—, `services/social.ts` —las cuatro
operaciones de relación avisan a la mensajería—, `lib/errors.ts`, `types/api.ts` y `app.ts`.

**Verificación en Android real** (emulador Pixel, Android 15, APK de release instalado):

| Comprobación | Resultado |
|---|---|
| Aviso en el inicio | «Tienes **1 mensaje sin leer**» —singular correcto— |
| Bandeja | la conversación, con la vista previa del último mensaje y la insignia «1» |
| Hilo | los dos mensajes, con «Enviado» **solo** en el propio |
| **Mensaje escrito desde fuera, con el hilo abierto** | **apareció solo**, sin tocar el teléfono |
| **Enviar desde el teléfono** | llegó al servidor y se leyó desde el otro lado |
| **Acuse en vivo** | pasó de «Enviado» a «**Leído**» solo, al leer el otro |
| **Bloqueo en vivo (FR-044)** | el campo de texto y el botón **desaparecieron solos** |
| Lo que se le dice a la bloqueada | «Solo puedes escribir a tus contactos.» |
| **La palabra «bloqueo» en la jerarquía de vistas** | **no aparece**: 0 coincidencias |
| El historial tras el bloqueo | **intacto**: sigue viendo lo que se dijeron |
| Paridad de textos con la web | **idénticos palabra por palabra**, los dos salen de `shared` |
| Permisos del APK | **sin cambios** respecto a la Fase 9: ni almacenamiento ni micrófono |
| Paridad bidireccional | **confirmada** |

**Migración**: `0009_clean_mephisto.sql`, dos tablas nuevas —`conversations` y `messages`— con el
índice único sobre el par ordenado y el índice del hilo por conversación y fecha, que es del que
cuelga la paginación. **Ninguna tabla existente se tocó.**

**Dependencia nueva**: `@fastify/websocket` en la API, la única de la fase. Los clientes usan el
`WebSocket` global —React Native trae el suyo y todo navegador tiene el estándar—, así que **la app
no añade ningún módulo nativo** y no hizo falta reejecutar `expo prebuild`.

**Nota de verificación**: el emulador se arrancó con `-no-window` (esta sesión no tiene display) y
la API se alcanzó con `adb reverse tcp:3101`. Un detalle del guionaje, no del producto: el teclado
de Android se superpone al botón de enviar sin desplazar el diseño, así que automatizar el envío
exige cerrarlo antes con `input keyevent 111` (ESC) —`keyevent 4` (atrás) también lo cierra, pero
además saca de la app—.

---

#### Fase 9 — Offline y sincronización · cerrada el 2026-08-17

**Entregado**: consulta sin conexión de lo previamente cargado —horario, agenda y faltas—
(FR-048); cola de las escrituras hechas sin red, sincronizada sola al recuperarla (FR-049); e
indicador de qué está pendiente de subir, con su detalle (FR-050).

**El identificador lo genera el cliente.** La decisión que gobierna la fase, y de la que cuelga
todo lo demás. Una actividad creada en modo avión necesita identidad **antes** de que el servidor
sepa de ella: sin eso, completarla o borrarla acto seguido no tendría a qué referirse, y habría
que reescribir la cola entera cuando la creación subiera —que es exactamente donde las colas se
corrompen—. Con el identificador puesto en el teléfono, la creación es además **idempotente**:
reenviarla tras perder la respuesta encuentra la fila que ya se escribió en vez de crear una
segunda. Es el caso real de la señal que cae a mitad de la petición.

**Las faltas no lo necesitaron**: `markAbsences` ya era idempotente desde la Fase 3 —las faltas
ya marcadas se omiten en lugar de duplicarse—, así que la pareja fecha + sesión las identifica sin
ayuda. Se comprobó antes de añadir nada.

**Decisiones de diseño**:

| Decisión | Por qué |
|---|---|
| El **identificador lo genera el cliente**, y el servidor lo acepta | Es lo que da identidad a lo creado sin red y lo que hace la creación reintentable. `onConflictDoNothing` sobre el identificador convierte el reenvío en una lectura de lo ya escrito |
| Antes de insertar se comprueba que el identificador **no sea de otra cuenta** | Sin esa comprobación, reenviar un identificador ajeno no escribiría nada —el conflicto lo absorbe— pero la lectura posterior devolvería la actividad de esa persona. El Principio III se rompería por una ruta que ni siquiera escribe |
| El alcance de la escritura offline es **agenda y faltas** | Es lo que se hace dentro del aula, que es donde falla la señal. Capturar el horario es una sesión larga que se hace una vez y en casa, y su validación de solapes solo la conoce el servidor: un bloque aceptado en local podría rechazarse al subir, y habría que explicar ese conflicto |
| El horario **se consulta** sin conexión aunque no se edite | "¿En qué aula toca ahora?" es la pregunta más frecuente dentro del edificio |
| La **cola se pliega** antes de enviar | Marcar y desmarcar una tarea cinco veces sin red mandaría cinco peticiones que se pisan. Crear+editar viaja como una sola creación con el valor final, y **lo creado y borrado sin conexión no se manda**: pedirle al servidor que cree una fila para borrarla acto seguido no tiene sentido |
| Conflicto y fallo de red **se distinguen por el código HTTP** | Un 4xx es una respuesta deliberada que daría lo mismo al reintentar: necesita al usuario. Un 0 o un 5xx se arreglan solos. Confundirlos tiene las dos consecuencias malas: reintentar un conflicto para siempre, o pedirle al usuario que resuelva algo que se habría resuelto solo |
| El 401 se reintenta pese a ser 4xx | `ApiClient` renueva el token y reintenta; si llega aquí, lo que toca es volver a entrar, no resolver un conflicto |
| Un fallo de red **corta la pasada** | Lo que viene detrás fallaría igual; seguir solo sumaría intentos. Lo pendiente se conserva **en orden** |
| La conexión se detecta **intentando**, no preguntando al sistema | El wifi del campus con portal cautivo dice que hay red mientras ninguna petición llega. La única señal honesta de "hay servidor" es haber hablado con él |
| Lo nuevo se encola **sin intentarlo** si ya hay cola | Mandarlo directo lo adelantaría a lo que espera desde antes, y completar una actividad cuya creación sigue en la cola llegaría antes que la actividad misma —404 y conflicto sobre algo que estaba bien— |
| El cache y la cola llevan el **usuario en la clave** | Es el Principio III aplicado al dispositivo, donde no hay ningún `WHERE` que lo garantice: sin eso, cerrar sesión y entrar con otra cuenta enseñaría el horario del anterior mientras no hubiera red para refrescarlo |
| Cerrar sesión borra el cache pero **no la cola** | Los cambios sin subir no son del dispositivo, son de la cuenta: se suben cuando esa cuenta vuelva a entrar |
| El indicador **se esconde** cuando no hay nada que decir | Una barra permanente de "todo bien" es ruido que se deja de leer, y entonces tampoco se lee el aviso que sí importa |
| La lista de pendientes dice **qué** está pendiente, no solo cuántos | "3 cambios" no distingue la falta de hoy de la tarea de ayer. La etiqueta se guarda al encolar porque la entidad de un borrado ya no está para derivarla |
| La **web cachea pero no encola** | La constitución le pide offline "en la medida que la plataforma lo permita" y FR-049 habla de la app. Encolar en el navegador exige un *service worker* con su ciclo de vida —caché vieja servida tras un despliegue es el fallo clásico— a cambio de una capacidad que el teléfono ya cubre mejor |
| El **almacenamiento es el sistema de archivos**, no `SecureStore` | Sus entradas están limitadas a 2048 bytes en Android y un horario completo los pasa. Además, el cifrado por hardware no aporta nada aquí: esto es material que el usuario ya tiene delante, no credenciales. Los tokens siguen en `SecureStore` |
| `expo-file-system` en vez de `AsyncStorage` | Ya viene con el SDK de Expo que la app usa, así que la fase **no añade ningún módulo nativo nuevo** |

**Verificación ejecutada** — 107 comprobaciones automáticas, todas en verde, más la pasada a mano
en Android:

| Suite | Qué prueba | Resultado |
|---|---|---|
| Lógica compartida (Node) | Identificadores válidos para el esquema del servidor —20 000 sin repetir, y **generándolos sin `crypto`, como en React Native**—, plegado de la cola con sus tres reglas y un **barrido aleatorio de 300 rondas** exigiendo que no invente ni duplique entidades, idempotencia del plegado, conflicto contra reintento en todos los códigos, y los textos del indicador **en todas las combinaciones** de estado exigiendo que ninguno diga "1 cambios" | **39/39** |
| Motor de sincronización (Node) | Cache con su fecha, aislamiento entre cuentas en el mismo dispositivo, cola que sobrevive al reinicio, plegado antes de enviar, fallo de red que conserva el orden, conflicto que deja de reintentarse, descarte y reintento manual, **dos sincronizaciones a la vez compartiendo una sola pasada**, el **punto muerto de "sin conexión" que impedía volver a probar la red**, y el indicador que deja de decir "subiendo" al terminar | **25/25** |
| API (`fetch` contra la API real) | Creación con identificador propuesto, **reenvío que no duplica**, reenvío que no pisa lo editado entre medias, alta sin identificador como antes de la fase, **secuestro del identificador de otra cuenta rechazado**, marcado doble de la misma falta sin duplicar, y rutas protegidas | **11/11** |
| Web (Playwright, navegador real) | Captura con conexión, **reconstrucción de agenda, horario y faltas desde el cache con la API interceptada**, aviso de antigüedad, texto del indicador **idéntico al de la app**, aislamiento del cache entre dos cuentas en el mismo navegador, olvido del perfil al cerrar sesión y ausencia de errores de JavaScript | **13/13** |

Además se reejecutó una **regresión de las fases 1 a 8** (**19/19**), porque esta fase tocó
`services/agenda.ts`, `logic/agenda.ts` y el esquema de alta, comunes a fases anteriores. Incluye
una comprobación nueva que exige que `rebuildAgendaList` —el orden que la app aplica sin conexión—
produzca **exactamente el mismo reparto y orden que el servidor**: es lo que garantiza que la lista
no se vea distinta según haya red o no.

**Verificación en Android real** (emulador Pixel 6, Android 15, APK de release instalado):

| Comprobación | Resultado |
|---|---|
| Agenda con conexión | carga y queda cacheada |
| **Crear una actividad con la API caída** | "Tarea sin red" aparece **al instante** en pendientes |
| **Reiniciar la app sin conexión** | la actividad **sigue ahí**: el cache sobrevivió al disco |
| La sesión **no se cierra** sin red | sigue dentro; antes echaba al usuario a la pantalla de entrada |
| Indicador sin nada pendiente (FR-050) | "Sin conexión · todo guardado" |
| Antigüedad de lo cacheado (FR-048) | "Actualizado hace 1 minuto" |
| Indicador con un cambio en cola | "Sin conexión · **1 cambio por subir**" —singular correcto— |
| Tarjeta del inicio (FR-050) | "Cambios sin subir · **1 actividad por subir**" |
| **Detalle de la cola** (FR-050) | "Segunda sin red · **Actividad creada**" y "Se subirán solos cuando vuelva la conexión." |
| **Sincronización al recuperar la red** | "Subiendo cambios…" sin que el usuario toque nada |
| **Las tres actividades creadas sin red, en PostgreSQL** | `Tarea sin red`, `Segunda sin red` y `Ciclo completo` |
| El indicador desaparece al terminar | correcto: sin nada que decir, no ocupa sitio |
| Textos del indicador | **palabra por palabra idénticos a los de la web** |
| Permisos del APK instalado | **sin `READ_EXTERNAL_STORAGE` ni `WRITE_EXTERNAL_STORAGE`**, y `RECORD_AUDIO` sigue ausente |
| Paridad bidireccional | **confirmada** |

**Corregido durante la fase** — cinco fallos, y **cuatro solo se veían en el APK de release**:

1. **`crypto.getRandomValues` no existe en React Native.** El más grave: el identificador se
   generaba antes de encolar nada, así que crear una actividad sin conexión lanzaba en la primera
   línea y la app respondía "Ocurrió un error inesperado" —justo la funcionalidad que la fase
   entrega—. No aparecía en Node ni en el navegador, donde `crypto` sí está, así que ninguna suite
   lo cubría. Ahora hay respaldo con `Math.random()`, aceptable **solo aquí** porque estos
   identificadores no protegen nada —lo contrario que el código de un compartido (Fase 6), que es
   la credencial—, y una prueba que **borra `crypto` del entorno** para reproducir Hermes.
2. **La sesión se cerraba al abrir sin conexión.** `authApi.me()` fallando por red se trataba
   igual que un 401, así que el usuario acababa en la pantalla de entrada y no podía consultar
   nada de lo guardado. Estaba en **los dos clientes** desde la Fase 1, pero solo importaba ahora.
   Se recuerda el perfil —nombre e identificador, **nunca credenciales**— para poder abrir sin red.
3. **Punto muerto: marcado "sin conexión", el motor no volvía a probar la red.** Al fallar una
   escritura se marcaba sin conexión, y como se negaba a enviar mientras lo estuviera, nada volvía
   a tocar la red: la cola se quedaba con "1 cambio por subir" para siempre aunque la conexión
   hubiera vuelto. El intento **es** la comprobación.
4. **El indicador se quedaba en "Subiendo cambios…" para siempre.** El último aviso de la pasada
   se emitía todavía dentro de ella, cuando `syncing` seguía activo, y la interfaz se quedaba con
   ese valor pese a tener la cola vacía.
5. **Bucle de peticiones: siete lecturas idénticas por pantalla.** Informar de si la API respondió
   cambiaba el estado, que recreaba la función de carga, que disparaba el efecto, que volvía a
   leer. Agotaba el límite del servidor y se leía como un fallo de la funcionalidad. Las acciones
   viven ahora en un contexto **estable**, separado del estado.

**Sobre el límite de peticiones**: se subió de 300 a 3000 por minuto **fuera de producción**. Las
suites abren varias cuentas y recorren las pantallas en segundos, y lo agotaban a mitad; en
producción sigue en 300, que es lo que protege el login.

**Migración**: **ninguna**. La fase no toca el esquema: el identificador propuesto usa la columna
`id` que ya existía, y el cache y la cola viven en el dispositivo.

**Nota de verificación**: el emulador se arrancó con `-no-window` (esta sesión no tiene display) y
la API se alcanzó con `adb reverse tcp:3101` —quitarlo y volver a ponerlo es justo cómo se simuló
la pérdida y la recuperación de la conexión—. **Sí se reejecutó `expo prebuild`**, porque
`expo-file-system` es un módulo nativo; ya venía con el SDK de Expo, así que no se añadió ninguna
dependencia nativa nueva al proyecto. Los permisos de almacenamiento que ese módulo declara por
defecto se quitan con un plugin propio (`with-sin-permisos-de-almacenamiento.js`): el cache vive en
el directorio privado de la app, que no exige ninguno.

---

#### Fase 8 — Social: perfiles y contactos · cerrada el 2026-08-17

**Entregado**: búsqueda de usuarios por `@usuario` (FR-039); alta de contactos por búsqueda, por
QR de perfil y por enlace (FR-040); solicitudes que **exigen aceptación** del destinatario
(FR-041); eliminación y bloqueo (FR-042); y perfil visible por terceros limitado a lo que el
usuario destina a ser público (FR-045).

**Ampliación pedida por el usuario**: el perfil no se quedó en el `PublicUser` mínimo que la Fase
1 previó. A petición explícita, es un perfil de red social —biografía, carrera, escuela y edad,
**todo opcional**— con **publicaciones** en el muro. Se acordó dejar las publicaciones **en texto**
y llevar las fotos y vídeos a una fase propia: los adjuntos exigen almacenamiento de archivos,
límites de tamaño y tipo, servido y moderación, que es infraestructura que el proyecto no tiene y
que ningún FR cubre todavía. La tabla `posts` queda lista para colgarlos sin rehacer lo escrito.

**Una relación entre dos personas es una sola fila.** La decisión que gobierna la fase. No hay
"mi contacto contigo" y "tu contacto conmigo" como filas espejo: hay una fila con un estado, que
cada uno ve desde su lado. Guardarla dos veces es cómo se llega a que uno la tenga aceptada y el
otro pendiente, y entonces *¿son contactos?* —la pregunta de la que cuelga FR-044 en la Fase 10—
deja de tener respuesta.

Para que sea **una sola**, el par va **ordenado**: `user_a_id` guarda siempre el identificador
menor. Así la relación entre A y B ocupa la misma fila se mire desde donde se mire, y el índice
único puede impedir la segunda. Sin el orden, dos personas que se agregan a la vez —el caso real
de escanearse el QR mutuamente— crearían las filas (A,B) y (B,A), que ningún índice vería como
duplicadas.

**Decisiones de diseño**:

| Decisión | Por qué |
|---|---|
| Una **sola fila por pareja**, con el par ordenado | Es lo que hace que la relación tenga un estado y no dos. El orden lo impone además un `CHECK` en la base de datos, no solo `orderedPair`: mientras la regla viviera solo en el código, un `insert` futuro que la olvidara crearía la fila espejo y el índice único no la rechazaría |
| El **bloqueo es un estado de la relación**, no una tabla aparte | Con una tabla de bloqueos separada, cada lectura tendría que consultar dos sitios y reconciliarlos, y FR-044 —"¿pueden hablar?"— necesita responderse desde un solo lugar |
| Se guarda **quién bloqueó** (`blocked_by_id`) | El bloqueo es asimétrico en lo que se cuenta: a quien bloqueó hay que ofrecerle desbloquear; a quien fue bloqueado **no se le dice nada**. Sin esta columna no se puede escribir ninguno de los dos mensajes |
| Al bloqueado se le trata como a un desconocido, **nunca se le avisa** | Ver "te bloquearon" convierte el bloqueo en un mensaje dirigido justo a la persona de la que uno se quiere separar. Su etiqueta es idéntica a la de "no es tu contacto", y **ni siquiera se le ofrece bloquear**: ese botón, por descarte, delataría el bloqueo |
| El perfil de un bloqueado responde **200 con el perfil cerrado**, no 404 | Un "no existe" para una cuenta que sí existe se nota en cuanto se compara con otra sesión, y confirmaría el bloqueo a quien no se le cuenta |
| **Desbloquear no restaura la amistad** | Decisión del usuario. Quien desbloquea para poder buscar a alguien no está pidiendo volver a ser su contacto; resucitar una conexión cortada a propósito sorprendería en el peor momento. Volver a agregar cuesta un toque |
| Lo que la visibilidad no alcanza **no se manda**, en vez de mandarse oculto | Es la diferencia entre proteger un dato y disimularlo: si viajara para que el cliente lo escondiera, bastaría abrir las herramientas del navegador. Se comprobó en el navegador real que la biografía **no aparece en el HTML** de un perfil restringido |
| La visibilidad arranca en **"solo contactos"** | Publicar algo y descubrir después que era público no tiene arreglo —lo visto, visto está—, mientras que abrirlo cuando uno quiere es un toque. El valor prudente es el que se pone por defecto, y así FR-045 se cumple sin que el usuario configure nada |
| El nombre y el `@usuario` **se ven siempre** | Son lo que FR-039 hace buscable; esconderlos haría imposible reconocer a quién se está mirando, y la búsqueda dejaría de servir |
| El enlace de perfil lleva el **`@usuario`**, no un código aleatorio | Al revés que un compartido (Fase 6). Allí el código es la **credencial** que protege un contenido; aquí el `@usuario` ya es público por FR-039, así que un código aleatorio no añadiría protección —quien tenga el enlace puede buscar el usuario igual— y sí quitaría lo único bueno de este enlace: que se puede dictar |
| Las **acciones las decide el servidor** y viajan en `actions` | Los clientes pintan botones a partir de lo mismo que la API comprueba. Derivarlos en cada cliente serían dos implementaciones de la misma regla, y la discrepancia se vería como un botón que existe en la pantalla y falla al tocarlo |
| Agregar a quien ya te agregó **acepta**, no crea una segunda solicitud | Dos personas que se agregan a la vez es el caso real, y dejarlas con dos solicitudes cruzadas pendientes sería absurdo: ambas quieren lo mismo |
| Rechazar, cancelar y eliminar **borran la fila** | No es historial que el Principio VI proteja: una solicitud rechazada es justo una relación que dejó de existir. Conservarla impediría además volver a solicitar, porque el índice único lo rechazaría. Lo que el principio protege es lo académico |
| Las publicaciones **no llevan `semesterId`** | Una publicación es de la persona, no del periodo que cursa: cerrar un semestre no debe archivarlas ni esconderlas, al contrario que las materias o las faltas |
| Los bloqueados **desaparecen de la búsqueda** en ambos sentidos | Un bloqueo que dejara a la persona saliendo en cada búsqueda sería una etiqueta, no una separación |
| **Sin `expo-router` todavía**, y era la fase que lo había reservado | El enlace de perfil lo abre **la web**, que sí tiene rutas —igual que pasó en la Fase 6—. En el teléfono el perfil ajeno se alcanza escaneando el QR o tocando un resultado, y ambos abren un panel dentro de la pantalla social. Lo que sí lo justificaría es un **enlace profundo del sistema** (`notecore://u/ana` desde WhatsApp), que exige registrar un esquema en el manifiesto y un `prebuild`, y que ninguna fase ha pedido |

**Verificación ejecutada** — 312 comprobaciones automáticas, todas en verde, más la pasada a mano
en Android:

| Suite | Qué prueba | Resultado |
|---|---|---|
| Lógica compartida (Node) | Par ordenado —incluidos 200 pares aleatorios exigiendo estabilidad—, punto de vista desde los dos lados, acciones por estado sin combinaciones contradictorias, **barrido exhaustivo de visibilidad × punto de vista exigiendo que ningún bloqueo deje ver nada**, enlace de perfil con ida y vuelta, textos con singular y plural, tiempo relativo sin números negativos, orden de listas y los esquemas | **106/106** |
| API (`fetch` contra la API real) | Rutas protegidas, perfil y edición parcial sin borrar lo demás, búsqueda, solicitud y aceptación, solicitudes cruzadas, **visibilidad que no manda los campos ocultos**, publicaciones y su visibilidad, bloqueo y desbloqueo, eliminación y rechazo, aislamiento entre cuentas y validación | **139/139** |
| Concurrencia (5 rondas) | Dos personas agregándose **en el mismo instante**, exigiendo una sola relación y el mismo estado en ambos lados | **20/20** |
| Web (Playwright, navegador real) | Rutas protegidas, perfil y persistencia, publicaciones, **el HTML de un perfil privado sin la biografía, la carrera, la escuela ni las publicaciones**, búsqueda por nombre y por enlace pegado, solicitud y aceptación, el contacto viendo ya el perfil, cambio de visibilidad, bloqueo con sus dos lados, desbloqueo sin restaurar y ausencia de errores de JavaScript | **47/47** |

Además se reejecutó una **regresión de las fases 1 a 7** (**60/60**), porque esta fase tocó
`services/auth.ts` y `lib/errors.ts`, que son comunes a todas las rutas.

**Corregido durante la fase**:

1. **Dos solicitudes simultáneas respondían 500.** Lo destapó la suite de concurrencia: la relación
   nunca se duplicaba —el índice único hacía su trabajo—, pero quien perdía la carrera recibía
   "ocurrió un error inesperado" en vez de su relación. El `catch` comprobaba `error.code === '23505'`
   y **Drizzle envuelve el error del driver** en un `DrizzleQueryError` propio, así que ese `code`
   venía `undefined` y el `23505` quedaba un nivel más abajo, en `cause`.
2. **El mismo fallo estaba en el registro desde la Fase 1.** Al corregir lo anterior se comprobó la
   ruta equivalente: dos registros simultáneos con el mismo `@usuario` respondían **500** en lugar
   de "ese nombre ya está tomado", porque `isUniqueViolation` de `services/auth.ts` miraba solo el
   nivel superior del error. Estaba ahí desde la Fase 1 y ninguna suite lo cubría, porque solo
   aparece en una carrera real. La comprobación vive ahora en `lib/errors.ts`, mira también en
   `cause`, y la usan las dos rutas.

**Migración**: `0008` crea `contacts` y `posts` y añade a `users` los cinco campos del perfil. Es
**puramente aditiva** —las columnas nuevas son nulables o traen valor por defecto—, así que al
revés que la de la Fase 7 no necesita relleno y no pudo romper ninguna fila existente. Se aplicó
sobre la base real con **170 cuentas**: ninguna perdió nada y las 170 quedaron con la visibilidad
en `contactos`, que es el valor prudente.

Se añadieron **a mano tres `CHECK`** que el generador no puede expresar y sin los cuales el índice
único no garantiza lo que dice: que el par vaya siempre ordenado —sin él, la fila espejo entraría
sin que nada la rechazara—, que nadie se agregue a sí mismo, y que quien pide o bloquea sea una de
las dos partes. **Se comprobaron los cinco casos contra PostgreSQL**: par desordenado, relación
consigo mismo, solicitante ajeno a la pareja y pareja duplicada se rechazan; el par ordenado
válido entra.

**Verificación en Android real** (emulador Pixel 6, Android 15, APK de release instalado):

| Comprobación | Resultado |
|---|---|
| Tarjeta "Perfil y contactos" en el inicio | correcto |
| Aviso de solicitudes pendientes (FR-041) | "Tienes **1 solicitud de contacto** esperando respuesta" —singular correcto— |
| Perfil ampliado cargado de la API | biografía, carrera, escuela y edad, con su contador "41 de 300" |
| Textos de visibilidad (FR-045) | los dos, **palabra por palabra idénticos a los de la web** |
| Visibilidad por defecto | "Solo mis contactos" marcada |
| Resumen de conteos | "0 contactos · 2 publicaciones" —plurales correctos— |
| **El QR de la pantalla real, decodificado** | la captura del emulador devuelve `http://localhost:3000/u/anadroid` |
| Búsqueda por `@usuario` (FR-039) | encuentra a la persona; a un contacto le muestra "Contacto" en vez de "Agregar" |
| Solicitud recibida | ofrece **Aceptar / Rechazar / Bloquear**, y **no** "Cancelar" —que es del emisor— |
| Aceptar (FR-041) | pasa a "Tus contactos (1)", estado "Contacto", acciones Eliminar/Bloquear, y el aviso desaparece |
| Solicitud enviada desde el perfil (FR-040) | "Solicitud enviada" con "Cancelar solicitud" |
| **Perfil restringido visto por una extraña (FR-045)** | solo nombre y `@usuario`, más "**Ana Android solo comparte su perfil con sus contactos**" |
| **Nada privado llega al dispositivo** | biografía, carrera, escuela y las dos publicaciones **ausentes de la jerarquía de vistas**, no solo ocultas |
| Una solicitud pendiente **no** abre el perfil | sigue privado mientras no se acepte |
| El mismo perfil, ya como contacto | biografía, "Ingenieria en Sistemas · TecNM Morelia · 21 años", "2 contactos · 2 publicaciones" y las dos publicaciones con "Hace 8 minutos" |
| Bloquear (FR-042) | pasa a "Bloqueado", solo ofrece "Desbloquear" y **el perfil se cierra al instante** |
| **Lo que ve quien fue bloqueado** | HTTP **200** —no 404, que confirmaría el bloqueo—, punto de vista `bloqueada_por_otro`, **ninguna acción ofrecida** —ni siquiera bloquear, que lo delataría—, y desaparece de sus listas y de su búsqueda |
| Desbloquear | vuelve a "No es tu contacto": **no restaura la amistad**, hay que volver a solicitar |
| Publicar desde la app | "Publicado desde el telefono · Hace un momento" |
| Permiso de cámara al escanear | `CAMERA: granted=true`; **`RECORD_AUDIO` sigue ausente** del manifiesto (Fase 6) |
| **Aceptado en la web y leído en la app** | el perfil pasa a completo en el teléfono sin tocar nada más |
| **Publicado en la app y leído desde la web** | "Publicado desde el telefono", `postCount: 1` |
| Paridad bidireccional | **confirmada** |

**Nota de verificación**: el emulador se arrancó con `-no-window` (esta sesión no tiene display) y
la API se alcanzó con `adb reverse tcp:3101`. **No se reejecutó `expo prebuild`**: esta fase no
añade ningún módulo nativo —el QR y la cámara ya venían de la Fase 6—. La contraseña de las
cuentas de prueba en dispositivo es ASCII, igual que en las fases 3 a 7, y los textos de varias
palabras se teclean con `%s` como separador.

**Sobre el entorno**: compilar el APK exigió instalar el **JDK 21** —en la máquina solo estaba el
JRE, sin `javac`—. Una vez instalado, Gradle seguía rechazando el *toolchain* porque su **demonio
tenía cacheada la comprobación anterior**; se resolvió con `./gradlew --stop`. Queda anotado
porque volverá a aparecer en cualquier máquina nueva.

---

#### Fase 7 — Semestres · cerrada el 2026-08-17

**Entregado**: inicio de un semestre nuevo desde la propia pantalla de semestres (FR-034); archivo
**íntegro** del anterior —horario, agenda, faltas y estadísticas— al iniciar el siguiente (FR-035);
consulta indefinida de los archivados (FR-036); protección de lo archivado frente a cualquier
modificación, verificada en el servidor (FR-037); y explicación del efecto **antes** de pedir la
confirmación, con los conteos reales delante (FR-038).

**El semestre es un ámbito, no una copia**. La decisión que gobierna toda la fase: `subjects`,
`schedule_blocks`, `absence_records` y `agenda_items` llevan `semester_id` y **se quedan donde
están** al archivarse; lo único que cambia al cerrar es el `status` del semestre. Se descartó la
alternativa de copiar el contenido a una tabla de instantáneas —el patrón de `shares.payload` de
la Fase 6— por dos motivos. El primero, que FR-036 pide consultarlos indefinidamente: si el archivo
tuviera otra forma que lo vivo, cada pantalla necesitaría dos caminos de pintado y los dos se
desincronizarían con el tiempo. El segundo, y decisivo, que vaciar las tablas al cerrar es
exactamente la operación de rutina que destruye historial y que el Principio VI prohíbe. **Cerrar
un semestre no borra ni copia una sola fila.**

**Decisiones de diseño**:

| Decisión | Por qué |
|---|---|
| El semestre **acota**, no archiva copiando | Cerrar cambia un estado, no mueve datos. Es lo que hace que el Principio VI se cumpla por construcción y no por cuidado: no hay ninguna ruta de código que borre historial porque ninguna lo toca |
| **Índice único parcial** de un solo activo por usuario | Si dos quedaran activos, "el semestre en curso" dejaría de estar definido y las materias nuevas irían a uno u otro según el orden de la consulta. Dos cierres lanzados a la vez desde app y web son el caso real, y la comprobación previa de ambos pasaría antes de que ninguno escribiera. Se verificó lanzando los dos cierres en paralelo: solo prosperó uno |
| El semestre en curso **se crea al vuelo** | Igual que los ajustes de la Fase 3: así las cuentas que ya existían no necesitan que nadie les inserte la fila, y ningún cliente maneja el caso de "todavía no hay semestre" |
| Cerrar y abrir son **una sola operación transaccional** | Cerrar sin abrir dejaría la cuenta sin sitio donde escribir y el estudiante no podría capturar nada. O se hacen las dos o no se hace ninguna |
| El cuerpo del cierre exige **`confirmed: true`** | FR-038 es un requisito, no una cortesía de la interfaz. Sin ese campo, una petición suelta —o un `curl` mal copiado— archivaría un semestre entero sin que nadie leyera nada |
| El **efecto se consulta por `GET`** aparte | Pedirlo no compromete a nada, que es justo lo que lo convierte en una explicación *previa*. Los conteos los da el servidor porque es el único sitio donde se sabe de verdad cuánto se va a archivar |
| El semestre nuevo arranca **vacío**, sin copiar el horario | Decisión del usuario. En el TecNM casi ninguna materia continúa entre semestres, así que copiar obligaría a borrar más de lo que ahorra; se recaptura o se importa con el flujo de la Fase 2 |
| Las actividades **pendientes también se archivan** | Decisión del usuario, y lectura literal de FR-035: arrastrar una parte dejaría el archivo contando algo distinto de lo que hubo, y el semestre nuevo no arrancaría vacío |
| El `WHERE` del cierre incluye `status = 'activo'` | Hace idempotente el doble toque: sin esa condición, la segunda petición archivaría de nuevo un semestre ya archivado —reescribiendo su fecha de cierre— y abriría un tercero |
| El nombre propuesto solo interpreta **`AAAA-N`** | De "2026-1" sale "2026-2" y de "2026-2" sale "2027-1". Con cualquier otro nombre se devuelve tal cual: "Quinto semestre" tendría que convertirse en "Sexto", y una tabla de ordinales fallaría en cuanto alguien escriba "5º". Es una propuesta editable, no un dato que deba acertar |
| El nombre del semestre **no se restringe** a esa convención | El estudiante etiqueta su semestre como le sirva; rechazar "Quinto" solo estorbaría |
| `semestre_archivado` es un **código de error propio**, 409 | No es `validacion` porque no hay nada que corregir en el formulario, ni 403 porque el semestre sí es del usuario: el recurso existe y es suyo, lo que no procede es escribir en él. El cliente lo usa para explicar que está viendo historial en vez de marcar un campo en rojo |
| La protección de FR-037 vive en el **servidor**, no en la interfaz | Los clientes esconden los botones de un semestre archivado, pero eso solo evita el error accidental. La garantía es `assertSemesterWritable`, y por eso se comprobó atacando la API directamente |
| **Renombrar un archivado también se rechaza** | Parece inofensivo, pero es la excepción por la que empiezan todas: en cuanto una escritura se permite sobre el historial, la protección deja de ser una regla y pasa a ser una lista de casos |
| Los nombres de materia y los solapes se comprueban **dentro del semestre** | Repetir "Cálculo" el semestre siguiente es el caso normal de una materia reprobada; una comprobación global lo rechazaría. Y el horario del semestre pasado ocupa esas mismas horas sin estorbar |
| La rotación de color se cuenta **por semestre** | Si contara todas las materias históricas, el primer color de un semestre nuevo dependería de cuántos semestres lleve la cuenta |
| El plan de recordatorios se acota al semestre en curso | Es lo que hace que cerrar cancele los avisos pendientes **sin código añadido**: el plan de la Fase 5 devuelve todos los vigentes y el cliente reprograma la lista entera, así que lo archivado deja de aparecer. Sin el filtro, el teléfono seguiría avisando de entregas de un semestre terminado |
| Lo aceptado de un compartido entra en el semestre **del receptor** | El compartido es una fotografía sin semestre (Fase 6), y el del emisor no significa nada en la cuenta de quien lo acepta |
| **Sin `expo-router` todavía** | La Fase 6 lo previó aquí y tampoco ha hecho falta: los semestres son una sección más que se abre desde el inicio, sin rutas anidadas ni enlaces profundos. Entra en la Fase 8, que comparte perfiles por enlace |

**El riesgo real de la fase era el borrado en cascada, no el cierre.** Tres rutas ya existentes
borraban por `userId` a secas: el modo "reemplazar" de la importación (Fase 2), el mismo modo al
aceptar un horario compartido (Fase 6) y `clearSchedule`. Sin acotarlas por semestre, cualquiera de
las tres habría arrasado el horario de **todos los semestres archivados** de la cuenta —el fallo más
destructivo que esta fase podía introducir, y precisamente el que el Principio VI prohíbe—. Las tres
llevan ahora `semester_id` en su `WHERE`.

**Verificación ejecutada** — 308 comprobaciones, todas en verde:

| Suite | Qué prueba | Resultado |
|---|---|---|
| Lógica compartida (Node) | Nombre propuesto en sus casos límite (cambio de año y de siglo, nombres libres, formatos parecidos), nombre por defecto y su encadenado sobre 5 semestres, editabilidad, resúmenes con singular y plural —exigiendo que ninguno enumere ceros—, avisos del cierre, periodo, orden de la lista y los esquemas | **90/90** |
| API (`fetch` contra la API real) | Semestre creado al vuelo e idempotente, conteo del contenido, efecto del cierre sin efectos secundarios, rechazo sin confirmación, archivo íntegro, semestre nuevo vacío en las cuatro pantallas, consulta de lo archivado, **seis vías de escritura sobre un archivado rechazadas**, materia repetida entre semestres, faltas que no cruzan, aislamiento entre cuentas, rutas protegidas y **cierre doble simultáneo** | **80/80** |
| Web (Playwright, navegador real) | Ruta protegida, enlace desde el inicio, semestre en curso con sus conteos, explicación previa completa, cancelar sin efectos, cierre, semestre nuevo vacío en horario/agenda/faltas, consulta de lo archivado, persistencia al recargar, segundo cierre y ausencia de errores de JavaScript | **43/43** |

Además se reejecutó una **regresión de las fases 1 a 6** (**95/95**), porque esta fase tocó los
cinco servicios: cada consulta lleva ahora un filtro por semestre y cada escritura una comprobación.

**Verificación en Android real** (emulador Pixel 6, Android 15, APK de release instalado):

| Comprobación | Resultado |
|---|---|
| Tarjeta "Semestres" en el inicio y pantalla completa | correcto |
| Semestre en curso con sus conteos | "2026-2 · Activo · Desde el 17/08/2026 · 2 materias · 1 falta · 1 actividad" |
| Aviso de que no se puede deshacer | visible junto al botón |
| **Explicación previa (FR-038)** | los cuatro avisos, **palabra por palabra idénticos a los de la web** |
| Nombre propuesto con cambio de año | de `2026-2` propone **`2027-1`** |
| Cierre desde la app (FR-034) | "Se archivó «2026-2» y empezó «2027-1», vacío." |
| El archivado conserva todo (FR-035) | "2026-2 · Archivado · 2 materias · 1 falta · 1 actividad" |
| Aviso de solo lectura (FR-037) | "Este semestre está archivado. No se puede modificar." |
| El semestre nuevo, vacío en **horario** | "Todavía no has capturado tus clases" |
| El semestre nuevo, vacío en **faltas** | "Todavía no tienes materias en tu horario" |
| El semestre nuevo, vacío en **agenda** | "No tienes nada pendiente" |
| **Nada se borró** (Principio VI) | en PostgreSQL, el archivado conserva sus 2 materias, 3 sesiones, 1 falta y 1 actividad |
| **Cierre hecho en la app leído en la web** | idéntico: mismo nombre, periodo, contenido y aviso de solo lectura |
| Paridad bidireccional | **confirmada** |

**Migración**: `0007` crea `semesters` y añade `semester_id` a las cuatro tablas de dominio. **No es
puramente aditiva**, y ahí estaba el riesgo: las columnas son `NOT NULL` sobre tablas que ya tenían
filas, y no hay valor por defecto posible porque el semestre correcto depende del usuario dueño de
cada fila. El generador de Drizzle producía `ADD COLUMN … NOT NULL` a secas, que habría fallado con
la primera fila existente. Se reescribió a mano en tres pasos: crear un semestre activo por cada
cuenta —con `started_at` tomado de la fecha de alta de la cuenta, no de hoy, porque lo capturado es
de un semestre que empezó antes de la migración—, rellenar las cuatro tablas, y solo entonces
imponer la restricción. **Se aplicó sobre la base real con 153 cuentas y 598 filas**: 153 semestres
creados, cero filas huérfanas, cero filas asignadas al semestre de otro usuario y ningún conteo
alterado.

**Corregido durante la fase**:

1. **El generador de migraciones habría roto la base con datos.** Descrito arriba: `drizzle-kit`
   no puede saber que una columna nueva necesita un relleno derivado del dueño de cada fila. Se
   detectó revisando el SQL generado antes de aplicarlo, y se comprobó ejecutando la migración
   contra las 153 cuentas reales en lugar de sobre una base vacía —donde el fallo no se habría
   manifestado nunca—.
2. **Tres borrados en cascada alcanzaban los semestres archivados.** Descrito arriba: los dos modos
   "reemplazar" y `clearSchedule` borraban por `userId` sin acotar. No lo habría detectado ninguna
   prueba de la fase nueva, porque las tres rutas son de fases anteriores y sus suites pasaban;
   apareció al revisar cada `delete` del proyecto buscando cuáles cruzaban el ámbito.
3. **Las faltas del semestre pasado seguirían contra el límite del nuevo.** El panel de FR-012
   contaba todas las faltas del usuario. Sin el filtro por semestre, el estudiante empezaría el
   semestre nuevo con la alerta de FR-016 ya encendida y un margen consumido por materias que ya
   no cursa. Se comprobó explícitamente: tras cerrar, una materia con el mismo nombre arranca en
   0 faltas.

**Nota de verificación**: el emulador se arrancó con `-no-window` (esta sesión no tiene display) y
la API se alcanzó con `adb reverse tcp:3101`. **No se reejecutó `expo prebuild`**: esta fase no
añade ningún módulo nativo. La contraseña de las cuentas de prueba en dispositivo es ASCII, igual
que en las fases 3 a 6.

---

#### Fase 6 — Compartir · cerrada el 2026-08-17

**Entregado**: compartición de horario y actividades por **código QR, código corto y enlace**, las
tres ofrecidas a la vez (FR-028); selección de qué materias o actividades incluye cada compartido
(FR-029); vista previa del contenido antes de aceptar (FR-030); copia **independiente y editable**
para el receptor, sin vínculo posterior con el original (FR-031); las tres modalidades entregan
exactamente el mismo contenido (FR-032); y revocación por parte del emisor, con aviso claro al
receptor cuando está revocado o caducado (FR-033).

**El compartido es una fotografía, no una ventana**. La decisión que gobierna toda la fase:
`shares.payload` guarda una **copia congelada** del contenido en el momento de generarlo, no
referencias a `subjects` ni a `agenda_items`. Guardar identificadores era menos escritura, pero
rompía el Principio IV por los dos extremos: si el emisor borra una materia, un enlace ya
repartido apunta a nada; si la edita, el receptor recibe algo distinto de lo que la vista previa
le enseñó. Con la copia dentro, lo que el emisor haga después no toca el compartido —y eso se
verificó en el emulador, no solo en las suites—.

**Decisiones de diseño**:

| Decisión | Por qué |
|---|---|
| El contenido se **congela al generar**, no al aceptar | Es lo que permite que la vista previa sea fiel aunque el receptor acepte una semana después, y que el compartido sobreviva a que el emisor borre el original |
| **Un solo `code` para las tres modalidades** | El enlace lo incrusta y el QR codifica el enlace. Un identificador por modalidad es exactamente cómo acabarían entregando contenidos distintos, que es lo que FR-032 prohíbe |
| El **enlace lo compone el servidor** (`WEB_URL`) | Es lo que se codifica en el QR: si la app armara una URL y la web otra, escanear y abrir el enlace llevarían a sitios distintos |
| Alfabeto **sin I, L, O ni U** | El código se dicta en voz alta y se copia a ojo; las tres primeras se confunden con `1` y `0`, y la `U` se excluye para no formar palabras malsonantes por azar |
| `normalizeShareCode` **corrige** esas confusiones al recibir | Quien teclea `IL0` desde un mensaje obtiene el código correcto en vez de "no encontrado" |
| El **código se genera con `crypto.getRandomValues`** | Es la única credencial que protege el contenido; con `Math.random()` se podrían enumerar los compartidos de otras personas |
| La **caducidad se deriva**, no se guarda como estado | Un estado almacenado exigiría un proceso que recorriera la tabla marcando vencidos, y hasta que corriera un compartido caducado seguiría diciendo "activo" |
| Revocar **marca la fila**, no la borra | Quien abra el enlace debe recibir "lo retiraron" y no "no existe": son mensajes distintos que llevan a acciones distintas |
| Los tres motivos —revocado, caducado, no encontrado— **se distinguen** (FR-033) | Cada uno lleva al receptor a algo distinto: pedir uno nuevo, o revisar lo que tecleó. Un único "no disponible" lo dejaría sin saber qué hacer |
| Pero los tres responden **404**, no 410 | Desde fuera, un compartido revocado es indistinguible de uno que nunca existió; devolver 410 solo para el caducado confirmaría a quien pruebe códigos al azar que ese sí era válido |
| La materia de una actividad viaja como **nombre**, no como identificador | El identificador del emisor no significa nada en la cuenta del receptor. Al aceptar se busca por nombre y, si no aparece, la actividad entra sin materia —estado válido desde FR-018— en vez de descartarse |
| Los nombres repetidos se **desambiguan con sufijo**, no se rechazan | Dos compañeros de la misma carrera tienen las mismas materias. Rechazar la copia entera por una repetida dejaría al receptor sin las otras cinco |
| Los **solapes no se rechazan** al aceptar | La alta manual sí los rechaza (Fase 2), pero allí el usuario corrige una sesión. Aquí rechazaría el horario entero por una hora que se encima, y el caso es real: quien recibe un horario suele tener ya algo capturado |
| El estado de **completado no se comparte** | Se comparte lo que hay que hacer, no lo que el emisor ya hizo: una tarea que llegara marcada como entregada no le serviría de nada al receptor |
| La **agenda siempre suma**, sin modo reemplazar | Reemplazarla borraría tareas propias que nada tienen que ver con lo recibido |
| La vista previa **exige sesión** | El código es la credencial, pero dejarla abierta convertiría cada enlace en una página pública indexable |
| El **codificador QR se escribió en `shared`** | Con una librería por plataforma serían dos implementaciones del mismo código; basta que difieran en el margen o en la versión elegida para que una cámara lea el de un cliente y no el del otro. Una sola matriz, dos formas de pintarla (Principio VIII) |
| **Sin `expo-router` todavía** | La Fase 5 lo previó aquí y no hizo falta: el enlace lo abre la **web**, que sí tiene rutas. En el teléfono el compartido llega por cámara o tecleando, y ambos caminos desembocan en un panel de la propia pantalla. Entra en la Fase 8, que comparte perfiles por enlace |

**Verificación ejecutada** — 246 comprobaciones, todas en verde:

| Suite | Qué prueba | Resultado |
|---|---|---|
| Lógica compartida (Node) | Generación y normalización de códigos (incluido el reparto sin sesgo sobre 32 000 caracteres), enlaces, estado y caducidad en sus límites exactos, resúmenes con singular y plural, orden de la lista y los esquemas de creación, código y aceptación | **67/67** |
| Codificador QR (Node + jsQR) | 50 enlaces aleatorios generados y **decodificados con un decodificador independiente**, UTF-8 con acentos, estructura de la matriz, elección de versión, salida SVG y lectura a escala baja | **21/21** |
| API (`fetch` contra la API real) | Generación con selección, vista previa que no copia, aceptación, independencia de la copia, las tres modalidades, revocación, caducidad forzada en base de datos, aislamiento entre cuentas y rutas protegidas | **108/108** |
| Web (Playwright, navegador real) | Pantalla de compartir, selección de contenido, las tres modalidades, vista previa desde otra cuenta, aceptación, independencia tras editar el original, recepción por código, revocación y ausencia de errores de JavaScript | **50/50** |

Además se reejecutó una **regresión de las fases 1 a 5** (16/16), porque esta fase tocó el contrato
de errores (código nuevo `compartido_no_disponible`), el `package.json` de la raíz y la versión de
React de todo el árbol.

**Verificación en Android real** (emulador Pixel 6, Android 15, APK de release instalado):

| Comprobación | Resultado |
|---|---|
| Tarjeta "Compartir" en el inicio y pantalla completa | correcto |
| Android pide permiso de cámara al escanear | correcto (`CAMERA: granted=true`) |
| Visor de la cámara con su marco e instrucción | correcto |
| Código tecleado en **minúsculas** (`434pvr20`) | se normaliza en pantalla: "Se abrirá 434P-VR20" |
| Vista previa (FR-030) | emisor, "2 materias · 3 sesiones", días, horas y aulas |
| Aceptar (FR-031) | "Se copiaron 2 materias con 3 sesiones" |
| Nombre repetido con lo que ya había | desambiguado como "Calculo (2)" |
| **El emisor renombra y borra desde la web** | la app del receptor sigue mostrando `Calculo`, `Calculo (2)` y `Fisica`, sin rastro del renombrado |
| Generación con selección (FR-029) | de "4 de 4" a "3 de 4" al desmarcar |
| Las tres modalidades en pantalla (FR-028) | QR + `1D97-CAJB` + enlace, los tres con el mismo código |
| **El QR de la pantalla real, decodificado** | la captura del emulador devuelve `http://localhost:3000/compartido/1D97CAJB` |
| Revocar desde la app (FR-033) | pasa a "Revocado"; quien abre el código recibe "Quien lo compartió retiró este contenido." |
| Paridad bidireccional | **confirmada** |

**Corregido durante la fase**:

1. **El codificador QR producía códigos ilegibles, con estructura perfecta.** Fueron tres fallos
   encadenados que solo la decodificación real destapó —a ojo, y en las comprobaciones de
   estructura, el QR parecía impecable—:
   - Los **separadores** de los patrones de búsqueda salían en negro, porque la condición del
     borde (`r === 0`) daba por buena la fila superior también en las columnas del separador. Los
     patrones quedaban pegados al resto del código y ninguna cámara los localizaba.
   - El **zigzag de datos** saltaba la columna 6 restando al contador del bucle, lo que desplazaba
     todos los pares siguientes y escribía los datos en columnas equivocadas.
   - El **polinomio generador** de Reed-Solomon salía con los coeficientes invertidos
     (`193,157,…,1` en vez de `1,216,194,…`), así que los símbolos de corrección no correspondían
     a los datos. Este era el que quedaba: los otros dos ya estaban arreglados y el QR seguía sin
     leerse.

   Se añadió una suite que **decodifica lo generado con jsQR**, un decodificador independiente. Sin
   ella, el fallo habría llegado al teléfono como "el QR no funciona" y sin ninguna pista de por
   qué.
2. **`CameraView` no se podía usar como componente JSX.** Las herramientas de desarrollo de Expo
   arrastran un `react` 18.3.1 que ninguna capa declara, y npm lo subía a la raíz. Los módulos
   nativos que también quedan izados —`expo-camera`— resolvían sus tipos de React contra **esa**
   copia, incompatible con el React 19 que ejecuta la app. Se intentó primero con `paths` en el
   `tsconfig` de mobile, y fue peor: Metro también lee esos `paths` y acabó importando el paquete
   de **tipos** en tiempo de ejecución, rompiendo el bundle. La solución correcta fue un
   `overrides` en la raíz que deja un solo React en todo el árbol.
3. **La app pedía permiso de micrófono para escanear un QR.** El plugin de `expo-camera` añade
   `RECORD_AUDIO` por defecto, porque también graba vídeo. Aquí solo se escanea, y pedir el
   micrófono para leer un código es justo lo que hace que la gente deniegue permisos por
   costumbre. Se desactivó con `recordAudioAndroid: false`; el manifiesto queda solo con `CAMERA`.

**Añadido**: `expo-camera` (escanear QR) y `react-native-svg` (pintarlo en la app). El **codificador
QR es propio**, en `packages/shared`: así los dos clientes generan la misma matriz.

**Migración**: `0006` crea la tabla `shares`. Es puramente aditiva —una tabla nueva, ninguna
existente se toca—, así que las cuentas que ya existían no pierden nada.

**Nota de verificación**: el emulador se arrancó con `-no-window` (esta sesión no tiene display) y
la API se alcanzó con `adb reverse tcp:3101`. Se reejecutó `expo prebuild` porque `expo-camera` y
`react-native-svg` son módulos nativos. La contraseña de las cuentas de prueba en dispositivo es
ASCII, igual que en las fases 3 a 5.

---

#### Fase 5 — Calendario y recordatorios · cerrada el 2026-08-17

**Entregado**: vista de calendario mensual que combina clases y vencimientos en la misma rejilla
(FR-023); detalle de un día concreto con sus clases —hora, aula y si se faltó— y lo que vence
(FR-024); recordatorios activables con anticipación configurable —el mismo día, 1, 2, 3 días o una
semana— y hora del aviso (FR-025); **notificación local real en Android** (FR-026); y
reprogramación o cancelación automática cuando la actividad cambia de fecha, se completa, pierde su
fecha o se borra (FR-027).

**El problema de la hora que la agenda no tiene**. FR-025 pide anticipación configurable y FR-026
un momento concreto, pero las actividades guardan `dueDate` como `date` sin hora —decisión de la
Fase 4: "se entrega el 3 de septiembre" es un día de calendario—. Darle hora a cada entrega la
convertiría en instante y reabriría el problema de husos que esa decisión cerró. Se resolvió con
una **hora de aviso por usuario** (20:00 por defecto): da el momento que la notificación necesita
sin tocar el modelo de la agenda.

**Decisiones de diseño**:

| Decisión | Por qué |
|---|---|
| El servidor devuelve **un día por fecha del rango**, incluidos los vacíos | El cliente pinta la rejilla recorriendo la lista. Generar las fechas en el cliente es justo donde reaparecen los errores de huso que `CalendarDate` existe para evitar |
| El **momento del aviso lo calcula el servidor** (`remindOn`, `remindAt`, `overdue`) | Si cada cliente restara los días de anticipación por su cuenta, app y web discreparían sobre cuándo toca avisar, y el fallo sería invisible hasta que la notificación llegara tarde |
| El plan devuelve **todos** los recordatorios vigentes, no solo los nuevos | Así FR-027 se cumple sin llevar registro de lo ya programado: el cliente cancela todo y reprograma la lista entera. Lo que cambió, se completó o se borró simplemente ya no aparece. Calcular diferencias exigiría un estado local que se desincronizaría al editar desde el otro cliente |
| Notificaciones **locales**, no push | Un recordatorio de entrega no necesita servidor en el momento del aviso. Push exigiría credenciales de Firebase, un token por dispositivo y un servicio que despierte a la hora exacta, para decir algo que el teléfono ya sabe |
| Los recordatorios arrancan **apagados** | Programar avisos que nadie pidió es lo que hace que se desactiven para siempre |
| Anticipación como **conjunto cerrado** (0, 1, 2, 3, 7 días) | Son las que se usan de verdad, y así la elección es un toque en la app en lugar de escribir un número |
| La **web configura y muestra**; la app **emite** la notificación | El navegador no puede programar un aviso que llegue con la pestaña cerrada. La paridad se cumple donde importa: los mismos ajustes y los mismos datos en ambos clientes (Principio I) |
| `reminderInstant` construye la fecha con **componentes locales** | `new Date('2026-08-19T20:00')` y `toISOString()` reinterpretan la hora en UTC: el aviso saldría desplazado seis horas en México |
| Los ajustes de recordatorio viven en `user_settings`, y su `UPDATE` **no toca `semesterWeeks`** | Es la tabla que comparte con la Fase 3. Sin esa separación, cambiar la hora del aviso reescribiría las semanas del semestre, y con ellas el límite sugerido de faltas |
| El detalle del día se abre **dentro** del calendario, no en otra pantalla | El usuario alterna entre días y perdería el contexto del mes si cada toque lo llevara fuera |
| **Sin `expo-router` todavía** | La Fase 4 lo previó aquí, pero los dos motivos no se materializaron: el detalle del día no es una ruta (se abre bajo la rejilla) y la notificación aún no abre una actividad concreta, porque no existe esa pantalla de detalle. El `itemId` ya viaja en la notificación para cuando la haya. Entra en la Fase 6, que comparte por enlace y sí necesita resolver rutas |

**Verificación ejecutada** — 244 comprobaciones, todas en verde:

| Suite | Qué prueba | Resultado |
|---|---|---|
| Lógica compartida (Node) | Rangos de fechas con años bisiestos y cambios de horario, rejilla mensual en 24 meses, momento y vigencia del aviso, textos, y validación de rangos y ajustes | **58/58** |
| API (`fetch` contra la API real) | Calendario por rango, recurrencia de clases por día de la semana, faltas en el calendario, detalle del día, ajustes, plan de recordatorios, los cinco caminos de FR-027, validación, aislamiento entre cuentas y rutas protegidas | **102/102** |
| Web (Playwright, navegador real) | Ruta protegida, enlace desde el inicio, rejilla, navegación entre meses, detalle del día con horas y aula, ajustes de recordatorio, persistencia al recargar y ausencia de errores de JavaScript | **38/38** |

Además se reejecutó una **regresión de las fases 1 a 4** (46/46) porque esta fase toca
`user_settings`, que comparte con el control de faltas, y el esquema de rangos de fechas.

**Verificación en Android real** (emulador Pixel 6, Android 15, APK de release instalado):

| Comprobación | Resultado |
|---|---|
| Rejilla mensual con clases y vencimientos (FR-023) | 42 celdas, coincide con la API día a día |
| Clases recurrentes en su día de la semana, con color por materia | correcto |
| Hoy destacado y meses vecinos atenuados | correcto |
| Detalle de un día (FR-024) | "Calculo · 07:00–09:00 · A-101" y "Reporte de lab · Tarea · Calculo" |
| Android pide permiso de notificaciones al activar | correcto (`POST_NOTIFICATIONS: granted=true`) |
| Aviso **programado en el sistema** (FR-026) | `dumpsys alarm`: `RTC_WAKEUP` de `net.ourocore.notecore` para **2026-08-24 20:00**, el momento exacto esperado |
| Lo ya vencido no se programa, y se señala | "Ya debería haberte avisado" |
| Completar la actividad **desde la web** cancela la alarma (FR-027) | `dumpsys alarm`: **0 alarmas**; la app muestra "No hay avisos pendientes que programar" |
| Cambiar la anticipación **desde la app** leído en la **web** | `leadDays: 7` y "Una semana antes" marcado en el navegador |
| Paridad bidireccional | **confirmada** |

**Corregido durante la fase**:

1. **Una fecha con forma válida pero inexistente devolvía 500.** `GET /calendar?from=2026-02-31`
   respondía "Ocurrió un error inesperado" en lugar de un error de campo. Zod ejecuta las
   comprobaciones de nivel superior **aunque las de los campos ya hayan fallado**, así que la
   comprobación del tamaño del rango llamaba a `daysBetween` con una fecha que
   `calendarDateSchema` acababa de rechazar, y el `RangeError` de `calendarDateToLocal` escapaba
   como fallo interno. Se guardó esa comprobación con `isCalendarDate`. Se revisó el esquema
   equivalente de la Fase 3 (`absenceHistoryQuerySchema`) y no tiene el fallo: solo compara texto.
2. **"Vence mañana" para una entrega a nueve días.** Lo encontró la verificación en el emulador,
   no las suites: la lista de próximos avisos anunciaba igual una entrega de mañana y un examen a
   nueve días. `reminderMessage` deriva el plazo de `leadDays`, que es la distancia entre el
   **aviso** y la entrega —correcta en la notificación, que se lee el día que salta, pero no en
   una lista que se lee hoy—. Se separó `reminderListMessage`, que cuenta desde hoy. Los dos
   textos viven en `shared` porque es justo el detalle que se corregiría en un cliente y se
   olvidaría en el otro.
3. **`POST_NOTIFICATIONS` no llegaba al manifiesto.** Instalar `expo-notifications` no basta:
   sin declarar el plugin en `app.json`, el prebuild no añade el permiso, y en Android 13+ las
   notificaciones **no se muestran y no hay error**. Se habría descubierto solo en un teléfono
   real. Se descartó `SCHEDULE_EXACT_ALARM`: los avisos son de día y hora fija, no exigen
   precisión al segundo, y es un permiso restringido que Google Play examina.
4. **Cambiar de mes reprogramaba todas las notificaciones.** El plan de recordatorios se cargaba
   en el mismo efecto que la rejilla, así que pasar de agosto a septiembre cancelaba y volvía a
   programar cada aviso del teléfono sin que nada hubiera cambiado. Se separaron los efectos en
   ambos clientes.
5. **"Agosto De 2026".** `textTransform: 'capitalize'` de React Native y `capitalize` de CSS ponen
   mayúscula en **cada palabra**, y en español solo la lleva la primera. `formatMonthName`
   devuelve ahora el nombre ya capitalizado y ningún cliente aplica la transformación.

**Añadido**: `expo-notifications`, para programar los avisos locales en Android.

**Migración**: `0005` añade a `user_settings` los campos `reminders_enabled`,
`reminder_lead_days` y `reminder_time_of_day`. Es aditiva y con valores por defecto: las cuentas
que ya existían quedan con los recordatorios apagados, sin perder nada.

**Nota de verificación**: el emulador se arrancó con `-no-window` (esta sesión no tiene display) y
la API se alcanzó con `adb reverse tcp:3101`. Se reejecutó `expo prebuild` porque
`expo-notifications` es un módulo nativo y hay que enlazarlo en el proyecto Android. Igual que en
las fases 3 y 4, la cuenta de prueba en dispositivo usa una contraseña ASCII, porque
`adb shell input text` no teclea `ñ`.

---

#### Fase 4 — Agenda · cerrada el 2026-08-17

**Entregado**: actividades con título, descripción, materia y fecha límite opcionales (FR-018),
en cuatro tipos —tarea, proyecto, examen y actividad—; edición de **todos** los campos tras la
creación (FR-019); completar conservando el registro, y reabrir (FR-020); eliminación explícita
(FR-021); pendientes ordenadas por proximidad de vencimiento (FR-022), con lo vencido primero y
un resumen de lo vencido y lo que vence hoy.

**Decisiones de diseño**:

| Decisión | Por qué |
|---|---|
| Borrar una materia **no borra** sus tareas (`set null`, no `cascade`) | Al contrario que las faltas, una entrega sigue existiendo aunque el estudiante reorganice su horario. Perderla en silencio sería justo el fallo que la agenda existe para evitar; se queda sin materia, que es un estado válido |
| **Completar y borrar son acciones distintas** | FR-020 conserva el registro y FR-021 exige el borrado explícito. La casilla completa de un toque; eliminar pide confirmación porque sí se pierde |
| Lo **vencido va primero**, no al final | Una entrega que ya pasó es lo más urgente de la lista. Enterrarla abajo la escondería justo cuando más importa |
| Lo que **no tiene fecha** va al final, pero se muestra | FR-018 permite omitirla, así que esconderla la perdería; simplemente no compite por urgencia con lo que sí la tiene |
| Una actividad **completada nunca urge**, aunque su fecha haya pasado | Marcar como "vencida" algo ya entregado es una alarma falsa |
| `daysUntilDue` y la urgencia los **calcula el servidor** | El cliente los derivaría del reloj del dispositivo, que puede ir en otro huso o mal. Con dos clientes, la misma tarea saldría "vence hoy" en uno y "venció ayer" en el otro |
| Toda la lista se calcula contra **una misma fecha** | Si el servidor cruzara la medianoche a mitad del recorrido, unas actividades saldrían "vencidas" y otras "vencen hoy" en la misma respuesta |
| Fechas como **`date`** de PostgreSQL, igual que las faltas | "Se entrega el 3 de septiembre" es un día de calendario. Con `timestamp` la entrega se movería de día al cambiar de huso |
| `completedAt` **solo se toca cuando el estado cambia** | Reenviar `completed: true` sobre algo ya completado reescribiría la fecha, y las completadas —ordenadas por ella— saltarían al principio sin que el usuario hiciera nada |
| El orden final lo pone `sortByDueDate`, no el `ORDER BY` | PostgreSQL pone los nulos al final en orden ascendente, pero no distingue lo vencido ni desempata por fecha de creación como pide FR-022 |
| **Sin `expo-router` todavía** | Con cuatro secciones que se abren desde el inicio sigue sin haber rutas anidadas. Entra en la Fase 5: el calendario enlaza al detalle de un día y a la actividad de ese día, y los recordatorios exigen abrir la app directamente en una actividad desde una notificación |

**Verificación ejecutada** — 264 comprobaciones, todas en verde:

| Suite | Qué prueba | Resultado |
|---|---|---|
| Lógica compartida (Node) | Días entre fechas (con cambios de horario y años bisiestos), urgencias en todos sus umbrales, orden de FR-022, y los esquemas de alta, edición y filtros | **111/111** |
| API (`fetch` contra la API real) | Alta mínima y completa, validación, orden por vencimiento, edición campo a campo, completar y reabrir, filtros, borrado, aislamiento entre cuentas, rutas protegidas y la cascada `set null` | **109/109** |
| Web (Playwright, navegador real) | Ruta protegida, enlace desde el inicio, alta, validación, orden, completar y reabrir, edición, persistencia y borrado, sin errores de JavaScript | **44/44** |

Además se reejecutó una **regresión de las fases 1 a 3** (24/24) porque esta fase tocó el
manejador de cuerpos de peticiones, que es común a todas las rutas.

**Verificación en Android real** (emulador Pixel 6, Android 15, APK de release instalado):

| Comprobación | Resultado |
|---|---|
| La app arranca y muestra la tarjeta "Tu agenda" | correcto |
| Agenda **creada desde la web** visible en la **app** | las 5 actividades, en el mismo orden |
| Urgencias, materias y fechas idénticas a la web | "Vencida · Venció hace 4 días", "Próxima · Vence en 3 días" |
| Resumen de vencidas y de hoy | "1 actividad vencida · 1 vence hoy" |
| Alta desde la interfaz táctil (tipo, materia y atajo de fecha) | creada y ordenada en su sitio entre las de hoy y las de 3 días |
| Editar el título conservando tipo, materia y fecha (FR-019) | correcto |
| Completar con la casilla (FR-020) | de 6 a 5 pendientes; el aviso de vencidas desaparece |
| La completada se conserva en su sección | "Completadas (1)" con la casilla marcada |
| Cambios hechos en la **app** leídos desde la **web** | **paridad bidireccional confirmada** |

**Corregido durante la fase**:

1. **Un `DELETE` con `content-type: application/json` fallaba con 400 en toda la API.** No es un
   fallo de la agenda: afectaba igual a las rutas de horario y faltas de las fases 2 y 3, y
   estaba ahí desde entonces. Fastify lee un cuerpo vacío con esa cabecera como
   `FST_ERR_CTP_EMPTY_JSON_BODY` —"prometiste JSON y no mandaste nada"—, que el manejador de
   errores traducía a "el cuerpo de la petición debe ser JSON válido": el borrado no se
   ejecutaba y el mensaje no tenía nada que ver con lo ocurrido. Los clientes propios se
   libraban por casualidad, porque `ApiClient` solo pone la cabecera cuando hay cuerpo, pero
   cualquier cliente HTTP corriente (curl con `-H`, axios, una cola de reintentos) la manda
   siempre. Se añadió un analizador de contenido que entrega `undefined` ante el cuerpo vacío.
   Importa de cara a la Fase 6, que expone compartición por enlace, y a la Fase 9, que sincroniza
   desde una cola. Efecto secundario bueno: un `POST` sin cuerpo ahora responde "Falta el correo"
   en lugar del error genérico de JSON.
2. **"Vence hoy · Vence hoy" en la lista.** Lo encontró la verificación en el emulador, no las
   suites. La línea de vencimiento concatenaba la etiqueta de urgencia con el mensaje de días, y
   para una entrega de hoy ambas mitades dicen lo mismo. Se añadió `dueDateLine` en `shared`
   —que omite la etiqueta cuando no aporta nada— en vez de parchearlo en cada cliente: es
   justo el detalle que se corrige en uno y se olvida en el otro, y entonces la misma actividad
   se lee distinto según el dispositivo. La suite recorre ahora todas las combinaciones de
   urgencia y días exigiendo que ninguna repita la misma frase.

**Nota de verificación**: el emulador se arrancó con `-no-window` (esta sesión no tiene display) y
la API se alcanzó con `adb reverse tcp:3101`. `adb shell input text` parte el texto en el primer
espacio, así que los títulos de varias palabras se teclean con `%s` como separador; tampoco teclea
`ñ`, por lo que la cuenta de prueba en dispositivo usa una contraseña ASCII, igual que en la
Fase 3.

---

#### Fase 3 — Control de faltas · cerrada el 2026-08-16

**Entregado**: registro de inasistencias eligiendo fecha y, dentro de ella, una sesión suelta o el
día completo (FR-011); conteo por materia (FR-012); límite sugerido del 20% de las sesiones del
semestre (FR-013), presentado siempre con la recomendación de confirmarlo con el profesor (FR-014)
y editable por materia (FR-015); alerta al acercarse al límite (FR-016); faltas justificables y
eliminables, con el conteo recalculado (FR-017).

**El problema del semestre que todavía no existe**. FR-013 mide el límite sobre las sesiones
totales *del semestre*, pero el semestre como entidad —con sus fechas— es la Fase 7. Se resolvió
con un ajuste de **semanas del semestre** por usuario (16 por defecto, lo habitual en el TecNM):
el total es `sesiones semanales × semanas`. Cuando la Fase 7 traiga las fechas reales, se sustituye
`estimateTotalSessions` por el conteo del calendario y nada más cambia.

**Decisiones de diseño**:

| Decisión | Por qué |
|---|---|
| La falta se guarda **por sesión**, no por materia y día | Una materia puede tener dos clases el mismo día; sin el bloque no se sabría si se faltó a una o a las dos, y el conteo de FR-012 saldría mal |
| El **día completo no es un modo aparte**: el cliente manda todas las sesiones del día | El servidor guarda siempre lo mismo —una falta por sesión— así que el conteo no depende de cómo se registró |
| `absence_limit` guarda **solo lo que el usuario fijó**; `null` = usa la sugerencia | Guardar el 20% ya resuelto lo dejaría obsoleto al editar el horario o las semanas. Así la sugerencia se recalcula sola y se distingue de un ajuste deliberado |
| **Justificar no borra** (FR-017) | El registro se conserva y deja de contar. Borrarlo perdería el hecho de que ese día no se asistió |
| Fechas como **`date`** de PostgreSQL y `YYYY-MM-DD` como texto en el dominio | "Falté el 3 de septiembre" es un día de calendario, no un instante. Con `timestamp` la falta se movería de día al cambiar de huso |
| Restricción **única `(block_id, date)`** en la base de datos | Dos toques rápidos en la app lanzan dos peticiones a la vez y la comprobación previa de ambas pasaría antes de que ninguna insertara. El conteo saldría inflado |
| Marcar algo **ya marcado no falla**, se omite | Marcar el día completo cuando ya había una falta suelta es razonable; fallar entero obligaría a desmarcarla primero |
| Las faltas caen con su **sesión del horario** (cascada) | Una inasistencia a una clase que ya no existe no se puede contar contra ningún límite. No es historial archivable (Principio VI): la Fase 7 archivará el semestre entero |
| El **color del estado** vive en `shared` | El color *es* la alerta de FR-016; si web pintara el aviso en ámbar y la app en rojo, la misma situación se leería distinto según el dispositivo |
| **Sin `expo-router` todavía** | Con tres secciones y vuelta siempre al inicio no hay rutas anidadas ni enlaces profundos que resolver. Entra cuando la agenda y el calendario lo conviertan en pestañas de verdad |

**Verificación ejecutada** — 193 comprobaciones, todas en verde:

| Suite | Qué prueba | Resultado |
|---|---|---|
| Lógica compartida (Node) | Límite sugerido, estimación de sesiones, umbrales de alerta en todos los límites de 1 a 40, fechas de calendario y validaciones | **60/60** |
| API (`curl` contra la API real) | Panel, clases del día, registro suelto y de día completo, duplicados, justificación, borrado, límite editable, semanas, aislamiento entre cuentas, rutas protegidas y cascada | **92/92** |
| Web (Playwright, navegador real) | Ruta protegida, panel, marcar, justificar, quitar, límite propio y vuelta al sugerido, alerta, semanas, persistencia y enlace desde el inicio | **41/41** |

**Verificación en Android real** (emulador Pixel 6, Android 15, APK de release instalado):

| Comprobación | Resultado |
|---|---|
| Falta marcada **desde la web** visible en la **app** | 1 de 6 en Cálculo, idéntico |
| Totales y sugeridos coinciden con la web | 32 y 16 sesiones · sugeridos 6 y 3 |
| El domingo avisa de que no hay clases | correcto |
| Navegación por días y clases del lunes con hora y aula | correcto |
| Marcar una falta desde la interfaz táctil | Taller pasó a 1 de 3, barra y margen actualizados |
| Justificar (FR-017) | "0 de 3 faltas · 1 justificada": se conserva y deja de contar |
| Fijar un límite propio de 1 (FR-015) | estado rojo "Alcanzaste el límite", sugerido 6 aún visible |
| Recomendación de confirmar con el profesor (FR-014) | visible junto a los límites |
| Cambios hechos en la **app** leídos desde la **web** | **paridad bidireccional confirmada** |

**Corregido durante la fase** — las dos las encontraron las suites, no la revisión a ojo:

1. **Con límites bajos, la alerta de FR-016 no saltaba nunca.** Con el umbral del 80% a secas, un
   límite de 3 avisaría a las 2.4 faltas —es decir, jamás, porque las faltas son enteras— y el
   estudiante pasaba de "vas bien" a "alcanzaste el límite" sin aviso intermedio. Ocurría en todos
   los límites de **1 a 4**, justo los de las materias de una sesión por semana, donde cada falta
   pesa más. `absenceStatus` avisa ahora también cuando queda una sola falta de margen. La suite
   incluye una comprobación que recorre los límites de 1 a 40 y exige que ninguno pase de "bien" a
   "alcanzado" sin avisar.
2. **`PATCH` de una falta con cuerpo vacío borraba la nota.** `absenceNoteSchema` convierte el
   `undefined` de una nota ausente en `null` —para no tener dos formas de decir "sin nota"—, así
   que tras transformar, `note` nunca valía `undefined` y el `refine` de "algo que actualizar"
   nunca se activaba: un `PATCH {}` pasaba la validación y vaciaba la nota. El esquema de edición
   define ahora su propio `note` opcional de verdad, que distingue "no lo mandes" de "déjalo
   vacío".

**Nota sobre los tipos de Zod**: los esquemas con `transform` o `default` exportan dos tipos —
`…Input` (lo que manda el cliente) y `…Parsed` (lo que valida el servidor)—. Sin esa separación,
`note` salía obligatorio en el cliente y justificar una falta exigía repetir la nota que ya tenía.

**Nota de verificación**: el emulador se arrancó con `-no-window` (esta sesión no tiene display).
`adb shell input text` no teclea `ñ`, así que la cuenta de prueba en dispositivo usa una contraseña
ASCII; el flujo con caracteres acentuados ya está cubierto por las suites de API y web.

---

#### Fase 2 — Horario · cerrada el 2026-08-16

**Entregado**: materias con sus sesiones semanales —día, hora de inicio y fin, aula— con alta,
edición y borrado en ambos clientes (FR-005); el prompt para la IA disponible desde la interfaz
(FR-006); importación del JSON que devuelve esa IA (FR-007) con informe preciso de lo descartado
(FR-008); vista semanal en rejilla (FR-009) con un color por materia (FR-010).

**El flujo de importación, auditado**. El plan pedía revisar la comodidad del flujo de la v1. Se
revisó el código original (`_respaldo_v1_20260816/`) y tenía tres problemas de fondo, corregidos:

| Problema de la v1 | Qué hace ahora |
|---|---|
| **No validaba nada**: lo que la IA devolviera entraba tal cual en la base de datos, así que una hora mal escrita se guardaba y rompía la vista después | Cada materia y cada sesión se valida; lo que no pasa se descarta **con su motivo** ("Materia 3, sesión 2: el día no se reconoce"), sin tumbar el resto de la importación |
| **Reimportar duplicaba el horario en silencio**: `POST /importar` siempre añadía | Se analiza primero y se devuelve una **vista previa** que marca qué materias ya existen; el usuario elige entre añadir y reemplazar |
| **Sin vista previa**: se pegaba y se escribía | Nada se escribe hasta confirmar; el análisis es de solo lectura |

Además se redujo la fricción de pegar: se aceptan las envolturas que la IA suele añadir —bloques
` ```json `, texto antes o después, `{"materias": [...]}`— y las variantes de formato (`7:00`,
`07:00:00`, `Miércoles`/`miercoles`/`1`), en vez de exigir un pegado limpio a mano.

**Decisiones de diseño**:

| Decisión | Por qué |
|---|---|
| **Importar en dos pasos** (vista previa → confirmar) | Es la corrección del fallo de la v1: el usuario decide con la información delante en vez de descubrir el duplicado después |
| El paso de confirmación **reenvía el texto**, no un identificador | El análisis es determinista, así que no hace falta guardar estado en el servidor entre los dos pasos |
| Las horas se guardan como **`time`**, no `timestamp` | Una clase de los lunes a las 07:00 es una hora de reloj recurrente; con `timestamp` el horario se desplazaría al cambiar de huso o con el horario de verano |
| `schedule_blocks` lleva **`user_id` propio** | Permite filtrar y borrar por usuario sin JOIN, y deja el aislamiento explícito en cada fila (Principio III) |
| **Se rechazan los solapes** entre materias | Nadie está en dos clases a la vez; permitirlo dejaría ambiguo el conteo de faltas de la Fase 3. Dos clases consecutivas (una acaba a las 09:00 y otra empieza a las 09:00) sí se permiten |
| Nombres duplicados rechazados **ignorando acentos y mayúsculas** | Para el estudiante "Cálculo" y "calculo" son la misma materia; tener las dos solo confunde al registrar faltas |
| **Se retiró el campo `paquete`** de la v1 | Decisión del usuario: el grupo no se usa en ninguna pantalla |
| **Sin `expo-router` todavía** | La Fase 1 lo previó para aquí, pero con inicio y horario no compensa; entra cuando haya pestañas de verdad (fases 3 a 5) |

**Verificación ejecutada** — 140 comprobaciones, todas en verde:

| Suite | Qué prueba | Resultado |
|---|---|---|
| Lógica compartida (Node) | Normalización de horas y días, solapes, rotación de color, rango de la rejilla, y el analizador de importación con casos sucios | **51/51** |
| API (`curl` contra la API real) | Alta, edición, borrado, validación, solapes, aislamiento entre cuentas, vista previa, importación en ambos modos y transaccionalidad | **60/60** |
| Web (Playwright, navegador real) | Alta manual, validación, rechazo de solape, importación de principio a fin, reimportación, edición, persistencia, borrado y ruta protegida | **29/29** |

**Verificación en Android real** (emulador Pixel 6, Android 15, APK de release instalado):

| Comprobación | Resultado |
|---|---|
| La app arranca y muestra la tarjeta "Tu horario" | correcto |
| Pantalla de horario vacío, hablando con la API | correcto |
| Pantalla de importación: prompt visible y botón de pegar | correcto |
| Alta de materia desde la interfaz táctil (nombre, color, día, aula) | creada y guardada en PostgreSQL con su color |
| La rejilla pinta el bloque en su día y hora, con aula | correcto |
| Horario **importado desde la web** visible en la **app** | 2 materias y 3 sesiones idénticas |
| Misma disposición, colores, aulas y horas que en el navegador | **paridad confirmada** |

**Corregido durante la fase**:

1. **Los errores de solape no llegaban al usuario.** La API los señala en el campo `blocks.N`,
   pero ningún control del formulario está atado a esa clave, y `toFormErrors` (de la Fase 1)
   descarta el mensaje general cuando hay errores por campo. Resultado: la materia no se creaba
   y la pantalla no explicaba por qué. Se añadió `withBlockMessage()` en el formulario de **web
   y app**, que sube esos mensajes a general. Sin esto, el usuario habría visto un formulario que
   simplemente no responde.
2. **`calculateAbsenceLimit` no se tocó**, pero conviene anotar que el orden de las sesiones
   importadas se corrigió durante el desarrollo: se ordenaban solo por hora, así que una materia
   con clase el viernes y el lunes salía en la vista previa en orden inverso al de la semana.

**Añadido**: `expo-clipboard`, para copiar el prompt y pegar la respuesta de la IA desde la app.

**Nota de verificación**: el emulador se arrancó con `-no-window` (esta sesión no tiene display;
sin esa bandera, Qt aborta). Además, `adb shell input text` no puede teclear `{` ni `}`, así que
la importación en la app se verificó comprobando que muestra correctamente un horario importado
desde la web —que es justo lo que exige la paridad—, mientras que el flujo completo de pegado se
cubrió en las suites de API y web.

---

#### Fase 1 — Cuentas y sesión · cerrada el 2026-08-16

**Entregado**: registro y login con correo, contraseña, nombre mostrado y `@usuario` único
(FR-001, FR-004); sesión simultánea e independiente en app y web (FR-002); aislamiento de datos
por usuario verificado en el servidor (FR-003); perfil editable, cambio de contraseña y gestión
de dispositivos con cierre remoto de sesiones.

**Decisiones de diseño**:

| Decisión | Por qué |
|---|---|
| Login por **correo**, `@usuario` para lo social | El `@usuario` lo pide FR-004 y lo usará la búsqueda de la Fase 8; el correo deja la puerta abierta a recuperar contraseña |
| **Cookies `httpOnly`** en web, **SecureStore** en la app | En web, un XSS no puede leer la sesión porque el token no es accesible desde JavaScript. En la app no hay cookies, y el Keystore de Android cifra los tokens |
| **Access + refresh token** con sesión en base de datos | Cerrar sesión surte efecto de inmediato en vez de esperar a que caduque el token, y cada dispositivo se cierra por separado (FR-002) |
| El refresh token **rota** en cada uso | Un token robado deja de servir en cuanto el legítimo renueva |
| Contraseñas con **bcrypt**, 12 rondas | Se eligió `bcryptjs` (JS puro) sobre `bcrypt` (nativo): el `allowScripts` del entorno bloquea la compilación del segundo |
| Sin librería de navegación en la app | Con tres pantallas no compensa; entra `expo-router` en la Fase 2, cuando lleguen las pestañas |

**Verificación ejecutada** — 123 comprobaciones, todas en verde:

| Suite | Qué prueba | Resultado |
|---|---|---|
| API (`curl` contra la API real) | 10 bloques: validación, duplicados, login, sesiones, aislamiento, rutas protegidas, perfil, rotación de tokens, cambio de contraseña, límite de intentos | **56/56** |
| Web (Playwright, navegador real) | Registro, cookies `httpOnly`, persistencia al recargar, rutas protegidas, perfil, dispositivos, logout, errores | **28/28** |
| App (cliente real contra la API) | Registro, validación, sesión persistente, renovación automática, perfil, convivencia con la web, aislamiento, logout | **26/26** |
| Paridad (navegador + cliente de app a la vez) | Cuenta creada en un cliente y usada en el otro, cambios cruzados, aislamiento entre cuentas | **13/13** |

**Verificación en Android real** (emulador Pixel 6, Android 15, APK de release instalado):

| Comprobación | Resultado |
|---|---|
| La app arranca y muestra la pantalla de entrada | correcto |
| Registro completo desde la interfaz táctil | usuario y sesión `mobile` creados en PostgreSQL |
| Pantalla de inicio con nombre, `@usuario` y dispositivos | correcto |
| Sesión persistente tras cerrar y reabrir la app | la restaura desde SecureStore |
| Cambio hecho en la **web** visible en la **app** | correcto |
| La app lista su sesión **y** la del navegador | correcto |
| Cerrar la sesión del navegador **desde la app** | 2 sesiones → 1; la web queda fuera |

**Corregido durante la fase**:

1. **El límite de intentos respondía 500 en vez de 429.** `errorResponseBuilder` de
   `@fastify/rate-limit` devolvía un objeto plano sin `statusCode`, que el manejador de errores
   no reconocía y trataba como fallo interno. Ahora devuelve un `AppError`. El usuario habría
   visto "error inesperado" en lugar de "espera un momento".
2. **La app no podía hablar con la API en el APK de release.** Android bloquea HTTP sin cifrar
   desde Android 9 y Expo no declara excepción alguna. Se añadió el plugin
   [`with-dev-cleartext.js`](apps/mobile/plugins/with-dev-cleartext.js), que permite cleartext
   **solo** hacia `localhost`, `127.0.0.1` y `10.0.2.2`; producción sigue exigiendo HTTPS.
3. **Los mensajes de campo obligatorio salían en inglés.** Zod 4 emite "expected string, received
   undefined" por defecto, y esos textos se muestran tal cual en el formulario. Se añadió
   `requiredString()` en `shared`.
4. **El límite de login era demasiado estricto.** 10 intentos por IP cada 15 minutos dejaba fuera
   a varios estudiantes tras un mismo NAT (casa o residencia) si uno se equivocaba. Subido a 30,
   que sigue haciendo inviable la fuerza bruta.

**Retirado**: `@react-native-async-storage/async-storage`, que entró como dependencia pero no se
usa — los tokens van en SecureStore, no en almacenamiento en claro.

**Nota de entorno**: se instaló el SDK de Android y un JDK 21 en `~/jdks/` para poder verificar en
dispositivo. El Java del sistema es solo JRE (sin compilador) y el 21 de Ubuntu no trae `javac`.
Metro usa el **puerto 8083**: el 8081 lo ocupa `qbittorrent-nox`, igual que el 3001 lo ocupa Koko.

**Pendiente que hereda la Fase 2**: `apps/mobile/android/` lo genera `expo prebuild` y no se
versiona; quien clone el repositorio debe ejecutar `npx expo prebuild --platform android` antes de
compilar.

---

#### Fase 0 — Cimientos · cerrada el 2026-08-16

**Entregado**: monorepo npm workspaces (`apps/api`, `apps/web`, `apps/mobile`,
`packages/shared`) con TypeScript estricto compartido; Docker Compose con PostgreSQL 17; Drizzle
con la primera migración aplicada; API Fastify con `/health`; web Next.js 15; app Expo 52.

**Verificación ejecutada**:

| Comprobación | Resultado |
|---|---|
| `npm run typecheck` en las 4 capas | sin errores en modo estricto |
| PostgreSQL en contenedor | `healthy` |
| Migración `0000` generada y aplicada | tabla `users` creada |
| `GET /health` | `200` · `{"status":"ok","database":"up"}` |
| Web Next.js | `200`, renderiza valores calculados por `shared` |
| Bundle de Android (`expo export`) | 560 módulos, `calculateAbsenceLimit` incluido |
| Tipo de `shared` importado desde api + web + mobile | correcto en las tres |

**Corregido durante la fase**: `calculateAbsenceLimit` devolvía 15 en lugar de 16 faltas para 80
sesiones. La causa era `1 - 0.8 = 0.19999999999999996` en coma flotante, que `Math.floor`
truncaba a la baja. Ahora el cálculo usa aritmética entera (`sessions * 20 / 100`) y está
verificado con 8 casos. El fallo habría restado una falta de margen a cada materia en la Fase 3.

**Decisión**: el puerto por defecto de la API pasó de 3001 a **3101**, porque el 3001 ya lo ocupa
de forma permanente otro servicio del equipo (Koko Signaling).

**Actualización de dependencias (mismo día, tras cerrar la fase)**: se subió todo el stack a las
versiones vigentes y se reverificó cada capa.

| | Antes | Ahora |
|---|---|---|
| Node | 18.19.1 (EOL) | **24.19.0 LTS** (`nvm default`) |
| PostgreSQL | 17 | **18.6** |
| Next.js | 15.5 | **16.3** |
| React | 18.3 | **19.2** |
| Expo SDK | 52 | **57** |
| React Native | 0.76 | **0.86** |
| Tailwind | 3.4 | **4.3** |
| Drizzle ORM | 0.38 | **0.45** |
| Zod | 3.25 | **4.4** |

`npm audit`: de **30 vulnerabilidades (1 crítica)** a **22, ninguna crítica**. Las restantes
provienen de las CLI de desarrollo de Expo y React Native (`@expo/cli`,
`@react-native/community-cli-plugin`, `@esbuild-kit`), no de código que llegue al dispositivo ni
al servidor, y ya están en el último SDK disponible.

Cambios que exigió la actualización:
- **Tailwind 4**: `tailwind.config.ts` eliminado; la configuración pasa a `globals.css` con
  `@import 'tailwindcss'` y directivas `@source`. El plugin de PostCSS ahora es
  `@tailwindcss/postcss` y autoprefixer ya no hace falta.
- **Expo 57**: `babel-preset-expo` dejó de venir incluido y hubo que declararlo como dependencia.
  `@types/react` tuvo que subir a 19 porque RN 0.86 lo exige.
- **PostgreSQL 18**: cambió el punto de montaje esperado a `/var/lib/postgresql` (antes
  `/var/lib/postgresql/data`). El volumen se recreó; la base solo tenía la tabla vacía de prueba.
- **TypeScript**: se mantiene en 5.9. La versión 7 es la reescritura nativa, demasiado reciente
  para asentar sobre ella un proyecto que empieza.

---

## 3. Estructura de Carpetas

```
.
├── PROYECTO.md              ← este documento (estado y avance)
├── README.md                presentación del proyecto
├── .env.example             plantilla de configuración
│
├── apps/
│   ├── api/                 backend — Fastify + Drizzle
│   │   └── src/
│   │       ├── db/          esquema y migraciones versionadas
│   │       ├── routes/      endpoints por dominio (health, auth, schedule, attendance,
│   │       │                agenda, calendar, share, semester, social, messaging)
│   │       ├── middleware/  autenticación: único lugar que fija quién eres
│   │       ├── services/    lógica de negocio (Principio II)
│   │       └── lib/         tokens, contraseñas, cookies, errores, validación
│   │
│   ├── web/                 aplicación web — Next.js + Tailwind
│   │   └── src/
│   │       ├── app/         rutas (/, /entrar, /registro, /perfil, /horario, /faltas,
│   │       │                /agenda, /calendario, /compartir, /compartido/[code],
│   │       │                /semestres)
│   │       ├── components/  componentes propios de web
│   │       └── lib/         cliente de API y contexto de sesión
│   │
│   └── mobile/              app Android — React Native + Expo
│       ├── plugins/         plugins de configuración nativa (cleartext local)
│       ├── android/         generado por `expo prebuild` — NO se versiona
│       └── src/
│           ├── screens/     Entrar, Registro, Inicio, Horario, Faltas, Agenda, Calendario,
│           │                Compartir, Semestres, Social, Mensajes
│           ├── components/  componentes propios de la app (incluye QR y escáner de cámara)
│           └── lib/         cliente de API, contexto de sesión y notificaciones locales
│
├── packages/
│   └── shared/              tipos de dominio, validaciones y lógica común
│       └── src/
│           ├── types/       entidades (Usuario, Sesión, Materia, Falta, Actividad…)
│           ├── schemas/     validaciones compartidas
│           ├── api/         cliente HTTP, llamadas tipadas y canal en vivo, para web y app
│           └── logic/       reglas puras (límite y alerta de faltas, horario, importación,
│                            urgencia y orden de la agenda, rejilla mensual y momento de los
│                            recordatorios, códigos y estado de los compartidos, codificador
│                            de QR, ciclo y archivo de semestres, relación entre personas y
│                            visibilidad del perfil, cache y cola sin conexión, quién puede
│                            escribir a quién, errores de formulario, fechas)
│
├── infra/                   Docker Compose y despliegue
│
├── specs/
│   └── 001-plataforma-academica/
│       ├── spec.md          especificación funcional
│       └── plan.md          plan de implementación
│
└── .specify/
    └── memory/
        └── constitution.md  principios del proyecto
```

**Convención**: cada fase toca las tres capas (`api`, `web`, `mobile`). Lo compartido entre web y
app va en `packages/shared` para no duplicar.

---

## 4. Información del Proyecto

### 4.1 Qué es

**NoteCore** — el núcleo de tu vida académica. Reúne horario de clases, control de faltas y agenda
de tareas en un solo lugar, con compartición entre compañeros.

**Dos clientes, mismo producto**:
- **App Android** (principal) — instalación por `.apk`, nombre de paquete `net.ourocore.notecore`
- **Web** (PC y móvil) — en `notecore.ourocore.net`, para quien no instala la app y para usuarios
  de iPhone

**Identidad**: el nombre une *Note* (las notas, el horario, la agenda) con *Core* (el núcleo donde
se centraliza todo), y enlaza con la marca **OuroCore**.

| | |
|---|---|
| Repositorio | https://github.com/BrianTz79/NoteCore |
| Web | `notecore.ourocore.net` |
| Paquete Android | `net.ourocore.notecore` |
| Scope npm | `@notecore/*` |

### 4.2 Principios rectores

1. **Paridad de plataformas** — toda función existe y se verifica en app y web
2. **Backend fuente única de verdad** — sin lógica de negocio duplicada
3. **Aislamiento estricto de datos** — ningún usuario ve datos de otro
4. **Compartir es copia, no sincronización** — el receptor obtiene material propio
5. **Offline-first en la app** — lo ya cargado se consulta sin conexión
6. **Los datos históricos no se borran** — los semestres se archivan
7. **Los presets normativos son orientativos** — el límite de faltas se confirma con el profesor
8. **Tipado estricto y código compartido** — los tipos se definen una vez y se usan en las tres capas

### 4.3 Stack

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| Lenguaje | **TypeScript 5.9** (estricto) | Tipos compartidos entre las tres capas: si un campo cambia, el compilador señala dónde rompe |
| App Android | **React Native 0.86 + Expo SDK 57** | Nueva Arquitectura estable; genera `.apk`, y cubre notificaciones, cámara/QR y widgets |
| Web | **Next.js 16 + Tailwind CSS 4** | Comparte componentes y lógica React con la app; evita escribir cada pantalla dos veces |
| Backend | **Node.js 24 + Fastify 5** | Rápido, con validación de esquemas integrada |
| Base de datos | **PostgreSQL 18 + Drizzle ORM** | Migraciones versionadas con tipos derivados del esquema |
| Compartido | **`packages/shared`** | Tipos de dominio, validaciones y componentes comunes a web y app |
| Infraestructura | **Docker Compose + Cloudflare Tunnel** | Igual que la v1, ya probado |

**Decisión de stack (2026-08-16)**: se sustituyó Astro por Next.js. Astro brilla en sitios de
contenido, pero este producto es una aplicación con sesión, estado y muchas pantallas
interactivas. Con Next.js, web y app comparten React, lo que hace viable el Principio I (paridad)
sin duplicar cada pantalla. Como efecto secundario desaparece la restricción de esbuild que
arrastraba la v1.

### 4.4 Detalle de fases

#### Fase 0 — Cimientos
Monorepo TypeScript con workspaces. Docker Compose de desarrollo (PostgreSQL + API + web). Drizzle
configurado con la primera migración. API Fastify que responde. Web Next.js que carga. Proyecto
Expo compilando a `.apk`. Paquete `shared` consumido por las tres capas.
**Verificación**: los tres servicios levantan, la app instala en un dispositivo, y un tipo definido
en `shared` se importa correctamente desde `api`, `web` y `mobile`.

#### Fase 1 — Cuentas y sesión (P1) ✅
Registro, login y perfil con nombre mostrado y nombre de usuario único (`@usuario`). Sesión
simultánea en app y web. Aislamiento de datos por usuario.
**Verificado el 2026-08-16**: misma cuenta activa en emulador Android y navegador a la vez, con
cambios cruzados en ambos sentidos y sin acceso entre cuentas. Detalle en el historial de cierres.

#### Fase 2 — Horario (P1) ✅
Materias y sesiones (día, hora, aula). Alta manual e importación del JSON generado por IA a partir
de una foto del horario; la app proporciona el prompt. Vista semanal.
**Auditoría del flujo de importación hecha**: la v1 no validaba, duplicaba el horario al reimportar
y no mostraba vista previa. Las tres cosas están corregidas (detalle en el historial de cierres).
**Verificado el 2026-08-16**: un horario importado desde la web se ve idéntico en el emulador
Android, con las mismas materias, colores, aulas y horas.

#### Fase 3 — Control de faltas (P1) ✅
Registro por día completo o por materia/hora. Conteo por materia. Límite sugerido = 20% de las
sesiones del semestre, derivado de la norma TecNM de **80% de asistencia mínima** —por debajo, el
profesor registra NP. Siempre editable y siempre con la recomendación de confirmarlo con el
profesor. Alertas de proximidad.
**Las sesiones del semestre se estiman** con un ajuste de semanas por usuario (16 por defecto),
porque el semestre con fechas llega en la Fase 7.
**Verificado el 2026-08-16**: una falta marcada en la web se ve igual en el emulador Android, y lo
marcado, justificado y ajustado desde la app se lee igual desde la web. Detalle en el historial.

#### Fase 4 — Agenda (P1) ✅
Tareas, proyectos, exámenes y actividades. Materia y fecha límite opcionales, estado de
completado que **conserva** el registro, y borrado como acción aparte. Las pendientes se ordenan
por proximidad de vencimiento, con **lo vencido primero**.
**La urgencia la calcula el servidor**: derivarla en el cliente usaría el reloj del dispositivo,
y la misma tarea saldría "vence hoy" en uno y "venció ayer" en el otro.
**Verificado el 2026-08-17**: una agenda creada en la web se ve igual en el emulador Android, y
lo creado, editado y completado desde la app se lee igual desde la web. Detalle en el historial.

#### Fase 5 — Calendario y recordatorios (P2) ✅
Calendario mensual que combina clases y vencimientos, con detalle por día que incluye horas, aula
y las faltas registradas. Recordatorios con anticipación configurable (el mismo día, 1, 2, 3 días
o una semana) y hora del aviso, con notificación local en Android.
**La hora del aviso es un ajuste del usuario, no un campo de cada entrega**: las actividades
guardan el día sin hora (Fase 4), y darles hora reabriría el problema de husos que esa decisión
cerró.
**Verificado el 2026-08-17**: el aviso quedó programado en el sistema Android
(`RTC_WAKEUP` para el día y hora exactos) y se canceló al completar la actividad desde la web
—verificado con `dumpsys alarm`: 0 alarmas—. Detalle en el historial.

#### Fase 6 — Compartir (P2) ✅
Horarios y actividades por QR, código corto y enlace —las tres entregan lo mismo, porque las tres
salen del mismo código. El emisor elige el contenido; el receptor ve vista previa y, al aceptar,
obtiene una copia independiente. Revocación y caducidad a los 30 días.
**El compartido guarda una copia congelada del contenido**, no referencias: así sobrevive a que el
emisor edite o borre el original, y la vista previa es fiel aunque se acepte una semana después.
**El codificador QR es propio y vive en `shared`**, para que app y web generen la misma matriz.
**Verificado el 2026-08-17**: el emisor renombró y borró sus materias desde la web y el horario
copiado en el emulador Android quedó intacto; el QR mostrado en la pantalla del emulador se
decodificó y devolvió el enlace correcto. Detalle en el historial.

#### Fase 7 — Semestres (P2) ✅
Iniciar semestre nuevo explicando antes su efecto. El anterior se archiva íntegro y queda
consultable de forma indefinida, protegido contra modificación en el servidor.
**El semestre es el ámbito de lo académico, no una copia de ello**: cerrar uno no borra ni duplica
una sola fila —solo cambia su estado—, así que el Principio VI se cumple por construcción.
**Verificado el 2026-08-17**: el semestre se cerró desde el emulador Android y el archivo se leyó
idéntico en el navegador; el nuevo arrancó vacío en horario, faltas y agenda mientras el anterior
conservaba sus 2 materias, 3 sesiones, 1 falta y 1 actividad en PostgreSQL. Detalle en el
historial.

#### Fase 8 — Social: perfiles y contactos (P3)
Perfil con nombre mostrado y `@usuario`. Búsqueda por nombre de usuario, agregado por QR o enlace.
Solicitudes con aceptación, eliminación y bloqueo.
**Verificación**: dos cuentas se conectan por búsqueda y por QR.

#### Fase 9 — Offline y sincronización (P2) ✅
Cache local de horario, agenda y faltas. Cola de cambios sin conexión, sincronizados al recuperar
red, con indicador de pendientes.
**Verificación**: en modo avión se consulta todo lo cargado y los cambios suben al reconectar.

#### Fase 10 — Mensajería (P3) ✅
Conversaciones de texto entre contactos aceptados, con entrega en tiempo real por WebSocket.
Bloqueo efectivo. Acuse de leído, conteo de no leídos y borrado de mensajes propios.
**Poder escribir no se guarda: es el estado de la relación**, consultado a `contacts` en cada
envío. Por eso un bloqueo surte efecto en el acto sobre una conversación ya abierta, en lugar de
esperar a que algo refresque una copia. FR-044 cuelga entero de `contactViewpoint`, que la Fase 8
dejó resuelto.
**A quien bloquean se le dice lo mismo que a un desconocido**: distinguirlo sería anunciarle el
bloqueo, que es justo lo que empuja a insistir por otra vía.
**Verificado el 2026-08-17**: con el hilo abierto en el emulador Android, un mensaje escrito desde
fuera apareció solo y el acuse pasó a «Leído» solo; al bloquear, el campo de texto desapareció solo
y la palabra «bloqueo» no aparece en ninguna parte de la jerarquía de vistas. Detalle en el
historial.

#### Fase 11 — Widget y pulido visual (P4)
Widget de pantalla principal con la vista semanal. Pasada de diseño integral con **hallmark** sobre
el producto ya funcional. Preparación para distribución.
**Verificación**: el widget refleja datos reales y abre la vista correspondiente.

### 4.5 Fuera de alcance

- App nativa para iOS (los usuarios de iPhone usan la web)
- Integración con sistemas escolares oficiales
- Calificaciones y promedios
- Toma de asistencia por profesores (el registro es autorreportado)
- Mensajería grupal, archivos adjuntos y llamadas
- Sincronización bidireccional continua de contenido compartido

---

## 5. Documentos de Referencia

| Documento | Contenido |
|-----------|-----------|
| [`.specify/memory/constitution.md`](.specify/memory/constitution.md) | Los 8 principios, en detalle |
| [`specs/001-plataforma-academica/spec.md`](specs/001-plataforma-academica/spec.md) | Historias de usuario y los 51 requisitos |
| [`specs/001-plataforma-academica/plan.md`](specs/001-plataforma-academica/plan.md) | Plan técnico de las 12 fases |
| [`README.md`](README.md) | Presentación del proyecto |

---

## 6. Notas

### Sobre la v1

La versión anterior fue **eliminada por completo** el 2026-08-16: contenedores detenidos, volumen
de base de datos borrado y código retirado. Contenía únicamente datos de prueba.

Queda un respaldo local en `_respaldo_v1_20260816/` —código, `.env` original y dump de la base de
datos— que **no se sube al repositorio** por contener secretos reales. Es descartable.

### Herramientas del proyecto

- **spec-kit** — comandos `/speckit-*` para el flujo de especificación y planificación
- **hallmark** — skill de diseño de UI, se usará en la Fase 11

### Infraestructura Cloudflare

La zona `ourocore.net` sirve todos los subdominios como `CNAME → <túnel>.cfargotunnel.com`
con proxy activado.

**Arreglado el 2026-08-16**: `ourocore.net` (sin `www`) devolvía 404. El registro DNS del apex
estaba bien, pero la Redirect Rule creada desde la plantilla de Cloudflare usaba el patrón
`https://ourocore.net` **sin comodín final**, que nunca coincidía porque Cloudflare normaliza las
peticiones a `https://ourocore.net/` con barra. Corregida a `https://ourocore.net/*`: ahora
responde 301 al `www` preservando ruta y query.

**Pendiente**: crear el túnel de `notecore.ourocore.net` apuntando a `web:3000`, con el servicio
`cloudflared` en `infra/docker-compose.yml`. Estaba previsto al cerrar la Fase 1 y **no se hizo**:
la fase se verificó entera en local (emulador Android + navegador), que es lo que exige la regla
de cierre, y exponer al exterior no añadía nada a esa verificación.

Cuando se monte, hay dos cosas que atender por lo hecho en la Fase 1:
- **`COOKIE_DOMAIN`** debe valer el dominio que compartan web y API para que la cookie de sesión
  viaje entre ambas.
- El plugin `with-dev-cleartext.js` solo abre HTTP hacia direcciones locales, así que la app
  apuntando al túnel irá por HTTPS sin tocar nada.

**Limpieza de la v1 (2026-08-16)**: eliminados el túnel `Horarios-Universidad-OuroCore` y su
registro `horarios.ourocore.net`, que quedaban de la versión retirada. Verificado que el resto de
subdominios sigue respondiendo y que ya no queda ningún túnel caído.

### Decisiones tomadas

- **Nombre**: NoteCore — *Note* (horario, agenda, notas) + *Core* (el núcleo que lo centraliza),
  en línea con la marca OuroCore
- **Repositorio**: https://github.com/BrianTz79/NoteCore
- **Web**: `notecore.ourocore.net`
- **Stack**: revisado el 2026-08-16 (ver sección 4.3)
