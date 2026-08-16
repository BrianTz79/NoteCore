# PaginaHorarios

Plataforma de organización académica para estudiantes universitarios: horario, control de faltas y
agenda de tareas. **Dos clientes**: app Android (React Native/Expo, principal) y web (Astro).

## Antes de trabajar, lee siempre

1. **[PROYECTO.md](PROYECTO.md)** — estado actual, fases hechas y pendientes. **Empieza por aquí.**
2. [.specify/memory/constitution.md](.specify/memory/constitution.md) — los principios del proyecto
3. [specs/001-plataforma-academica/spec.md](specs/001-plataforma-academica/spec.md) — requisitos
4. [specs/001-plataforma-academica/plan.md](specs/001-plataforma-academica/plan.md) — plan de fases

El proyecto avanza **una fase por conversación**. El usuario suele arrancar con "continúa con la
Fase N".

## Reglas del proyecto

### Paridad de plataformas (no negociable)
Una fase **no se cierra** hasta que su funcionalidad está verificada en app Android **y** en web.
Toda fase toca las tres capas: `apps/api`, `apps/web`, `apps/mobile`.

### Backend como fuente de verdad
La lógica de negocio vive en `apps/api`. Los clientes solo presentan e interactúan. Nunca dupliques
reglas (límites de faltas, validaciones, resolución de compartición) en web o mobile.

### Aislamiento de datos
Todo registro pertenece a un usuario. Toda consulta filtra por el usuario autenticado, verificado
en el servidor. Nunca confíes en un identificador de usuario que venga del cliente.

### Compartir es copia, no sincronización
Al aceptar un compartido, el receptor obtiene una copia independiente. No hay vínculo posterior
entre origen y destino.

### Restricción técnica heredada (importante)
En `apps/web`, la lógica JS compleja va en archivos `.js` separados, **nunca inline** en `<script>`
dentro de `.astro`, cuando haya caracteres multi-byte (emojis, acentos) o llaves `{}` en el HTML.
Bug reproducido de esbuild/Astro que rompe la compilación de forma no evidente.

### Datos históricos
Los semestres se archivan, nunca se borran. Ninguna operación de rutina destruye historial.

### El límite de faltas es orientativo
Se calcula como 20% de las sesiones del semestre (norma TecNM: 80% de asistencia mínima, por debajo
el profesor registra NP). **Siempre** se presenta como sugerencia editable, con la recomendación
visible de confirmarlo con el profesor.

## Estructura

```
apps/api/       backend Node.js + Express (ESM) + PostgreSQL
apps/web/       Astro + Tailwind
apps/mobile/    React Native + Expo
packages/shared tipos y validaciones comunes
infra/          Docker Compose
specs/          especificación y plan
```

## Al cerrar una fase

1. Verificar la funcionalidad **en app y en web**
2. Actualizar [PROYECTO.md](PROYECTO.md): marcar ✅, registrar fecha y verificación, actualizar el
   reporte resumen
3. Commit: `feat(faseN): descripción` con trailer `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

El usuario es el autor de los commits; la asistencia de IA se declara en el trailer.

## Nunca

- Subir `.env` o `_respaldo_v1_*/` al repositorio (contienen secretos reales)
- Cerrar una fase verificada en un solo cliente
- Poner lógica de negocio en los clientes
- Borrar datos históricos sin confirmación explícita del usuario
