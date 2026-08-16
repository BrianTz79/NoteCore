# PaginaHorarios

Plataforma de organización académica para estudiantes universitarios: horario visual, control de
faltas, agenda de tareas y compartición entre compañeros.

Disponible como **app Android** (principal) y **aplicación web** para PC y móvil.

## El problema

Los estudiantes pierden materias por acumular faltas sin darse cuenta, y organizan sus tareas en
notas dispersas que no están vinculadas a su horario real de clases. PaginaHorarios reúne ambas
cosas en un solo lugar, con el horario como eje.

## Funcionalidades

- **Horario visual** — captura manual o importación asistida por IA: el estudiante fotografía su
  horario, lo procesa con una IA usando el prompt que la app le da, y pega el resultado.
- **Control de faltas** — registro por día o por materia, con límite sugerido derivado de la norma
  de 80% de asistencia mínima (TecNM) y siempre editable.
- **Agenda** — tareas, proyectos y actividades con fecha límite opcional, vinculadas o no a una
  materia.
- **Calendario** — clases y vencimientos en una sola vista.
- **Recordatorios** — notificaciones antes del vencimiento de una actividad.
- **Compartir** — horarios y actividades por QR, código o enlace; el receptor obtiene una copia
  independiente y editable.
- **Semestres** — archivado histórico consultable de semestres anteriores.
- **Social** — perfiles con nombre de usuario, contactos y mensajería.
- **Offline** — consulta sin conexión de la información ya cargada.

## Stack

| Capa | Tecnología |
|------|-----------|
| App Android | React Native (Expo) |
| Web | Astro + Tailwind CSS |
| Backend | Node.js + Express (ESM), API REST |
| Base de datos | PostgreSQL |
| Infraestructura | Docker Compose, túnel Cloudflare |

## Puesta en marcha

```bash
# 1. Configurar variables de entorno
cp .env.example .env
#    Editar .env con los valores reales

# 2. Levantar los servicios
docker compose up -d

# 3. La web queda disponible en http://localhost:8083
```

## Estructura del proyecto

```
PROYECTO.md        estado del proyecto y avance por fases
apps/
├── api/           backend REST y acceso a base de datos
├── web/           aplicación web
└── mobile/        aplicación Android (React Native)
packages/shared/   tipos y validaciones comunes
infra/             Docker Compose y despliegue
specs/             especificaciones y planes de implementación
```

## Documentación

El estado del proyecto, las fases completadas y las pendientes se mantienen en
[`PROYECTO.md`](PROYECTO.md).

Los principios que rigen el desarrollo están en
[`.specify/memory/constitution.md`](.specify/memory/constitution.md).

## Desarrollo

El proyecto avanza en **fases verticales**: cada fase entrega una funcionalidad completa en
backend, app y web. Una fase no se cierra hasta verificarse en ambas plataformas.

## Créditos

Desarrollado por [@mizllet](https://github.com/mizllet).

Este proyecto se desarrolla con asistencia de [Claude Code](https://claude.com/claude-code). Las
decisiones de producto, alcance y arquitectura son propias; la asistencia de IA queda reflejada en
los commits mediante el trailer `Co-Authored-By`.

## Licencia

MIT
