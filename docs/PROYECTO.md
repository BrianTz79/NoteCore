# PaginaHorarios — Estado del Proyecto

> Documento vivo. Se actualiza al cerrar cada fase.
> Última actualización: **2026-08-16**

---

## 1. Reporte Resumen

| | |
|---|---|
| **Estado general** | Planificación completada — listo para empezar Fase 0 |
| **Fases completadas** | 0 de 12 |
| **Fase actual** | Fase 0 — Cimientos (no iniciada) |
| **Versión en producción** | v1 (respaldada, sigue operativa en horarios.ourocore.net) |
| **Bloqueos** | Ninguno |

**Avance**: `░░░░░░░░░░░░` 0%

### ¿Qué se ha hecho hasta ahora?

Se definió la visión completa del producto y se documentó formalmente:

- **Constitución del proyecto** con 8 principios que rigen todo el desarrollo
- **Especificación** con 11 historias de usuario, 51 requisitos funcionales y 11 criterios de éxito
- **Plan de implementación** dividido en 12 fases verticales
- **Repositorio Git** inicializado con protección de secretos verificada
- **Respaldo íntegro de la v1** en `_respaldo_v1_20260816/` (verificado por checksum)

### Próximo paso

Iniciar **Fase 0 — Cimientos**: estructura de carpetas, Docker Compose de desarrollo, sistema de
migraciones y proyecto Expo compilando a `.apk`.

---

## 2. Fases

**Leyenda**: ✅ Hecha · 🔄 En curso · 🔍 En revisión · ⬜ Pendiente · ⏸️ Bloqueada

| # | Fase | Prioridad | Estado | Backend | Web | App |
|---|------|-----------|--------|---------|-----|-----|
| 0 | Cimientos | — | ⬜ | ⬜ | ⬜ | ⬜ |
| 1 | Cuentas y sesión | P1 | ⬜ | ⬜ | ⬜ | ⬜ |
| 2 | Horario | P1 | ⬜ | ⬜ | ⬜ | ⬜ |
| 3 | Control de faltas | P1 | ⬜ | ⬜ | ⬜ | ⬜ |
| 4 | Agenda | P1 | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | Calendario y recordatorios | P2 | ⬜ | ⬜ | ⬜ | ⬜ |
| 6 | Compartir | P2 | ⬜ | ⬜ | ⬜ | ⬜ |
| 7 | Semestres | P2 | ⬜ | ⬜ | ⬜ | ⬜ |
| 8 | Social: perfiles y contactos | P3 | ⬜ | ⬜ | ⬜ | ⬜ |
| 9 | Offline y sincronización | P2 | ⬜ | ⬜ | ⬜ | ⬜ |
| 10 | Mensajería | P3 | ⬜ | ⬜ | ⬜ | ⬜ |
| 11 | Widget y pulido visual | P4 | ⬜ | ⬜ | ⬜ | ⬜ |

### Regla de cierre de fase

Una fase **no se cierra** hasta que su funcionalidad está verificada en **app Android y web**.
Al cerrarla se registra aquí la fecha, la verificación realizada y se hace un commit de Git como
punto de guardado.

### Historial de cierres

_Sin fases cerradas todavía._

---

## 3. Información del Proyecto

### 3.1 Qué es

Plataforma de organización académica para estudiantes universitarios. Reúne en un solo lugar el
horario de clases, el control de faltas y la agenda de tareas, con compartición entre compañeros.

**Dos clientes, mismo producto**:
- **App Android** (principal) — instalación por `.apk`
- **Web** (PC y móvil) — para quien no instala la app y para usuarios de iPhone

### 3.2 Principios rectores

Definidos en [`.specify/memory/constitution.md`](../.specify/memory/constitution.md) v1.0.0:

1. **Paridad de plataformas** — toda función existe y se verifica en app y web
2. **Backend fuente única de verdad** — sin lógica de negocio duplicada en clientes
3. **Aislamiento estricto de datos** — ningún usuario ve datos de otro
4. **Compartir es copia, no sincronización** — el receptor obtiene material propio e independiente
5. **Offline-first en la app** — lo ya cargado se consulta sin conexión
6. **Los datos históricos no se borran** — los semestres se archivan, nunca se destruyen
7. **Los presets normativos son orientativos** — el límite de faltas se confirma con el profesor
8. **Restricciones técnicas heredadas** — JS complejo fuera de los `.astro` (bug de esbuild)

### 3.3 Stack

| Capa | Tecnología |
|------|-----------|
| App Android | React Native + Expo |
| Web | Astro + Tailwind CSS |
| Backend | Node.js + Express (ESM), API REST |
| Base de datos | PostgreSQL |
| Infraestructura | Docker Compose + túnel Cloudflare |

### 3.4 Detalle de fases

#### Fase 0 — Cimientos
Estructura de carpetas, Git con protección de secretos, Docker Compose de desarrollo, sistema de
migraciones, proyecto Expo compilando a `.apk`, este documento en marcha.
**Verificación**: los tres servicios levantan y la app instala en un dispositivo.

