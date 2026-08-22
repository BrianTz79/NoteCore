'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CACHE_KEYS,
  describeUpcoming,
  nextClass,
  remainingToday,
  semillaDeLaVisita,
  tipsDeLaVisita,
  toScheduleEntries,
  unreadSummary,
  type AgendaList,
  type AttendanceSummary,
  type Subject,
  type TipContext,
  type TipDestino,
  type UnreadSummary,
  type UpcomingClass,
} from '@notecore/shared';
import { agendaApi, attendanceApi, messagingApi, scheduleApi, tipsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { loadWithCache, useSyncActions } from '@/lib/sync-context';
import { RequireSession } from '@/components/require-session';
import { SECCIONES } from '@/lib/navigation';
import { Button, Card, EmptyState, NavLink, Rule, Tag } from '@/components/ui';
import { SyncIndicator } from '@/components/sync-indicator';

/**
 * Inicio, ya con sesión (Fase 11 · macroestructura Stat-Led de `design.md`).
 *
 * **Qué cambió y por qué.** Hasta la Fase 10 esta pantalla eran diez tarjetas visualmente
 * idénticas, cada una con título, párrafo explicativo y un enlace `→`. Eso es un menú
 * disfrazado de contenido: obliga a leer diez párrafos para encontrar dónde tocar, y el
 * párrafo solo sirve la primera vez que alguien abre la aplicación.
 *
 * Ahora la pantalla responde antes de que se le pregunte: arriba, **qué clase toca**;
 * después, solo lo que exige atención —faltas cerca del límite, entregas vencidas,
 * mensajes sin leer—; y al final la navegación, compacta, sin explicar lo que ya se
 * entiende por su nombre.
 */
export default function HomePage() {
  return (
    <RequireSession>
      <Inicio />
    </RequireSession>
  );
}

/** Lo que el inicio necesita de la API, en un solo objeto para pedirlo de una vez. */
interface Resumen {
  readonly proxima: UpcomingClass | null;
  readonly quedanHoy: number;
  readonly faltas: AttendanceSummary | null;
  readonly agenda: AgendaList | null;
  readonly sinLeer: UnreadSummary | null;
}

function Inicio() {
  const { user, logout } = useAuth();
  const sync = useSyncActions();
  const [resumen, setResumen] = useState<Resumen | null>(null);
  /** Contexto y descartes de los consejos del inicio (Fase 29). */
  const [contextoTips, setContextoTips] = useState<TipContext | null>(null);
  const [descartados, setDescartados] = useState<readonly string[]>([]);
  /**
   * Semilla de la rotación, fijada **una vez** al montar la pantalla.
   *
   * Sin ella —barajando con el reloj en cada render— los consejos cambiarían solos mientras se
   * están leyendo, porque React repinta al llegar cada respuesta de la API. Fijarla los deja
   * quietos dentro de la visita y los rota entre una y otra.
   */
  const [semillaTips] = useState(() => semillaDeLaVisita());

  /**
   * Los consejos ya cerrados, en el almacenamiento del navegador.
   *
   * Local y no en el servidor por lo mismo que en la app: haber cerrado un consejo es una
   * preferencia de **este** navegador, no un dato de la cuenta. No merece una tabla ni un
   * viaje de red, y perderlo no tiene consecuencia —lo peor es volver a ver un consejo—.
   *
   * En un efecto y no en el `useState` inicial porque `localStorage` no existe durante el
   * renderizado del servidor de Next, y leerlo allí rompería la hidratación.
   */
  useEffect(() => {
    if (!user) return;
    setDescartados(leerTipsDescartados(user.id));
  }, [user]);

  /** Cierra un consejo: no vuelve a salir en este navegador. */
  function descartarTip(id: string) {
    if (!user) return;
    const siguiente = [...descartados, id];
    setDescartados(siguiente);
    guardarTipsDescartados(user.id, siguiente);
  }

  /**
   * Todo lo del inicio, en paralelo.
   *
   * `Promise.allSettled` y no `all`: si los mensajes fallan, el horario debe salir igual.
   * Esta es la pantalla que más se abre y la que peor tolera quedarse en blanco por una
   * ruta que no respondió.
   *
   * El horario pasa por el cache de la Fase 9 —es lo que hace que el inicio siga diciendo
   * qué clase toca sin conexión—; el resto no, porque un conteo de faltas viejo induce a
   * error de una forma que un horario viejo no.
   */
  useEffect(() => {
    let vigente = true;

    async function cargar() {
      const [horario, faltas, agenda, mensajes, contexto] = await Promise.allSettled([
        loadWithCache(sync, CACHE_KEYS.schedule, () => scheduleApi.subjects()),
        attendanceApi.summary(),
        agendaApi.list(),
        messagingApi.unread(),
        // Contexto de los consejos (Fase 29). Si falla, los consejos no salen y el resto de
        // la pantalla se pinta igual: es lo primero que sobra cuando algo va mal.
        tipsApi.context(),
      ]);

      if (!vigente) return;

      const subjects: readonly Subject[] =
        horario.status === 'fulfilled' ? horario.value.data : [];
      const entries = toScheduleEntries(subjects);

      setResumen({
        // La regla de qué clase toca vive en `shared` y la comparten la app y el widget de
        // Android: los tres dicen lo mismo a la misma hora porque llaman a lo mismo.
        proxima: nextClass(entries),
        quedanHoy: remainingToday(entries).length,
        faltas: faltas.status === 'fulfilled' ? faltas.value : null,
        agenda: agenda.status === 'fulfilled' ? agenda.value : null,
        sinLeer: mensajes.status === 'fulfilled' ? mensajes.value : null,
      });

      setContextoTips(contexto.status === 'fulfilled' ? contexto.value : null);
    }

    void cargar();
    return () => {
      vigente = false;
    };
  }, [sync]);

  if (!user) return null;

  return (
    <main className="mx-auto w-full max-w-3xl px-nc-md pb-nc-3xl lg:max-w-4xl lg:px-nc-xl lg:pt-nc-xl">
      {/*
       * En escritorio la barra lateral ya identifica a quien tiene la sesión y ya lleva el
       * botón de salir (`AppShell`); repetirlos aquí sería la misma información dos veces en
       * la misma pantalla. `lg:hidden` deja esta cabecera solo para el móvil, que no tiene
       * barra.
       */}
      <header className="flex flex-wrap items-center justify-between gap-nc-sm py-nc-lg lg:hidden">
        <div className="min-w-0">
          <h1 className="text-2xl font-medium">{user.displayName}</h1>
          <p className="font-mono text-sm text-tinta3">@{user.username}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void logout()}>
          Cerrar sesión
        </Button>
      </header>

      <div className="space-y-nc-lg">
        <SyncIndicator />
        <ProximaClase resumen={resumen} />
        <Avisos resumen={resumen} />

        {/*
          Consejo del inicio (Fase 29). Debajo de la próxima clase y los avisos, nunca encima:
          quien abre NoteCore viene a ver su horario, no a que le enseñen la aplicación.
        */}
        <ConsejosDelInicio
          contexto={contextoTips}
          descartados={descartados}
          semilla={semillaTips}
          onDescartar={descartarTip}
        />

        <Navegacion />
      </div>
    </main>
  );
}

