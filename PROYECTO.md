# NoteCore — Estado del Proyecto

> **Documento vivo.** Se actualiza al cerrar cada fase.
> Última actualización: **2026-08-16**

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
| **Estado general** | Horario y control de faltas funcionando en app y web |
| **Fases completadas** | 4 de 12 |
| **Fase actual** | Fase 4 — Agenda (no iniciada) |
| **Bloqueos** | Ninguno |
| **Repositorio** | https://github.com/BrianTz79/NoteCore |

**Avance**: `████░░░░░░░░` 33%

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

### Próximo paso

**Fase 4 — Agenda**: tareas, proyectos y actividades con materia y fecha límite opcionales, y
estado de completado.

---

## 2. Fases

**Leyenda**: ✅ Hecha · 🔄 En curso · 🔍 En revisión · ⬜ Pendiente · ⏸️ Bloqueada

| # | Fase | Prio | Estado | API | Web | App |
|---|------|------|--------|-----|-----|-----|
| 0 | Cimientos | — | ✅ | ✅ | ✅ | ✅ |
| 1 | Cuentas y sesión | P1 | ✅ | ✅ | ✅ | ✅ |
| 2 | Horario | P1 | ✅ | ✅ | ✅ | ✅ |
| 3 | Control de faltas | P1 | ✅ | ✅ | ✅ | ✅ |
| 4 | Agenda | P1 | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | Calendario y recordatorios | P2 | ⬜ | ⬜ | ⬜ | ⬜ |
| 6 | Compartir | P2 | ⬜ | ⬜ | ⬜ | ⬜ |
| 7 | Semestres | P2 | ⬜ | ⬜ | ⬜ | ⬜ |
| 8 | Social: perfiles y contactos | P3 | ⬜ | ⬜ | ⬜ | ⬜ |
| 9 | Offline y sincronización | P2 | ⬜ | ⬜ | ⬜ | ⬜ |
| 10 | Mensajería | P3 | ⬜ | ⬜ | ⬜ | ⬜ |
| 11 | Widget y pulido visual | P4 | ⬜ | ⬜ | ⬜ | ⬜ |

### Regla de cierre

Una fase se cierra cuando funciona **en app y en web**. Al cerrarla:
1. Marcar ✅ en esta tabla
2. Registrar la fecha y la verificación en el historial de abajo
3. Actualizar el reporte resumen
4. Hacer commit: `feat(faseN): descripción`

### Historial de cierres

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
│   │       ├── routes/      endpoints por dominio (health, auth, schedule, attendance)
│   │       ├── middleware/  autenticación: único lugar que fija quién eres
│   │       ├── services/    lógica de negocio (Principio II)
│   │       └── lib/         tokens, contraseñas, cookies, errores, validación
│   │
│   ├── web/                 aplicación web — Next.js + Tailwind
│   │   └── src/
│   │       ├── app/         rutas (/, /entrar, /registro, /perfil, /horario, /faltas)
│   │       ├── components/  componentes propios de web
│   │       └── lib/         cliente de API y contexto de sesión
│   │
│   └── mobile/              app Android — React Native + Expo
│       ├── plugins/         plugins de configuración nativa (cleartext local)
│       ├── android/         generado por `expo prebuild` — NO se versiona
│       └── src/
│           ├── screens/     Entrar, Registro, Inicio, Horario, Faltas
│           ├── components/  componentes propios de la app
│           └── lib/         cliente de API y contexto de sesión
│
├── packages/
│   └── shared/              tipos de dominio, validaciones y lógica común
│       └── src/
│           ├── types/       entidades (Usuario, Sesión, Materia, Falta, errores de API…)
│           ├── schemas/     validaciones compartidas
│           ├── api/         cliente HTTP y llamadas tipadas, para web y app
│           └── logic/       reglas puras (límite y alerta de faltas, horario, importación,
│                            errores de formulario, fechas de calendario)
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

#### Fase 4 — Agenda (P1)
Tareas, proyectos y actividades. Materia y fecha límite opcionales, estado de completado.
**Verificación**: actividad creada en un cliente se edita desde el otro.

#### Fase 5 — Calendario y recordatorios (P2)
Calendario que combina clases y vencimientos, con detalle por día. Recordatorios con anticipación
configurable y notificación en el dispositivo.
**Verificación**: la notificación llega a tiempo y se cancela al completar la actividad.

#### Fase 6 — Compartir (P2)
Horarios y actividades por QR, código corto y enlace —las tres entregan lo mismo. El emisor elige
el contenido; el receptor ve vista previa y, al aceptar, obtiene una copia independiente.
Revocación y caducidad.
**Verificación**: la copia no cambia cuando el emisor edita su original.

#### Fase 7 — Semestres (P2)
Iniciar semestre nuevo desde configuración. El anterior se archiva íntegro y queda consultable de
forma indefinida, protegido contra modificación accidental.
**Verificación**: el nuevo arranca vacío y el anterior conserva todo.

#### Fase 8 — Social: perfiles y contactos (P3)
Perfil con nombre mostrado y `@usuario`. Búsqueda por nombre de usuario, agregado por QR o enlace.
Solicitudes con aceptación, eliminación y bloqueo.
**Verificación**: dos cuentas se conectan por búsqueda y por QR.

#### Fase 9 — Offline y sincronización (P2)
Cache local de horario, agenda y faltas. Cola de cambios sin conexión, sincronizados al recuperar
red, con indicador de pendientes.
**Verificación**: en modo avión se consulta todo lo cargado y los cambios suben al reconectar.

#### Fase 10 — Mensajería (P3)
Conversaciones de texto entre contactos aceptados. Bloqueo efectivo.
**Nota**: la fase más costosa y la que más superficie de privacidad abre. Deliberadamente al final.
**Verificación**: mensajes entre contactos se entregan; entre no contactos se rechazan.

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
