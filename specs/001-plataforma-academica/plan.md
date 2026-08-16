# Implementation Plan: Plataforma Académica Multiplataforma

**Feature Directory**: `specs/001-plataforma-academica`
**Created**: 2026-08-16
**Spec**: [spec.md](spec.md)
**Constitution**: [constitution.md](../../.specify/memory/constitution.md) v1.0.0

## Summary

Reconstrucción de PaginaHorarios como plataforma multiusuario con dos clientes —app Android
(React Native/Expo) y web (Astro)— sobre una API REST única en Node.js/Express con PostgreSQL.

El desarrollo procede en **fases verticales**: cada fase entrega una funcionalidad completa y
verificada en backend, app y web antes de avanzar. La v1 existente queda respaldada en
`_respaldo_v1_20260816/` y sigue operando en producción hasta que la v2 alcance paridad funcional.

## Technical Context

| Aspecto | Decisión |
|---------|----------|
| Lenguaje backend | Node.js (ESM) + Express |
| Base de datos | PostgreSQL con migraciones versionadas |
| App móvil | React Native + Expo → `.apk` |
| Web | Astro + Tailwind, responsive |
| Autenticación | JWT, sesiones concurrentes app + web |
| Despliegue | Docker Compose + túnel Cloudflare |
| Control de versiones | Git, commit al cierre de cada fase |

**Restricción heredada**: lógica JS compleja en archivos `.js` separados, nunca inline en `.astro`
con caracteres multi-byte o llaves `{}` (bug de esbuild ya diagnosticado en v1).

## Constitution Check

| Principio | Cómo lo cumple este plan |
|-----------|--------------------------|
| I. Paridad de plataformas | Cada fase define entregables de backend, app y web; la puerta de cierre exige verificación en ambos clientes |
| II. Backend fuente de verdad | Toda regla (límites de faltas, validación, compartición) vive en la API; los clientes solo presentan |
| III. Aislamiento de datos | Fase 1 establece autenticación y filtrado por usuario antes de cualquier dato académico |
| IV. Compartir es copia | Fase 6 implementa copia en la aceptación, sin vínculo posterior |
| V. Offline-first | Fase 9 dedicada; el modelo de datos de fases previas contempla sincronización diferida |
| VI. Datos históricos | Fase 7 archiva semestres; ninguna fase incluye borrado destructivo automático |
| VII. Presets orientativos | Fase 3 muestra el límite sugerido con la recomendación de confirmar con el profesor |
| VIII. Restricción esbuild | Aplicada en todo el trabajo web desde la fase 1 |

## Fases de Implementación

### Fase 0 — Cimientos

**Objetivo**: dejar el proyecto listo para construir, sin funcionalidad de usuario todavía.

- Estructura de carpetas (`backend/`, `frontend/`, `app/`, `docs/`, `specs/`)
- Repositorio Git inicializado con `.gitignore` que excluye secretos y respaldos
- `docker-compose.yml` para desarrollo: PostgreSQL, backend, frontend
- Sistema de migraciones de base de datos
- Proyecto Expo inicializado y compilando a `.apk`
- Documento `docs/PROYECTO.md` en marcha

**Verificación**: los tres servicios levantan; la app compila e instala en un dispositivo.

---

### Fase 1 — Cuentas y sesión (P1)

**Objetivo**: FR-001 a FR-004. Un usuario se registra, inicia sesión en ambos clientes y sus datos
quedan aislados.

- **Backend**: esquema `users` con nombre mostrado y nombre de usuario único; registro, login,
  perfil; middleware de autenticación; filtrado por usuario en toda consulta
- **Web**: pantallas de registro, login y perfil
- **App**: pantallas equivalentes con sesión persistente

**Verificación**: la misma cuenta abre sesión simultáneamente en app y web; un usuario no puede
leer datos de otro.

---

### Fase 2 — Horario (P1)

**Objetivo**: FR-005 a FR-010. El estudiante captura y visualiza su horario.

- **Backend**: `subjects` y `schedule_blocks`; CRUD completo; endpoint de importación con
  validación estricta y transaccional (sin destruir datos previos ante error)
- **Web**: vista semanal, alta/edición manual, pantalla de importación con el prompt para la IA
- **App**: vista semanal táctil, alta/edición manual, importación por pegado

**Revisión pendiente**: auditar el flujo de importación de la v1 —el usuario reportó que debe
verificarse su comodidad y agilidad.

**Verificación**: horario capturado por ambos métodos se ve idéntico en app y web.

---

### Fase 3 — Control de faltas (P1)

**Objetivo**: FR-011 a FR-017. Registro de inasistencias y alertas de límite.

- **Backend**: `absence_records`; registro por día completo o por sesión; cálculo del límite
  sugerido (20% de sesiones totales del semestre); estadísticas por materia
- **Web**: flujo de marcar falta (fecha → día completo o materias), panel de estadísticas
- **App**: mismo flujo optimizado para pocos toques

**Nota normativa**: el límite se presenta como sugerencia con la recomendación visible de
confirmarlo con el profesor (Principio VII).

**Verificación**: conteos y alertas coinciden entre plataformas; el límite es editable.

---

### Fase 4 — Agenda (P1)

**Objetivo**: FR-018 a FR-022. Tareas y actividades vinculadas o no a materias.

- **Backend**: `agenda_items` con materia y fecha límite opcionales, estado de completado; CRUD
- **Web**: lista de pendientes ordenada por vencimiento, alta y edición
- **App**: alta rápida pensada para usarse durante la clase