/* ==========================================================================
 * El dato principal
 * ======================================================================== */

/**
 * Qué clase toca.
 *
 * Es el motivo por el que alguien abre esta aplicación entre dos clases, así que ocupa el
 * sitio que le corresponde: arriba y grande, no en la séptima tarjeta de una lista.
 */
function ProximaClase({ resumen }: { resumen: Resumen | null }) {
  if (resumen === null) {
    // Reserva del alto real del bloque para que la pantalla no salte al llegar los datos.
    return <div className="h-32 animate-pulse rounded-lg border border-filete bg-papel2" />;
  }

  const { proxima, quedanHoy } = resumen;

  if (proxima === null) {
    return (
      <EmptyState
        message="Todavía no has capturado tu horario."
        action={
          <Button
            // Un enlace con voz de botón: la acción principal de una pantalla vacía.
            onClick={() => {
              window.location.href = '/horario';
            }}
          >
            Capturar mi horario
          </Button>
        }
      />
    );
  }

  const { entry } = proxima;
  const enCurso = proxima.timing === 'en_curso';

  return (
    <section
      className="rounded-lg border border-filete bg-papel2 p-nc-lg"
      // El color de la materia entra como borde izquierdo: identifica la clase sin teñir
      // una superficie entera, que a este tamaño sería un bloque de color con texto encima.
      style={{ borderLeft: `3px solid ${entry.color}` }}
    >
      <div className="flex items-center justify-between gap-nc-sm">
        <p className="text-xs font-medium tracking-wide text-tinta3 uppercase">
          {enCurso ? 'Clase en curso' : 'Próxima clase'}
        </p>
        <p className="font-mono text-sm text-acento">{describeUpcoming(proxima)}</p>
      </div>

      <h2 className="mt-nc-xs text-3xl font-medium">{entry.subjectName}</h2>

      <div className="mt-nc-xs flex flex-wrap items-center gap-x-nc-md gap-y-nc-2xs">
        <p className="font-mono text-lg tabular-nums text-tinta2">
          {entry.startTime}–{entry.endTime}
        </p>
        {entry.room ? <p className="text-md text-tinta3">Aula {entry.room}</p> : null}
      </div>

      {quedanHoy > 0 ? (
        <p className="mt-nc-sm text-sm text-tinta3">
          {quedanHoy === 1 ? 'Queda 1 clase hoy' : `Quedan ${quedanHoy} clases hoy`}
        </p>
      ) : null}

      <div className="mt-nc-md">
        <NavLink href="/horario">Ver la semana completa →</NavLink>
      </div>
    </section>
  );
}