#### Fase 1 — Cuentas y sesión (P1)
Registro, login, perfil con nombre mostrado y nombre de usuario único (`@usuario`). Sesión
simultánea en app y web. Aislamiento de datos por usuario.
**Verificación**: misma cuenta activa en ambos clientes; ningún acceso cruzado entre usuarios.

#### Fase 2 — Horario (P1)
Materias y sesiones (día, hora, aula). Alta manual e importación del JSON generado por IA a partir
de una foto del horario; la app proporciona el prompt. Vista semanal.
**Pendiente de auditar**: la comodidad y agilidad del flujo de importación de la v1.
**Verificación**: horario capturado por ambos métodos idéntico en app y web.

#### Fase 3 — Control de faltas (P1)
Registro de inasistencia por día completo o por materia/hora. Conteo por materia. Límite sugerido
calculado como 20% de las sesiones del semestre, derivado de la norma TecNM de 80% de asistencia
mínima —por debajo de la cual el profesor registra NP. Siempre editable y siempre acompañado de la
recomendación de confirmarlo con el profesor. Alertas de proximidad al límite.
**Verificación**: conteos y alertas coinciden entre plataformas.

#### Fase 4 — Agenda (P1)
Tareas, proyectos y actividades. Materia asociada opcional, fecha límite opcional, estado de
completado. Todo editable.
**Verificación**: actividad creada en un cliente se edita desde el otro.

#### Fase 5 — Calendario y recordatorios (P2)
Vista de calendario que combina clases y vencimientos, con detalle por día. Recordatorios con
anticipación configurable y notificación en el dispositivo.
**Verificación**: la notificación llega en el momento configurado y se cancela al completar.

#### Fase 6 — Compartir (P2)
Compartición de horario y actividades por QR, código corto y enlace —las tres modalidades entregan
lo mismo. El emisor elige el contenido; el receptor ve una vista previa y, al aceptar, obtiene una
copia independiente. Revocación y caducidad.
**Verificación**: la copia recibida no cambia cuando el emisor edita su original.

#### Fase 7 — Semestres (P2)
Iniciar semestre nuevo desde configuración. El anterior se archiva íntegro —horario, agenda,
faltas— y queda consultable de forma indefinida y protegido contra modificación accidental.
**Verificación**: el semestre nuevo arranca vacío y el anterior conserva todo.

#### Fase 8 — Social: perfiles y contactos (P3)
Perfil con nombre mostrado y `@usuario`. Búsqueda por nombre de usuario, y agregado por QR o enlace
de perfil. Solicitudes con aceptación, eliminación y bloqueo.
**Verificación**: dos cuentas se conectan por búsqueda y por QR.

#### Fase 9 — Offline y sincronización (P2)
Cache local de horario, agenda y faltas. Cola de cambios hechos sin conexión, sincronizados al
recuperar red, con indicador de pendientes.
**Verificación**: en modo avión se consulta todo lo cargado y los cambios suben al reconectar.

#### Fase 10 — Mensajería (P3)
Conversaciones de texto entre contactos aceptados. Restringida a contactos; bloqueo efectivo.
**Nota**: es la fase más costosa y la que más superficie de privacidad abre. Deliberadamente al
final, sobre una base estable.
**Verificación**: mensajes entre contactos se entregan; entre no contactos se rechazan.

#### Fase 11 — Widget y pulido visual (P4)
Widget de pantalla principal con la vista semanal. Pasada de diseño integral sobre el producto ya
funcional. Preparación para distribución.
**Verificación**: el widget refleja datos reales y abre la vista correspondiente.

### 3.5 Fuera de alcance

- App nativa para iOS (los usuarios de iPhone usan la web)
- Integración con sistemas escolares oficiales
- Calificaciones y promedios
- Toma de asistencia por profesores (el registro es autorreportado)
- Mensajería grupal, archivos adjuntos y llamadas
- Sincronización bidireccional continua de contenido compartido

### 3.6 Documentos relacionados

| Documento | Contenido |
|-----------|-----------|
| [`.specify/memory/constitution.md`](../.specify/memory/constitution.md) | Principios del proyecto |
| [`specs/001-plataforma-academica/spec.md`](../specs/001-plataforma-academica/spec.md) | Especificación funcional completa |
| [`specs/001-plataforma-academica/plan.md`](../specs/001-plataforma-academica/plan.md) | Plan de implementación por fases |
| [`README.md`](../README.md) | Presentación del proyecto |

### 3.7 Respaldo de la versión anterior

La v1 está respaldada íntegra en `_respaldo_v1_20260816/` (verificada por checksum, 26 archivos
fuente). **No se sube al repositorio** porque contiene el `.env` con secretos reales.

La v1 sigue operativa en producción y no se sustituye hasta que la v2 demuestre paridad funcional.