**Verificación**: una actividad creada en un cliente aparece y se edita en el otro.

---

### Fase 5 — Calendario y recordatorios (P2)

**Objetivo**: FR-023 a FR-027. Vista integrada y notificaciones.

- **Backend**: consultas por rango de fechas; persistencia de configuración de recordatorios
- **Web**: vista de calendario con clases y vencimientos, detalle por día
- **App**: calendario + notificaciones locales, reprogramación al cambiar fechas

**Verificación**: la notificación llega en el momento configurado; se cancela al completar la
actividad.

---

### Fase 6 — Compartir (P2)

**Objetivo**: FR-028 a FR-033. Compartición por QR, código y enlace.

- **Backend**: `shares` con contenido seleccionado, vigencia y revocación; endpoint de vista previa
  y de aceptación que copia a la cuenta receptora
- **Web**: selección de contenido, generación de las tres modalidades, vista previa y aceptación
- **App**: generación y escaneo de QR con cámara

**Verificación**: dos cuentas distintas; la copia recibida es independiente y editar el original no
la altera.

---

### Fase 7 — Semestres (P2)

**Objetivo**: FR-034 a FR-038. Ciclo de vida y archivo histórico.

- **Backend**: `semesters`; asociación de materias, agenda y faltas al semestre; cierre que archiva
  y crea el nuevo; consulta de archivados en modo lectura
- **Web y App**: iniciar semestre con explicación previa del efecto; consulta de semestres pasados

**Verificación**: tras cerrar un semestre, el nuevo arranca vacío y el anterior conserva todo.

---

### Fase 8 — Social: perfiles y contactos (P3)

**Objetivo**: FR-039 a FR-042, FR-045. Base de la sección social.

- **Backend**: perfil público, búsqueda por nombre de usuario, solicitudes, aceptación, bloqueo
- **Web y App**: buscador, perfil propio y ajeno, QR y enlace de perfil, gestión de contactos

**Verificación**: dos cuentas se encuentran por nombre de usuario y por QR, y completan la
conexión.

---

### Fase 9 — Offline y sincronización (P2)

**Objetivo**: FR-048 a FR-050. Consulta y escritura sin conexión.

- **App**: cache local de horario, agenda y faltas; cola de cambios pendientes; sincronización al
  recuperar red; indicador de pendientes
- **Web**: cache de consulta en la medida que la plataforma lo permita
- **Backend**: endpoints idempotentes y resolución de conflictos por marca de tiempo

**Verificación**: en modo avión se consulta todo lo cargado y los cambios se suben al reconectar.

---

### Fase 10 — Mensajería (P3)

**Objetivo**: FR-043, FR-044. Conversaciones entre contactos.

- **Backend**: `messages`; entrega en tiempo real; restricción a contactos aceptados y no
  bloqueados
- **Web y App**: lista de conversaciones e hilo de mensajes

**Nota de alcance**: es la fase más costosa y la que más superficie de privacidad abre; se aborda
al final deliberadamente, sobre una base ya estable.

**Verificación**: mensajes entre contactos se entregan y persisten; entre no contactos se
rechazan.

---

### Fase 11 — Widget y pulido (P4)

**Objetivo**: FR-051 y refinamiento visual general.

- **App**: widget de pantalla principal con la vista semanal
- **Web y App**: pasada de diseño integral con hallmark sobre el producto ya funcional
- Preparación para distribución `.apk` y evaluación de publicación en tienda

**Verificación**: el widget refleja datos reales y abre la vista correspondiente.

---

## Project Structure

```
backend/
├── src/
│   ├── db/           migraciones, pool de conexión
│   ├── routes/       endpoints por dominio
│   ├── middleware/   autenticación, validación
│   └── services/     lógica de negocio
frontend/             aplicación web (Astro)
├── src/
│   ├── pages/
│   ├── components/
│   └── lib/          lógica en .js separados (Principio VIII)
app/                  aplicación Android (Expo)
├── src/
│   ├── screens/
│   ├── components/
│   └── lib/
docs/
└── PROYECTO.md       estado y avance por fases
specs/
└── 001-plataforma-academica/
```

## Complexity Tracking

| Área | Riesgo | Mitigación |
|------|--------|-----------|
| Paridad de dos clientes | Divergencia funcional entre app y web | Puerta de cierre por fase que exige verificar ambos |
| Sincronización offline | Conflictos de escritura diferida | Fase dedicada, endpoints idempotentes, resolución por marca de tiempo |
| Mensajería en tiempo real | Alta complejidad y superficie de privacidad | Última fase, sobre base estable; alcance limitado a texto entre contactos |
| Migración desde v1 | Pérdida de datos reales en uso | v1 respaldada e intacta en producción hasta demostrar paridad |
| Modelo de semestres | Afecta a materias, agenda y faltas | Se introduce en fase 7 con migración que asigna lo existente a un semestre activo |

## Notas de decisión

- **Compartir como copia y no sincronización** (Principio IV): decisión explícita del usuario.
  Elimina resolución de conflictos, permisos compartidos y edición concurrente.
- **iOS fuera de alcance**: los usuarios de iPhone usan la web. Reevaluable si el producto tiene
  buena recepción.
- **Widget clasificado P4**: el usuario lo marcó como opcional, por lo que no condiciona la
  arquitectura; React Native lo permite cuando llegue su fase.
- **Sin integración de IA en el producto**: la conversión de imagen a datos la hace el estudiante
  en una herramienta externa; la app aporta el prompt y consume el resultado.