/* ==========================================================================
 * Lo que exige atención
 * ======================================================================== */

/**
 * Solo lo que hay que atender.
 *
 * **Nada se muestra "por completitud".** Si no hay faltas cerca del límite, no hay línea de
 * faltas: un aviso que aparece siempre deja de leerse, y entonces tampoco se lee el día que
 * de verdad importa.
 */
function Avisos({ resumen }: { resumen: Resumen | null }) {
  if (resumen === null) return null;

  const { faltas, agenda, sinLeer } = resumen;

  // Materias en riesgo o pasadas del límite sugerido (FR-016).
  const enRiesgo = (faltas?.subjects ?? []).filter(
    (materia) => materia.status === 'cerca' || materia.status === 'alcanzado',
  );

  const vencidas = agenda?.overdueCount ?? 0;
  const hoy = agenda?.dueTodayCount ?? 0;
  const mensajes = unreadSummary(sinLeer?.total ?? 0, sinLeer?.conversations ?? 0);

  if (enRiesgo.length === 0 && vencidas === 0 && hoy === 0 && !mensajes) return null;

  return (
    <section className="space-y-nc-2xs">
      <h2 className="text-xs font-medium tracking-wide text-tinta3 uppercase">
        Requiere tu atención
      </h2>

      <ul className="divide-y divide-filete overflow-hidden rounded-lg border border-filete bg-papel2">
        {enRiesgo.map((materia) => (
          <li key={materia.subjectId}>
            <Link
              href="/faltas"
              className="flex items-center justify-between gap-nc-sm px-nc-md py-nc-sm transition-colors duration-100 hover:bg-papel3"
            >
              <span className="flex min-w-0 items-center gap-nc-xs">
                <Tag color={materia.color}>{materia.subjectName}</Tag>
              </span>
              <span
                className={`shrink-0 font-mono text-sm tabular-nums ${
                  materia.status === 'alcanzado' ? 'text-error' : 'text-aviso'
                }`}
              >
                {materia.absences}/{materia.limit} faltas
              </span>
            </Link>
          </li>
        ))}

        {vencidas > 0 ? (
          <li>
            <Link
              href="/agenda"
              className="flex items-center justify-between gap-nc-sm px-nc-md py-nc-sm transition-colors duration-100 hover:bg-papel3"
            >
              <span className="text-md text-tinta">
                {vencidas === 1 ? '1 entrega vencida' : `${vencidas} entregas vencidas`}
              </span>
              <span className="shrink-0 text-sm text-error">Ver agenda →</span>
            </Link>
          </li>
        ) : null}

        {hoy > 0 ? (
          <li>
            <Link
              href="/agenda"
              className="flex items-center justify-between gap-nc-sm px-nc-md py-nc-sm transition-colors duration-100 hover:bg-papel3"
            >
              <span className="text-md text-tinta">
                {hoy === 1 ? '1 entrega vence hoy' : `${hoy} entregas vencen hoy`}
              </span>
              <span className="shrink-0 text-sm text-aviso">Ver agenda →</span>
            </Link>
          </li>
        ) : null}

        {mensajes ? (
          <li>
            <Link
              href="/mensajes"
              data-testid="aviso-mensajes"
              className="flex items-center justify-between gap-nc-sm px-nc-md py-nc-sm transition-colors duration-100 hover:bg-papel3"
            >
              <span className="text-md text-tinta">Tienes {mensajes}</span>
              <span className="shrink-0 text-sm text-acento">Leer →</span>
            </Link>
          </li>
        ) : null}
      </ul>
    </section>
  );
}

