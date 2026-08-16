# NoteCore

**El núcleo de tu vida académica.** Horario visual, control de faltas, agenda de tareas y
compartición entre compañeros, en un solo lugar.

Disponible como **app Android** (principal) y **aplicación web** en [notecore.ourocore.net](https://notecore.ourocore.net).

> Parte del ecosistema **[OuroCore](https://www.ourocore.net/)**.

## El problema

Los estudiantes pierden materias por acumular faltas sin darse cuenta, y organizan sus tareas en
notas dispersas que no están vinculadas a su horario real de clases. NoteCore reúne ambas
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
| Lenguaje | TypeScript 5.9 (estricto) |
| App Android | React Native 0.86 + Expo SDK 57 |
| Web | Next.js 16 + Tailwind CSS 4 |
| Backend | Node.js 24 + Fastify 5, API REST |
| Base de datos | PostgreSQL 18 + Drizzle ORM |
| Infraestructura | Docker Compose, túnel Cloudflare |

Web y app comparten componentes, tipos y lógica de dominio a través de `packages/shared`.

## Puesta en marcha

Requiere **Node 22 o superior** (el proyecto usa 24 LTS, fijado en `.nvmrc`) y Docker.

```bash
# 1. Configurar variables de entorno
cp .env.example .env
#    Editar .env: contraseña de PostgreSQL y JWT_SECRET (openssl rand -hex 32)

# 2. Instalar dependencias y compilar el paquete compartido
npm install
npm run build:shared

# 3. Levantar la base de datos y aplicar migraciones
npm run docker:up
npm run db:migrate

# 4. Arrancar en desarrollo
npm run dev:api      # API   → http://localhost:3101/health
npm run dev:web      # Web   → http://localhost:3000
npm run dev:mobile   # App   → Expo
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

Desarrollado por **Brian Tellez** — *mizllet* — [@BrianTz79](https://github.com/BrianTz79).
Más proyectos y trabajo en [briantellez.ourocore.net](https://briantellez.ourocore.net/).

Este proyecto se desarrolla con asistencia de [Claude Code](https://claude.com/claude-code). Las
decisiones de producto, alcance y arquitectura son propias; la asistencia de IA queda reflejada en
los commits mediante el trailer `Co-Authored-By`.

## Licencia

MIT
