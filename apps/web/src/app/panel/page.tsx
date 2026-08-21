'use client';

import { useCallback, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import {
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_TARGET_LABELS,
  formatDateTime,
  toFormErrors,
  type ReportList,
  type PanelResumen,
  type PanelVersion,
} from '@notecore/shared';
import { moderationApi, panelApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { RequireSession } from '@/components/require-session';
import { Button, Card, FormError, Rule, ScreenHeader, Stat, Tag } from '@/components/ui';

/**
 * El panel de números del operador (Fase 25).
 *
 * ## La excepción al Principio I, y por qué está prevista
 *
 * Esta pantalla **no tiene equivalente en la app**, y no debe tenerlo. La paridad de
 * plataformas existe para que ningún estudiante quede sin acceso a una función del producto,
 * y esto no es una función del producto: es una herramienta de operación para quien mantiene
 * NoteCore, que se consulta en una pantalla grande donde caben tablas de doce columnas. Es la
 * misma excepción que ya se aplicó en la Fase 14, y está anotada en el plan.
 *
 * ## Lo que esta pantalla NO protege
 *
 * Nada. La comprobación de `isAdmin` que hay aquí abajo es **comodidad de interfaz**: evita
 * pintar un esqueleto de tablas vacías a quien no va a poder llenarlas. Quien quite esa
 * condición en las herramientas del navegador verá la pantalla y ni un solo número, porque la
 * ruta `/panel/resumen` de la API responde 404 a cualquiera que no sea administrador
 * (`requireAdmin`). Un panel que se esconde ocultando un enlace no está protegido; este lo
 * está en el servidor, y esto de aquí solo es cortesía.
 */
export default function PanelPage() {
  return (
    <RequireSession>
      <Panel />
    </RequireSession>
  );
}

function Panel() {
  const { user } = useAuth();
  const [datos, setDatos] = useState<PanelResumen | null>(null);
  const [error, setError] = useState<string>();

  /**
   * A quien no sea administrador se le da el 404 de Next, no una pantalla de «no tienes
   * permiso»: lo segundo confirma que el panel existe, que es justo lo que la API evita
   * respondiendo 404 en lugar de 403. Las dos capas cuentan la misma historia.
   */
  useEffect(() => {
    if (user && !user.isAdmin) notFound();
  }, [user]);

  useEffect(() => {
    if (!user?.isAdmin) return;

    let vigente = true;
    panelApi
      .resumen()
      .then((respuesta) => {
        if (vigente) setDatos(respuesta);
      })
      .catch((fallo: unknown) => {
        if (vigente) setError(toFormErrors(fallo).general);
      });

    return () => {
      vigente = false;
    };
  }, [user]);

  if (!user?.isAdmin) return null;

  return (
    <main className="mx-auto w-full max-w-5xl px-nc-md pb-nc-3xl lg:px-nc-xl">
      <ScreenHeader
        title="Panel"
        subtitle={
          datos
            ? `Calculado el ${formatDateTime(datos.salud.calculadoEn)}`
            : 'Números de operación de NoteCore'
        }
        back={{ href: '/', label: 'Inicio' }}
      />

      <div className="mt-nc-lg space-y-nc-lg">
        <FormError message={error} />

        {datos === null && error === undefined ? (
          <p className="text-tinta3">Calculando…</p>
        ) : null}

        {datos ? (
          <>
            {/*
              Los reportes van **primero**, por delante incluso del embudo (Fase 21).
              Todo lo demás en esta pantalla son números que se miran; esto es lo único que
              pide que una persona haga algo, y una cola de moderación al final de una página
              larga es una cola que no se lee.
            */}
            <Reportes pendientes={datos.reportesPendientes} />
            <Embudo datos={datos} />
            <Actividad datos={datos} />
            <Inventario datos={datos} />
            <Retencion datos={datos} />
            <Versiones versiones={datos.versiones} />
            <Altas datos={datos} />
            <Salud datos={datos} />
          </>
        ) : null}
      </div>
    </main>
  );
}

/* ==========================================================================
 * Las secciones, en el orden en que se leen
 * ======================================================================== */

/**
 * Los reportes de contenido recibidos (Fase 21).
 *
 * ## Por qué esto no es un backoffice de moderación
 *
 * Porque no hace falta uno para publicar, y montarlo aquí sería inventar alcance. Google pide
 * que exista un mecanismo de denuncia y que lo reportado **llegue a alguien**; esta sección es
 * ese alguien. Lo que hace es lo mínimo que sirve de verdad: enseñar quién reportó qué y por
 * qué, y permitir distinguir lo que ya se miró de lo que no.
 *
 * **Lo que deliberadamente no hace**: sancionar, borrar contenido ajeno ni suspender cuentas
 * desde aquí. Esas acciones existen ya por otras vías y con otras consecuencias, y un botón
 * que las dispare en un clic desde una lista es exactamente cómo se borra lo que no se debía.
 *
 * ## La lista se carga aparte del resumen
 *
 * El resumen del panel trae solo el **número** de pendientes. Los reportes llevan texto
 * escrito por personas —lo único de todo el panel que no es un conteo—, y traerlos en la misma
 * respuesta que las estadísticas los cargaría en cada visita al panel aunque no hubiera
 * ninguno que mirar.
 */
function Reportes({ pendientes }: { pendientes: number }) {
  const [lista, setLista] = useState<ReportList | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string>();
  const [ocupado, setOcupado] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setLista(await moderationApi.list());
    } catch (fallo: unknown) {
      setError(toFormErrors(fallo).general);
    }
  }, []);

  useEffect(() => {
    if (abierto) void cargar();
  }, [abierto, cargar]);

  async function revisar(id: string, status: 'revisado' | 'descartado') {
    setOcupado(id);
    setError(undefined);
    try {
      await moderationApi.review(id, { status });
      await cargar();
    } catch (fallo: unknown) {
      setError(toFormErrors(fallo).general);
    } finally {
      setOcupado(null);
    }
  }

  return (
    <Card
      title="Reportes"
      action={
        <button
          type="button"
          onClick={() => setAbierto((previo) => !previo)}
          data-testid="alternar-reportes"
          className="text-sm text-acento hover:text-foco"
        >
          {abierto ? 'Ocultar' : 'Ver reportes'}
        </button>
      }
    >
      <Stat
        label="Sin revisar"
        value={pendientes}
        /*
          Cero pendientes es neutro, no un éxito: no hay nada que celebrar en que nadie haya
          reportado nada, y pintarlo de verde enseñaría a leer el color como un marcador.
        */
        tone={pendientes > 0 ? 'aviso' : 'neutro'}
        hint={pendientes > 0 ? 'Hay avisos esperando revisión.' : 'Nada pendiente.'}
      />

      <FormError message={error} />

      {abierto ? (
        lista === null ? (
          <p className="text-tinta3">Cargando…</p>
        ) : lista.reports.length === 0 ? (
          <p data-testid="sin-reportes" className="text-tinta2">
            No hay reportes.
          </p>
        ) : (
          <ul className="space-y-nc-sm" data-testid="lista-reportes">
            {lista.reports.map((reporte) => (
              <li
                key={reporte.id}
                data-testid={`reporte-${reporte.id}`}
                className="space-y-nc-xs rounded-lg border border-filete bg-papel3 p-nc-sm"
              >
                <div className="flex flex-wrap items-center gap-nc-xs">
                  <Tag tone={reporte.status === 'pendiente' ? 'aviso' : 'neutro'}>
                    {REPORT_STATUS_LABELS[reporte.status]}
                  </Tag>
                  <Tag tone="error">{REPORT_REASON_LABELS[reporte.reason]}</Tag>
                  <span className="text-sm text-tinta3">
                    {REPORT_TARGET_LABELS[reporte.target]} ·{' '}
                    {formatDateTime(reporte.createdAt)}
                  </span>
                </div>

                <p className="text-sm text-tinta2">
                  <span className="text-tinta">@{reporte.reporter.username}</span> reportó a{' '}
                  <span className="text-tinta">@{reporte.author.username}</span>
                  {/*
                    Se dice si el original ya no está, y no se calla: cambia lo que procede
                    hacer con el aviso —no hay nada que retirar— y ahorra ir a buscarlo.
                  */}
                  {reporte.targetId === null ? (
                    <span className="text-tinta3"> · el contenido ya no existe</span>
                  ) : null}
                </p>

                {/*
                  El texto copiado en el momento del reporte. Es la única superficie del
                  producto donde el contenido de una conversación privada sale del hilo, y por
                  eso lleva **solo el mensaje señalado**: quien reporta señala un renglón, no
                  entrega su conversación entera a revisión.
                */}
                <blockquote className="whitespace-pre-wrap break-words border-l-2 border-filete2 pl-nc-sm text-sm text-tinta">
                  {reporte.targetText}
                </blockquote>

                {reporte.detail ? (
                  <p className="text-sm text-tinta2">
                    <span className="text-tinta3">Añadió: </span>
                    {reporte.detail}
                  </p>
                ) : null}

                {reporte.status === 'pendiente' ? (
                  <div className="flex flex-wrap gap-nc-xs">
                    <Button
                      variant="secondary"
                      loading={ocupado === reporte.id}
                      data-testid={`revisado-${reporte.id}`}
                      onClick={() => void revisar(reporte.id, 'revisado')}
                    >
                      Marcar revisado
                    </Button>
                    <Button
                      variant="secondary"
                      loading={ocupado === reporte.id}
                      data-testid={`descartado-${reporte.id}`}
                      onClick={() => void revisar(reporte.id, 'descartado')}
                    >
                      Descartar
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-tinta3">
                    {reporte.reviewedAt ? formatDateTime(reporte.reviewedAt) : ''}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )
      ) : null}
    </Card>
  );
}

/**
 * El embudo va primero porque es el único que responde «¿va bien esto?».
 *
 * Los conteos de más abajo dicen cuánto hay; este dice si sirve. Si mucha gente se registra
 * y no llega a capturar su horario, el problema está en esa pantalla — y esa conclusión no
 * sale de ningún otro número del panel.
 */
function Embudo({ datos }: { datos: PanelResumen }) {
  const { registrados, capturaronHorario, volvieronOtroDia } = datos.embudo;

  return (
    <Card title="Embudo">
      <div className="grid gap-nc-md sm:grid-cols-3">
        <Stat label="Se registraron" value={registrados} />
        <Stat
          label="Capturaron horario"
          value={capturaronHorario}
          tone={porcentajeTono(capturaronHorario, registrados)}
          hint={porcentaje(capturaronHorario, registrados)}
        />
        <Stat
          label="Volvieron otro día"
          value={volvieronOtroDia}
          tone={porcentajeTono(volvieronOtroDia, registrados)}
          hint={porcentaje(volvieronOtroDia, registrados)}
        />
      </div>
    </Card>
  );
}

function Actividad({ datos }: { datos: PanelResumen }) {
  const { activosHoy, activos7Dias, activos30Dias, sesionesApp, sesionesWeb } = datos.actividad;

  return (
    <Card title="Actividad">
      <div className="grid gap-nc-md sm:grid-cols-3">
        <Stat label="Activos hoy" value={activosHoy} tone="acento" />
        <Stat label="Activos 7 días" value={activos7Dias} />
        <Stat label="Activos 30 días" value={activos30Dias} />
      </div>

      <Rule />

      {/*
        El reparto entre app y web es el número que dice si la paridad de plataformas está
        sirviendo de algo o si un cliente se usa y el otro no — la pregunta que el Principio I
        lleva sin poder responder desde la Fase 0.
      */}
      <div className="grid gap-nc-md sm:grid-cols-2">
        <Stat label="Sesiones · app Android" value={sesionesApp} />
        <Stat label="Sesiones · navegador" value={sesionesWeb} />
      </div>
    </Card>
  );
}

function Inventario({ datos }: { datos: PanelResumen }) {
  const inv = datos.inventario;

  return (
    <Card title="Lo que hay en la base">
      <div className="grid gap-nc-md sm:grid-cols-3 lg:grid-cols-4">
        <Stat label="Usuarios" value={inv.usuarios} tone="acento" />
        <Stat
          label="Con horario"
          value={inv.conHorario}
          hint={porcentaje(inv.conHorario, inv.usuarios)}
        />
        <Stat label="Materias" value={inv.materias} />
        <Stat label="Sesiones de clase" value={inv.sesionesDeClase} />
        <Stat label="Faltas" value={inv.faltas} />
        <Stat label="Tareas" value={inv.tareas} />
        <Stat label="Publicaciones" value={inv.publicaciones} />
        <Stat label="Mensajes" value={inv.mensajes} />
        <Stat label="Conversaciones" value={inv.conversaciones} />
        <Stat label="Contactos" value={inv.contactos} />
        <Stat label="Periodos activos" value={inv.periodosActivos} />
        <Stat label="Periodos archivados" value={inv.periodosArchivados} />
        <Stat label="Comparticiones" value={inv.comparticionesCreadas} />
        {/*
          Sin porcentaje sobre las creadas, aunque la tentación es evidente: un mismo
          compartido se puede aceptar muchas veces —ese es el punto de un enlace—, así que la
          proporción pasa de 100 y se lee como un error de cálculo. Se vio en la verificación
          marcando «106%». El número absoluto dice lo que hay que saber.
        */}
        <Stat label="Aceptadas" value={inv.comparticionesAceptadas} />
        <Stat label="Cuentas borradas" value={inv.cuentasBorradas} />
      </div>
    </Card>
  );
}

function Retencion({ datos }: { datos: PanelResumen }) {
  const { elegibles7, volvieron7, elegibles30, volvieron30 } = datos.retencion;

  return (
    <Card title="Retención">
      <div className="grid gap-nc-md sm:grid-cols-2">
        <Stat
          label="Vuelven a los 7 días"
          value={porcentaje(volvieron7, elegibles7)}
          tone={porcentajeTono(volvieron7, elegibles7)}
          hint={`${volvieron7} de ${elegibles7} cuentas con más de 7 días`}
        />
        <Stat
          label="Vuelven a los 30 días"
          value={porcentaje(volvieron30, elegibles30)}
          tone={porcentajeTono(volvieron30, elegibles30)}
          hint={`${volvieron30} de ${elegibles30} cuentas con más de 30 días`}
        />
      </div>

      {/*
        La advertencia va con el número y no en la documentación: quien mire esto dentro de
        seis meses no va a leer `types/panel.ts` antes de sacar una conclusión.
      */}
      <p className="text-xs text-tinta3">
        Se mide sobre la última vez que se usó una sesión. Una sesión que el teléfono refresca
        sola cuenta como vuelta, así que estos dos números son un suelo optimista, no una
        medida fina.
      </p>
    </Card>
  );
}

function Versiones({ versiones }: { versiones: readonly PanelVersion[] }) {
  if (versiones.length === 0) {
    return (
      <Card title="Versiones instaladas">
        <p className="text-tinta3">Todavía no hay sesiones vivas que hayan informado su versión.</p>
      </Card>
    );
  }

  return (
    <Card title="Versiones instaladas">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-filete text-left">
              <th className="py-nc-xs pr-nc-sm font-medium text-tinta2">Cliente</th>
              <th className="py-nc-xs pr-nc-sm font-medium text-tinta2">Versión</th>
              <th className="py-nc-xs text-right font-medium text-tinta2">Sesiones vivas</th>
            </tr>
          </thead>
          <tbody>
            {versiones.map((fila) => (
              <tr key={`${fila.client}-${fila.version ?? 'sin'}`} className="border-b border-filete">
                <td className="py-nc-xs pr-nc-sm text-tinta">
                  {fila.client === 'mobile' ? 'App Android' : 'Navegador'}
                </td>
                <td className="py-nc-xs pr-nc-sm font-mono text-tinta2">
                  {/*
                    Sin versión son las sesiones abiertas antes de que esto se registrara, o
                    que no han vuelto a usarse desde entonces. Es un dato, no un hueco.
                  */}
                  {fila.version ?? <span className="text-tinta3">sin informar</span>}
                </td>
                <td className="py-nc-xs text-right font-mono tabular-nums text-tinta">
                  {fila.sesiones}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Altas({ datos }: { datos: PanelResumen }) {
  const semanas = datos.altasPorSemana;

  if (semanas.length === 0) {
    return (
      <Card title="Altas por semana">
        <p className="text-tinta3">Todavía no hay altas que mostrar.</p>
      </Card>
    );
  }

  // La barra más larga marca la escala. Con `Math.max` en 0 la división sería NaN, pero eso
  // no puede pasar: si hay filas, al menos una tiene una alta.
  const maximo = Math.max(...semanas.map((semana) => semana.altas));

  return (
    <Card title="Altas por semana">
      <ul className="space-y-nc-2xs">
        {semanas.map((semana) => (
          <li key={semana.semana} className="flex items-center gap-nc-sm">
            <span className="w-24 shrink-0 font-mono text-xs text-tinta3">{semana.semana}</span>
            {/*
              Una barra de CSS y no un gráfico: son doce filas de un solo número y una
              librería de gráficos aquí serían cientos de kilobytes para dibujar rectángulos.
            */}
            <span className="h-nc-xs min-w-0 flex-1 rounded-sm bg-papel3">
              <span
                className="block h-full rounded-sm bg-acento"
                style={{ width: `${Math.round((semana.altas / maximo) * 100)}%` }}
              />
            </span>
            <span className="w-8 shrink-0 text-right font-mono text-sm tabular-nums text-tinta">
              {semana.altas}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Salud({ datos }: { datos: PanelResumen }) {
  const { apiUptimeSegundos, tamanoBaseDatos } = datos.salud;

  return (
    <Card title="Salud">
      <div className="grid gap-nc-md sm:grid-cols-2">
        <Stat
          label="La API lleva viva"
          value={duracion(apiUptimeSegundos)}
          hint="Vuelve a cero al reiniciar el contenedor."
        />
        <Stat label="Tamaño de la base" value={tamanoBaseDatos} />
      </div>
    </Card>
  );
}

/* ==========================================================================
 * Formato
 * ======================================================================== */

/** Un porcentaje legible, o un guion cuando no hay base sobre la que calcularlo. */
function porcentaje(parte: number, total: number): string {
  if (total === 0) return '—';
  return `${Math.round((parte / total) * 100)}%`;
}

/**
 * Colorea una proporción para que se lea de un vistazo.
 *
 * Los cortes son deliberadamente generosos —la mitad ya es verde— porque estos son embudos de
 * producto, no exámenes: que la mitad de quien se registra llegue a capturar su horario es un
 * buen resultado, y pintarlo de rojo enseñaría a ignorar el color.
 */
function porcentajeTono(parte: number, total: number): 'neutro' | 'exito' | 'aviso' | 'error' {
  if (total === 0) return 'neutro';
  const proporcion = parte / total;
  if (proporcion >= 0.5) return 'exito';
  if (proporcion >= 0.25) return 'aviso';
  return 'error';
}

/** Segundos a algo que se lee: «3 d 4 h», «12 min». */
function duracion(segundos: number): string {
  const dias = Math.floor(segundos / 86400);
  const horas = Math.floor((segundos % 86400) / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);

  if (dias > 0) return `${dias} d ${horas} h`;
  if (horas > 0) return `${horas} h ${minutos} min`;
  return `${minutos} min`;
}