/* ==========================================================================
 * Navegación
 * ======================================================================== */

/**
 * Las secciones, en rejilla compacta.
 *
 * Sin párrafo explicativo debajo de cada una: «Faltas» y «Agenda» se entienden por su
 * nombre, y quien ya usó la aplicación una vez no vuelve a leer la explicación. La
 * descripción de una línea se queda solo donde el nombre no basta.
 *
 * **Fase 14**: `lg:hidden`. En escritorio la barra lateral de `AppShell` ya lista las mismas
 * nueve secciones de forma permanente; repetirlas aquí sería la misma navegación dos veces
 * en la misma pantalla. En móvil, que no tiene barra, esta rejilla sigue siendo la única
 * forma de moverse — la lista viene de `@/lib/navigation`, compartida con la barra, para que
 * las dos no puedan divergir.
 */
/* ==========================================================================
 * Consejos del inicio (Fase 29)
 * ======================================================================== */

/** Dónde recuerda este navegador qué consejos cerró el usuario. */
function claveDescartados(userId: string): string {
  return `notecore:${userId}:tips-descartados`;
}

function leerTipsDescartados(userId: string): readonly string[] {
  try {
    const crudo = window.localStorage.getItem(claveDescartados(userId));
    if (!crudo) return [];
    const leido: unknown = JSON.parse(crudo);
    // Se comprueba la forma en lugar de confiar: un valor corrupto —o escrito a mano desde
    // la consola— no puede tumbar la pantalla que más se abre.
    return Array.isArray(leido) ? leido.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    // `localStorage` lanza en modo privado de algunos navegadores. Sin descartes guardados
    // los consejos vuelven a salir, que es molesto y no es grave.
    return [];
  }
}

function guardarTipsDescartados(userId: string, ids: readonly string[]): void {
  try {
    window.localStorage.setItem(claveDescartados(userId), JSON.stringify(ids));
  } catch {
    // Igual que arriba: no merece interrumpir al usuario con un error.
  }
}

/**
 * A qué ruta lleva cada destino de consejo.
 *
 * El consejo viaja con el destino como nombre de sección porque vive en `shared`, que no sabe
 * de rutas de Next ni de la navegación de la app. Cada cliente lo traduce a lo suyo: aquí a
 * una URL, en la app a un cambio de sección.
 */
