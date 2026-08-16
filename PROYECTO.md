# PaginaHorarios — Estado del Proyecto

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
| **Estado general** | Planificación completa — listo para Fase 0 |
| **Fases completadas** | 0 de 12 |
| **Fase actual** | Fase 0 — Cimientos (no iniciada) |
| **Bloqueos** | Ninguno |
| **Pendiente de decisión** | Nombre definitivo del proyecto · crear repositorio en GitHub |

**Avance**: `░░░░░░░░░░░░` 0%

### Qué se ha hecho

- **Constitución** con 8 principios rectores del proyecto
- **Especificación**: 11 historias de usuario, 51 requisitos funcionales, 11 criterios de éxito
- **Plan** de 12 fases verticales
- **Repositorio Git** inicializado, con secretos protegidos y verificados
- **v1 eliminada**: contenedores, volumen de base de datos y código retirados. Queda un respaldo
  local fuera del repositorio

### Próximo paso

**Fase 0 — Cimientos**: Docker Compose de desarrollo, sistema de migraciones, API mínima, web
mínima y proyecto Expo compilando a `.apk`.

---

## 2. Fases

**Leyenda**: ✅ Hecha · 🔄 En curso · 🔍 En revisión · ⬜ Pendiente · ⏸️ Bloqueada

| # | Fase | Prio | Estado | API | Web | App |
|---|------|------|--------|-----|-----|-----|
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

### Regla de cierre

Una fase se cierra cuando funciona **en app y en web**. Al cerrarla:
1. Marcar ✅ en esta tabla
2. Registrar la fecha y la verificación en el historial de abajo
3. Actualizar el reporte resumen
4. Hacer commit: `feat(faseN): descripción`

### Historial de cierres

_Sin fases cerradas todavía._

---

## 3. Estructura de Carpetas

```
.
├── PROYECTO.md              ← este documento (estado y avance)
├── README.md                presentación del proyecto
├── .env.example             plantilla de configuración
│
├── apps/
│   ├── api/                 backend — Node.js + Express
│   │   └── src/
│   │       ├── db/          conexión y migraciones versionadas
│   │       ├── routes/      endpoints por dominio
│   │       ├── middleware/  autenticación y validación
│   │       └── services/    lógica de negocio
│   │
│   ├── web/                 aplicación web — Astro + Tailwind
│   │   └── src/
│   │       ├── pages/
│   │       ├── components/
│   │       └── lib/         lógica en .js separados (ver principio VIII)
│   │
│   └── mobile/              app Android — React Native + Expo
│       └── src/
│           ├── screens/
│           ├── components/
│           └── lib/
│
├── packages/
│   └── shared/              tipos y validaciones comunes a web y app
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

Plataforma de organización académica para estudiantes universitarios. Reúne horario de clases,
control de faltas y agenda de tareas en un solo lugar, con compartición entre compañeros.

**Dos clientes, mismo producto**:
- **App Android** (principal) — instalación por `.apk`
- **Web** (PC y móvil) — para quien no instala la app y para usuarios de iPhone

### 4.2 Principios rectores

1. **Paridad de plataformas** — toda función existe y se verifica en app y web
2. **Backend fuente única de verdad** — sin lógica de negocio duplicada
3. **Aislamiento estricto de datos** — ningún usuario ve datos de otro
4. **Compartir es copia, no sincronización** — el receptor obtiene material propio
5. **Offline-first en la app** — lo ya cargado se consulta sin conexión
6. **Los datos históricos no se borran** — los semestres se archivan
7. **Los presets normativos son orientativos** — el límite de faltas se confirma con el profesor
8. **Restricciones técnicas heredadas** — JS complejo fuera de los `.astro` (bug de esbuild)

### 4.3 Stack

| Capa | Tecnología |
|------|-----------|
| App Android | React Native + Expo |
| Web | Astro + Tailwind CSS |
| Backend | Node.js + Express (ESM), API REST |
| Base de datos | PostgreSQL |
| Infraestructura | Docker Compose + túnel Cloudflare |

### 4.4 Detalle de fases

#### Fase 0 — Cimientos
Docker Compose de desarrollo, sistema de migraciones versionadas, API mínima que responde, web
mínima que carga, proyecto Expo compilando a `.apk`.
**Verificación**: los tres servicios levantan y la app instala en un dispositivo.

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

### Pendientes de decisión

- **Nombre definitivo** del proyecto, la app y la web
- **Crear el repositorio en GitHub** (requiere instalar `gh` o crearlo desde la web)
