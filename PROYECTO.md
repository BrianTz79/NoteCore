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
| **Estado general** | Cimientos listos — construyendo funcionalidad |
| **Fases completadas** | 1 de 12 |
| **Fase actual** | Fase 1 — Cuentas y sesión (no iniciada) |
| **Bloqueos** | Ninguno |
| **Repositorio** | https://github.com/BrianTz79/NoteCore |

**Avance**: `█░░░░░░░░░░░` 8%

### Qué se ha hecho

- **Constitución** con 8 principios rectores del proyecto
- **Especificación**: 11 historias de usuario, 51 requisitos funcionales, 11 criterios de éxito
- **Plan** de 12 fases verticales
- **Repositorio Git** inicializado, con secretos protegidos y verificados
- **v1 eliminada**: contenedores, volumen de base de datos y código retirados. Queda un respaldo
  local fuera del repositorio
- **Fase 0 cerrada**: monorepo con las cuatro capas compilando en TypeScript estricto, PostgreSQL
  con migraciones versionadas, API respondiendo y bundle de Android generado

### Próximo paso

**Fase 1 — Cuentas y sesión**: registro, login y perfil con `@usuario` único, sesión simultánea en
app y web, y aislamiento de datos por usuario verificado en el servidor.

---

## 2. Fases

**Leyenda**: ✅ Hecha · 🔄 En curso · 🔍 En revisión · ⬜ Pendiente · ⏸️ Bloqueada

| # | Fase | Prio | Estado | API | Web | App |
|---|------|------|--------|-----|-----|-----|
| 0 | Cimientos | — | ✅ | ✅ | ✅ | ✅ |
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

### Regla de cierre

Una fase se cierra cuando funciona **en app y en web**. Al cerrarla:
1. Marcar ✅ en esta tabla
2. Registrar la fecha y la verificación en el historial de abajo
3. Actualizar el reporte resumen
4. Hacer commit: `feat(faseN): descripción`

### Historial de cierres

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

**Pendiente no bloqueante**: Node 18.19.1 en la máquina de desarrollo está fuera de soporte; el
proyecto declara `engines: node >=20.11.0`. Y `npm audit` reporta vulnerabilidades heredadas de
la cadena de Expo SDK 52, resolubles al subir de SDK mayor.

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
│   │       ├── routes/      endpoints por dominio
│   │       ├── middleware/  autenticación y validación
│   │       └── services/    lógica de negocio
│   │
│   ├── web/                 aplicación web — Next.js + Tailwind
│   │   └── src/
│   │       ├── app/         rutas
│   │       ├── components/  componentes propios de web
│   │       └── lib/         cliente de API y utilidades
│   │
│   └── mobile/              app Android — React Native + Expo
│       └── src/
│           ├── screens/
│           ├── components/  componentes propios de la app
│           └── lib/
│
├── packages/
│   └── shared/              tipos de dominio, validaciones y lógica común
│       └── src/
│           ├── types/       entidades (Usuario, Materia, Falta…)
│           ├── schemas/     validaciones compartidas
│           └── logic/       reglas puras (p. ej. cálculo de límite de faltas)
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
| Lenguaje | **TypeScript** (estricto) | Tipos compartidos entre las tres capas: si un campo cambia, el compilador señala dónde rompe |
| App Android | **React Native + Expo** | Nueva Arquitectura estable; genera `.apk`, y cubre notificaciones, cámara/QR y widgets |
| Web | **Next.js + Tailwind CSS** | Comparte componentes y lógica React con la app; evita escribir cada pantalla dos veces |
| Backend | **Node.js + Fastify** | Rápido, con validación de esquemas integrada |
| Base de datos | **PostgreSQL + Drizzle ORM** | Migraciones versionadas con tipos derivados del esquema |
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

#### Fase 1 — Cuentas y sesión (P1)
Registro, login y perfil con nombre mostrado y nombre de usuario único (`@usuario`). Sesión
simultánea en app y web. Aislamiento de datos por usuario.
**Verificación**: misma cuenta activa en ambos clientes; ningún acceso cruzado.

#### Fase 2 — Horario (P1)
Materias y sesiones (día, hora, aula). Alta manual e importación del JSON generado por IA a partir
de una foto del horario; la app proporciona el prompt. Vista semanal.
**Pendiente de auditar**: comodidad y agilidad del flujo de importación (reportado por el usuario).
**Verificación**: horario capturado por ambos métodos idéntico en app y web.

#### Fase 3 — Control de faltas (P1)
Registro por día completo o por materia/hora. Conteo por materia. Límite sugerido = 20% de las
sesiones del semestre, derivado de la norma TecNM de **80% de asistencia mínima** —por debajo, el
profesor registra NP. Siempre editable y siempre con la recomendación de confirmarlo con el
profesor. Alertas de proximidad.
**Verificación**: conteos y alertas coinciden entre plataformas.

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

### Decisiones tomadas

- **Nombre**: NoteCore — *Note* (horario, agenda, notas) + *Core* (el núcleo que lo centraliza),
  en línea con la marca OuroCore
- **Repositorio**: https://github.com/BrianTz79/NoteCore
- **Web**: `notecore.ourocore.net`
- **Stack**: revisado el 2026-08-16 (ver sección 4.3)