const RUTA_DE_DESTINO: Readonly<Record<TipDestino, string>> = {
  horario: '/horario',
  faltas: '/faltas',
  agenda: '/agenda',
  calendario: '/calendario',
  compartir: '/compartir',
  semestres: '/semestres',
  social: '/social',
  mensajes: '/mensajes',
  /**
   * La web no tiene pantalla de «Ajustes» como la app: sus dos contenidos —la política y el
   * borrado de cuenta— son páginas propias. Los consejos que apuntan aquí hablan de privacidad
   * y de borrar la cuenta, y la política enlaza a la segunda, así que lleva a la política.
   */
  ajustes: '/privacidad',
};

/**
 * Los consejos de esta visita.
 *
 * **Tres a la vez y rotando**, como los de la pantalla de carga de un juego: se repiten aunque
 * ya conozcas la función, porque algo que usaste una vez en septiembre se olvida en noviembre.
 * Cuáles tocan lo decide `tipsDeLaVisita` en `shared`, con las mismas reglas que evalúa la app y
 * sobre el mismo contexto, para que las dos digan lo mismo de la misma cuenta.
 */
function ConsejosDelInicio({
  contexto,
  descartados,
  semilla,
  onDescartar,
}: {
  contexto: TipContext | null;
  descartados: readonly string[];
  semilla: number;
  onDescartar: (id: string) => void;
}) {
  // Sin contexto no se adivina: mejor ningún consejo que uno que no venga a cuento.
  if (!contexto) return null;

  const tips = tipsDeLaVisita(contexto, descartados, semilla);
  if (tips.length === 0) return null;

  return (
    <Card title="¿Sabías que…?">
      {/* La cabecera va una vez y no por consejo: son tres tarjetas dentro de una sección, no
          tres secciones compitiendo con el horario por la atención. */}
      <div className="divide-y divide-filete">
        {tips.map((tip, indice) => (
          <div key={tip.id} className={indice > 0 ? 'space-y-nc-xs pt-nc-md' : 'space-y-nc-xs'}>
            <p className="font-medium text-tinta">{tip.titulo}</p>
            <p className="text-tinta2">{tip.cuerpo}</p>

            <div className="flex flex-wrap items-center gap-nc-xs pb-nc-md">
              {tip.destino && tip.accion ? (
                <Link
                  href={RUTA_DE_DESTINO[tip.destino]}
                  className="rounded-lg border border-filete2 bg-acento/10 px-nc-sm py-nc-xs text-sm text-foco transition hover:border-acento"
                >
                  {tip.accion}
                </Link>
              ) : null}

              {/* Cerrar siempre está: un consejo del que no se puede uno librar es un anuncio.
                  Cerrar **este** no calla los demás. */}
              <Button variant="secondary" size="sm" onClick={() => onDescartar(tip.id)}>
                Ya lo sé
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Navegacion() {
  return (
    <nav aria-label="Secciones" className="space-y-nc-2xs lg:hidden">
      <h2 className="text-xs font-medium tracking-wide text-tinta3 uppercase">Ir a</h2>
      <Rule />
      {/*
       * `minmax(0, 1fr)` y no `1fr`: con `1fr` una nota larga ensancharía su columna por
       * encima del ancho disponible y la rejilla desbordaría a lo ancho en un móvil.
       */}
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-nc-xs pt-nc-xs">
        {SECCIONES.map((seccion) => (
          <li key={seccion.href}>
            <Link
              href={seccion.href}
              className="block rounded-md border border-filete bg-papel2 px-nc-sm py-nc-xs transition-colors duration-100 hover:border-filete2 hover:bg-papel3"
            >
              <span className="block text-md font-medium text-tinta">{seccion.nombre}</span>
              <span className="block text-xs text-tinta3">{seccion.nota}</span>
            </Link>
          </li>
        ))}
      </ul>

      {/*
        La app Android (Fase 17). Fuera de la rejilla y en texto menor: no es una sección del
        producto sino una descarga, y en escritorio vive en la barra lateral. Aquí hace más
        falta que allí — quien lee esto en el móvil es justo quien puede instalarla.
      */}
      <Link
        href="/app"
        className="inline-block pt-nc-xs text-sm text-tinta3 transition-colors duration-100 hover:text-tinta"
      >
        Descargar la app para Android →
      </Link>
    </nav>
  );
}
