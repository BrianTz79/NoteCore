# NoteCore — Estado del Proyecto

> **Documento vivo.** Se actualiza al cerrar cada fase.
> Última actualización: **2026-08-21** (fases 26 a 29 cerradas: privacidad antes de entrar, aviso de la siguiente clase, botones en la notificación y consejos en el inicio)

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
| **Estado general** | Producto completo: horario, faltas, agenda, calendario con recordatorios **y aviso antes de cada clase**, compartición por QR/código/enlace, ciclo de **semestres o cuatrimestres** con archivo histórico, sección social, consulta sin conexión, mensajería en tiempo real, una **familia de cuatro widgets** de pantalla principal, **actualización de la app sin pasar por la tienda** e **identidad visual propia** (el ouroboros formando una C), sobre un **sistema de diseño único** que web y app derivan de los mismos tokens. Desde el 2026-08-21, además: **política de privacidad**, **borrado de cuenta**, **reporte de contenido** y un **panel de números** para quien opera el servicio. Ese mismo día quedó **listo para Google Play**: `.aab` firmado, actualizador apagado y la ficha escrita. Y se cerraron cuatro fases más de uso: la **política de privacidad accesible sin iniciar sesión**, el **aviso de la siguiente clase**, **botones de «Cumplida» y «Recordar más tarde» en la propia notificación** y **consejos en el inicio** que enseñan lo que la app sabe hacer |
| **Fases completadas** | 12 de 12 del plan original (Fase 0 a Fase 11) |
| **Fase actual** | Ninguna en curso. Cerradas y verificadas: las 12 del plan original, las 7 nuevas (12 a 18), **las siete del camino a Play Store (19 a 25)** y **las cuatro de uso (26 a 29)**. Ver la [sección 14](#14-fases-26-a-29--avisos-acciones-y-descubrimiento-2026-08-21) |
| **En producción** | **Sí**, desde el 2026-08-20 — web en https://notecore.ourocore.net y API en https://notecore-api.ourocore.net, tras el túnel de Cloudflare. APK firmado con clave propia. **Las fases 19, 20 y 25 se desplegaron el 2026-08-21**: `/privacidad`, `/borrar-cuenta` y `/panel` ya responden. Ver la [sección 7](#7-despliegue-en-producción-2026-08-20) |
| **Bloqueos** | Ninguno. Todas las fases están **desplegadas** desde el 2026-08-21, y el `.aab` de la **versión 0.3.0** (`versionCode 6`) está compilado y probado, listo para subir a Play Store. La clave de firma **ya tiene respaldo local verificado** en `~/respaldos-notecore/`, pero **sigue faltando una copia fuera de esta máquina** |
| **Repositorio** | https://github.com/BrianTz79/NoteCore |
| **Contacto público** | `ourocore.contacto@gmail.com` — el del proyecto, **nunca el personal**. Va en la política de privacidad, en la ficha de Play Store y en Data Safety. Ver la [sección 13](#13-el-correo-de-contacto-público-2026-08-21) |
| **Datos en producción** | **Ocho cuentas reales** al 2026-08-22: `@mizllet` y siete más con correo propio, creadas entre el 21 y el 22 de agosto — **ya hay gente usándolo**. Quedan además **17 de prueba** (`@ejemplo.mx`) de la verificación de las fases 26-29, pendientes de borrar. Ver la [sección 12](#12-limpieza-de-datos-de-prueba-2026-08-21) |

**Avance del plan original**: `████████████` 100% · **Fases nuevas (12-18)**: `███████` 7 de 7 ·
**Fases 19-25**: `███████` 7 de 7 · **Fases de uso (26-29)**: `████` 4 de 4

> **Nota de entorno**: compilar el APK exige un **JDK 21**. Durante esta fase solo estaba el JRE y
> hubo que instalarlo (`sudo apt install openjdk-21-jdk-headless`). Si Gradle sigue diciendo que el
> *toolchain* no tiene `JAVA_COMPILER` después de instalarlo, es el **demonio en caché**: `./gradlew
> --stop` y volver a compilar.

### Qué se ha hecho

- **Constitución** con 8 principios rectores del proyecto
- **Especificación**: 11 historias de usuario, 52 requisitos funcionales, 11 criterios de éxito
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

- **Fase 11 cerrada**: widget de pantalla principal con la próxima clase, y pasada de diseño
  integral sobre las 23 pantallas de los dos clientes. El hallazgo de la fase fue que **la paleta
  estaba escrita dos veces** —clases de Tailwind en la web, un objeto copiado a mano en la app— y
  coincidían por casualidad; ahora las dos salen de `packages/shared/src/design/tokens.ts`, con el
  sistema documentado en [`design.md`](design.md). El acento cambió porque el anterior **no pasaba
  el contraste mínimo** en texto pequeño. El widget **no decide qué clase mostrar**: la regla vive
  en `shared` y la ejecuta la app, que le deja el resultado resuelto —por eso la web, la app y la
  pantalla de inicio del teléfono dicen lo mismo a la misma hora—

- **Fase 13 cerrada**: identidad visual con el logo del ouroboros formando una C, en el icono de
  la app, el favicon de la web y la pantalla de entrada de los dos clientes. La geometría vive
  **una sola vez** en `packages/shared/src/design/logo.ts` —como datos, no como componente, igual
  que el QR de la Fase 6—, y cada cliente la pinta con su propio motor tomando el color de su
  propio sistema de diseño. El icono adaptativo de Android se generó con el dibujo **al 62% del
  lienzo** para no perder el borde en el recorte circular, verificado instalando el APK y abriendo
  el cajón de aplicaciones del emulador real

- **Fase 14 cerrada**: barra lateral fija de escritorio en la web, y las doce pantallas
  ensanchadas para aprovecharla —la app no se tocó, el síntoma era solo suyo—. La barra entra en
  un único punto, `RequireSession`, que ya envuelve a las doce pantallas más las dos de perfil y
  compartido ajenos: una pantalla nueva la hereda por estar ahí, no por acordarse de importarla.
  No aparece hasta los 1024px —por debajo de eso el árbol es idéntico al de antes de la fase—, y
  la lista de nueve secciones pasó a un solo archivo compartido entre la barra y la rejilla del
  inicio, para que las dos no puedan divergir

- **Fase 15 cerrada**: la sección social partida en **Muro, Mi perfil, Contactos y Ajustes**, en
  app y web. Medir antes de empezar cambió el tamaño de la fase: estaba escrita como una
  reorganización, pero el **muro no existía** —`GET /social/posts` devolvía solo las propias—, así
  que hubo que construirlo en la API. Se apoya en `listContacts` en vez de consultar `contacts`
  por su cuenta, para que un bloqueo saque a alguien del muro sin que haya dos definiciones de
  "contacto" que puedan divergir; verificado con tres cuentas contra la API real, incluido que lo
  que la visibilidad no permite **no viaja en la respuesta**

- **Fase 18 cerrada**: quien cursa **cuatrimestres** lleva su periodo como tal, en app y web. El
  tipo va en el **periodo** y no en la cuenta: si fuera un ajuste del usuario, cambiarlo
  reetiquetaría también el historial ya cerrado, y un archivado se cursó bajo el régimen que
  tenía. Medir antes de empezar cambió el tamaño de la fase por segunda vez: las semanas del
  periodo eran un ajuste **global** (`user_settings.semester_weeks`), así que un cuatrimestre de
  12 semanas habría recalculado el límite de faltas del semestre archivado; se movieron a
  `semesters.weeks`, y la migración copió el valor de cada usuario a sus periodos para que ningún
  límite existente cambiara de número —verificado sobre los 239 periodos reales, cero
  discrepancias—. La palabra sale de `SEMESTER_KIND_LABELS` en `shared`, junto a la de los estados,
  para que web y app no puedan llamar distinto al mismo periodo

- **Fase 16 cerrada**: el widget de la Fase 11 **encogió a la mitad** —de `4×2` celdas a `3×1`—
  con el nombre de la materia al doble de tamaño, y ahora encabeza una **familia de cuatro**:
  «Próxima clase», «Hoy», «Faltas» y «Vence pronto». El hueco vacío que motivó la fase no venía
  del tamaño declarado sino de un `layout_weight` que estiraba el espacio vertical, así que
  encogerlo sin quitarlo no habría servido de nada. Las tres reglas nuevas viven en
  `widgets.ts` de `shared` y las ejecuta la app: los widgets siguen sin decidir nada. Las tres
  filas son **tres layouts con ids numerados** y no tres `include` del mismo, porque un
  `RemoteViews` direcciona por id global y las tres copias habrían mostrado el texto de la
  primera. Verificado con los cuatro colocados en el lanzador real, cada uno abriendo su
  sección, y borrándose los cuatro al cerrar sesión

- **Fase 17 cerrada**: la app **se actualiza sin pasar por la tienda**. Comprueba al abrir si hay
  una versión más nueva —comparando el **`versionCode`**, que es lo que Android usa para decidir si
  algo es una actualización—, la anuncia en el inicio, la descarga, **verifica su SHA-256** y se la
  entrega al instalador del sistema. La web estrena `/app`, que es de donde sale el APK **la primera
  vez**: el actualizador solo alcanza a quien ya tiene la app. Todo vive detrás de un interruptor
  que, apagado, deja el APK **sin el permiso `REQUEST_INSTALL_PACKAGES`** —comprobado sobre el
  binario con `aapt`, no sobre el código—, porque las tiendas prohíben que una app se autoactualice
  y ese permiso se revisa con lupa. Lo que más cambió la experiencia fue comprobar el permiso
  **antes** de descargar: sin eso el usuario se bajaba 97 MB para descubrir que el instalador no
  aparecía —falla en silencio—. Verificado el ciclo entero en el emulador, de `versionCode=1` a
  `versionCode=2`, con la sesión intacta después

- **Fase 21 cerrada**: se puede **reportar** una publicación y un mensaje desde app y web, con un
  motivo de una lista corta, y los reportes se leen en una sección nueva de `/panel`. Reportar y
  bloquear se ofrecen **juntos y separados** desde la propia publicación: son dos cosas distintas
  —bloquear es privado e inmediato, reportar avisa a quien opera el servicio— y Google las cuenta
  como dos requisitos. La decisión de diseño es que el reporte guarda una **copia congelada del
  texto**: quien reporta algo suele hacerlo justo antes de que su autor lo borre, y se verificó
  borrando la publicación y el mensaje después de reportarlos —el panel conserva lo que se dijo y
  avisa de que el original ya no está—. La regla que más importa es que **solo se reporta lo que
  uno puede ver**: reportar un mensaje de una conversación ajena responde exactamente lo mismo que
  un identificador inventado, así que la ruta no sirve para averiguar qué existe

- **Fase 22 cerrada**: el APK pasó de declarar **más de treinta permisos a siete**. Sobraban
  `SYSTEM_ALERT_WINDOW` —dibujar sobre otras apps, de los que más escrutinio atraen—, los dos de
  almacenamiento externo, los cuatro de **notificaciones push** y una **veintena de badges de
  lanzadores** que arrastraba `expo-notifications` con Firebase entero; NoteCore no manda push, sus
  recordatorios son locales. No los metía el proyecto: `SYSTEM_ALERT_WINDOW` y `VIBRATE` los escribe
  la **plantilla base de Expo**, que los marca en su propio comentario como opcionales. Todo se
  quita desde un plugin, nunca editando `android/` a mano. Verificado con `aapt2 dump badging`
  sobre el APK firmado y con `dumpsys package` sobre la app ya instalada, y —lo que de verdad
  cierra la fase— comprobando que **la cámara sigue leyendo QR y el recordatorio sigue
  programándose**: `dumpsys alarm` muestra la alarma `RTC_WAKEUP` en su hora

### Próximo paso

**Todo está desplegado y el `.aab` está listo.** La web y la API de producción llevan las fases 21,
22 y 26 a 29 desde el 2026-08-21, verificadas contra los dominios públicos. El App Bundle de la
**versión 0.3.0** (`versionCode 6`) está compilado, firmado y probado instalándolo desde el propio
`.aab`: **solo falta subirlo a la consola de Play Store**. El detalle está en la
[sección 14](#14-fases-26-a-29--avisos-acciones-y-descubrimiento-2026-08-21).

**El plan está completo y el producto está desplegado.** Las doce fases —de la 0 a la 11— están
cerradas y verificadas en app y web. El **2026-08-20** se puso en producción: web y API en HTTPS
tras el túnel de Cloudflare, y un APK **firmado con clave propia** (ver la sección 6).

**Usarlo destapó seis cosas** que no se ven hasta que el producto está en manos de alguien, y ese
mismo día se pidió una séptima: **cuatrimestres** para quien no cursa por semestres. Están
escritas como las fases 12 a 18 en la [sección 8](#8-fases-12-a-18--todas-cerradas).

**Las fases 12 a 16 y la 18 están cerradas y verificadas** (2026-08-20). La 12 redesplegó la API con
`WEB_API_PREFIX=/api` y arregló el botón atrás; la 13 le dio a NoteCore su logo —el ouroboros
formando una C— en el icono de la app, el favicon de la web y la pantalla de entrada; la 14 le dio
a la web una barra lateral de escritorio y ensanchó las doce pantallas; la 15 partió la sección
social en Muro, Mi perfil, Contactos y Ajustes, y construyó el muro, que no existía. la 16 encogió el widget de la próxima clase y le dio tres hermanos —el día, las faltas y lo que
vence pronto—. El APK se recompiló para la 15 y para la 16, firmado con la clave de siempre. El
detalle de cada una está en el historial:
[Fase 12](#fase-12--arreglos-de-producción--cerrada-el-2026-08-20),
[Fase 13](#fase-13--identidad-visual-logo-e-iconos--cerrada-el-2026-08-20),
[Fase 14](#fase-14--la-web-en-pantalla-grande--cerrada-el-2026-08-20),
[Fase 15](#fase-15--social-en-secciones-propias--cerrada-el-2026-08-20),
[Fase 16](#fase-16--widgets-familia-y-densidad--cerrada-el-2026-08-20),
[Fase 18](#fase-18--cuatrimestres-además-de-semestres--cerrada-el-2026-08-20).

**Cerrar una fase no la despliega.** La web sirve una imagen de Docker: mientras no se
reconstruya (`docker compose --env-file .env -f infra/docker-compose.yml build web && … up -d
web`), producción muestra el código anterior aunque el commit ya esté en `main`. Pasó con las
fases 13 y 14, y el síntoma —«la página no la veo cambiada»— parece caché del navegador y no lo
es.

**La 17 también está cerrada, y con ella se agotaron las fases 12 a 18.** La app comprueba al
abrir si hay una versión nueva, la descarga, **comprueba su SHA-256** y se la pasa al instalador de
Android; la web tiene una página `/app` de donde sale el APK la primera vez. Todo detrás de un
interruptor: con `UPDATER_ENABLED=false` y `EXPO_PUBLIC_UPDATER_ENABLED=false` el APK **no lleva
siquiera el permiso** de instalación —verificado sobre el binario— y la API responde que no está
disponible. Detalle en el
[historial](#fase-17--actualización-de-la-app-sin-tienda--cerrada-el-2026-08-20).

**Publicar una versión nueva** es, desde ahora, subir el `versionCode` en `apps/mobile/app.json`,
compilar el APK y ejecutar `scripts/publicar-apk.sh <ruta-al-apk> "notas"`. El script lee el
`versionCode` **del propio binario** y escribe el `latest.json`, así que no se puede publicar un
manifiesto que no describa el archivo que lo acompaña. La API lo sirve sin reiniciarse.

**La Fase 17 se desplegó a producción el 2026-08-21**: se reconstruyeron las imágenes de la web y
de la API —las rutas `/releases/*` daban 404 porque la imagen era anterior a la fase—, se montó el
directorio de publicación y se encendieron los dos interruptores. La primera versión publicada por
esta vía fue la `0.2.0 (3)`.

**Lo que queda ahora sí son fases.** El 2026-08-21 se adquirió la cuenta de desarrollador de Google
Play, y una auditoría del código contra los requisitos de la tienda destapó **seis frentes**:
política de privacidad, borrado de cuenta, reporte de contenido, permisos de más en el manifiesto,
el `.aab` con su ficha, y apagar el actualizador. Ese mismo día se pidió además un **panel de
números** —cuánta gente usa el producto, qué hay en la base, qué se usa y qué no—, que es la
**Fase 25**. Las siete están escritas en la
[sección 9](#9-fases-pendientes-19-a-25--el-camino-a-play-store-y-medir).

Las seis de la tienda no añaden producto —la app está funcionalmente completa—: resuelven **lo que
hace que la tienda rechace una publicación**. Las dos primeras son rechazo automático; la última,
apagar el actualizador, va deliberadamente al final. La 25 sí construye algo nuevo, pero para el
operador, y conviene tenerla **antes** de que la tienda empiece a traer gente.

**Las fases 21 y 22 se cerraron el 2026-08-21**. La 21 añadió el mecanismo de denuncia que
faltaba —bloquear existía desde la Fase 8, reportar no— y una sección de reportes en `/panel`; la
22 dejó el APK con siete permisos en lugar de más de treinta.

**Y ese mismo día se cerraron la 24 y la 23, que eran las dos últimas.** Con ellas, **las siete
fases del camino a Play Store están hechas**. La 24 resultó ser el interruptor que la Fase 17
había preparado —cero líneas de lógica tocadas, y la web sin necesitar nada porque `/app` ya
sabía decir «Busca NoteCore en Google Play»—; la 23 produjo el **`.aab` firmado** (62 MB,
`versionCode 5`, cinco permisos y **sin** `REQUEST_INSTALL_PACKAGES`) y
[`docs/play-store.md`](docs/play-store.md) con todos los textos de la ficha.

Compilar de verdad enseñó que **las tres verificaciones del script estaban rotas y ninguna lo
decía**: `aapt2` no lee un `.aab`, el bundle es bytecode de Hermes donde un `grep` no encuentra
la URL aunque esté, y un `| tail` convirtió un fallo en «exit code 0». La última es la que
importa: una verificación que pasa desapercibida al fallar produce confianza en lugar de dudas.

**Lo que falta para publicar no es código**: las capturas de pantalla y el gráfico de cabecera,
probar el `.aab` con `bundletool` en un teléfono real, y —**una vez publicada la app**— apagar
`UPDATER_ENABLED` en el servidor.
Las dos están **verificadas pero sin desplegar**: la web con los reportes sigue sin reconstruirse y
el APK limpio sin publicarse, con el aviso de arriba sobre lo que significa cerrar sin desplegar.

**Antes de la 23 hay que desplegar la 21**, y no es opcional: la ficha de Play declara que la app
tiene un mecanismo de denuncia, y esa declaración se comprueba contra la app **en producción**.

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
| 11 | Widget y pulido visual | P4 | ✅ | ✅ | ✅ | ✅ |
| — | *Despliegue en producción (2026-08-20)* | — | ✅ | ✅ | ✅ | ✅ |
| 12 | Arreglos de producción | **P0** | ✅ | ✅ | ✅ | ✅ |
| 13 | Identidad visual: logo e iconos | P2 | ✅ | — | ✅ | ✅ |
| 14 | La web en pantalla grande | P1 | ✅ | — | ✅ | — |
| 15 | Social en secciones propias | P2 | ✅ | ✅ | ✅ | ✅ |
| 16 | Widgets: familia y densidad | P3 | ✅ | — | — | ✅ |
| 17 | Actualización de la app sin tienda | P3 | ✅ | ✅ | ✅ | ✅ |
| 18 | Cuatrimestres además de semestres | P2 | ✅ | ✅ | ✅ | ✅ |
| — | *Fase 17 desplegada a producción (2026-08-21)* | — | ✅ | ✅ | ✅ | ✅ |
| 19 | Política de privacidad y datos declarados | **P0** | ✅ | — | ✅ | ✅ |
| 20 | Borrar la cuenta | **P0** | ✅ | ✅ | ✅ | ✅ |
| 21 | Reportar contenido y cerrar la moderación | P1 | ✅ | ✅ | ✅ | ✅ |
| 22 | Limpiar los permisos del manifiesto | P1 | ✅ | — | — | ✅ |
| 23 | El `.aab` y la ficha de la tienda | P1 | ⬜ | — | — | ⬜ |
| 24 | Apagar el actualizador | P2 | ⬜ | ⬜ | ⬜ | ⬜ |
| 25 | Panel de números: seguimiento y telemetría | P2 | ✅ | ✅ | ✅ | — |
| — | *Fases 19, 20 y 25 desplegadas a producción (2026-08-21)* | — | ✅ | ✅ | ✅ | ✅ |
| — | *Fases 21 y 22 cerradas (2026-08-21) — **sin desplegar***  | — | ✅ | ✅ | ✅ | ✅ |

> Las fases 12 a 18 salieron de **usar el producto desplegado** (2026-08-20), no del plan
> original. Un `—` en una columna significa que esa capa no participa: no es trabajo pendiente.
>
> **Van por prioridad, no por número.** La 18 se numeró así por llegar la última, pero era P2 y
> por eso se hizo antes que la 16 y la 17. Renumerar habría movido cinco fases ya escritas y roto
> los enlaces del documento, sin ganar nada.
>
> **De las fases 19 a 25 quedan abiertas solo la 23 y la 24.** Las **19, 20 y 25 se cerraron y
> desplegaron el 2026-08-21**: con ellas fuera, los dos motivos de **rechazo automático** de Play
> Store —no tener política de privacidad ni borrado de cuenta— ya no aplican. Las **21 y 22 se
> cerraron el 2026-08-21** y están **verificadas pero sin desplegar**. Su enunciado está en
> la [sección 9](#9-fases-pendientes-19-a-25--el-camino-a-play-store-y-medir) y lo que se entregó
> en el [historial](#10-historial-de-las-fases-19-a-25). El orden restante es **23 → 24**, y la
> **24 va la última a propósito**.
>
> La **22 no toca ni la API ni la web**: es el manifiesto de Android y nada más. Los permisos que
> el APK declara son una propiedad del artefacto que se sube a la tienda, no una función del
> producto — no hay nada que un servidor ni un navegador puedan hacer al respecto.
>
> La **25 no toca la app**, y es deliberado: el panel de números es una herramienta de operación
> que se consulta en pantalla grande. Es la misma excepción de la Fase 14, no un cierre a medias.
>
> La **19 no toca la API**, y también es deliberado: la política de privacidad es texto, y ese
> texto vive en `packages/shared` para que la web, la app y el cuestionario de Data Safety digan
> exactamente lo mismo. No hay nada que servir desde la API.

### Regla de cierre

Una fase se cierra cuando funciona **en app y en web**. Al cerrarla:
1. Marcar ✅ en esta tabla
2. Registrar la fecha y la verificación en el historial de abajo
3. Actualizar el reporte resumen
4. Hacer commit: `feat(faseN): descripción`

### Historial de cierres

#### Fase 17 — Actualización de la app sin tienda · cerrada el 2026-08-20

**Entregado**: la app **comprueba al abrir** si hay una versión más nueva, la anuncia en el inicio,
la descarga, **verifica su SHA-256** y se la entrega al instalador de Android. La web estrena
`/app`, de donde sale el APK la primera vez —el actualizador solo alcanza a quien ya tiene la app
instalada—. Todo detrás de un interruptor que, apagado, **no deja rastro en el APK**.

**Publicar una versión** es ahora un comando: `scripts/publicar-apk.sh <apk> "notas"`.

##### El interruptor no es una bandera, son dos, y esa es la fase

Lo que pedía el enunciado —«que sea fácil de quitar»— se resolvió con **dos interruptores
independientes**, y la distinción importa:

- **`EXPO_PUBLIC_UPDATER_ENABLED`** (compilación de la app) decide **dos cosas con un solo valor**:
  si la app pregunta, y si `plugins/with-actualizador.js` mete en el manifiesto
  `REQUEST_INSTALL_PACKAGES` y el `FileProvider`. Al salir del mismo sitio, no puede darse una app
  que avise sin poder instalar, ni un APK que pida permiso de instalación y no lo use
- **`UPDATER_ENABLED`** (servidor) apaga el mecanismo **para los teléfonos ya instalados**, sin
  publicar nada. Es el que hace falta el día de subir a Play Store: una app antigua puede seguir
  preguntando, y la API le responde `disponible: false`

**Por qué el permiso va en un plugin y no en el manifiesto del módulo.** El widget de la Fase 11
declara sus receptores en el `AndroidManifest.xml` de su propio módulo y Gradle los funde. Aquí no
se podía: un manifiesto de módulo **no se puede condicionar**, así que el permiso viajaría en el
APK siempre. Y `REQUEST_INSTALL_PACKAGES` es de los que Play Store revisa con lupa, sobre una
práctica —autoactualizarse por fuera— que las tiendas **prohíben**.

##### Lo que se decidió al implementarla

- **El permiso se comprueba ANTES de descargar.** Es lo que más cambió la experiencia. Desde
  Android 8 el permiso en el manifiesto no basta: hace falta que el usuario autorice «instalar apps
  desconocidas» para esta app, y sin eso **el instalador no aparece — falla en silencio**. Sin la
  comprobación previa, el usuario se bajaba 97 MB para descubrirlo. Verificado en el emulador: el
  primer intento abrió los Ajustes en lugar de gastar la descarga
- **Verificar es parte de descargar, no un paso aparte.** `descargar()` comprueba la suma antes de
  devolver, y borra el archivo si no coincide. Si fueran dos funciones, algún camino de la interfaz
  —el típico es un reintento— llamaría a instalar sin verificar, que es justo el fallo del que la
  suma protege
- **La versión instalada se lee del paquete, no de una constante.** `versionInstalada()` la saca de
  `PackageInfo`. Una constante en JavaScript se olvida de subir al publicar, y entonces la app se
  cree en una versión que no es
- **El script de publicación lee el `versionCode` del propio APK** con `aapt`, no de `app.json`.
  Publicar un número mayor que el del binario dejaría a la app en bucle: Android instala el APK
  real —con su código menor—, la app se vuelve a comparar contra el publicado y se vuelve a creer
  desactualizada
- **`latest.json` se relee en cada petición**, sin caché. Publicar es copiar archivos en el volumen
  sin reiniciar el contenedor; con caché, la API anunciaría la versión anterior hasta el siguiente
  despliegue, que es exactamente el escenario para el que esto se construyó
- **Las dos rutas no piden sesión.** Es la única parte del producto que se consulta desde fuera, por
  dos motivos: quien tiene una versión rota **puede no poder entrar** —y es cuando más necesita
  saber que hay arreglo—, y no hay nada que aislar: un número de versión y un APK firmado son
  públicos por definición
- **La app se guarda en el caché externo y se borra sola.** Cuando la app comprueba que ya corre una
  versión igual o mayor que la descargada, `limpiarDescargas()` tira el archivo. Son ~100 MB, y
  nadie más los iba a borrar. Verificado: el directorio quedó vacío tras instalar
- **El aviso es un bloque en el inicio, no un diálogo.** Un modal al abrir interrumpe a quien
  entró a ver a qué hora es su próxima clase, y lo que enseña es a descartarlo sin leerlo

##### La paridad de esta fase no puede ser literal, y así se resolvió

Un navegador **no instala aplicaciones**, y ningún código lo va a cambiar. Lo que sí es paritario es
lo que se sabe y de dónde sale: la web muestra la misma versión, las mismas notas, el mismo tamaño y
la **misma suma de verificación**, y sirve el mismo binario desde la misma ruta. Lo que la web no
puede hacer —lanzar el instalador— lo hace la persona al abrir el archivo. Y la web cubre algo que
la app no puede cubrir: **la primera instalación**, que por definición ocurre cuando no hay app.

##### Decisiones de diseño

| Decisión | Por qué |
|---|---|
| Se compara **`versionCode`**, nunca `versionName` | Es lo que Android usa para decidir si algo es una actualización. Ordenar el texto daría que «0.10.0» es anterior a «0.9.0», y dos publicaciones pueden llamarse igual |
| El APK se entrega por un **`FileProvider` propio**, no como `file://` | Desde Android 7, pasar una ruta de archivo a otro proceso lanza `FileUriExposedException` y **tumba la app**. Se creó uno con autoridad propia (`…​.actualizador`) en vez de reutilizar el de `expo-file-system`, cuyos `paths` no controlamos y podrían cambiar con el SDK |
| El `<paths>` expone **solo el subdirectorio de descargas** | El proveedor concede lectura a quien reciba la URI, así que su alcance es lo que el instalador podrá leer. Un `path="."` abriría el caché externo entero |
| `file` del manifiesto se trata como **nombre, no como ruta** (`basename`) | Sin eso, un `"file": "../../etc/passwd"` convertiría la descarga en una lectura arbitraria servida por HTTP. Verificado: un archivo que existe fuera del directorio se rechaza igual |
| La suma se **normaliza** antes de validarla | Lo natural al publicar es pegar el contenido del `.sha256`, que trae «suma  nombre-del-archivo». Sin recortarlo, **toda** verificación fallaría y el síntoma —«la descarga siempre está corrupta»— apuntaría a la red |
| Se comprueba que **el APK existe** antes de anunciarlo | Un manifiesto que nombra un archivo no copiado haría que la app avisara y la descarga diera 404, en bucle cada vez que se abre, sin forma de quitarse el aviso |
| `UPDATER_ENABLED` y `RELEASES_DIR` se combinan en **una sola** bandera en `config.ts` | Con dos sueltas, un descuido dejaría la ruta anunciando una versión que no puede entregar |
| Los APK se publican en un **directorio montado**, no en PostgreSQL | Publicar es copiar dos archivos. Una tabla exigiría migración, modelo y panel de administración para un dato que cambia casi nunca — y este mecanismo tiene que **poder desaparecer**, que es más fácil borrando un módulo que revirtiendo una migración en producción |
| El estado final tras lanzar el instalador es **«instalando»**, no «instalado» | A partir de ahí decide Android y decide el usuario. La app no puede saber cómo terminó, y afirmarlo sería inventarse un resultado |

##### Verificación (2026-08-20, emulador Android con APK de release firmado + la web)

**El ciclo entero, en el emulador**, que es el criterio que pedía la fase:

- Se compiló e instaló un APK con **`versionCode=1`** (0.1.9) que ya trae el actualizador, y se
  publicó el **`versionCode=2`** (0.2.0) con `scripts/publicar-apk.sh` — que leyó el número del
  binario y escribió el `latest.json`
- Al abrir la app, pidió `/releases/android/latest` (confirmado en el registro de la API) y mostró
  **«Hay una versión nueva: 0.2.0»** con las notas y **«97.0 MB · se descarga y se instala desde
  aquí»**
- El primer «Descargar e instalar» **no descargó**: detectó que faltaba el permiso y abrió «Install
  unknown apps». Concedido (`appops` → `REQUEST_INSTALL_PACKAGES: allow`), el segundo intento
  descargó, verificó la suma y abrió el diálogo del sistema **«NoteCore — Do you want to update
  this app?»**
- Confirmado: `dumpsys package` pasó a **`versionCode=2, versionName=0.2.0`**. Al reabrir, **el
  aviso ya no aparece** —no hay bucle— y **la sesión seguía abierta**: la actualización no borra
  datos. El directorio de descargas quedó **vacío**

**Con el interruptor apagado no queda rastro**, comprobado sobre el binario y no sobre el código:

- APK compilado con `EXPO_PUBLIC_UPDATER_ENABLED=false` → `aapt dump permissions` **no lista**
  `REQUEST_INSTALL_PACKAGES`, y el manifiesto **no tiene** el `FileProvider`. Con `=true`, ambos
  aparecen
- API con `UPDATER_ENABLED=false` → `{"disponible":false,"release":null}` y la descarga responde
  **404**, con el APK presente en el directorio. La web, en ese estado, dice «La descarga directa no
  está habilitada. Busca NoteCore en Google Play»

**Los fallos del manifiesto**, uno por uno: APK ausente, `versionCode` como cadena, y `file` con
`../` apuntando a un archivo que **sí existe** fuera del directorio. Los tres devuelven
`release: null` en lugar de anunciar algo que no se puede entregar.

**La web** (`/app`), a 900px y a 390px: muestra «Versión 0.2.0», 97.0 MB, la fecha, el `versionCode`
y la suma SHA-256 tras «Verificar la descarga». El APK descargado desde el enlace tiene **la misma
suma** que la publicada. Enlaces desde la barra lateral (escritorio) y desde el inicio (móvil).

**Lo que NO se verificó**: un teléfono físico —se usó el emulador— y la descarga sobre el túnel de
Cloudflare, que solo se puede probar desplegando. Esta fase **no está desplegada**: producción sigue
con la imagen anterior y el actualizador apagado.

---

#### Fase 16 — Widgets: familia y densidad · cerrada el 2026-08-20

**Entregado**: el widget de la Fase 11 **encogió a la mitad** y con el nombre de la materia al
doble de tamaño, y ahora es la cabeza de una **familia de cuatro**: «Próxima clase», «Hoy»,
«Faltas» y «Vence pronto». Los cuatro se ofrecen desde la pantalla del horario, cada uno abre
su sección al tocarlo, y los cuatro se borran al cerrar sesión.

**El síntoma tenía dos causas, y solo una era el tamaño.** El widget se declaraba con
`targetCellHeight="2"` pero el hueco vacío bajo el aula no venía de eso: venía de un
`layout_weight="1"` en el bloque central que **estiraba el espacio vertical** hasta llenar la
altura reservada. Encogerlo a `3×1` sin quitar ese peso habría dejado el mismo hueco, más
apretado. Ahora la altura la fija el contenido, el nombre de la materia va a **24sp** —de 17sp—,
y el aula y el pie de «quedan N clases» se fueron al widget «Hoy», que es donde el día completo
tiene sitio.

**El widget compacto acabó necesitando textos propios, y viven en `shared`.** A 24sp, «Ahora
mismo» ocupaba ~80dp del ancho y dejaba «Cálculo Integral» en «Cálculo Int…»: el reloj se comía
el dato al que se subordina. Se añadieron `widgetCuandoCorto()` —«Ahora»— y
`widgetMateriaCorta()` —«Sin horario»— **en `shared`, no en Kotlin**: acortar es una decisión de
redacción, y en el inicio de la app y de la web sigue apareciendo el texto largo, donde sí hay
sitio. El Kotlin recibe las dos versiones ya resueltas y solo elige la que su layout admite.

**Tres widgets nuevos, un solo pintor.** «Hoy», «Faltas» y «Vence pronto» comparten forma
—encabezado, hasta tres filas, pie— así que comparten layout y comparten `PintorDeListas`. Tres
copias habrían divergido a la primera corrección hecha en una y olvidada en las otras dos, que
es exactamente lo que pasó con la paleta antes de la Fase 11.

**Ninguno decide nada.** Las tres reglas nuevas viven en
`packages/shared/src/logic/widgets.ts` —`widgetDia()`, `widgetFaltas()`, `widgetAgenda()`— y
las ejecuta la app, que deja el resultado ya resuelto a texto y a color donde el Kotlin lo lee.
Es el mismo reparto de la Fase 11, extendido: **la app decide, el widget pinta**.

**Decisiones de diseño**:

| Decisión | Por qué |
|---|---|
| Las tres filas son **tres archivos de layout con ids numerados**, no tres `include` del mismo | Se intentó primero con `<include layout="@layout/widget_fila" android:id="@+id/fila_2"/>` y **no sirve para un `RemoteViews`**: el `android:id` del include renombra el contenedor, no las vistas de dentro. Las tres copias seguirían teniendo el mismo `fila_titulo`, y `setTextViewText` —que direcciona por id global, sin recorrer el árbol— escribiría siempre en la primera. Las tres filas mostrarían el mismo texto |
| **Tres filas** y un pie de «y N más», no una lista con adaptador | Un `RemoteViewsService` con `ListView` daría filas ilimitadas, pero exige un servicio en el manifiesto, un factory en su propio hilo y un ciclo de actualización aparte. Para tres filas fijas, tres layouts cuestan menos y no añaden un proceso que mantener. Por debajo de ~30dp por fila el nombre de una materia deja de leerse a la distancia a la que se mira una pantalla de inicio, que es de reojo |
| El widget de faltas muestra **solo lo que está en riesgo** | Un widget que enseñara las nueve materias, la mayoría en verde, no dice nada de un vistazo: hay que leerlo entero para descubrir que no pasa nada. Cuando ninguna está en riesgo lo dice en una línea. Es el criterio del inicio de la Fase 11: nada se muestra por completitud |
| El `PendingIntent` lleva el **hash de la ruta** como `requestCode` | Con el `0` fijo que tenía el widget original, los cuatro compartirían el mismo `PendingIntent` y `FLAG_UPDATE_CURRENT` haría que el último en crearse reescribiera el destino de todos: los cuatro abrirían la misma pantalla. Verificado en el emulador que cada uno abre la suya |
| La agenda se ordena por **`daysUntilDue`**, no con `sortByDueDate` | `sortByDueDate` compara la cadena `dueDate`, y en la pantalla de agenda basta porque ahí se ve la fecha entera. El widget muestra «Venció hace 2 días» / «Vence en 3 días», es decir `daysUntilDue`, y ordenar por un dato distinto del que se lee produce una lista que parece desordenada aunque no lo esté |
| La **cola de cada fila cede el ancho al título** (`maxWidth="72dp"`) | Sin eso, «Química Orgánica» se llevaba media fila y el título se cortaba en «Reporte de reacci…», que es el dato por el que esa línea está en el widget. Se midió en el emulador: con 96dp todavía se cortaban, con 72dp «Reporte de reacciones» cabe entero y la materia se lee como «Química Or…», que se entiende |
| El puente **recuerda la última fuente conocida** de cada dato | Los cuatro widgets se guardan juntos porque salen del mismo `widgetFamily()`, pero no todas las pantallas tienen las tres fuentes: `FaltasScreen` solo conoce las faltas. Sin esa memoria, entrar a faltas después del inicio llamaría con el horario en `null` y **borraría** el widget de la próxima clase. Omitir un parámetro conserva; nunca borra |
| El refresco de las tres fuentes vive en la **raíz de la app**, no en una pantalla | Abrir la app no es pasar por el inicio: **arranca en la sección donde se quedó**. Quien la cierra en «Mensajes» la vuelve a abrir ahí, y sin un refresco en la raíz sus cuatro widgets se quedarían con lo que dijeran la última vez que visitó las pantallas que los alimentan |
| El estado vacío saca sus títulos de **`res/values`** | Sin datos no hay JSON del que leer el título, y lo que hacía antes era `clave.uppercase()`: eso ponía «DIA» —sin tilde— y «AGENDA» en la cabecera, que son los nombres internos de las claves. Un widget que cambia de nombre al cerrar sesión parece otro widget |
| La clave del widget compacto **sigue llamándose `snapshot`** | Quien actualice la app con el widget ya colocado tiene ese valor escrito en su teléfono. Renombrarla le habría dejado el widget en blanco hasta la siguiente sincronización, por una limpieza que no se ve desde fuera |

**Verificación** (2026-08-20, emulador Android con APK de release firmado + la misma cuenta en
la web):

- **Los cuatro widgets se colocaron desde la app**, con el diálogo de fijado del sistema, y
  Android los reconoce como cuatro proveedores distintos (`dumpsys appwidget`) con sus tamaños:
  el compacto a `resizeMode=1` y 12801 de alto, los tres de lista a `resizeMode=3` y 28161
- **«Hoy»** mostró «4 clases», tres filas con la barra del color de cada materia, «ahora» en la
  que estaba en curso, «Lab 2» en la que tiene aula, y **«y 1 más»** por la cuarta
- **«Faltas»** mostró «3 en riesgo» filtrando las dos materias en verde, con la que superó el
  límite **en rojo** y las dos cercanas en ámbar. Al borrar las faltas por la API y reabrir la
  app, pasó a **«Ninguna materia en riesgo»**; al volver a marcarlas, a «2 en riesgo»
- **«Vence pronto»** mostró «2 vencidas» y las ordenó por lo que vence antes: «Venció hace 3
  días», «Venció ayer», «Vence en 2 días» —las dos vencidas en rojo—
- **El compacto** mostró «Cálculo Integral» entero a 24sp con «Ahora» **en verde**, porque esa
  clase estaba en curso
- **Cada widget abre su sección**: el compacto y «Hoy» en «Mi horario», «Faltas» en «Mis
  faltas», «Vence pronto» en «Mi agenda». Son cuatro `PendingIntent` distintos, no uno
- **Al cerrar sesión los cuatro se borraron**: ni una materia, ni una falta, ni una entrega del
  usuario anterior quedó visible en la pantalla de inicio (Principio III)
- **La web dice lo mismo que el widget** con la misma cuenta: «Física General 3/3 alcanzado» y
  «Química Orgánica 2/3 cerca», y la agenda con las mismas palabras —«Venció hace 3 días»—
  porque ambos llaman a `dueDateMessage` en `shared`
- El typecheck de los cuatro paquetes y el build de producción de Next pasan limpios

**Ojo con esto para la próxima fase**: `expo prebuild` **reescribe `apps/mobile/tsconfig.json`**
—lo reformatea y le borra dos entradas de `include` y un comentario—. No es un cambio de la
fase; hay que revertirlo con `git checkout` antes del commit. Y Gradle **no rastrea `src/` como
entrada**: tras editar TypeScript hay que borrar `android/app/build/generated/assets` y
`android/app/build/intermediates/merged_assets` o el APK sale con el bundle anterior, sin avisar
—costó tres verificaciones en falso—.

#### Fase 18 — Cuatrimestres además de semestres · cerrada el 2026-08-20

**Entregado**: quien cursa **cuatrimestres** lleva su periodo como tal, en app y web. El semestre
sigue siendo el tipo principal y el que viene por defecto.

**Lo que se midió antes de escribir código volvió a cambiar el tamaño de la fase.** La fase estaba
escrita sobre el supuesto de que la aritmética ya funcionaba —y es cierto: `MIN/MAX_SEMESTER_WEEKS`
llevaban editables desde la Fase 3—. Lo que no estaba escrito es **dónde vivían esas semanas**: en
`user_settings.semester_weeks`, un ajuste **global de la cuenta**. Con un solo tipo de periodo eso
nunca dio problema. Con dos, sí: alguien con un semestre archivado de 16 semanas que abre un
cuatrimestre y pone 12 habría **recalculado el límite de faltas del archivado**, años después de
haberlo cursado. Las semanas se movieron a `semesters.weeks`, y esa mudanza —no el campo `kind`—
fue la mitad del trabajo de la fase.

**El tipo va en el periodo, no en la cuenta.** Un ajuste del usuario habría sido más simple, pero
al cambiarlo reetiquetaría **también el histórico ya cerrado**. Con el tipo en el periodo, quien
cambia de plan o de escuela conserva sus semestres antiguos como semestres (Principio VI).

**El vocabulario cambia en la interfaz, no en el modelo.** La tabla sigue llamándose `semesters`,
las rutas `/semesters` y los tipos `Semester`. Renombrar a un término neutro es una migración sobre
datos en producción que toca los tres clientes, a cambio de cero diferencia para quien usa el
producto. La palabra sale de `SEMESTER_KIND_LABELS` en `shared` —junto a `SEMESTER_STATUS_LABELS`,
que ya resolvía este mismo problema para los estados—, con las cuatro formas que piden las
pantallas: singular, plural, con artículo y con mayúscula inicial.

**Decisiones de diseño**:

| Decisión | Por qué |
|---|---|
| Cuatrimestre = **12 semanas** por defecto | Los cuatro meses de clase efectivos. Editable, como el semestre: hay planteles de 15 |
| Nombre siguiente con **N de 1 a 3** en cuatrimestres | De "2026-2" sale "2026-3", no "2027-1". Con la regla semestral, quien cursa tres periodos al año vería un nombre equivocado cada tercer cierre |
| Cambiar el tipo **no toca las semanas** | Quien corrige la etiqueta puede tener sus semanas ya ajustadas a mano; sobrescribirlas le borraría el ajuste sin avisar |
| Cambiar de tipo **al cerrar** sí propone las del tipo nuevo | Arrastrar 16 semanas de un semestre a un cuatrimestre daría un límite de faltas un tercio más alto del que le toca, y el estudiante no tendría por qué sospecharlo |
| El primero de una cuenta nace **semestre** | Crear la cuenta ya pide bastante; es un dato que se corrige en dos toques y que la mayoría no necesita tocar |
| El mensaje de archivado **nombra el tipo** | «Este cuatrimestre está archivado». Decirle «semestre» a quien no cursa uno le habla de algo que no está cursando |

**La compartición no necesitó cambios.** Se comprobó antes de tocar nada: `share.ts` ya resuelve el
destino con `getCurrentSemesterId` **del receptor**, y el `payload` no lleva semanas ni tipo. Un
compartido que viaja de un cuatrimestre a un semestre se incorpora al periodo activo de quien
recibe, con las semanas de **ese** periodo — que es exactamente lo que la fase pedía.

**Verificación**:

| Qué | Cómo | Resultado |
|---|---|---|
| Los cuatro paquetes | `npm run typecheck` en la raíz | `shared`, `api`, `web` y `mobile`, limpio |
| Migración sobre datos reales | 239 periodos y 311 usuarios en la base de producción | `kind` = `semestre` en los 239; los 12 usuarios con 18/20 semanas **conservaron su número**, comparado fila a fila contra el estado previo: **cero discrepancias** |
| Límite de faltas por tipo | API real: materia de 5 sesiones/semana | Semestre de 16 → 80 sesiones, límite 16. Cuatrimestre de 12 → 60 sesiones, límite 12 |
| Cambiar tipo sin tocar semanas | `PATCH /semesters/:id` con solo `kind` | Pasó a cuatrimestre **conservando las 16**; el número solo cambió al pedirlo |
| Nombre propuesto en cuatrimestres | `GET /semesters/close-effect` sobre un cuatrimestre «2026-2» | Propone **«2026-3»**, no «2027-1» |
| Cambio de régimen al cerrar | Cerrar un cuatrimestre de 12 abriendo un semestre | El nuevo arrancó con **16 semanas propias**, no con las 12 heredadas |
| Archivado en solo lectura | `PATCH` sobre el cuatrimestre ya archivado | 409 con **«Este cuatrimestre está archivado»** — nombra el tipo con el que se cerró |
| **Web, navegador real** | Sesión iniciada, `/semestres` y `/faltas`, cambiando el tipo por el desplegable y guardando las semanas con su botón | «Cuatrimestre en curso», «Semanas del cuatrimestre», «48 en el cuatrimestre · sugerido 9», y el archivado como «Cuatrimestre de 12 semanas» |
| **App Android, emulador real** | APK de release contra la API, sesión iniciada, ciclo completo por toques | Chips de tipo, cambio a semestre y vuelta, panel de faltas en vocabulario de cuatrimestre, y el cierre entero: «Se archivó «2026-2» y empezó «2026-3», cuatrimestre vacío de 12 semanas» |
| Aviso del Principio VII | Visible en los dos clientes junto al límite | Intacto: el límite sigue siendo **orientativo**, con la recomendación de confirmarlo con el profesor |

Las cuentas de prueba se borraron al terminar; los 311 usuarios reales y sus 239 periodos quedaron
intactos.

---

#### Fase 15 — Social en secciones propias · cerrada el 2026-08-20

**Entregado**: las cuatro secciones pedidas —**Muro, Mi perfil, Contactos y Ajustes**— en app y
web, y el muro de publicaciones, que **no existía**.

**Lo que se midió antes de escribir código cambió el tamaño de la fase.** La fase estaba escrita
como una reorganización de pantallas, pero `GET /social/posts` devolvía `listOwnPosts`: solo las
propias. **No había ninguna consulta que trajera las de los contactos**, así que el muro era
backend nuevo, no un reparto distinto de lo que ya había. Las otras tres secciones sí eran
partir las 989 + 687 líneas existentes.

**El muro se apoya en `listContacts`, no consulta `contacts` por su cuenta.** Quién cuenta como
contacto aceptado —y en particular que un bloqueo saque a alguien de esa lista— ya estaba
resuelto ahí. Un `WHERE` propio habría creado una segunda definición de "contacto" que
envejecería sola, y la forma de romperse habría sido la peor posible: **alguien a quien
bloqueaste siguiendo en tu muro**. La visibilidad se comprueba además por autor con
`canSeeProfileDetails`, la misma función del perfil y de `listUserPosts`.

**«Mi perfil» y «Ajustes» se separaron porque mezclados no se entendía ninguno.** La tarjeta
pública y el formulario de edición vivían en el mismo componente, y nunca quedaba claro si lo
que se veía era lo que ven los demás o algo a medio editar. Ahora el perfil se mira —con los
campos vacíos diciendo «Sin llenar», porque un hueco callado se lee como un fallo de carga— y
los ajustes se editan.

**La búsqueda se mudó dentro de «Contactos»**, que es donde se usa: buscar a alguien es un paso
de agregarlo, no una sección aparte.

**Decisiones de diseño**:

| Decisión | Por qué |
|---|---|
| Pestañas dentro de Contactos, no cuatro botones en el inicio | Es cambio de contenido: no toca la navegación general, y el inicio se habría ido de 9 a 12 secciones |
| El muro trae contactos aceptados **más lo propio** | Si lo propio no apareciera, publicar algo y no verlo se lee como que no se guardó |
| El botón «Borrar» solo se pinta en lo propio | Comodidad de interfaz. El servidor lo comprueba igual: el `WHERE` de `deletePost` lleva el `userId` (Principio III) |
| Pestaña de inicio: Muro | Es lo que cambia entre visitas; el perfil propio casi nunca cambia |

**Ojo con esto para la próxima**: el `assembleRelease` a secas incrustó `http://localhost:3101`
en el APK y la app no conectaba con nada —la receta de la Fase 12 ya lo advertía y no se
siguió—. Hay que pasar `EXPO_PUBLIC_API_URL` **y** `--rerun-tasks`, y comprobarlo en el bundle:
`grep -ao "notecore-api.ourocore.net" .../index.android.bundle`.

**Verificación (2026-08-20)**:

| Qué | Cómo | Resultado |
|---|---|---|
| El muro trae contactos aceptados y lo propio | Tres cuentas contra la API real | Llegan las dos, en orden |
| Lo que la visibilidad no permite **no viaja** | Cuenta con perfil «solo contactos», sin relación | **Ausente de la respuesta**, no oculta en el cliente |
| Un bloqueo saca del muro | Aceptar, leer el muro, bloquear, releer | `['POST_DE_LUIS']` → `[]` |
| Las cuatro secciones en la app | APK de release en el emulador | Muro, Mi perfil, Contactos y Ajustes |
| Las cuatro secciones en la web | Sesión real en el navegador | `["Muro","Mi perfil","Contactos","Ajustes"]` |
| Borrar solo lo propio | Muro con dos autores | «Borrar» solo bajo la publicación propia |
| Atrás sigue deshaciendo un paso | Ajustes → atrás → Muro → atrás → Inicio | Un paso cada vez, sin cerrar la app |

#### Fase 14 — La web en pantalla grande · cerrada el 2026-08-20

**Entregado**: barra lateral fija de escritorio, y las doce pantallas ensanchadas para
aprovecharla. La app no se tocó —el síntoma era solo de la web—.

**La barra vive en un solo punto: `RequireSession`.** Las doce pantallas, más `u/[username]`
y `compartido/[code]`, pasan todas por ahí para exigir sesión; envolver su resultado en
`AppShell` en vez de tocar cada `page.tsx` es lo que hace que una pantalla nueva **herede** la
barra por estar dentro de `RequireSession`, no por acordarse de importarla. Es la misma lógica
que ya usó el `SyncProvider` de la Fase 9.

**La barra no aparece hasta `lg` (1024px), no en `md` (768px).** Mide 256px; con el contenido
Workbench ya en `max-w-5xl`/`max-w-6xl` (1024–1152px), activarla en `md` habría dejado menos de
512px de contenido en una tableta en vertical —peor que sin barra—. En `lg` el contenido
conserva un ancho útil incluso con la barra descontada. Por debajo de `lg` el árbol es
exactamente el de antes: sin barra, con la cabecera de usuario y la rejilla "Ir a" del inicio,
que es la única navegación que existía hasta esta fase.

**La lista de nueve secciones se separó a `@/lib/navigation.ts`.** Antes vivía solo dentro de
`page.tsx`, usada por la rejilla "Ir a"; ahora la comparten esa rejilla y la barra lateral, para
que las dos no puedan divergir si algún día se añade o se renombra una sección —el mismo
razonamiento que llevó la paleta a `tokens.ts` en la Fase 11.

**La rejilla "Ir a" del inicio se oculta en escritorio (`lg:hidden`), no se borra.** Con la
barra ya listando las mismas nueve secciones de forma permanente, mostrarla también en el
cuerpo de la pantalla habría sido la misma navegación dos veces en la misma pantalla. En móvil,
que no tiene barra, sigue siendo la única forma de moverse.

**`semestres` no tenía ningún contenedor con ancho máximo.** No se notaba antes de esta fase
porque nunca había más de 768px disponibles; con el ancho de escritorio nuevo sí se habría
notado, así que entró el mismo `<main>` que ya usan `horario`, `faltas`, `agenda` y
`calendario`. Es una inconsistencia previa a la Fase 14, no un efecto suyo, pero esta fase era
el momento de arreglarla porque es exactamente el síntoma que describe.

**Decisiones de diseño**:

| Decisión | Por qué |
|---|---|
| Barra lateral fija, no navbar superior | Aprovecha el alto que sobra en una pantalla 16:9 —una herramienta de sesión que se consulta entre clases, no un sitio de contenido— y es el patrón que `design.md` ya reserva para la familia Workbench, que cubre ocho de las nueve secciones |
| Se activa en `lg` (1024px), no en `md` (768px) | En `md` el contenido Workbench se habría quedado con menos de 512px en una tableta en vertical: peor que la columna única de antes. `lg` es el primer punto donde barra + contenido caben con holgura |
| La barra entra en `RequireSession`, no en cada `page.tsx` | Es el único punto por el que pasan las doce pantallas con sesión. Tocar doce archivos habría sido más trabajo y, sobre todo, una pantalla nueva se habría podido quedar sin barra por un descuido de importación |
| La lista de secciones se compartió entre la barra y la rejilla "Ir a" | Antes de esta fase solo existía dentro de `page.tsx`. Separarla evita que la barra y la rejilla del inicio diverjan en silencio, el mismo motivo que llevó la paleta a `tokens.ts` en la Fase 11 |
| La rejilla "Ir a" se oculta en escritorio en vez de borrarse | En móvil sigue siendo la única navegación; en escritorio, mostrarla junto a la barra sería la misma información dos veces en la misma pantalla |
| `semestres` recibió un `<main>` con ancho máximo que no tenía | Sin él, su contenido se habría estirado al ancho completo disponible junto a la barra, rompiendo la consistencia con el resto de pantallas Workbench |

**Verificación (2026-08-20)**, navegador real vía Playwright, cuenta de prueba registrada en
la propia verificación:

| Qué | Cómo | Resultado |
|---|---|---|
| Los cuatro paquetes | `npm run typecheck` | Los cuatro, limpio |
| Build de producción de la web | `next build` | Compila; 16 rutas generadas, ninguna rota |
| Barra en escritorio (1440px) | Captura tras registro e inicio de sesión | Logo, nueve secciones, usuario y "Cerrar sesión"; la sección activa resaltada en cada pantalla visitada |
| Doce pantallas en escritorio | `horario`, `faltas`, `agenda`, `calendario`, `compartir`, `semestres`, `social`, `mensajes`, `perfil`, `mensajes` con hilo | Todas dentro de la barra, con ancho ensanchado y sin desbordar |
| Barra ausente por debajo de `lg` | Captura a 900px (tableta) | Sin barra; cabecera de usuario y rejilla "Ir a" completas, igual que antes de la fase |
| Móvil sin cambios (390px) | Captura del inicio y de tres pantallas | Idéntico al comportamiento previo a la fase: sin barra, columna única |
| `semestres` con su nuevo contenedor | Captura a 1440px | Contenido centrado con ancho máximo, ya no estirado a todo el ancho |
| Consola del navegador | `console --errors` en cada navegación | Sin errores de JavaScript |

---

#### Fase 13 — Identidad visual: logo e iconos · cerrada el 2026-08-20

**Entregado**: el logo de NoteCore —el ouroboros formando una C— en los tres destinos donde
antes no había marca propia: el icono de la app Android (legacy y adaptativo), el favicon de
la web, y la pantalla de entrada de los dos clientes.

**La geometría vive una sola vez, en `shared`.** `packages/shared` no exporta componentes
React —solo tipos, esquemas, lógica y tokens—, así que el patrón que ya dejó el QR de la Fase 6
es el que se repitió aquí: los números del dibujo (el arco del anillo, el círculo de la
cabeza, los tres renglones) están en
[`design/logo.ts`](packages/shared/src/design/logo.ts), y cada cliente lo pinta con su propio
motor —`react-native-svg` en la app, `<svg>` nativo en la web—, tomando el color de su propio
sistema de diseño (`COLOR` en la app, las clases de `tokens.css` en la web) en vez de
recibirlo fijo desde `shared`. Fijar ahí un color habría sido exactamente la clase de
duplicación que este archivo existe para evitar.

**El icono adaptativo se generó con aire de sobra a propósito.** La advertencia que dejó
escrita esta misma fase antes de empezar —el recorte circular de Android se come el borde de
un dibujo que ya toca el límite— se resolvió escalando el anillo a un 62% del lienzo antes de
exportarlo; Expo añade además su propio margen sobre eso al empaquetar el icono adaptativo. El
resultado, comprobado en el cajón de aplicaciones del emulador, es un anillo cómodo dentro del
círculo, sin ningún trazo cortado.

**Cómo se generaron los PNG sin tocar ningún `package.json`**: no había ni `sharp` ni
`rsvg-convert` ni `cairosvg` en el entorno, y esta fase no es motivo para dejar una dependencia
de rasterizado permanente en el repo por tres imágenes. Se usó el mismo camino que ya usan las
suites Playwright de las fases 8 a 11 —Chromium ya estaba en caché, sin que `playwright` viva
en ningún `package.json` del monorepo—: un script Node desechable, fuera del repositorio,
que pintó el SVG en una página y capturó el lienzo. `apps/mobile/assets/icon.png` (1024×1024,
fondo sólido) y `apps/mobile/assets/adaptive-icon.png` (1024×1024, fondo transparente real,
comprobado por `colorType` en la cabecera PNG y componiendo sobre `#0b0f18` antes de darlo por
bueno) para la app; `apps/web/src/app/icon.png` (32×32) como respaldo del favicon.

**El favicon es SVG con respaldo, sin tocar `layout.tsx`.** Next.js App Router sirve
automáticamente cualquier `icon.svg` o `icon.png` colocado en `apps/web/src/app/` —confirmado
en la documentación empaquetada del propio `node_modules/next`, no de memoria, porque
`apps/web/AGENTS.md` advierte que esta versión de Next puede diferir de lo entrenado—: el build
de producción generó los dos `<link rel="icon">`, el SVG con `sizes="any"` primero y el PNG
32×32 detrás, sin necesidad de tocar el `<head>` a mano.

**Decisiones de diseño**:

| Decisión | Por qué |
|---|---|
| La geometría del logo vive en `shared` como datos, no como componente | `shared` no exporta JSX —los dos clientes tienen motores de dibujo SVG distintos—; el patrón ya lo fijó el `QrCode` de la Fase 6. Sin esto, el trazo del anillo se habría escrito dos veces y habría podido divergir en silencio, igual que la paleta antes de la Fase 11 |
| Los colores del logo **no están en `shared`**, cada cliente los toma de su propio sistema | Fijar `#5aa9ff` dentro de `logo.ts` habría sido una copia más del token `acento`, exactamente lo que el sistema de diseño de la Fase 11 existe para evitar |
| El icono adaptativo se generó con el dibujo al 62% del lienzo | La zona segura de un icono adaptativo de Android es un círculo inscrito; un logo ya circular que toca el borde pierde el filo al recortarse, la advertencia que esta fase dejó escrita para sí misma antes de empezar |
| Los PNG se generaron con un script desechable de Playwright, fuera del repo | No había rasterizador de SVG en el entorno, y tres imágenes no son motivo para fijar una dependencia nueva en ningún `package.json`. El mismo camino —Chromium ya cacheado, `playwright` sin vivir en ningún manifiesto— es el que usan las suites de verificación de las fases 8 a 11 |
| El favicon es un `icon.svg` de convención de Next, no una ruta generada a mano | Next.js ya resuelve `rel`, `sizes` y `type` a partir del archivo; escribirlo en `layout.tsx` habría sido una segunda fuente de verdad para algo que el *file convention* ya resuelve solo |

**Verificación (2026-08-20)**:

| Qué | Cómo | Resultado |
|---|---|---|
| Los tres paquetes tocados | `npm run typecheck` en `shared`, `web` y `mobile` | Los tres, limpio |
| Build de producción de la web | `next build` | Compila; `/icon.png` e `/icon.svg` aparecen como rutas propias |
| Favicon servido | `curl` sobre `/entrar` con el servidor de producción arrancado | `<link rel="icon" href="/icon.svg" sizes="any" type="image/svg+xml">` y el PNG 32×32 detrás |
| Logo en la pantalla de entrada, web | Captura de un navegador real a 480px | El anillo junto a «NoteCore», sin desbordar la cabecera |
| Icono adaptativo, transparencia real | Cabecera PNG (`colorType: 6`) y composición sobre `#0b0f18` antes de exportar | Fondo realmente transparente, no blanco disimulado |
| `expo prebuild` | Regenera `apps/mobile/android/` desde `app.json` | Los mipmaps de `ic_launcher` y `ic_launcher_foreground` salen del logo nuevo |
| APK de release recompilado | Receta de la Fase 12: `EXPO_PUBLIC_API_URL` + `createBundleReleaseJsAndAssets --rerun-tasks` + `assembleRelease` | Compila limpio |
| Firma del APK | `apksigner verify --print-certs`, comparado byte a byte con el de `_apk/` | **Mismo SHA-256** de certificado que el APK anterior |
| **Icono en el cajón de aplicaciones del emulador real** | APK instalado, cajón abierto, captura de pantalla | El ouroboros, recortado en círculo por el lanzador, **sin perder el anillo ni el detalle** |
| **Pantalla de entrada en la app real** | APK contra la API de producción, captura de pantalla | El mismo logo junto a «NoteCore», idéntico al de la web —misma geometría de `shared`— |

El APK verificado reemplazó al anterior en `_apk/`, con el mismo SHA-256 de certificado
comprobado antes de copiarlo.

---

#### Fase 12 — Arreglos de producción · cerrada el 2026-08-20

**Entregado**: los tres fallos que afectaban a quien usara el producto ese día. El 12.3 (cabeceras
de seguridad de la web) ya se había resuelto al desplegar; esta fase cerró el **12.1** y el
**12.2**.

**12.1 · La sesión de la web se cerraba sola.** El path de la cookie de refresco sale ahora de una
sola función, `refreshCookiePath()` en [`apps/api/src/lib/cookies.ts`](apps/api/src/lib/cookies.ts),
que compone el prefijo público de la API (`WEB_API_PREFIX`) con la ruta de refresco. Se descartó
`path=/`, que habría hecho viajar el token de refresco en todas las peticiones. Al cerrar sesión se
barre además la cookie que quedó en el path anterior.

**12.2 · El botón atrás cerraba la app.** Un hook compartido,
[`useBotonAtras`](apps/mobile/src/lib/boton-atras.ts), al que cada pantalla declara su escalera de
pasos; atrás deshace **uno** —primero la capa abierta, después volver al inicio—. En el inicio y en
la pantalla de entrar, `useSalirDeLaApp` exige **dos pulsaciones** con un aviso.

**Lo que se aprendió probándolo, que no salía de leer el código**:

- **Consumir el evento "por si acaso" bloquea la salida.** La primera versión devolvía `true`
  siempre, incluso cuando ningún paso de la escalera aplicaba. React Native solo llama a
  `exitApp()` si **ningún** escucha devuelve `true`, así que la escalera de `App.tsx` —que fuera
  del registro no hace nada— le ganaba a `useSalirDeLaApp` y **la app no se podía cerrar**. Ahora
  una escalera sin paso aplicable devuelve `false` y deja pasar la pulsación. Las pantallas sí
  llevan un paso final `cuando: true`, y por eso desde una sección nunca se sale de golpe.
  **El typecheck no detecta esto**: solo aparece ejecutando la app
- **Android consulta los escuchas en orden inverso al registro**, y en React los efectos del hijo
  corren antes que los del padre. Por eso la raíz **no** resuelve "volver al inicio": un escucha
  allí ganaría al de la pantalla y atrás saltaría al inicio sin cerrar el formulario abierto.
  Comprobado leyendo `BackHandler.android.js` de la versión instalada
- **Al compilar el APK hay que pasarle `EXPO_PUBLIC_API_URL`.** Gradle no lee el `.env` de la raíz,
  así que un `assembleRelease` a secas incrusta `http://localhost:3101` y la app no conecta con
  nada. Y si solo se exporta la variable, Gradle da la tarea de empaquetado por actualizada y **no
  la rehace**: hace falta `./gradlew :app:createBundleReleaseJsAndAssets --rerun-tasks`

**Verificación (2026-08-20)**:

| Qué | Cómo | Resultado |
|---|---|---|
| Cookie con el path correcto | Registro por `notecore.ourocore.net/api`, leyendo `Set-Cookie` | `Path=/api/auth/refresh` |
| Refresco con solo cookies | `POST /api/auth/refresh` sin cabeceras | **200** (antes 401) |
| Sesión sobrevive al token caducado | Quitando la cookie de acceso: `/auth/me` → refresco → `/auth/me` | **401 → 200 → 200** |
| Barrido de la cookie vieja | `POST /api/auth/logout` | Borra los dos paths |
| La app no se ve afectada | Login `x-notecore-client: mobile` contra la API directa | **0 cookies**, `/auth/me` y refresco 200 |
| Atrás en las 8 secciones | APK release en el emulador, `KEYCODE_BACK` en cada una | Vuelve al inicio, ninguna cierra la app |
| Atrás cierra la capa interna | Formulario de materia abierto en Horario | Cierra el formulario y **deja Horario** |
| Atrás en el inicio | Dos pulsaciones, con y sin sesión | 1ª avisa y se queda · 2ª sale al lanzador |

El APK verificado quedó en `_apk/`, firmado con la misma clave que el anterior —comprobado que el
SHA-256 del certificado coincide—, así que se instala encima sin desinstalar.

#### Fase 11 — Widget y pulido visual · cerrada el 2026-08-20

**Entregado**: widget de pantalla principal con la próxima clase (FR-051) y pasada de diseño
integral con **hallmark** sobre las 12 pantallas de la web y las 11 de la app. Con un sistema
bloqueado en [`design.md`](design.md) y sus valores en `packages/shared/src/design/tokens.ts`.

**La paleta estaba escrita dos veces y nadie lo había notado.** Es el hallazgo que reordenó la
fase. La web usaba clases de Tailwind (`slate-950`, `sky-600`) y la app un objeto `colors`
copiado a mano; coincidían por casualidad, no por construcción, y cualquier ajuste en un cliente
habría dejado al otro atrás en silencio. Además había **cinco tablas de colores de estado** más
en `shared` —faltas, agenda, social, compartir, semestres— cada una con su propio rojo y su
propio ámbar. Ahora todo sale de `tokens.ts`: 468 clases migradas en la web, 224 medidas y 39
colores sueltos en la app.

**El acento cambió por contraste, no por gusto.** El `sky-600` anterior daba 3,4:1 sobre el
fondo y los enlaces de navegación lo usaban en texto de 14px, por debajo del mínimo AA de 4,5:1.
El cobalto nuevo da 8,3:1. Es el único arreglo de accesibilidad de la fase que cambia un valor
que ya estaba en producción.

**El inicio dejó de ser un menú disfrazado de contenido.** Eran diez tarjetas idénticas con
título, párrafo y enlace `→`: había que leer diez párrafos para encontrar dónde tocar, y el
párrafo solo servía la primera vez. Ahora responde antes de que se le pregunte —qué clase toca,
qué exige atención— y la navegación va al final, compacta. **Nada se muestra por completitud**:
si no hay faltas cerca del límite no hay línea de faltas, porque un aviso que aparece siempre
deja de leerse.

**El widget no decide nada.** `widgetSnapshot()` vive en `shared` y la ejecuta la app, que deja
el resultado ya resuelto en un `SharedPreferences` donde el Kotlin lo lee y lo pinta. El widget
corre en el proceso del lanzador: no tiene JavaScript, ni sesión, ni forma de llamar a la API. Si
hubiera calculado él qué clase toca, la regla existiría en dos idiomas y una de las dos copias
habría envejecido sin que nadie lo notara. Los tres —web, app y widget— dicen lo mismo a la misma
hora porque los tres llaman a la misma función.

**Decisiones de diseño**:

| Decisión | Por qué |
|---|---|
| El widget es un **módulo local de Expo**, no código generado en el prebuild | Se intentó primero generarlo dentro de `android/app` desde un plugin, y **no funciona**: los módulos se registran desde una clase `ExpoModulesPackageList` que el autolinking genera dentro de `node_modules`. Un módulo que no pasa por el autolinking no aparece en el runtime aunque sus tres clases estén en el APK —lo estaban, y `requireNativeModule` seguía devolviendo `null`—. Como módulo local, además, vive versionado en git en lugar de en un directorio que el prebuild regenera |
| La barra de color del widget es un **`ImageView`** | `android.view.View` no está en la lista de clases que un `RemoteViews` puede inflar: el lanzador responde «Class not allowed to be inflated» y el widget entero deja de cargar. `ImageView` sí está permitido y acepta el mismo `setBackgroundColor` |
| Los colores del widget se **generan** en cada `prebuild` | Un `RemoteViews` solo entiende colores compilados en `res/values/`. Es la única duplicación del sistema; derivarla de `tokens.ts` en cada compilación es lo que impide que se convierta en una divergencia |
| El widget muestra **la próxima clase**, no la rejilla semanal | Seis columnas por ocho horas en el ancho de un teléfono dan celdas de menos de 40dp, donde no cabe el nombre de una materia. Lo que se mira en la pantalla de inicio es «qué me toca ahora», y eso sí se lee de un vistazo. La semana está a un toque |
| Las clases de espaciado de la web llevan el prefijo **`nc-`** | En Tailwind 4, `--spacing-*` alimenta también las anchuras nombradas: declarar `--spacing-md` redefine `max-w-md` de 28rem a 1rem. La columna del formulario de entrada colapsó al ancho de una letra, y desde fuera parecía un fallo de la rejilla |
| La app usa la **tipografía del sistema** y la web las tres familias | `monospace` en Android resuelve a Roboto Mono, que cumple el rol tabular —el que de verdad importa—, y `sans-serif` a Roboto. Empaquetar tres familias son ~700 KB en un APK que se instala a mano. La paridad del Principio I es de **información y estructura**, no de archivo tipográfico |
| Los botones destructivos son **discretos en reposo** | Cinco botones rojos rellenos en una lista de materias gritan la acción menos frecuente de la pantalla y convierten el rojo en decoración —y entonces el rojo del aviso de faltas, que sí importa, deja de destacar—. El color aparece al apuntarlos |
| El widget se **borra al cerrar sesión** | El horario de quien se fue no puede quedarse visible en la pantalla de inicio del teléfono, a la vista de cualquiera que lo mire. Es el Principio III aplicado fuera de la app, que es donde se olvida |

**Verificación** (2026-08-20, emulador Android + navegador con la misma cuenta):

- **La misma cuenta en los dos clientes dice lo mismo al minuto**: «Álgebra Lineal · 07:00–09:00
  · B101 · En 7 h 16 min», con los mismos tres avisos y los mismos colores. Coinciden porque
  ambos llaman a `nextClass()` en `shared`, no porque se hayan igualado a mano
- **El widget se colocó en la pantalla de inicio** desde el propio botón de la app, con el
  diálogo de fijado de Android, y mostró la clase real con **la barra en verde** —el color exacto
  de esa materia—, su hora, su aula y «Quedan 2 clases hoy»
- **Al tocar el widget, la app abrió en «Mi horario»**, no en el inicio: el enlace profundo
  `notecore://horario` cumple el criterio del plan
- **El widget se refresca solo**: se le vio pasar de «En 7 h 2 min» a «En 6 h 50 min» sin abrir
  la app
- Las 12 pantallas de la web se recorrieron con sesión iniciada y **ninguna desborda a lo ancho**
  a 1280px; el typecheck de los cuatro paquetes y el build de producción de Next pasan limpios

**Nota de entorno**: el puerto 8081 estaba ocupado por `qbittorrent-nox`, así que Metro corrió en
el 8083. La app busca el bundle en `10.0.2.2:8081` —la puerta al host desde el emulador—, donde
`adb reverse` no interviene: hay que escribir `debug_http_host` en
`shared_prefs/net.ourocore.notecore_preferences.xml` con `run-as`.

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
│   │       │                agenda, calendar, share, semester, social, messaging,
│   │       │                releases — publicación del APK, Fase 17)
│   │       ├── middleware/  autenticación: único lugar que fija quién eres
│   │       ├── services/    lógica de negocio (Principio II)
│   │       └── lib/         tokens, contraseñas, cookies, errores, validación
│   │
│   ├── web/                 aplicación web — Next.js + Tailwind
│   │   └── src/
│   │       ├── app/         rutas (/, /entrar, /registro, /perfil, /horario, /faltas,
│   │       │                /agenda, /calendario, /compartir, /compartido/[code],
│   │       │                /semestres, /social, /mensajes, /u/[username],
│   │       │                /app — descarga del APK, Fase 17)
│   │       ├── components/  componentes propios de web
│   │       └── lib/         cliente de API y contexto de sesión
│   │
│   └── mobile/              app Android — React Native + Expo
│       ├── modules/         módulos nativos locales (Expo autolinking)
│       │   ├── widget-horario/  familia de cuatro widgets (Fases 11 y 16)
│       │   └── actualizador/    descarga, verifica e instala el APK (Fase 17)
│       ├── plugins/         plugins de configuración nativa (cleartext local, firma de
│       │                    release, widget, y el permiso de instalación de la Fase 17,
│       │                    que solo entra si el interruptor está encendido)
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
│                            escribir a quién, comparación de versiones para el actualizador,
│                            errores de formulario, fechas)
│
├── infra/                   Docker Compose y despliegue
│
├── scripts/
│   └── publicar-apk.sh      publica una versión para el actualizador (Fase 17)
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

#### Fase 11 — Widget y pulido visual (P4) ✅
Widget de pantalla principal con la próxima clase y pasada de diseño integral con **hallmark**.
Cerrada el 2026-08-20: el widget se colocó en la pantalla de inicio del emulador, mostró la clase
real con el color de su materia y, al tocarlo, la app abrió en «Mi horario». Detalle en el
historial.

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
- **hallmark** — skill de diseño de UI; se usó en la Fase 11 y su resultado está
  bloqueado en [`design.md`](design.md), que toda pantalla nueva debe leer antes de tocar estilos

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

---

## 7. Despliegue en producción (2026-08-20)

### Direcciones

| Qué | Dónde | Notas |
|---|---|---|
| Web | `https://notecore.ourocore.net` | Next.js en modo producción |
| API para la web | `https://notecore.ourocore.net/api/*` | Reescritura de Next hacia `http://api:3101` |
| API para la app | `https://notecore-api.ourocore.net` | Alcanzada directa, con token por cabecera |
| Túnel | `NoteCore` = `85a28853-5117-461c-8369-8323c5c0e18d` | 4 conexiones, `healthy` |

Se levanta entero con `npm run docker:up`: PostgreSQL, API, web y `cloudflared`. **No hay
un solo puerto abierto en el router**: el túnel establece la conexión de salida.

### Por qué la web y la app entran por sitios distintos

No es una inconsistencia, es la consecuencia de cómo se autentica cada una.

La web usa **cookies `httpOnly` con `sameSite: lax`**, y `lax` no manda la cookie en
peticiones cruzadas. Con la web en un host y la API en otro, cada `fetch` saldría sin
sesión y no duraría ni una recarga. Por eso la API se sirve **bajo el mismo origen** que la
web, con un `rewrite` en `next.config.mjs` que reenvía `/api/*` a `http://api:3101` por la
red interna de Docker: el tráfico web→API no llega a salir a internet.

La app manda el **token por cabecera**: no hay cookie que proteger, así que habla directa
con `notecore-api.ourocore.net`.

El `LiveChannel` de la mensajería deriva su `wss://` de esa misma base, así que en web se
resuelve contra el origen de la página —una ruta relativa no tiene esquema que cambiar, y
`new WebSocket('/api/...')` lanzaría—.

### El hostname de la API es de un solo nivel, y esa es la razón

El primer intento fue `api.notecore.ourocore.net`. **No funciona**: el certificado universal
de Cloudflare cubre `*.ourocore.net`, pero no un segundo nivel de comodín, y el `curl`
moría en el handshake TLS —no en un 404, que habría sido más fácil de leer—. Cubrirlo exige
un certificado avanzado de pago. `notecore-api.ourocore.net` entra en el certificado que ya
existe y no cuesta nada.

### La firma del APK

El `build.gradle` que genera React Native trae `signingConfig signingConfigs.debug` **dentro
del bloque `release`**, con un comentario que dice que generes tu propia clave. Si no se
hace, el APK de producción sale firmado con una clave **que está publicada en el repositorio
de React Native**: Play Store lo rechaza, y cualquiera podría firmar una actualización que
el teléfono aceptaría como legítima.

La clave real es un **RSA de 4096 bits con 30 años de validez**, en
`~/.notecore-release/`, **fuera del repositorio**. Si se pierde, no se puede volver a
publicar una actualización de la app en Play Store bajo la misma identidad: **hay que
respaldarla**.

El arreglo vive en `plugins/with-firma-de-release.js` y no en `android/app/build.gradle`
porque ese directorio está en `.gitignore` y `expo prebuild` lo regenera entero: un cambio a
mano desaparece en la siguiente compilación limpia, en silencio y justo cuando importa. Si
faltan las credenciales, el plugin **aborta la compilación** en vez de firmar con la clave de
depuración.

### Despliegue del 2026-08-21 (fases 19, 20 y 25)

Se reconstruyeron las imágenes de `api` y `web` y se recrearon los contenedores. La migración
`0011` ya se había aplicado antes, durante la verificación; es **compatible hacia atrás** —solo
añade columnas y endurece claves foráneas—, así que el código anterior siguió funcionando con ella
durante el rato que estuvo desplegada sin su código.

Se añadió `NEXT_PUBLIC_APP_VERSION=0.2.0` al `.env`. Es la versión que la web manda en la cabecera
`x-notecore-version` y que el panel agrega. **Va en la compilación, no en el entorno del
contenedor**: `NEXT_PUBLIC_*` se incrusta en el bundle, así que cambiarla exige reconstruir la
imagen, no solo reiniciarla.

Verificado desde las direcciones públicas: `/privacidad` y `/borrar-cuenta` responden 200 **sin
sesión** con el contenido completo, `/panel` responde 404 a una cuenta normal y 401 sin sesión, y
con una cuenta administradora devuelve los números reales de producción.

**La cuenta `@mizllet` quedó marcada como administradora** (`is_admin = true`), y es la única.

### Otros arreglos que salieron al desplegar

| Qué estaba mal | Por qué importaba |
|---|---|
| Los `Dockerfile` copiaban `node_modules` de cada workspace por separado | npm los iza a la raíz y esos directorios no existen: la construcción **nunca había funcionado**. Ahora se copia el árbol entero |
| La web no emitía **ninguna** cabecera de seguridad | `helmet` protege la API, pero las páginas las sirve Next. Sin `X-Frame-Options`, NoteCore se podía embeber en un iframe invisible para recoger las pulsaciones del usuario |
| `JWT_SECRET` no llegaba al contenedor de la API | Estaba en `.env` pero el `docker-compose.yml` no lo pasaba |

### Verificación (2026-08-20)

- Web, API por `/api` y API directa: **HTTP 200 con TLS válido** por internet
- **Ciclo completo de sesión por cookie** sobre HTTPS: registro, cookies `notecore_access` y
  `notecore_refresh`, y `/auth/me` respondiendo solo con la cookie
- **Ciclo de la app**: token por cabecera contra la API directa, y **401 sin token**
- **El APK release instalado en el emulador**, con `adb reverse` retirado y sin Metro:
  entró con una cuenta creada por HTTPS y pintó la pantalla de inicio con su `@usuario`
- **Paridad**: esa misma cuenta entró en la web y devolvió el mismo usuario
- Las cuentas de prueba se borraron al terminar

### Publicar una versión nueva de la app (Fase 17)

Desde la Fase 17 la app se actualiza sola, pero **hay que publicar la versión**, y el primer paso
es el que se olvida:

1. **Subir el `versionCode`** en `apps/mobile/app.json`. Es lo único que decide si alguien recibe
   la actualización; el `version` visible no se compara jamás
2. Compilar el APK con la receta de arriba (`EXPO_PUBLIC_API_URL` en la línea de comandos, y
   además `EXPO_PUBLIC_UPDATER_ENABLED=true`, que se lee en el **prebuild**)
3. `scripts/publicar-apk.sh <ruta-al-apk> "qué trae de nuevo"`

El script lee el `versionCode` **del propio binario** con `aapt`, calcula el SHA-256 sobre el
archivo ya copiado y escribe el `latest.json`. La API lo relee en cada petición: **no hace falta
reiniciar nada**.

Comprobar que salió: `curl -s $PUBLIC_API_URL/releases/android/latest`. Si responde
`"release": null` con el actualizador encendido, el motivo está en el registro de la API
(`manifiesto_invalido`, `apk_ausente`, `sin_manifiesto`).

**Para desplegar la Fase 17 a producción** hace falta, además de reconstruir las imágenes:
`UPDATER_ENABLED=true`, `RELEASES_HOST_DIR` apuntando al directorio de los APK, y
`PUBLIC_API_URL=https://notecore-api.ourocore.net` — sin esto último el enlace de descarga sale con
el host interno del contenedor y el teléfono no lo alcanza.

### Pendiente antes de Play Store

La cuenta de desarrollador se adquirió el **2026-08-21**, y lo que falta está desglosado como las
**fases 19 a 24** en la [sección 9](#9-fases-pendientes-19-a-25--el-camino-a-play-store-y-medir)
—junto con la **25**, el panel de números, que no es de la tienda—. **De todas ellas solo quedan
abiertas la 23 y la 24**; las demás se cerraron el 2026-08-21. En resumen, y por orden:

| | Qué | Fase |
|---|---|---|
| **P0** | Política de privacidad pública y cuestionario de Data Safety | [19](#fase-19--política-de-privacidad-y-datos-declarados--p0--cerrada-el-2026-08-21) |
| **P0** | Borrar la cuenta desde la app y desde una URL web | [20](#fase-20--borrar-la-cuenta--p0--cerrada-el-2026-08-21) |
| **P1** | Reportar publicaciones y mensajes (el bloqueo ya existe) | [21](#fase-21--reportar-contenido-y-cerrar-la-moderación--p1--cerrada-el-2026-08-21) |
| **P1** | Quitar los permisos que ninguna parte de la app usa | [22](#fase-22--limpiar-los-permisos-del-manifiesto--p1--cerrada-el-2026-08-21) |
| **P1** | Generar el `.aab` y montar la ficha de la tienda | [23](#fase-23--el-aab-y-la-ficha-de-la-tienda--p1) |
| **P2** | Apagar el actualizador — **la última puerta** | [24](#fase-24--apagar-el-actualizador--p2-la-última-a-propósito) |
| **P2** | *(no es de la tienda)* Panel de números, antes de que entre gente | [25](#fase-25--panel-de-números-seguimiento-y-telemetría--p2--cerrada-el-2026-08-21) |

**Y antes que todas, fuera de las fases**: **respaldar `~/.notecore-release/`** en un sitio seguro
y fuera de esta máquina. Sigue sin respaldo. Perder esa clave impide volver a actualizar la app
bajo la misma identidad, y no tiene arreglo posterior.

El `versionCode` hay que subirlo en **cada** publicación: hoy va en `4`, lo subió la sesión del
2026-08-21.

---

## 8. Fases 12 a 18 — todas cerradas

Estas siete fases **no venían en el plan original**: seis salieron de usar el producto ya
desplegado, el 2026-08-20, y la última (**18, cuatrimestres**) se pidió el mismo día. Se mantiene la regla de siempre —una fase por conversación, y no se cierra hasta
verificarla en app **y** en web—.

Van ordenadas por prioridad, no por número: la **12 es P0** porque hay una sesión que se cae en
producción ahora mismo.

---

### Fase 12 — Arreglos de producción · **P0** ✅ *(cerrada el 2026-08-20)*

Tres fallos que afectaban a quien usara el producto ese día. Los tres están **diagnosticados con la
causa exacta**, no supuestos.

#### 12.1 · La sesión de la web se cierra sola (regresión del despliegue)

**Síntoma**: dejas la web abierta un rato, recargas, y te pide entrar de nuevo.

**Causa, ya confirmada**: la cookie de refresco se emite con `path=/auth/refresh`
(`apps/api/src/lib/cookies.ts`), pero desde que la web habla con la API por el rewrite `/api`,
el navegador la pide en `/api/auth/refresh`. Los paths no coinciden, **el navegador no manda la
cookie**, y el refresco responde 401. El token de acceso dura 15 minutos: pasados esos, la
sesión muere aunque el refresco fuese válido 30 días.

Comprobado sobre producción: el refresco da **401** con el path actual y **200** forzando la
cookie a `/api/auth/refresh`. Esa es la única diferencia entre los dos casos.

**Es una regresión introducida el 2026-08-20** con el rewrite, no un fallo de la Fase 1.

**Qué hay que decidir al implementarla**: el path de la cookie tiene que salir de un solo sitio
que conozca el prefijo de la API. Ojo con la tentación de poner `path=/`: haría que el token de
refresco viajara en *todas* las peticiones, que es justo lo que el path estrecho evita.

**Cómo se resolvió** *(2026-08-20)*: una variable nueva, **`WEB_API_PREFIX`**, dice bajo qué
prefijo alcanza **el navegador** a la API —vacía en desarrollo, `/api` en producción— y una sola
función, `refreshCookiePath()` en
[`apps/api/src/lib/cookies.ts`](apps/api/src/lib/cookies.ts), la compone con la ruta de refresco.
Escribir y borrar la cookie usan esa misma función, porque una cookie **solo se borra si el path
del borrado coincide con el del alta**. Se descartó `path=/` por lo que ya advertía el párrafo de
arriba. Al cerrar sesión se barre además la cookie que quedó en el path anterior: no se envía
nunca —por eso fallaba—, pero seguiría en el navegador 30 días.

La variable va **emparejada con `NEXT_PUBLIC_API_URL`**, y así está anotado en `.env.example` y en
`infra/docker-compose.yml`: si una cambia sin la otra, el fallo vuelve exactamente igual.

**Verificación** *(hecha el 2026-08-20)*: API redesplegada con `WEB_API_PREFIX=/api`. Sobre
producción: la cookie sale con `Path=/api/auth/refresh`, el refresco responde **200** donde antes
daba 401, y el ciclo con el token de acceso caducado da **401 → refresco 200 → 200**. La app,
comprobada aparte, **no recibe ni una cookie** y su ciclo por cabecera sigue igual.

#### 12.2 · El botón atrás de Android cierra la app

**Síntoma**: estás en Horario, pulsas atrás para volver, y sales al escritorio del teléfono.

**Causa, ya confirmada**: no hay **ni un solo** `BackHandler` en `apps/mobile/src`. La app
gestiona la navegación con estado propio, y Android, al no ver a nadie atender el botón, aplica
lo suyo: cerrar la actividad.

**Qué hay que decidir**: qué significa "atrás" en cada pantalla —volver al inicio, cerrar un
diálogo abierto, salir de una conversación— y qué pasa **en el inicio**, donde sí debe salir de
la app. El patrón habitual es pedir confirmación o exigir dos pulsaciones seguidas, para que un
toque accidental no te eche.

**Cómo se resolvió** *(2026-08-20)*: un hook compartido,
[`useBotonAtras`](apps/mobile/src/lib/boton-atras.ts), al que cada pantalla le declara su
**escalera** —una lista de pasos con su condición, y se ejecuta el primero que se cumple—. Atrás
significa lo mismo que la flecha de la cabecera: deshacer **un** paso. Primero la capa abierta
dentro de la pantalla (el formulario, el detalle del día, el hilo, el perfil ajeno), y solo
cuando no queda ninguna, volver al inicio. En el inicio y en la pantalla de entrar, un segundo
hook —`useSalirDeLaApp`— pide **dos pulsaciones seguidas** con un aviso, porque el borde inferior
del teléfono es donde más roces accidentales hay.

**El detalle que casi sale mal, y por qué queda anotado**: Android llama a los escuchas del botón
atrás **en orden inverso al registro** y se detiene en el primero que devuelve `true`; y en React
los efectos del hijo corren **antes** que los del padre. Es decir, un escucha puesto en `App.tsx`
para "volver al inicio" **ganaría** al de la pantalla, y atrás saltaría al inicio sin cerrar el
formulario abierto. Por eso la raíz **no** resuelve ese salto: cada pantalla termina su propia
escalera llamando a `onVolver`, que es exactamente volver al inicio. Verificado leyendo
`BackHandler.android.js` de la versión de React Native instalada, no por costumbre.

**Verificación** *(hecha el 2026-08-20)*: APK release instalado en el emulador. Atrás en las ocho
secciones vuelve al inicio y **ninguna cierra la app**; con el formulario de materia abierto,
atrás lo cierra y **deja Horario**; en el inicio, la primera pulsación avisa y la segunda sale al
lanzador.

**Probarlo destapó un fallo que el typecheck no ve**: la primera versión consumía el evento
siempre, y eso **impedía cerrar la app** —React Native solo llama a `exitApp()` si ningún escucha
devuelve `true`—. Está explicado en el
[historial](#fase-12--arreglos-de-producción--cerrada-el-2026-08-20).

#### 12.3 · La web no emite cabeceras de seguridad *(hecho el 2026-08-20)*

Ya arreglado al desplegar, se anota aquí porque pertenece al mismo grupo. `helmet` cubría la
API pero no las páginas de Next: sin `X-Frame-Options`, NoteCore se podía embeber en un iframe
invisible para recoger las pulsaciones del usuario.

---

### Fase 13 — Identidad visual: logo e iconos · P2 ✅ *(cerrada el 2026-08-20)*

Hoy la app usa el icono por defecto de Expo y la web no tiene favicon propio.

**Dirección elegida** (2026-08-20): **el ouroboros formando una C**. La serpiente mordiéndose
la cola dibuja la C de *Core*, y el hueco interior deja ver los renglones de una hoja. Une la
mascota de OuroCore con el nombre del producto y sobrevive al tamaño de una pestaña, donde el
anillo se sigue leyendo aunque el detalle interior se pierda.

Se pidió además una **demo del monograma NC entrelazado** para comparar antes de cerrar la
decisión: está publicada en
<https://claude.ai/code/artifact/ceb8654f-fb76-4a4f-bfbb-f1e928d3cbc9>, con los dos dibujos a
128, 48 y 16 píxeles —el de 16 es el que decide, porque es el de la pestaña—. El logo se dibuja en **SVG**, no como imagen de mapa de bits: es lo que permite
derivar todos los tamaños del mismo archivo sin que se vea borroso en ninguno.

**Dónde acaba usándose**:

| Destino | Formato | Nota |
|---|---|---|
| Icono de la app | PNG desde el SVG, varios tamaños | Android exige el icono adaptativo en capas |
| Favicon | SVG + PNG de respaldo | El SVG permite que cambie con el tema claro/oscuro |
| Pantalla de entrada | SVG en línea | Web y app, desde `shared` |

**Lo que hay que cuidar**: el icono adaptativo de Android **recorta en círculo** en muchos
lanzadores. Un logo que ya es circular pierde el borde si se dibuja al límite: hay que dejarle
aire. Y a 16px en la pestaña, cualquier detalle interior desaparece — conviene mirarlo a ese
tamaño antes de darlo por bueno, no solo en grande.

**Verificación**: verlo instalado en el lanzador de Android, en la pestaña del navegador a
tamaño real, y en la pantalla de entrada de los dos clientes.

**Cómo se resolvió y se verificó** (2026-08-20): ver el
[historial](#fase-13--identidad-visual-logo-e-iconos--cerrada-el-2026-08-20).

---

### Fase 14 — La web en pantalla grande · P1 ✅ *(cerrada el 2026-08-20)*

**Síntoma**: en una laptop o un escritorio la web se ve igual que en el teléfono, con todo el
contenido en una columna estrecha y el resto de la pantalla vacío.

**Causa, ya medida**: en toda la web hay **9 clases responsive** (`sm:`, `md:`, `lg:`), y el
contenedor está fijo en `max-w-3xl` —768px—. En una pantalla de 1920px se desperdicia más del
60% del ancho. Tampoco existe **ningún componente de navegación**: `apps/web/src/components/`
no tiene ni barra lateral ni navbar; cada pantalla se alcanza volviendo al inicio.

**Qué hay que decidir**: barra lateral fija o navbar superior. La lateral aprovecha mejor una
pantalla ancha —el alto es lo que sobra en 16:9— pero hay que resolver qué hace en el teléfono,
donde no cabe. Sea cual sea, en móvil la web **no debe empeorar**: hoy funciona bien ahí.

**Ojo con esto**: la Fase 11 dejó las medidas con prefijo `nc-` porque en Tailwind 4
`--spacing-*` redefine también las anchuras nombradas (`max-w-md` pasó de 28rem a 1rem y el
formulario de entrada colapsó al ancho de una letra). Cualquier medida nueva tiene que respetar
esa convención.

**Verificación**: las 12 pantallas de la web en un navegador ancho y en uno estrecho. La app no
se toca.

---

### Fase 15 — Social en secciones propias · P2 ✅ *(cerrada el 2026-08-20)*

> **Nota al cerrarla**: lo de abajo es la especificación tal como se escribió. Al medir antes de
> empezar apareció algo que la cambiaba de tamaño: **el muro no existía en la API** —`GET
> /social/posts` devolvía solo las propias—, así que no fue una reorganización sino backend
> nuevo. El detalle de lo entregado está en
> [el historial](#fase-15--social-en-secciones-propias--cerrada-el-2026-08-20).

**Síntoma**: el botón se llama «Contactos» pero dentro está todo: tu perfil, la búsqueda, las
solicitudes, los perfiles ajenos y las publicaciones. No se encuentra el perfil propio, y no
hay forma de ver un muro de publicaciones.

**Causa, ya medida**: `SocialScreen.tsx` son **968 líneas** con siete bloques dentro
(`PerfilPropio`, `Buscador`, `FilaUsuario`, `Contactos`, `FilaContacto`, `PerfilAjeno`,
`Publicaciones`). En la web, `social/page.tsx` son otras 687. Todo lo que la Fase 8 construyó
está ahí; el problema **no es que falte, es que no se encuentra**.

**Lo que pediste, separado**:

1. **Mi perfil** — verlo como lo ven los demás, accesible de inmediato
2. **Ajustes del perfil** — biografía, carrera, escuela, edad y visibilidad. Es
   configuración, y mezclarla con el perfil es lo que hace que ninguno de los dos se entienda
3. **Contactos** — solo contactos, solicitudes y búsqueda
4. **Muro de publicaciones** — lo que publican tus contactos, que hoy no existe como vista

**Ojo con esto**: la Fase 8 dejó una regla que no se puede aflojar al reorganizar —lo que la
visibilidad no alcanza **no se manda**, no se manda y se oculta en el cliente—. Al montar el
muro, un cambio descuidado en la consulta puede empezar a devolver publicaciones que el
receptor no debería ver. Es el Principio III, y toca verificarlo mirando la respuesta de la
API, no la pantalla.

**Verificación**: las cuatro secciones en app y web, y una comprobación con dos cuentas de que
el muro no filtra nada que la visibilidad no permita.

---

### Fase 16 — Widgets: familia y densidad · P3 ✅ *(cerrada el 2026-08-20)*

> Cerrada y verificada. El detalle de lo que se entregó, las decisiones y la verificación están
> en el [historial](#fase-16--widgets-familia-y-densidad--cerrada-el-2026-08-20). Lo de abajo es
> el enunciado con el que se abrió, que se conserva porque es el diagnóstico que la originó.

**Síntoma**: el widget ocupa mucho para lo poco que muestra, y el nombre de la materia se lee
pequeño para algo que debe entenderse de una ojeada.

**Causa, ya medida**: el nombre de la materia va a **17sp**, y el layout tiene un
`layout_weight="1"` en el bloque central que **estira el hueco vertical** hasta llenar la
altura reservada — de ahí el espacio vacío bajo el aula. El widget se declara con
`targetCellWidth="4"` y `targetCellHeight="2"`.

**Dos cosas, no una**:

1. **Encoger y agrandar el actual**: menos alto, y el nombre de la materia mucho más grande.
   El resto de la información se subordina a ese dato
2. **Una familia de widgets**, para quien quiera más: el día completo, las faltas cerca del
   límite, lo que vence pronto

**Ojo con esto** (todo aprendido en la Fase 11, cuesta caro reaprenderlo):

- Un `RemoteViews` **no puede inflar `android.view.View`**: el lanzador responde «Class not
  allowed to be inflated» y el widget entero deja de cargar. Por eso la barra de color es un
  `ImageView`
- El widget **no decide qué mostrar**: la regla vive en `shared` y la ejecuta la app, que le
  deja el resultado ya resuelto. Un widget nuevo tiene que seguir el mismo camino, o la regla
  acabará escrita en dos idiomas y una copia envejecerá sin que nadie lo note
- El widget corre en el proceso del lanzador: no tiene JavaScript, ni sesión, ni forma de
  llamar a la API
- Los widgets nuevos **también deben borrarse al cerrar sesión**, como el actual

**Verificación**: los widgets colocados en el lanzador real, con el diálogo de fijado del
sistema (arrastrarlos no se puede sintetizar de forma fiable).

---

### Fase 17 — Actualización de la app sin tienda · P3 ✅ *(cerrada el 2026-08-20)*

> Cerrada y verificada. El detalle de lo entregado, las decisiones y la verificación están en el
> [historial](#fase-17--actualización-de-la-app-sin-tienda--cerrada-el-2026-08-20). Lo de abajo es
> el enunciado con el que se abrió, que se conserva porque es el diagnóstico que la originó.

**Situación**: publicar en Play Store cuesta 25 USD y por ahora no se va a hacer, así que la
app se instala a mano. Sin un mecanismo propio, cada versión nueva exige avisar a cada usuario
y que reinstale.

**Enfoque elegido** (2026-08-20): **actualizador de APK propio**, aislado tras un interruptor.
La API expone cuál es la última versión y dónde está el APK; la app compara al abrir, avisa
cuando hay una nueva y ofrece descargarla.

Se descartó **Expo Updates**: actualiza JavaScript al vuelo, pero **no puede tocar código
nativo** —el widget, la cámara—, así que seguirían haciendo falta APKs nuevos para esos cambios
y acabarías manteniendo dos mecanismos.

**El requisito de que sea fácil de quitar es parte del diseño, no un extra**: todo vive en un
módulo propio con un interruptor de configuración. Al subir a Play Store se apaga con una
variable y el resto de la app no se entera. Las tiendas **prohíben** que una app se
autoactualice por fuera, así que esto no puede quedar enredado en el resto del código.

**Lo que hay que cuidar**:

- Instalar un APK exige el permiso `REQUEST_INSTALL_PACKAGES`, que **Play Store revisa con
  lupa**. Debe entrar condicionado al interruptor, no fijo en el manifiesto
- La versión que decide es el **`versionCode`**, no el nombre visible. Hoy va en `1` y **hay
  que subirlo en cada publicación**, o el actualizador no verá nada nuevo
- El APK descargado debe verificarse antes de instalarlo. Se genera un `.sha256` junto al
  binario; comprobarlo es lo que impide instalar una descarga corrompida o alterada
- Android solo acepta la actualización si el APK nuevo está **firmado con la misma clave**. Es
  otra razón para respaldar `~/.notecore-release/`

**Verificación**: instalar una versión con `versionCode` bajo, publicar una más alta, y ver el
ciclo entero —aviso, descarga, instalación— en un teléfono real. Y comprobar que **con el
interruptor apagado no queda rastro**: ni permiso en el manifiesto, ni aviso, ni peticiones.

---

### Fase 18 — Cuatrimestres además de semestres · P2 ✅ *(cerrada el 2026-08-20)*

**Lo que se pidió** (2026-08-20): que quien estudia por **cuatrimestres** —cuatro meses— pueda
llevar su periodo como tal. **El semestre sigue siendo el tipo principal y el que viene por
defecto**; el cuatrimestre es la alternativa para quien la necesite.

**Qué hay hoy, medido antes de escribir esto**: la Fase 3 dejó las semanas del periodo como un
**ajuste editable** —`DEFAULT_SEMESTER_WEEKS = 16`, entre `MIN_SEMESTER_WEEKS` 1 y
`MAX_SEMESTER_WEEKS` 52, con su propia ruta `PATCH /attendance/semester-weeks`—, y el límite de
faltas se calcula sobre ese número
([`packages/shared/src/logic/attendance.ts`](packages/shared/src/logic/attendance.ts)).

Conviene decirlo claro porque cambia el tamaño de la fase: **la aritmética ya funciona**. Alguien
que estudie por cuatrimestres puede poner 12 semanas hoy mismo y su límite de faltas saldrá bien.
Lo que falta no es el cálculo, es todo lo demás:

1. **El periodo no sabe lo que es.** `Semester` no guarda su tipo, así que las semanas correctas
   hay que ponerlas a mano en cada periodo nuevo y nada las propone
2. **La interfaz solo dice «semestre»**, en las tres capas y en decenas de textos. A quien cursa
   un cuatrimestre el producto le habla de algo que no está cursando
3. **El nombre sugerido al cerrar** deriva de la convención semestral (de «2026-1» sale
   «2026-2»), que en un plantel cuatrimestral no es la que se usa

#### Decisiones ya tomadas (2026-08-20)

**El tipo va en el periodo, no en la cuenta.** Un campo en `Semester`, elegido al crearlo. La
alternativa —un ajuste del usuario, «yo estudio por cuatrimestres»— era más simple pero tiene un
defecto que no se ve hasta que pasa: al cambiarlo se reetiquetaría **también el histórico ya
cerrado**, y un periodo archivado se cerró bajo el régimen que tenía. Con el tipo en el periodo,
un estudiante que cambia de plan o de escuela conserva sus semestres antiguos como semestres.

**El vocabulario cambia en la interfaz, no en el modelo.** Las pantallas dicen «cuatrimestre»
cuando el periodo lo es; la base de datos, las rutas y los tipos de `shared` siguen diciendo
`semester`. Renombrar a un término neutro sería más coherente sobre el papel, pero es una
migración sobre **datos que ya están en producción** y que toca los tres clientes, a cambio de
cero diferencia para quien usa el producto. Si algún día se hace, es su propia fase.

#### Lo que se decidió al implementarla (2026-08-20)

- **Un cuatrimestre trae 12 semanas** por defecto: los cuatro meses de clase efectivos. Como las
  del semestre, es una propuesta **editable** —hay planteles que cursan quince—, y sale de
  `defaultWeeksForKind` en `shared` para que web y app no propongan números distintos
- **El nombre siguiente sale del tipo del periodo que se cierra.** `periodsPerYear` decide cuántos
  periodos tiene el año —dos o tres—, así que de un cuatrimestre «2026-2» sale «2026-3» y del
  último del año sale «AAAA+1-1». Sigue siendo **una propuesta editable**, como prometía la Fase 7
- **La palabra vive en `SEMESTER_KIND_LABELS`**, junto a `SEMESTER_STATUS_LABELS`, con las cuatro
  formas que piden las pantallas: singular, plural, con artículo y con mayúscula inicial
- **Las semanas se mudaron al periodo**, algo que esta fase no tenía escrito y que resultó ser la
  mitad del trabajo. Estaban en `user_settings.semester_weeks`, un ajuste global de la cuenta: con
  dos tipos conviviendo, ajustar las de un cuatrimestre habría recalculado el límite de faltas de
  un semestre ya archivado. Ahora van en `semesters.weeks`, y la migración copió el valor de cada
  usuario a sus periodos para que ningún límite existente cambiara de número

#### Ojo con esto

- **El límite de faltas no cambia de naturaleza.** Sigue siendo el 20% de las sesiones y sigue
  siendo **orientativo**, con la recomendación visible de confirmarlo con el profesor
  (Principio VII). Un cuatrimestre tiene menos sesiones, así que su límite es **más bajo y cada
  falta pesa más** — el aviso de «queda una sola falta» de `absenceStatus` importa aún más aquí
- **Los periodos ya archivados son semestres y deben seguir siéndolo.** La migración que añada el
  campo tiene que dejarlos en `semestre`, no en un valor vacío que las pantallas tengan que
  adivinar. Es el Principio VI: ninguna operación de rutina toca el historial
- **La compartición cruza tipos.** Un compartido de horario puede viajar de alguien con
  cuatrimestre a alguien con semestre. Como compartir **es copia y no sincronización**, lo que
  llega se incorpora al periodo activo de quien recibe, con las semanas de **ese** periodo — no
  las del origen

**Verificación**: crear un cuatrimestre y un semestre en la misma cuenta y comprobar en **app y
web** que cada uno se nombra como lo que es, que su límite de faltas sale de sus propias semanas,
y que un periodo archivado antes de esta fase sigue apareciendo como semestre.

---

### Orden sugerido

**12 primero**, sin discusión: hay una sesión que se cae en producción y un botón atrás que
echa al usuario de la app. La **14** va después porque afecta a cualquiera que abra la web en
una laptop. El resto —13, 15, 16, 17, 18— son mejoras que pueden ir en el orden que prefieras.

**Ese orden ya se cumplió por completo.** Las siete se cerraron el 2026-08-20, en el orden
12 → 13 → 14 → 15 → 18 → 16 → 17.

---

## 9. Fases pendientes (19 a 25) — el camino a Play Store, y medir

> **Estado al 2026-08-21**: las fases **19, 20, 21, 22 y 25 están cerradas** — su detalle está en
> la [sección 10](#10-historial-de-las-fases-19-a-25). Quedan abiertas **la 23 y la 24**. Con la 19
> y la 20 cerradas, los dos motivos de **rechazo automático** ya no aplican; con la 21, la app tiene
> el mecanismo de denuncia que la tienda exige, y con la 22 el APK ya no declara permisos que no
> usa. **Las 21 y 22 están verificadas pero sin desplegar.**

Siete fases, de dos orígenes distintos:

- **Las 19 a 24** salieron de una **auditoría del proyecto contra los requisitos de Google Play**,
  hecha el 2026-08-21 sobre el código real —manifiesto, rutas de la API y pantallas de la web—, no
  sobre una lista genérica de la tienda. La cuenta de desarrollador **ya está adquirida**, así que
  esto deja de ser hipotético: es el camino a publicar
- **La 25** se pidió el mismo día y no es de la tienda: un **panel de números** para el dueño del
  proyecto, para dejar de publicar a ciegas

**Qué cambia respecto de las fases 12-18**: aquellas salieron de usar el producto y mejoraban lo
que ya hacía. Las seis de Play Store no añaden producto —la app está funcionalmente completa—:
resuelven **lo que hace que la tienda rechace una publicación**. La 25 sí construye algo nuevo,
pero para el operador, no para el estudiante.

Sigue valiendo la regla de siempre: una fase por conversación, y no se cierra hasta verificarla en
app **y** en web. **La 25 es la excepción prevista**: es una pantalla de web que no tiene —ni debe
tener— equivalente en la app, como ya pasó con la 14.

### Cómo están ordenadas

Las dos primeras (**19, 20**) llevan código de producto y son motivo de rechazo automático. La
**25 va justo después**, porque hay que estar midiendo **antes** de que la tienda empiece a traer
gente. La **21** también es rechazo, en cuanto un revisor abra el muro. Las **22 y 23** son
configuración y compilación. La **24 va deliberadamente al final**: apagar el actualizador es lo
último que se toca, porque mientras se prepara todo lo demás sigue siendo la vía por la que llegan
las versiones nuevas al teléfono.

> **Antes de nada, y no es una fase**: respaldar `~/.notecore-release/`.
>
> **Hecho a medias el 2026-08-21.** Hay dos copias verificadas en `~/respaldos-notecore/claves/`
> —una carpeta y un `.tar.gz` de 5 KB—, ambas comprobadas abriendo el keystore con su contraseña
> real y contrastando la huella SHA-256 contra el original. Eso protege de un borrado accidental.
>
> **Lo que sigue faltando es sacar una copia fuera de esta máquina**, que es lo que protege de que
> el disco muera. El `.tar.gz` cabe en cualquier USB; si va a la nube, hay que cifrarlo antes
> (`gpg -c`) porque lleva las contraseñas en texto plano. Las instrucciones están en
> `~/respaldos-notecore/LEEME.md`.
>
> Si se pierde la clave, no se puede volver a actualizar la app bajo la misma identidad en Play
> Store, y eso no tiene arreglo posterior — ni Google puede deshacerlo. El fallo es silencioso: no
> se descubre el día que muere el disco, sino meses después, al intentar publicar.

---

### Fase 19 — Política de privacidad y datos declarados · **P0** ✅ *(cerrada el 2026-08-21)*

> Cerrada y verificada en web y en app. El detalle está en el
> [historial](#fase-19--política-de-privacidad-y-datos-declarados--cerrada-el-2026-08-21). Lo de
> abajo es el enunciado con el que se abrió, que se conserva porque es el diagnóstico que la
> originó.

**Por qué es P0**: Google exige una URL pública de política de privacidad para **cualquier** app
que maneje datos personales. NoteCore guarda nombre, `@usuario`, horarios, faltas, agenda y
mensajes entre usuarios. **No existe ninguna página de privacidad** — se comprobó el 2026-08-21
buscando en `apps/web/src/app`: no hay ni ruta ni texto. Sin esto la publicación se rechaza antes
de que nadie mire la app.

**Qué hay que hacer**:

- Una página real en la web (`/privacidad`), enlazada desde el pie y desde Ajustes en la app.
  Debe ser **accesible sin sesión**: Google la revisa sin instalar ni registrarse
- Que diga la verdad y sea comprobable contra el código: qué se guarda (los campos reales de las
  tablas), para qué, cuánto tiempo, con quién se comparte (**con nadie**: no hay analítica ni
  terceros, y eso es una ventaja que conviene decir explícitamente), y cómo se ejerce el borrado
- El **cuestionario de Data Safety** de la consola de Play, que es un formulario aparte de la
  política y debe coincidir con ella. Declarar de menos aquí es motivo de suspensión, no de
  simple rechazo

**Lo que hay que cuidar**: la política tiene que mencionar la mensajería y la sección social —son
datos de *otras* personas dentro de la cuenta de una— y el permiso de cámara (se usa para leer
QR de compartición, **no** para almacenar imágenes; decirlo evita una pregunta del revisor).

**Depende de**: nada. Se puede hacer ya.

**Verificación**: abrir `/privacidad` en un navegador **sin sesión iniciada** y desde la app;
comprobar que cada dato que enumera existe de verdad en el esquema, y que no enumera ninguno que
no se recoja.

---

### Fase 20 — Borrar la cuenta · **P0** ✅ *(cerrada el 2026-08-21)*

> Cerrada y verificada en web y en app. El detalle está en el
> [historial](#fase-20--borrar-la-cuenta--cerrada-el-2026-08-21). Lo de abajo es el enunciado con
> el que se abrió, que se conserva porque es el diagnóstico que la originó.

**Por qué es P0**: desde 2023 Google exige que quien se registró pueda **eliminar su cuenta y sus
datos** desde dentro de la app, y además por una **URL web alcanzable sin instalarla**. Se
comprobó el 2026-08-21: no hay endpoint de borrado en `apps/api`, ni nada equivalente en
`shared`. Un usuario hoy no puede irse.

**Qué hay que hacer**:

- Endpoint de borrado en la API, con la lógica de negocio del lado del servidor como siempre
- Entrada en la pantalla de **Ajustes** de la app (creada el 2026-08-21, es su sitio natural) y en
  el perfil de la web
- Una ruta web pública que explique cómo borrar la cuenta sin tener la app instalada
- Confirmación explícita e inequívoca antes de ejecutar: es la única operación del producto que
  destruye datos del usuario a propósito

**La decisión de diseño que hay que tomar en esa conversación**, y que choca de frente con el
principio de datos históricos: **qué pasa con lo compartido y lo enviado**. Un mensaje que Ana le
mandó a Beto vive en la conversación de Beto; un horario que Ana compartió ya es una **copia
independiente** de Beto, por el principio de "compartir es copia". Borrar la cuenta de Ana no
puede vaciar la de Beto. La propuesta a discutir: **borrar todo lo que es de Ana, y anonimizar lo
que ya es de otro** —el mensaje queda, el remitente pasa a ser "Usuario eliminado"—. Google acepta
esto siempre que la política de privacidad lo explique, y por eso esta fase va **después** de la 19.

**Lo que hay que cuidar**: el borrado debe cerrar todas las sesiones abiertas de esa cuenta (el
teléfono y el navegador a la vez), y ser irreversible de verdad — no un `estado = borrado` que
deje los datos ahí, porque eso es exactamente lo que Google prohíbe.

**Depende de**: la Fase 19, porque la política tiene que describir este comportamiento.

**Verificación**: crear dos cuentas, compartir un horario y cruzar mensajes entre ellas, borrar
una, y comprobar en **app y web** que la otra conserva su copia y su historial con el remitente
anonimizado; que la cuenta borrada no puede entrar; y que sus datos ya no están en la base.

---

### Fase 21 — Reportar contenido y cerrar la moderación · **P1** ✅ *(cerrada el 2026-08-21)*

> Cerrada y verificada en web y en app. El detalle está en el
> [historial](#fase-21--reportar-contenido-y-cerrar-la-moderación--cerrada-el-2026-08-21). Lo de
> abajo es el enunciado con el que se abrió, que se conserva porque es el diagnóstico que la
> originó.


**Por qué**: la app tiene contenido generado por usuarios —el muro de publicaciones de la Fase 15
y la mensajería—, y para eso Google pide un mecanismo de **denuncia**. Se comprobó el 2026-08-21:
el **bloqueo de usuarios sí existe** (`SOCIAL_ROUTES.block`, FR-042, ya cerrado en su fase), pero
**no hay forma de reportar una publicación ni un mensaje**. Falta la mitad de la pareja.

**Qué hay que hacer**:

- Reportar una publicación y reportar un mensaje, con un motivo de una lista corta
- Que el reporte llegue a algún sitio donde pueda leerse. **No hace falta un panel de moderación
  completo** para publicar — con que quede registrado y sea consultable basta para el requisito—,
  y montar un backoffice entero aquí sería inventar alcance
- Dejar visible que el bloqueo ya existe: desde la propia publicación o el hilo, no solo desde el
  perfil

**Lo que hay que cuidar**: no confundir bloquear con reportar. Bloquear es una decisión privada
del usuario y ya funciona; reportar es avisar a quien mantiene el servicio. Google los cuenta como
requisitos distintos.

**Depende de**: nada técnico, pero conviene después de la 19 y la 20 por prioridad.

**Verificación**: reportar una publicación y un mensaje desde **app y web**, comprobar que el
reporte queda registrado con quién, qué y por qué, y que el bloqueo sigue funcionando.

---

### Fase 22 — Limpiar los permisos del manifiesto · **P1** ✅ *(cerrada el 2026-08-21)*

> Cerrada y verificada sobre el APK firmado. El detalle está en el
> [historial](#fase-22--limpiar-los-permisos-del-manifiesto--cerrada-el-2026-08-21). Lo de abajo es
> el enunciado con el que se abrió, con la medición que la originó.


**Por qué**: el APK declara **más permisos de los que la app pide**. Medido el 2026-08-21 sobre
el manifiesto generado, contra lo que declara `app.json` (solo `POST_NOTIFICATIONS`):

| Permiso en el APK | ¿Lo pide `app.json`? | Situación |
|---|---|---|
| `INTERNET` | no (implícito) | correcto, hace falta |
| `POST_NOTIFICATIONS` | **sí** | correcto, son los recordatorios |
| `CAMERA` | no | se usa de verdad, para los QR — hay que **declararlo a propósito** |
| `VIBRATE` | no | lo mete una librería; inofensivo pero conviene revisarlo |
| `SYSTEM_ALERT_WINDOW` | no | **dibujar sobre otras apps.** La app no lo usa. Es de los permisos que más escrutinio atraen |
| `READ_EXTERNAL_STORAGE` | no | **obsoleto** en Android 13+ |
| `WRITE_EXTERNAL_STORAGE` | no | **obsoleto** en Android 13+ |
| `REQUEST_INSTALL_PACKAGES` | condicionado | lo mete el actualizador — **se va en la Fase 24** |

Los está añadiendo alguna dependencia por su cuenta, no el código del proyecto. Un permiso que no
se usa no solo llama la atención del revisor: sale escrito en la ficha de la tienda y **el usuario
lo lee antes de instalar**.

**Qué hay que hacer**: averiguar qué librería mete cada uno, quitarlos con `remove` en el
manifiesto vía plugin de Expo, y declarar explícitamente los que sí se usan.

**Lo que hay que cuidar**: esto va en un **plugin de `plugins/`**, nunca editando `android/` a
mano — `expo prebuild` regenera esa carpeta entera y el arreglo desaparecería en silencio, que es
exactamente lo que documenta la [sección 7](#la-firma-del-apk) sobre la firma de release.

**Depende de**: nada.

**Verificación**: `aapt2 dump badging` sobre el `.aab` o el APK resultante, comprobando que la
lista de permisos es exactamente la que se pretende — y que la cámara sigue leyendo QR y las
notificaciones siguen llegando.

---

### Fase 23 — El `.aab` y la ficha de la tienda · **P1** ✅ *(cerrada el 2026-08-21)*

> Cerrada. El detalle está en el
> [historial](#fase-23--el-aab-y-la-ficha-de-la-tienda--cerrada-el-2026-08-21).

**Por qué**: la tienda **no acepta `.apk`**, solo `.aab` (`./gradlew bundleRelease`). Y la ficha
—icono, capturas, textos— es requisito de publicación, no un adorno.

**Qué hay que hacer**:

- Generar el `.aab` firmado con la clave de `~/.notecore-release/`, con la misma receta de
  variables de entorno que el APK (`EXPO_PUBLIC_API_URL` en la línea de comandos, o el bundle sale
  apuntando a `localhost` — ver la [sección 7](#7-despliegue-en-producción-2026-08-20))
- Subir el `versionCode` (hoy va en **4**, lo subió la sesión del 2026-08-21)
- Ficha: icono 512×512, gráfico de cabecera 1024×500, **mínimo 2 capturas** de teléfono,
  descripción corta y larga. El ouroboros de la Fase 13 ya da la identidad visual
- Clasificación de contenido y país/precio en la consola

**Lo que hay que cuidar**: al subir el primer `.aab`, Google ofrece **Play App Signing**. Conviene
entender qué se acepta antes de pulsar: Google pasa a gestionar la clave de distribución y la de
`~/.notecore-release/` queda como clave de *carga*. Es lo recomendable —protege de perder la
clave—, pero es una decisión de una sola vez y no se revierte.

**Depende de**: la 22 (los permisos salen escritos en la ficha) y, en la práctica, de la 24 —
conviene que el `.aab` que se sube ya no lleve el actualizador.

**Verificación**: instalar el `.aab` mediante `bundletool` en un teléfono real y comprobar que
arranca, entra y sincroniza contra producción — no dar por bueno un artefacto que solo se ha
compilado.

---

### Fase 24 — Apagar el actualizador · **P2** ✅ *(cerrada el 2026-08-21)*

> Cerrada. El detalle está en el
> [historial](#fase-24--apagar-el-actualizador--cerrada-el-2026-08-21).

**Por qué va al final**: las tiendas **prohíben** que una app se actualice por fuera, así que esto
tiene que estar apagado el día de publicar. Pero mientras se preparan las fases 19 a 23, el
actualizador **sigue siendo la vía por la que las versiones nuevas llegan al teléfono** para poder
verificarlas. Apagarlo antes de tiempo obligaría a instalar cada prueba a mano y no ganaría nada.

**Qué hay que hacer**: los dos interruptores, que van emparejados y hacen cosas distintas:

- **`EXPO_PUBLIC_UPDATER_ENABLED=false`** (app): se lee en el **prebuild**, así que exige rehacer
  el prebuild, no solo recompilar. Con él apagado el `.aab` no lleva siquiera el permiso
  `REQUEST_INSTALL_PACKAGES`
- **`UPDATER_ENABLED=false`** (servidor): apaga el mecanismo en **los teléfonos ya instalados**,
  sin publicar nada. Este es el que importa el día de Play Store, porque actúa sobre lo que ya
  está fuera

La Fase 17 se diseñó para que esto fuera un interruptor y no una cirugía: todo vive en un módulo
propio. Esta fase es cobrar esa deuda a favor.

**Lo que hay que cuidar**: hay que decidir **qué ven los teléfonos que ya tienen la app instalada
por fuera**. Al apagar el servidor dejan de recibir avisos, y si no se les da un camino a la
versión de la tienda se quedan congelados en la que tengan. Conviene que la última versión
distribuida por fuera avise de que a partir de ahí se actualiza por Play Store.

**Depende de**: que las fases 19 a 23 estén cerradas. Es la última puerta.

**Verificación**: compilar con el interruptor apagado y comprobar que **no queda rastro**: ni
permiso en el manifiesto (`aapt2 dump badging`), ni aviso en la pantalla de inicio, ni una sola
petición a `/releases/android/latest`. Y que la app sigue funcionando igual en todo lo demás.

---

### Fase 25 — Panel de números: seguimiento y telemetría · **P2** ✅ *(cerrada el 2026-08-21)*

> Cerrada y verificada. El detalle está en el
> [historial](#fase-25--panel-de-números-seguimiento-y-telemetría--cerrada-el-2026-08-21). Lo de
> abajo es el enunciado con el que se abrió.

**Lo que se pidió** (2026-08-21): una **página única de acceso propio** —del dueño del proyecto, no
de los usuarios— para ver cómo va NoteCore: cuánta gente lo usa, qué hay en la base de datos, qué
se está usando y qué no. **En la web, no en la app**: es una herramienta de operación, y se
consulta en una pantalla grande donde caben tablas.

**Por qué hace falta**: hoy no hay una sola cifra. Para saber cuántas personas usan el producto hay
que entrar a PostgreSQL a mano y escribir SQL. Con la app a punto de entrar en Play Store, eso deja
de ser sostenible: publicar sin poder medir es no enterarse de si funciona.

#### Cómo se entra

**Marca de administrador en la propia cuenta** (decidido el 2026-08-21). Se añade un campo
`isAdmin` a la tabla `users`, en `false` por defecto para todo el mundo, y se activa **a mano con
SQL** solo para la cuenta del dueño. Se entra con el login de siempre y aparece el panel.

Se descartaron las dos alternativas y conviene dejar escrito por qué, para no rediscutirlo:

- **Lista de usuarios en el `.env`**: no toca el esquema, pero cambiar quién es admin exige
  reiniciar el contenedor, y deja la autorización fuera del sitio donde vive todo lo demás
- **Contraseña propia del panel**: es una segunda credencial que mantener y rotar, y rompe el
  principio de que la sesión es una sola cosa en todo el producto

**Lo que hay que cuidar, y es lo más importante de esta fase**: la comprobación va **en el
servidor, en cada petición**, nunca en el cliente. Un panel que se esconde ocultando un enlace no
está protegido —la ruta sigue respondiendo a quien la escriba—. Y las rutas del panel deben
responder **404, no 403**: un 403 confirma que el panel existe. Es el Principio III (aislamiento
de datos) aplicado a la única pantalla del producto que, por definición, mira datos de todos.

#### Qué números salen

Las cuatro categorías se piden completas, y **la lista queda abierta a propósito**: si al usarlo
aparece algo que falta, se añade.

**1 · Lo que ya está en la base** — sale de consultar las 13 tablas, sin guardar nada nuevo ni
tocar los clientes:

- Usuarios totales y altas por semana
- Cuántos tienen horario capturado (y el porcentaje: es el indicador de si el producto "prendió")
- Materias, sesiones, faltas registradas, tareas en agenda, publicaciones, mensajes
- Semestres y cuatrimestres activos vs. archivados
- Comparticiones creadas y cuántas se aceptaron

**2 · Uso y actividad** — de la tabla `sessions`, que ya guarda `lastUsedAt` y `client`:

- Activos hoy y en 7 días
- Reparto entre **app Android y navegador web** — el dato que dice si la paridad de plataformas
  está sirviendo de algo o si un cliente se usa y el otro no

**3 · Salud del sistema**:

- Si la API responde y desde cuándo, tamaño de la base de datos, errores recientes
- **Qué `versionCode` tiene instalado cada quien.** Este es útil de verdad: dice cuánta gente se
  quedó en una versión vieja, y ahora mismo no hay forma de saberlo. Requiere que la app mande su
  versión —cabecera en las peticiones, o al refrescar sesión— y guardarla en `sessions`

**4 · Retención y embudo** — el más laborioso y el más valioso:

- Cuántos vuelven a los 7 y a los 30 días de registrarse (cohortes por fecha de alta)
- Dónde se cae quien se registra: **se registra → captura horario → vuelve**. Si mucha gente se
  registra y no llega a capturar su horario, el problema está en esa pantalla y no en otro sitio

#### Lo que hay que cuidar

- **Números agregados, no espionaje.** El panel cuenta **cuántos**, no **quién**: nada de leer
  mensajes ni mirar la agenda de nadie. Aparte de ser lo correcto, la Fase 19 va a publicar una
  política de privacidad que promete justo esto, y las dos tienen que decir lo mismo
- **La Fase 19 debe mencionar este panel.** Si la política dice "no compartimos datos con nadie"
  pero existe una pantalla que los agrega, hay que declarar que existe y qué mira
- **Las consultas de conteo se hacen lentas con datos.** `COUNT(*)` sobre tablas que crecen es
  aceptable hoy con pocos usuarios, pero conviene medirlo y no dejar que el panel tumbe la API
  que están usando los estudiantes. Si hace falta, se cachea el resultado unos minutos
- **La versión instalada exige tocar los tres clientes**, así que es la parte que puede quedarse
  para una segunda pasada si la fase se alarga: el resto del panel funciona sin ella

**Depende de**: nada técnico — se puede hacer ya. Pero conviene **antes de publicar en Play
Store**, porque el día que empiece a entrar gente es cuando los números valen, y montarlo después
significa perderse la única cohorte que no se repite: la primera.

**Verificación**: entrar al panel con la cuenta marcada como admin y ver los números; comprobar
con SQL directo que **coinciden** —un panel que miente es peor que no tenerlo—; e intentar entrar
con una cuenta normal, comprobando que la ruta responde **404** y que la API rechaza la petición
aunque se llame directamente sin pasar por la interfaz.

---

### Orden sugerido

**19 → 20 → 25 → 21 → 22 → 23 → 24.** ~~19~~ · ~~20~~ · ~~25~~ hechas; **queda 21 → 22 → 23 → 24**.

Las dos primeras llevan código de producto y son las que convierten «casi lista» en «subible»:
la **19 y la 20 son rechazo automático**.

La **25 (el panel de números) se cuela en tercer lugar** y no por capricho: hay que tenerlo
**antes** de que empiece a entrar gente desde la tienda. Montarlo después significa perderse la
única cohorte que no se repite —la primera— y publicar a ciegas, sin saber si el producto prende.
Va después de la 19 porque la política de privacidad tiene que declarar que ese panel existe.

La **21** es rechazo en cuanto un revisor abra el muro de publicaciones. La **22** y la **23** son
compilación y consola. La **24 es la última puerta**, y solo se cruza cuando todo lo demás está
listo.

**Fuera de las fases y antes que todas**: respaldar `~/.notecore-release/`.

---

## 10. Historial de las fases 19 a 25

### Fase 19 — Política de privacidad y datos declarados ✅ *(cerrada el 2026-08-21)*

**Qué se entregó**

- **`packages/shared/src/logic/privacidad.ts`** — el texto completo de la política, en `shared`.
  Es el corazón de la fase: exporta `DATOS_DECLARADOS` (una entrada por dato, con las columnas
  reales de las tablas que lo guardan), `NO_SE_HACE`, `PERMISOS_DECLARADOS`, `PANEL_OPERADOR` y
  `BORRADO_EXPLICADO`
- **`/privacidad` en la web** — página pública, **sin sesión** y renderizada en el servidor, con el
  texto completo en el HTML inicial. Es la URL que se declara en la consola de Play
- **`PrivacidadScreen` en la app** — el mismo contenido dentro de Ajustes → Tus datos
- Enlace a privacidad en la barra lateral de la web

**Las decisiones**

- **El texto vive en `shared`, no en la página.** Hay tres consumidores que tienen que decir lo
  mismo: la web (que revisa Google), la app, y el cuestionario de Data Safety (que se rellena a
  mano contra `DATOS_DECLARADOS`). Una política copiada es una política que diverge, y Google
  compara la política con lo declarado: dos versiones del mismo documento suspenden una publicación
- **La regla que gobierna el archivo**: todo lo enumerado existe en el esquema y todo lo que el
  esquema guarda está enumerado. No es redacción legal genérica — cada entrada nombra columnas
  reales, y por eso se puede comprobar mecánicamente
- **Se dice lo incómodo**: que los mensajes se guardan **sin cifrado extremo a extremo** y que
  quien administra la base tendría acceso técnico. Prometer una protección que no existe es peor
  que no tenerla
- **Se declara el panel de la Fase 25** antes de construirlo. Si la política dice «no compartimos
  datos con nadie» y existe una pantalla que los agrega, la política es falsa por omisión

**Verificación (2026-08-21)**

- `/privacidad` y `/borrar-cuenta` responden **200 sin sesión iniciada**, con el contenido completo
  en el HTML inicial (un rastreador sin JavaScript las lee igual). Ambas se prerenderizan como
  estáticas en el build de producción
- **Comprobación mecánica contra el esquema**, en las dos direcciones: los 20 destinos declarados
  existen en `information_schema`, y **ninguna de las 13 tablas queda sin mencionar**
- La pantalla de la app muestra el mismo contenido, verificada en el emulador

**Lo que se corrigió al verificar**

- **Faltaba `users.profile_visibility`**: lo detectó la comprobación mecánica. Es un ajuste de la
  persona —quién ve su perfil— y merecía estar declarado. Las otras cinco columnas sin declarar son
  metadatos técnicos sin contenido personal (`id`, fechas, `is_admin`, `anonymized_at`)
- **Los asteriscos de Markdown salían literales** en pantalla: las cadenas las pintan tres motores
  distintos y ninguno interpreta Markdown. Ahora van en texto plano, con una nota en el archivo


---

### Fase 20 — Borrar la cuenta ✅ *(cerrada el 2026-08-21)*

**Qué se entregó**

- **`DELETE /auth/me`** en la API, con `deleteAccount` en el servicio de auth: una transacción que
  borra las diez tablas de la persona y vacía su fila de `users`
- **Migración `0011`**: columna `users.anonymized_at`, y las claves foráneas de `messages.sender_id`
  y de las dos columnas de `conversations` pasan de `cascade` a **`restrict`**
- **`/borrar-cuenta` en la web** — página pública con las instrucciones, alcanzable **sin la app**
- El formulario real en **Mi cuenta** (web) y en **Ajustes → Tus datos** (app)
- Las cuentas borradas dejan de aparecer en búsquedas, perfiles y mensajería nueva

**La decisión de diseño, y por qué es la correcta**

El choque estaba entre el borrado que Google exige y el principio de datos históricos. Un mensaje
que Ana le mandó a Beto vive en la conversación de Beto y **también es suyo**: borrarlo dejaría sus
respuestas colgando de nada.

La solución es **una lápida por cuenta borrada**. Se destruyen todos los datos de la persona y su
fila de `users` se vacía: correo y `@usuario` a valores aleatorios sin significado, nombre a
«Usuario eliminado», contraseña a un hash que ninguna contraseña satisface, perfil a `null`. Lo que
queda es un identificador y una fecha.

**No es la desactivación que Google prohíbe.** Lo prohibido es congelar la cuenta dejando los datos
dentro para revivirla; aquí no queda ningún dato que revivir. La política de Play permite retener
datos **plenamente anonimizados** cuando la política de privacidad lo explica — y la Fase 19 lo
explica, que es exactamente por qué esta fase iba después.

**Por qué una lápida por cuenta y no un centinela global**: `conversations` guarda el par de
personas con un índice único. Reapuntar los hilos de todas las cuentas borradas a un único
centinela haría chocar dos hilos distintos de la misma persona contra ese índice.

**Por qué `restrict` y no `cascade`**: con la lápida, la fila de `users` no se borra, así que la
cascada nunca se dispararía en la operación normal. `restrict` está para lo que no es normal — un
`DELETE FROM users` escrito a mano en una consola: PostgreSQL lo rechaza y la conversación de un
tercero se salva, en lugar de ejecutarse en silencio.

**La confirmación pide dos cosas distintas**: la contraseña prueba **quién** es (sin ella, un
teléfono desbloqueado sobre una mesa basta para vaciar la cuenta de su dueño); escribir BORRAR
prueba que **entendió** (un «¿seguro?» se acepta por reflejo, teclear una palabra no).

**Verificación (2026-08-21)**

El escenario completo que pedía el enunciado, contra una API de desarrollo en el 3102:

- Dos cuentas, contactos aceptados, **mensajes cruzados** y un horario compartido y aceptado
- Al borrar Ana: **cero filas suyas** en las diez tablas (materias, bloques, semestres, faltas,
  agenda, publicaciones, comparticiones, ajustes, contactos y sesiones), su mensaje a Beto
  **conservado**, y su fila vaciada sin ningún dato personal
- **Beto conserva** su hilo —con el remitente como «Usuario eliminado»— y su copia del horario
- Ana no puede entrar ni con su sesión (`sesion_expirada`) ni con su contraseña
  (`credenciales_invalidas`)
- Los tres guardianes: contraseña incorrecta → rechaza; sin la palabra → rechaza; con las dos → 204
- **Borrado real desde el emulador Android**, con APK de release: la app cae sola en la pantalla de
  entrar y la base confirma la lápida

**Lo que se descubrió al verificar**: el guardián de contraseña se disparó de verdad en el
emulador —`adb shell input text` había metido caracteres de más—, lo que confirmó de paso que
marca el campo correcto.


---

### Fase 25 — Panel de números: seguimiento y telemetría ✅ *(cerrada el 2026-08-21)*

**Qué se entregó**

- **`GET /panel/resumen`** con `requireAuth` + `requireAdmin`, y `services/panel.ts` con las siete
  secciones de números
- **`/panel` en la web** — la excepción prevista al Principio I: no tiene ni debe tener equivalente
  en la app, como ya pasó con la Fase 14
- **`users.is_admin`**, en `false` por defecto y activable **solo con SQL**
- **`sessions.client_version`** y la cabecera `x-notecore-version` desde app y web

**Cómo se entra, y qué protege qué**

La comprobación va **en el servidor, en cada petición**, y responde **404, no 403**: para cualquiera
que no sea administrador, `/panel/resumen` es indistinguible de una dirección inventada —mismo
estado, mismo cuerpo, mismo mensaje—. Se verificó comparando ambas respuestas: son idénticas.

Que la web no pinte el enlace es **comodidad**, no seguridad. Quien lo fuerce verá un enlace que
lleva a un 404.

**No hay ninguna ruta que conceda `is_admin`.** Convertir a alguien en administrador exige acceso a
la base de datos, porque un endpoint que concediera ese permiso sería, por definición, el endpoint
que hay que comprometer para verlo todo.

**Números agregados, no espionaje**: ni una consulta del servicio devuelve el texto de un mensaje,
el título de una tarea o el `@usuario` de nadie. Todas son `count`, `sum` o `group by` sobre
columnas que no identifican a nadie. Es lo que la Fase 19 promete por escrito.

**La versión instalada**: la cabecera se anota en la sesión **solo cuando cambia** y sin esperar al
`await` — esto corre antes de *todo* endpoint autenticado, y un fallo debe costar una cifra del
panel, no la petición del estudiante. En la app sale del `versionCode` de `app.json`, no del módulo
del actualizador: **la Fase 24 va a apagar ese módulo**, y depender de él sería escribir una avería
con fecha.

**Cómo entrar al panel**

```sql
update users set is_admin = true where username = 'mizllet';
```

Se hizo el 2026-08-21 y **`@mizllet` es la única cuenta administradora**. Para quitar el permiso,
lo mismo con `false`. No hay ninguna ruta de la API que lo conceda, y es deliberado.

El panel vive en https://notecore.ourocore.net/panel y el enlace aparece al pie de la barra
lateral, solo para esa cuenta.

**Verificación (2026-08-21)**

- **Los 15 conteos cuadran uno a uno con SQL directo.** Más actividad, versiones y retención,
  también contrastados
- Una cuenta normal recibe 404 con el mismo cuerpo que una ruta inventada; sin sesión, 401
- El desglose de versiones registró `dev-verificacion` al entrar desde la web: la cabecera funciona
  de punta a punta

**Los dos fallos que la verificación atrapó** — y la razón por la que la comprobación de esta fase
es «cuadrar los números con SQL» y no «que la pantalla cargue»:

1. **El embudo decía 0 usuarios con horario mientras la base tenía 147.** Interpolar `${users.id}`
   dentro de una subconsulta emite `"id"` sin calificar, y dentro de
   `select 1 from subjects s where s.user_id = "id"` PostgreSQL lo resuelve contra `subjects`, que
   también tiene una columna `id`. La comparación quedaba en `s.user_id = s.id` —nunca cierta— y el
   `filter` no contaba nada. **No hay error: la consulta es válida y devuelve 0.** Un panel que
   miente no se cae, se lee
2. **«Aceptadas 68 · 106%»**: un compartido se puede aceptar muchas veces, así que la proporción
   pasa de 100 y se lee como un error de cálculo. Se quitó el porcentaje

**Lo que queda abierto a propósito**: el servicio **no cachea**. Con los usuarios de hoy las
consultas tardan milisegundos y las lanza una sola persona; cachear ahora añadiría invalidación y
una respuesta que puede mentir unos minutos, a cambio de nada. Tocará cuando abrir el panel se note
en la latencia de la API que usan los estudiantes, y la forma es un cache de unos minutos delante
de `resumen()`, que el archivo deja fácil por devolver todo de una sola función.

---

### Fase 21 — Reportar contenido y cerrar la moderación ✅ *(cerrada el 2026-08-21)*

**Qué se entregó**

- **`POST /reports`** para reportar una publicación o un mensaje, con un motivo de una lista de seis
  y una explicación opcional
- **`GET /panel/reportes`** y **`PATCH /panel/reportes/:id`**, las dos con `requireAuth` +
  `requireAdmin` y el mismo **404, no 403** de la Fase 25
- **Migración `0013`**: tabla `reports`, con un índice único por persona y contenido
- **Reportar y bloquear juntos** en cada publicación ajena del muro, en **app y web**. Bloquear
  existía desde la Fase 8, pero solo se llegaba a él desde la lista de contactos
- **Reportar un mensaje** desde el hilo: botón al pasar el ratón en la web, **mantener pulsado** en
  la app —el mismo gesto que ya borraba los propios—
- **Sección «Reportes» en `/panel`**, la primera de la pantalla, con el conteo de pendientes
- La **política de privacidad declara** los reportes, la excepción que suponen para el panel y qué
  pasa con ellos al borrar la cuenta

**Las tres decisiones de diseño**

**1. El reporte guarda una copia congelada del texto.** No una referencia viva. Quien reporta algo
suele hacerlo justo antes de que su autor lo borre, y un reporte que al abrirse dice «esa
publicación ya no existe» no le sirve a nadie. Que el original siga estando se comprueba **al
leer**, no se escribe en la fila: entre el reporte y la revisión es justo cuando el autor lo borra.

**2. Solo se reporta lo que uno puede ver.** Antes de aceptar un reporte se comprueba el acceso con
`canSeeProfileDetails` —la misma función que usan el perfil, el muro y `listUserPosts`—, y en los
mensajes, que quien reporta sea una de las dos personas del hilo. Sin esto, `/reports` sería un
oráculo: mandando identificadores al azar y mirando si responden 404 o 201, cualquiera podría
averiguar qué publicaciones y qué mensajes existen. **Un formulario de denuncia es el último sitio
donde nadie espera una fuga.**

**3. Al autor lo resuelve el servidor.** Nunca viaja en la petición. Si el cliente dijera a quién
acusa, bastaría con cambiar ese campo para levantar reportes contra cualquiera.

**Reportar no es bloquear**, y la fase entera cuelga de eso: bloquear es una decisión **privada** de
quien bloquea, surte efecto en el acto y no se le dice a nadie; reportar **avisa a quien mantiene el
servicio** y su efecto llega después, decidido por otro. Google las cuenta como dos requisitos
distintos. Se ofrecen juntas, con nombres distintos, y el acuse del reporte recuerda que no bloquea.

**Verificación (2026-08-21)**

Contra una API de desarrollo en el 3103, con su propia base en un contenedor aparte —nunca la de
producción—:

- **Web, en un navegador real**: reportadas una publicación y un mensaje, con el acuse en pantalla;
  enviar sin motivo se rechaza y se explica
- **App, en el emulador con APK de release**: los dos botones en la publicación ajena, el formulario
  con sus seis motivos, y el reporte del mensaje por **mantener pulsado**. El tercer reporte se creó
  desde la app con su motivo y su detalle, y quedó en la base
- **El texto sobrevive al borrado**: Beto borró su publicación y su mensaje después de que Ana los
  reportara. El panel conserva los dos textos y avisa de que el original ya no está
- **Los cuatro guardianes**: reportarse a uno mismo → rechazado; un tercero reportando un mensaje de
  una conversación ajena → **la misma respuesta exacta** que un identificador inventado; sin sesión
  → 401
- **El panel a quien no es administrador**: 404 con cuerpo **idéntico** al de una ruta inventada,
  comparados byte a byte
- **Reportar dos veces** el mismo contenido no crea una segunda fila: responde `yaReportado: true`.
  Se comprobó **entre clientes** —reportado desde la web, reintentado desde la app—

**El fallo que la verificación atrapó**: la política decía que los reportes «se borran contigo» al
borrar la cuenta, y **no era verdad**. `reports` declara `onDelete: cascade` hacia `users`, pero el
borrado de la Fase 20 **no borra la fila de `users`** —la vacía y la anonimiza—, así que la cascada
no se dispara nunca. Los reportes sobrevivían apuntando a «Usuario eliminado», con el texto de esa
persona dentro. Se arregló borrándolos explícitamente en la transacción, **por los dos lados** —los
que hizo y los que había contra ella—, y se volvió a verificar en ambos sentidos. Es el mismo tipo
de trampa que documenta la sección de Drizzle: una declaración correcta que no se ejecuta nunca.

---

### Fase 22 — Limpiar los permisos del manifiesto ✅ *(cerrada el 2026-08-21)*

**Qué se entregó**

- **`plugins/with-permisos-declarados.js`**, que sustituye a `with-sin-permisos-de-almacenamiento.js`
- Los tres permisos que se usan, **declarados a propósito** en `app.json`: `INTERNET`,
  `POST_NOTIFICATIONS` y `CAMERA`
- Veinticinco permisos retirados con `tools:node="remove"`

**El resultado, medido sobre el APK firmado**

De **más de treinta** permisos a **siete**:

| Permiso | Estado |
|---|---|
| `INTERNET`, `POST_NOTIFICATIONS`, `CAMERA` | se quedan — se usan |
| `REQUEST_INSTALL_PACKAGES` | se queda: lo pone el actualizador. **Se va en la Fase 24** |
| `USE_BIOMETRIC`, `USE_FINGERPRINT` | se quedan **a propósito** (ver abajo) |
| `DYNAMIC_RECEIVER_NOT_EXPORTED` | se queda: se lo autoconcede la app, no es del sistema |
| `SYSTEM_ALERT_WINDOW`, `VIBRATE` | **fuera** |
| `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` | **fuera** |
| `c2dm.RECEIVE`, `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED`, `ACCESS_NETWORK_STATE` | **fuera** (FCM) |
| `BIND_GET_INSTALL_REFERRER_SERVICE` + **20 de badges** | **fuera** (ShortcutBadger) |

**De dónde salían, que no era donde decía el enunciado**

El enunciado suponía que «los está añadiendo alguna dependencia». El reporte del fusionador
—`manifest-merger-release-report.txt`, que dice el origen de cada entrada— mostró otra cosa:
`SYSTEM_ALERT_WINDOW` y `VIBRATE` los escribe la **plantilla base de Expo** en el prebuild, y vienen
marcados en su propio comentario como «OPTIONAL PERMISSIONS, REMOVE WHATEVER YOU DO NOT NEED».
Quitarlos es lo que la plantilla espera de quien la usa.

Los demás sí eran de dependencias, y todos del mismo sitio: **`expo-notifications` arrastra Firebase
entero y ShortcutBadger**. NoteCore **no manda push** —sus recordatorios (Fase 5) son notificaciones
locales programadas en el propio teléfono—, así que los cuatro de FCM y la veintena de badges de
lanzadores no servían para nada.

**Lo que se deja a propósito**: `USE_BIOMETRIC` y `USE_FINGERPRINT`, de `androidx.biometric` vía
`expo-secure-store`. Hoy no se disparan —los tokens se guardan sin `requireAuthentication`—, pero es
la librería que cifra las credenciales de la sesión y no se toca su manifiesto a ciegas por dos
permisos que no piden nada al usuario ni destacan en la ficha.

**Verificación (2026-08-21)**

- **`aapt2 dump badging`** sobre el APK de release firmado: la lista es exactamente la de arriba
- **`dumpsys package`** sobre la app **ya instalada**: Android ve los mismos siete
- **La cámara sigue leyendo QR**: el diálogo del sistema aparece, se concede, y el escáner abre con
  la imagen en vivo
- **Los recordatorios siguen llegando**: con una entrega a dos días y el aviso a un día,
  `dumpsys alarm` muestra la alarma `expo.modules.notifications.NOTIFICATION_EVENT` como
  `RTC_WAKEUP` para las **08:00 del día anterior** — la hora configurada
- La app arranca, entra y sincroniza sin un solo `FATAL` en el log

**La trampa que volvió a saltar**: recompilar tras cambiar `EXPO_PUBLIC_API_URL` dio «18 tareas
ejecutadas» y un APK con **la URL anterior** — Gradle reutilizó el bundle de JavaScript en caché. El
APK llevaba el código nuevo de la Fase 21 y la dirección vieja a la vez. Hizo falta
`./gradlew clean assembleRelease`, y comprobarlo **descomprimiendo el APK y buscando la URL dentro
del bundle**, no fiándose de que la compilación dijera «BUILD SUCCESSFUL». Está documentado en la
sección de compilar el APK, y es exactamente el caso que describe.

**Segundo tropiezo, menor**: `expo prebuild --clean` borra `android/local.properties`, así que la
primera compilación después falla con «SDK location not found». Se resuelve con `ANDROID_HOME` en el
entorno; es la misma clase de efecto que la firma de release, que también vive en un plugin por eso.

---

### Fase 24 — Apagar el actualizador ✅ *(cerrada el 2026-08-21)*

**Qué se entregó**

- **`scripts/compilar-aab-tienda.sh`**, que compila con `EXPO_PUBLIC_UPDATER_ENABLED=false`
  y **verifica el artefacto** antes de darlo por bueno
- `versionCode` a **5**
- El interruptor del servidor (`UPDATER_ENABLED=false`) queda **documentado como último
  paso**, para aplicarlo el día que la app esté publicada

**La fase fue un interruptor, como se diseñó en la Fase 17**

No hubo cirugía: cero líneas de lógica tocadas. La deuda que la Fase 17 pagó por adelantado
—todo el actualizador en un módulo propio, detrás de una variable que gobierna a la vez el
código y el manifiesto— se cobró aquí. Lo único que hacía falta era **compilar con la variable
apagada y demostrarlo sobre el binario**.

**Y la web no necesitó nada.** `/app` ya distinguía `disponible: false` de «no hay versión
publicada», y para el primer caso su texto es literalmente «Busca NoteCore en Google Play». La
paridad de la fase se cumple sin tocar un archivo de `apps/web`: la escribió la Fase 17
pensando en este día.

**Verificado sobre el `.aab`, no sobre el código**

| Permiso declarado | Origen |
|---|---|
| `INTERNET`, `POST_NOTIFICATIONS`, `CAMERA` | los tres de la Fase 22 |
| `USE_BIOMETRIC`, `USE_FINGERPRINT` | `androidx.biometric` vía `expo-secure-store`, dejados a propósito |
| ~~`REQUEST_INSTALL_PACKAGES`~~ | **no está** — es el resultado de la fase |

Cinco permisos, y el del actualizador fuera. El certificado del artefacto es el propio
(`CN=Brian Tellez, OU=OuroCore`, RSA 4096), no el de depuración.

---

### Fase 23 — El `.aab` y la ficha de la tienda ✅ *(cerrada el 2026-08-21)*

**Qué se entregó**

- El **`.aab` firmado**: 62 MB, `versionCode 5`, con la clave de `~/.notecore-release/`
- **`scripts/compilar-aab-tienda.sh`**, que encapsula la receta entera y sus cuatro trampas
- **[`docs/play-store.md`](docs/play-store.md)**: descripción corta y larga, categoría,
  clasificación de contenido, el cuestionario de Data Safety traducido desde
  `DATOS_DECLARADOS`, y la lista de comprobación previa a enviar a revisión

**Lo que enseñó compilar de verdad, que no estaba en el enunciado**

Tres cosas que solo aparecen al ejecutar, y las tres eran verificaciones que *creían* estar
funcionando:

1. **`aapt2 dump` no lee un `.aab`.** Responde «could not identify format of APK»: un App
   Bundle no es un APK y su manifiesto va en **protobuf**. Hay que extraerlo del zip
2. **El bundle de JavaScript es bytecode de Hermes.** Un `grep` de la URL no encuentra nada
   —ni siquiera las direcciones de las librerías—, porque las cadenas viven en una tabla y
   salen pegadas unas a otras. Sin `strings` delante, la comprobación **rechaza un artefacto
   correcto**
3. **`| tail` se tragó el fallo.** La primera ejecución abortó en la verificación de permisos
   y aun así devolvió «exit code 0», porque una tubería reporta el estado del último comando.
   Durante unos minutos el `.aab` constaba como verificado sin que la verificación se hubiera
   ejecutado nunca

La tercera es la que más importa, y por eso el script termina ahora con un aviso en la última
línea además del código de salida: **una verificación que puede pasar desapercibida al fallar
es peor que no tenerla**, porque produce confianza en lugar de dudas.

**Lo que queda fuera y es tuyo**

Las **capturas de pantalla** y el **gráfico de cabecera** (1024×500). Requieren la app
corriendo con datos verosímiles, y un horario de «Materia 1, Materia 2» no vende nada.

**Pendiente al cerrar**: probar el `.aab` con `bundletool` en un teléfono real. La fase pedía
no dar por bueno un artefacto que solo se ha compilado, y `bundletool` no está instalado en
esta máquina.


---

## 11. Despliegue y respaldo del 2026-08-21

Cerradas las tres fases, se hicieron las dos cosas que faltaban para que sirvieran de algo.

### Desplegado

Imágenes de `api` y `web` reconstruidas y contenedores recreados. El detalle está en la
[sección 7](#despliegue-del-2026-08-21-fases-19-20-y-25). En resumen: `/privacidad`,
`/borrar-cuenta` y `/panel` ya responden en producción, y `@mizllet` es administradora.

**La URL que se declara en la consola de Play** —el campo que hoy bloquea la publicación— es:

```
https://notecore.ourocore.net/privacidad
```

Y la de borrado de cuenta, que Google pide aparte:

```
https://notecore.ourocore.net/borrar-cuenta
```

Las dos responden 200 sin sesión, con el contenido en el HTML inicial: un revisor las lee sin
instalar nada ni registrarse.

### Respaldo de la clave de firma

Dos copias en `~/respaldos-notecore/claves/`, con un `LEEME.md` que explica qué son, por qué
importan y cómo restaurarlas:

| Copia | Para qué |
|---|---|
| `notecore-release-20260820/` | El directorio tal cual, con permisos |
| `notecore-release-20260820.tar.gz` | 5 KB, listo para llevarse a un USB o cifrar |

**Verificadas de verdad**, no solo copiadas: se abrió el keystore de cada copia con la contraseña
real y se comprobó que su huella SHA-256 coincide con la del original
(`4D:2C:D8:71:...:87:96`, alias `notecore`, vigente hasta 2056).

> **Esto todavía no es un respaldo completo.** Son copias en el **mismo disco**: protegen de un
> borrado accidental, no de que el disco muera. Falta llevarse el `.tar.gz` fuera de la máquina —y
> cifrarlo si va a la nube, porque lleva las contraseñas en texto plano—. Es el único paso que
> queda y cuesta un minuto.


---

## 12. Limpieza de datos de prueba (2026-08-21)

La base de producción llevaba **315 cuentas, y solo una era real**. Las otras 314 se habían ido
acumulando desde la Fase 1: cada verificación de cada fase creaba las suyas y ninguna las
retiraba. Con el panel de la Fase 25 recién estrenado eso dejó de ser inofensivo — un panel que
dice «315 usuarios» cuando hay uno no informa, desinforma, y era su primera lectura.

**Cómo se distinguieron**: por el dominio del correo. Las cuentas de prueba usaban `notecore.test`
(142), `test.local` (50), `test.mx` (34), `ejemplo.test` (24), `prueba.mx` (15) y siete dominios
más; la real es la única con un dominio de verdad. No hizo falta juzgar cuenta por cuenta.

**Antes de borrar se comprobaron dos cosas**, y esa comprobación es lo que hizo el borrado seguro:

1. **Ninguna cuenta de prueba tenía contacto, conversación ni mensaje con la cuenta real** — cero
   en las tres. Sin ese cero, borrarlas habría dejado huecos en datos legítimos
2. Se hizo un **volcado completo** a `~/respaldos-notecore/base-de-datos/` antes de tocar nada

El borrado fue **una sola transacción**, de las hojas hacia la raíz y con la lista de víctimas en
una tabla temporal, para que ninguna sentencia pudiera usar un criterio distinto de la anterior.
Los mensajes y las conversaciones van antes que `users` porque desde la Fase 20 sus claves
foráneas son `restrict`: un orden equivocado aborta la transacción en vez de borrar a medias.

**Resultado**: 313 cuentas fuera (una ya se había ido antes), y la cuenta real **intacta** —7
materias, 32 sesiones de clase, 1 periodo y 3 comparticiones—. Cero filas huérfanas en las seis
tablas que se comprobaron.

El panel pasó de «315 usuarios · 147 con horario» a **«2 usuarios · 1 con horario»** en el momento
de la lectura (el segundo era una cuenta temporal de verificación, ya borrada). Es el número que
de verdad hay.

### Y para que no vuelva a pasar: las cuentas de prueba ya no cuentan

Limpiar a mano no resuelve nada, porque la siguiente fase vuelve a llenarlo. Así que el mismo día
se cerró el problema de raíz: **una cuenta creada con un dominio de prueba nace marcada, y el panel
la ignora en todos sus números**.

- `users.is_test_account`, decidido **una vez al registrarse** mirando el dominio del correo contra
  `DOMINIOS_DE_PRUEBA` en `packages/shared/src/logic/cuentas-de-prueba.ts`
- La lista son dominios **reservados o propios**: los del RFC 2606 (`test`, `example`, `invalid`,
  `localhost`, `example.com`…) más `ourocoreprueba.com` y `notecore.test`

**`prueba.mx` se dejó fuera a propósito**: `.mx` es un dominio de país real y alguien podría
poseerlo. Marcar cuentas por un dominio ajeno las excluiría de las estadísticas sin que lo
supieran.

**Por qué una columna y no un `LIKE` en cada consulta**: el panel hace doce conteos y cada uno
tendría que repetir el patrón. Un criterio repetido doce veces acaba divergiendo — se añade un
dominio, se actualizan once consultas y la duodécima sigue contando de más. En el servicio el
criterio vive en **una** constante, `CUENTA_REAL`, y los conteos sobre otras tablas usan
`IDS_REALES`: no basta con excluir la cuenta, porque sus materias y sus mensajes inflaban el panel
igual. Excluir la cuenta y contar sus datos habría sido peor que no excluir nada — la pantalla
diría «1 usuario · 246 materias».

**Verificado el 2026-08-21**: con 5 cuentas en la base (4 de prueba, con 10 materias y 3 tareas
entre todas), el panel seguía diciendo **1 usuario · 7 materias · 0 tareas** — solo lo real.

Una cuenta de prueba **funciona igual que cualquier otra**: entra, captura horario, escribe. Lo
único que cambia es que no ensucia una estadística. Y sigue siendo buena costumbre borrarlas al
terminar, para que la base no crezca sin motivo.

---

## 13. El correo de contacto público (2026-08-21)

La política de privacidad y la página de borrado llevaban `lucio.tellez@gmail.com`, un correo
**personal**. Se cambió a **`ourocore.contacto@gmail.com`**, el del proyecto.

**Por qué importa más de lo que parece**: esa dirección no vive solo en una página. Va escrita en
la ficha de Play Store, en el cuestionario de Data Safety y en una página pública que Google
indexa — queda expuesta para siempre y mezcla la identidad privada con la marca OuroCore.

Se cambió también en `package.json` (campo `author`), que lo llevaba desde el inicio del proyecto.

> **Regla para lo que venga**: en los proyectos que se publican como **Mizllet / OuroCore**, el
> correo de contacto es `ourocore.contacto@gmail.com`. El personal no se usa en nada que sea
> público.

---

## 14. Fases 26 a 29 — avisos, acciones y descubrimiento (2026-08-21)

Cuatro fases nacidas de sugerencias de uso, no del plan original. Las tres primeras vienen de
pedir que la app **avise** —antes de clase, y con botones en el propio aviso—; la cuarta, de que
NoteCore hace muchas cosas y **ninguna se anuncia**.

### Fase 26 — La privacidad, antes de entrar ✅ *(cerrada el 2026-08-21)*

**Qué se entregó**: la política de privacidad es alcanzable **sin sesión** desde entrar y desde
registro, en app y web.

**Qué estaba roto**. La página web ya era pública desde la Fase 19 —requisito de Play: el revisor
la abre sin registrarse—, pero **no había ni un enlace hacia ella** desde el login: los únicos
salían de la barra lateral, que exige sesión. En la app era peor: `PrivacidadScreen` colgaba de
Ajustes, así que para leer qué se guarda de ti tenías que **entregar tus datos primero**.

| Decisión | Por qué |
|---|---|
| Es la **misma** pantalla, no una copia | El texto ya vivía en `shared` y lo pintan los dos clientes. Duplicarla habría creado dos políticas que divergen |
| El rótulo del botón de volver es un **parámetro** | Llega desde entrar o desde registro; decir «Ajustes» a quien vino del formulario sería mentir sobre dónde le deja |
| `privacidadDesde` recuerda de cuál se vino | Volver siempre a entrar le borraría los cuatro campos a quien estaba registrándose |
| En registro pesa más que en entrar | El registro es donde alguien **entrega** sus datos, y el único momento en que leer la política todavía cambia su decisión |

**Verificado en Android real**: «Política de privacidad» visible en la pantalla de entrada sin
sesión; al tocarla, la política se abre con el botón **«← Entrar»**; desde registro, el mismo
enlace abre la misma pantalla rotulada **«← Crear cuenta»**, y atrás devuelve al formulario con
sus campos. En navegador real: 11/11, incluida la comprobación de que la política **está en el
HTML inicial** —un rastreador sin JavaScript la lee—.

---

### Fase 27 — Aviso de la siguiente clase ✅ *(cerrada el 2026-08-21)*

**Qué se entregó**: NoteCore avisa unos minutos antes de que empiece cada clase, con la materia y
el aula. Antelación configurable (5, 10, 15 o 30 minutos). **Arranca apagado.**

**La decisión que define la fase: arranca apagado.** Se pidió que viniera encendido por defecto.
Un horario completo son unas **veinticinco clases a la semana**, así que encenderlo para todos
serían veinticinco notificaciones semanales que nadie pidió — exactamente el volumen que lleva a
desactivar los avisos de la app **entera**, incluidos los recordatorios de entrega que sí se
querían. Es la misma decisión que ya tomó la Fase 5 y por el mismo motivo.

| Decisión | Por qué |
|---|---|
| **Recurrencia semanal**, no fechas | Una entrega vence una vez; una clase se repite cada semana. Con fechas habría que reprogramar cada siete días, y quien no abriera la app se quedaría sin avisos. Un disparador `WEEKLY` lo repite el sistema operativo |
| Vive en `class-alerts.ts`, no en `calendar.ts` | Comparte tipo de dato con el **horario** (`Weekday` + `ClockTime`), no con el calendario. Mezclarlos habría empujado a tratar la clase como un instante, que es lo que la Fase 2 decidió no hacer |
| **Canal de Android propio** | El canal es la unidad que el usuario silencia desde los ajustes del sistema. Con un solo canal, callar los avisos de clase callaría también los de entrega |
| La hora del aviso la calcula el **servidor** | Igual que `remindOn` en la Fase 5: si cada cliente restara los minutos, app y web discreparían y el fallo no se vería hasta que la notificación llegara tarde |
| `crossesMidnight` se marca y **no se programa** | Una clase a las 00:10 con 30 minutos de antelación avisaría el día anterior a las 23:40: correcto en aritmética, absurdo en la práctica, y en el día de la semana equivocado |
| El `UPDATE` toca **solo sus dos columnas** | `user_settings` la comparte con las semanas del semestre (Fase 3) y la hora del recordatorio (Fase 5). Escribir la fila entera reescribiría ajustes de otras pantallas |

**El hallazgo de la fase**: `reprogramarRecordatorios` empezaba con
`cancelAllScheduledNotificationsAsync()`, que **arrasa con todo**. Con dos familias conviviendo,
abrir el calendario —que reprograma las entregas— habría borrado en silencio los avisos de clase
de toda la semana. Se resolvió con identificadores por prefijo (`entrega:` / `clase:`) y
cancelación selectiva. Se verificó explícitamente: tras reprogramar las entregas, los dos avisos
de clase **seguían en `dumpsys alarm`**.

**Verificado en Android real** (emulador Pixel, Android 15, APK de release):

| Comprobación | Resultado |
|---|---|
| Viene **apagado** por defecto | correcto |
| Android pide `POST_NOTIFICATIONS` al encender | correcto, concedido |
| Alarmas programadas en el sistema | `RTC_WAKEUP` **2026-08-28 06:55** y **10:55** — las dos clases menos 5 minutos |
| Recurrencia semanal | ambas caen el **viernes siguiente**, no hoy |
| Cambiar la antelación a 30 min reprograma | `06:30` y `10:30` |
| Contador en pantalla | «2 clases avisadas cada semana», coincide con el horario |
| Las dos familias conviven | tras reprogramar entregas, los avisos de clase **siguen ahí** |

**API**: 29/29, incluida la comprobación cruzada de que cambiar el aviso de clase **no toca** la
hora ni la anticipación del recordatorio de entrega, y al revés.

---

### Fase 28 — Acciones en la notificación y aplazar ✅ *(cerrada el 2026-08-21)*

**Qué se entregó**: la notificación de una entrega lleva dos botones —**«Cumplida»** y **«En 1
hora»**— que resuelven **sin abrir la app**. Dentro de la app y de la web, el aplazamiento ofrece
las cuatro opciones (30 min, 1, 3 y 4 horas).

**Lo que ya existía**: la anticipación configurable que se pidió *ya estaba hecha* desde la Fase 5
(mismo día, 1, 2, 3 días o una semana, más hora de aviso). Lo nuevo son los botones y el
aplazamiento.

| Decisión | Por qué |
|---|---|
| `reminderSnoozedUntil` es la **única** columna del aviso que se guarda | Todo lo demás se calcula: `remindOn` es `dueDate` menos la anticipación. Un aplazamiento nace de un **acto** y no se deduce de ningún otro dato |
| Es `timestamp`, no `date` como `dueDate` | Aplazar cuatro horas necesita hora. No reabre el problema de husos de la Fase 4: lo que se mueve es **cuándo suena el aviso**, no cuándo vence la entrega |
| Viajan los **minutos**, no el instante | El cliente que pide esto es una notificación, y el reloj del teléfono puede ir mal o en otro huso. Con una duración, el momento sale del reloj del servidor |
| Ruta propia (`POST …/aplazar`), no un campo de `PATCH` | Es una **acción**, no una edición: mueve el aviso, no lo que la actividad es. Y evita que un cliente escriba a mano el instante |
| **Dos** botones, no cuatro aplazamientos | Android esconde tras «expandir» lo que pase de dos o tres. Gastarlos en variantes de lo mismo dejaría fuera «Cumplida», que es el que más se usa |
| El escucha vive en `App.tsx`, no en la pantalla de agenda | Los botones están declarados para **no abrir la app**. La respuesta llega con la app cerrada, cuando una pantalla concreta no está montada |
| «Cumplida» pasa por la **cola offline**; aplazar **no** | El aviso salta donde no hay señal. Completar se encola y sube solo (Fase 9). Aplazar no puede: subirlo horas después lo movería a «una hora desde que hubo red», una hora que nadie eligió |
| El aplazamiento se **limpia** al completar y al mover la fecha | En los dos casos dejaría de referirse a nada, y quedaría un aviso silenciado hasta una hora pensada para otra fecha |

**Verificado en Android real** — el ciclo entero, sobre la notificación de verdad:

| Comprobación | Resultado |
|---|---|
| La notificación llega con sus **dos botones** | `actions={[0] "Cumplida", [1] "En 1 hora"}`, ambos `broadcastIntent` (no abren la app) |
| Pulsar **«Cumplida»** desde la sombra | la actividad quedó `completed: true` en PostgreSQL, sin abrir la app |
| Pulsar **«En 1 hora»** | `reminderSnoozedUntil` guardado **una hora exacta** después, y `completed: false` |
| El aviso se **reprograma** al aplazar | `dumpsys alarm`: la alarma pasó a las **23:49**, una hora después de pulsar |
| La app muestra el estado | «Aviso aplazado hasta las 23:49» en la agenda, con las cuatro opciones |

**API**: 22/22. La comprobación que más enseñó fue de huso: `remindOn` sale en fecha **local**, no
la que daría `toISOString()` —de noche en México eso adelanta un día—. El fallo estaba en la
prueba, no en el código: el servidor ya construía la fecha con componentes locales (Fase 5).

---

### Fase 29 — Consejos en el inicio ✅ *(cerrada el 2026-08-21)*

**Qué se entregó**: la pantalla de inicio muestra **un** consejo, elegido según el estado real de
la cuenta, con un botón que lleva a donde se resuelve y otro para cerrarlo para siempre.

**La regla que los hace útiles y no ruido**: un consejo **solo aparece si su condición se
cumple**. No es una lista que rota al azar: a quien ya comparte su horario no se le sugiere
compartirlo, y a quien no tiene ni una materia no se le habla de widgets —porque el widget que
vería estaría vacío—. Es lo que separa un tutorial de un anuncio.

| Decisión | Por qué |
|---|---|
| La elección vive en `shared` (`siguienteTip`) | Principio II. Si cada cliente la tomara, la web sugeriría capturar el horario mientras la app felicita por tenerlo |
| **Uno solo**, no la lista entera | Seis tarjetas de consejo convertirían el inicio en un folleto. Va **debajo** de la próxima clase y de los avisos: quien abre la app viene a ver su horario |
| Un endpoint (`/tips/context`) y no cinco peticiones | El consejo mira seis cosas a la vez. Pedirlas por separado añadiría cinco viajes a la pantalla que más se abre, para pintar lo accesorio |
| Devuelve **cuentas**, no listas | Las reglas solo preguntan «¿tiene alguno?». Mandar la agenda entera para responder a `pendientes > 0` expondría datos que la respuesta no necesita |
| Los descartes viven en el **dispositivo** | Haber cerrado un consejo es una preferencia de este teléfono, no un dato de la cuenta. No merece tabla ni viaje de red, y perderlo no tiene consecuencia |
| Va en el mismo `allSettled` que el resto | Si falla, no salen consejos y la pantalla se pinta igual. Un consejo es lo primero que sobra cuando algo va mal |
| El destino viaja como **nombre de sección** | `shared` no sabe de rutas de Next ni de la navegación de la app. Cada cliente lo traduce a lo suyo |

**Verificado en Android real**: la cuenta de prueba tenía horario, así que el inicio **no** sugirió
capturarlo sino **encender el aviso de clase** —la regla eligió según el estado real—; tocar
«Encenderlo» llevó al calendario. En navegador real: a una cuenta vacía se le sugiere capturar el
horario, al cerrarlo aparece el siguiente, y **el descarte persiste tras recargar**.

**API**: 27/27, incluida la cadena completa de estados y que **el mismo contexto da siempre el
mismo consejo**, que es lo que hace que web y app coincidan.

#### Revisión del 2026-08-21: de asistente de primeros pasos a pantalla de carga

El primer diseño enseñaba **un** consejo y solo mostraba lo que aún no habías hecho. Se cambió el
modelo entero a petición: **consejos tipo pantalla de carga de videojuego**, que rotan al azar y
**se repiten aunque ya conozcas la función**.

**Por qué el cambio es correcto**: un tutorial que solo enseña lo que no has hecho deja de
hablarte justo cuando llevas meses usando la app, que es cuando más funciones has olvidado. Una
opción que usaste una vez en septiembre no la recuerdas en noviembre.

| Qué cambió | De | A |
|---|---|---|
| Catálogo | 12 consejos | **37**, cubriendo horario, faltas, agenda, avisos, compartir, periodos, social, la app y privacidad |
| Cuántos se ven | 1 | **3 a la vez**, en una sección «¿Sabías que…?» |
| Condición | «si no lo ha hecho» | **casi todos aplican siempre**; la condición solo evita lo que sería falso o incomprensible —no se habla de widgets a quien no tiene materias, ni de justificar faltas a quien no tiene ninguna— |
| Selección | prioridad fija | **barajado determinista por semilla**, repartiendo **un consejo por tema** |

**Dos decisiones que no se ven pero sostienen el resto**:

- La baraja es **determinista a partir de una semilla**, no `Math.random()`. Con azar puro cada
  repintado de React reordenaría los consejos **mientras el usuario los está leyendo**. La semilla
  se fija al montar la pantalla y sale del reloj en tramos de cinco minutos: quieta dentro de una
  visita, distinta entre visitas.
- Se reparte **un consejo por tema** antes de rellenar. Sin eso, tres al azar de un catálogo con
  cinco consejos de avisos darían casi siempre tres de avisos, y parecería que la app solo
  notifica.

**El único consejo que sigue callándose cuando ya está hecho** es «empieza por tu horario»:
decírselo a quien lleva medio semestre con el suyo capturado sería absurdo, no un recordatorio.

**Verificado en el APK derivado del `.aab`, contra producción**: la sección muestra tres consejos
de **temas distintos** (agenda, avisos, faltas); ir al horario y volver **no los reordena**;
cerrar uno lo quita y entra otro; y el descarte **persiste tras reiniciar la app**. En la web de
producción: 11/11, incluida la comprobación de que hay exactamente **tres** a la vez.

---

### Lo que estas cuatro fases NO cambiaron

**Los permisos del manifiesto siguen siendo los mismos.** La Fase 22 los dejó en siete y estas
cuatro no añadieron ninguno: `aapt2 dump badging` sobre el APK compilado devuelve `CAMERA`,
`INTERNET`, `POST_NOTIFICATIONS`, `USE_BIOMETRIC`, `USE_FINGERPRINT` y el
`DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` de siempre. Los avisos de clase y los botones de la
notificación se apoyan en `POST_NOTIFICATIONS`, que ya estaba.

### Desplegado el 2026-08-21

**Todo lo anterior está en producción.** Se reconstruyeron las imágenes `notecore-api` y
`notecore-web` y se recrearon los contenedores. Las dos migraciones (`0014`, `0015`) ya estaban
aplicadas: la base de datos de desarrollo **es** la de producción, alcanzada por `localhost:5432`.

Antes de desplegar se hizo un **respaldo de la base** en `~/respaldos-notecore/`, verificado —15
tablas y 14 bloques de datos—.

**Verificación contra producción**: 11/11 por API (`https://notecore-api.ourocore.net`) y 11/11 en
navegador real contra `https://notecore.ourocore.net`.

### El `.aab` de la versión 0.3.0

| | |
|---|---|
| `versionCode` | **6** (era 5) |
| `versionName` | **0.3.0** (era 0.2.0) |
| Permisos | **5**, sin `REQUEST_INSTALL_PACKAGES` |
| API incrustada | `https://notecore-api.ourocore.net` |
| Ruta | `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab` |

Compilado con `scripts/compilar-aab-tienda.sh`, que es lo que garantiza el prebuild con el
actualizador apagado y el `clean` de Gradle. **Probado como lo servirá Google**: se derivó el APK
universal con `bundletool`, se instaló en el emulador y se usó contra producción real.

### Lo que quedó pendiente

- **17 cuentas de prueba mías** (`@ejemplo.mx`) siguen en la base de datos e inflan el contador
  del panel. El borrado quedó bloqueado por seguridad y necesita hacerse a mano.
- **Hay usuarios reales nuevos**: además de `@mizllet`, siete cuentas con correo de Gmail creadas
  el 2026-08-21 y el 2026-08-22. El apartado «una sola cuenta real» del reporte resumen ya no es
  cierto.
