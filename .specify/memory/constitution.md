<!--
Sync Impact Report
==================
Version change: (none) → 1.0.0
Rationale: Ratificación inicial de la constitución del proyecto PaginaHorarios v2.

Modified principles: N/A (documento inicial)

Added sections:
  - Core Principles (I-VIII)
  - Restricciones Técnicas y de Stack
  - Flujo de Desarrollo y Puertas de Calidad
  - Governance

Removed sections: ninguna

Follow-up TODOs: ninguno
-->

# PaginaHorarios Constitution

Sistema de gestión de horarios, control de asistencias y agenda académica para estudiantes
universitarios. Disponible como app Android (principal) y aplicación web (PC y móvil).

## Core Principles

### I. Paridad de Plataformas (NO NEGOCIABLE)

Toda funcionalidad MUST estar disponible y verificada en ambos clientes —app Android y web
responsive (escritorio y móvil)— antes de considerarse completa. El desarrollo procede en
**fases verticales**: cada fase entrega una funcionalidad end-to-end en backend, app y web
simultáneamente. Una fase NO se marca como terminada si funciona en un cliente y no en el otro.

**Rationale**: El usuario declaró que ambas versiones tienen el mismo contenido y propósito. La
web sirve a quienes no instalan el APK y a usuarios de iPhone, que hoy no tienen alternativa
nativa. Una brecha de funcionalidad entre clientes deja a un grupo de usuarios sin acceso.

### II. Backend como Fuente Única de Verdad

Toda lógica de negocio MUST residir en la API REST del backend. Los clientes son capas de
presentación e interacción; NO duplican reglas de negocio (cálculo de límites de faltas,
validación de horarios, resolución de compartición). Cualquier regla implementada en un cliente
sin su contraparte en el backend es una violación.

**Rationale**: Dos clientes con lógica duplicada divergen inevitablemente, produciendo resultados
distintos para el mismo usuario según el dispositivo que use.

### III. Aislamiento Estricto de Datos por Usuario

Todo registro MUST pertenecer a un usuario identificable. Ningún endpoint puede exponer datos de
un usuario a otro salvo mediante un acto explícito de compartición iniciado por el propietario.
Toda consulta MUST filtrar por el usuario autenticado; la autorización se verifica en el servidor,
nunca confiando en parámetros del cliente.

**Rationale**: El sistema es multiusuario y almacena información académica personal —horarios,
faltas, tareas, mensajes. Una fuga entre cuentas es el fallo más grave que este sistema puede
tener.

### IV. Compartir es Copia, No Sincronización

Al compartir un horario o un elemento de agenda vía QR, código o enlace, el receptor MUST obtener
una **copia independiente** bajo su propiedad. Tras la copia NO existe vínculo entre origen y
destino: las ediciones posteriores de cualquiera de las partes no afectan a la otra. El emisor
MUST poder elegir qué contenido comparte antes de generar el QR/código/enlace.

**Rationale**: Decisión explícita del usuario. Evita conflictos de edición, permisos compartidos y
resolución de concurrencia —una complejidad enorme que no aporta valor al caso de uso real
(compañeros que copian el horario de clase y luego lo ajustan a su gusto).

### V. Offline-First en la App

La app Android MUST mostrar la información ya cargada sin conexión: horario, agenda, faltas y
semestres consultados previamente. Las escrituras sin conexión se encolan localmente y se
sincronizan al recuperar red. La web ofrece offline en la medida que la plataforma lo permita,
sin que ello bloquee la paridad funcional.

**Rationale**: El usuario consulta su horario dentro de la universidad, donde la conectividad es
intermitente. Una app que no abre sin señal no cumple su propósito principal.

### VI. Los Datos Históricos No Se Borran

Al iniciar un semestre nuevo, el semestre anterior MUST archivarse íntegro —horario, agenda,
faltas y estadísticas— y permanecer consultable de forma indefinida. Ninguna operación de rutina
puede destruir historial. Las eliminaciones iniciadas por el usuario MUST ser explícitas,
confirmadas e informar exactamente qué se perderá.

**Rationale**: Requisito directo del usuario: poder consultar semestres pasados. El historial
académico gana valor con el tiempo y es irrecuperable si se destruye.

