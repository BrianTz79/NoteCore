'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import {
  formatDateTime,
  toFormErrors,
  type PanelResumen,
  type PanelVersion,
} from '@notecore/shared';
import { panelApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { RequireSession } from '@/components/require-session';
import { Card, FormError, Rule, ScreenHeader, Stat } from '@/components/ui';

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