### VII. Los Presets Normativos Son Orientativos

El límite de faltas por defecto se calcula desde la norma TecNM de **80% de asistencia mínima**
(equivalente a 20% de inasistencias sobre el total de sesiones del semestre). Este valor MUST
presentarse siempre como sugerencia, acompañado de una recomendación visible de confirmar el
criterio con el profesor de la materia, y MUST ser editable por el usuario en cualquier momento.

**Rationale**: El criterio real de asistencia lo fija cada profesor y puede diferir del
reglamento. Un límite presentado como autoridad induciría al estudiante a un error con
consecuencias académicas reales.

### VIII. Restricciones Técnicas Heredadas

La lógica JavaScript compleja MUST vivir en archivos `.js` separados, nunca inline en `<script>`
dentro de archivos `.astro`, cuando el contenido incluya caracteres multi-byte (emojis, acentos) o
llaves `{}` en el HTML. Esta regla se origina en un fallo reproducido de esbuild/Astro que rompe
la compilación de forma no evidente.

**Rationale**: Problema ya diagnosticado y resuelto a costa de tiempo en la v1. Documentarlo
impide reincidir.

## Restricciones Técnicas y de Stack

- **App Android**: React Native con Expo. Distribución inicial por `.apk` de instalación directa;
  Play Store como objetivo posterior. iOS queda explícitamente fuera de alcance en esta etapa; los
  usuarios de iPhone acceden por web.
- **Web**: aplicación responsive funcional en escritorio y navegador móvil.
- **Backend**: Node.js + Express (ESM), API REST.
- **Base de datos**: PostgreSQL.
- **Autenticación**: cuenta única por usuario, con sesión válida simultáneamente en app y web.
- **Identidad de usuario**: nombre mostrado (ej. `Brian Tellez`) y nombre de usuario único
  (ej. `@mizllet`), utilizado para búsqueda y perfil compartible.
- **Despliegue**: Docker Compose; acceso externo vía túnel Cloudflare.
- **Secretos**: credenciales, tokens y `JWT_SECRET` viven en `.env`, nunca en el repositorio ni en
  código cliente.

## Flujo de Desarrollo y Puertas de Calidad

- El trabajo avanza en **fases verticales numeradas**. Cada fase declara su alcance en backend,
  app y web.
- **Puerta de fase**: una fase se cierra solo cuando su funcionalidad se verifica en app Android
  y web. La verificación se registra en la documentación del proyecto.
- El estado del proyecto se mantiene en un documento Markdown vivo que contiene, en este orden:
  (1) reporte resumen del avance, (2) lista de fases con su estado —hechas, pendientes, en
  revisión—, y (3) la información detallada del proyecto y sus fases. Se actualiza al cerrar
  cada fase.
- Los cambios de esquema de base de datos MUST ser migraciones versionadas, nunca ediciones
  destructivas sobre datos existentes.
- Antes de sustituir el sistema v1 en producción, la v2 MUST demostrar paridad funcional con lo
  que la v1 ya ofrece a sus usuarios actuales.

## Governance

Esta constitución tiene precedencia sobre cualquier otra práctica del proyecto. Cuando una
decisión de implementación contradiga un principio, prevalece el principio o se enmienda la
constitución de forma explícita.

**Procedimiento de enmienda**: toda modificación requiere (1) declarar qué principio cambia y por
qué, (2) actualizar el número de versión conforme a la política de versionado, y (3) registrar la
fecha de última enmienda.

**Política de versionado** (semántico):
- **MAJOR**: eliminación o redefinición incompatible de un principio de gobernanza.
- **MINOR**: adición de un principio o expansión material de una guía existente.
- **PATCH**: aclaraciones, correcciones de redacción, refinamientos no semánticos.

**Revisión de cumplimiento**: cada cierre de fase verifica el cumplimiento de los principios I
(paridad), II (backend como fuente de verdad) y III (aislamiento de datos). Cualquier complejidad
añadida que no sirva a un principio debe justificarse o eliminarse.

**Version**: 1.0.0 | **Ratified**: 2026-08-16 | **Last Amended**: 2026-08-16
