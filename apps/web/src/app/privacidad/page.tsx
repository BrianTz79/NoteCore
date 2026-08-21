import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BORRADO_EXPLICADO,
  DATOS_DECLARADOS,
  NO_SE_HACE,
  PANEL_OPERADOR,
  PERMISOS_DECLARADOS,
  PRIVACIDAD_ACTUALIZADA,
  PRIVACIDAD_CONTACTO,
} from '@notecore/shared';

/**
 * Política de privacidad (Fase 19).
 *
 * ## No pide sesión, y eso es el requisito
 *
 * Google la revisa **sin instalar la app y sin registrarse**. Una política detrás de un login
 * es, para el revisor, una política que no existe. Por eso esta página no pasa por
 * `RequireSession` — y por eso tampoco es un componente cliente: se renderiza en el servidor
 * y su texto está en el HTML inicial, así que un rastreador que no ejecute JavaScript la lee
 * igual. Es una página de documento, no de aplicación: no hay nada que pedir a la API.
 *
 * ## De dónde sale el texto
 *
 * De `@notecore/shared`, no de aquí. La app pinta exactamente el mismo contenido en su
 * pantalla de Ajustes, y el cuestionario de Data Safety de Play se rellena contra la misma
 * lista. Tres consumidores, un origen: es lo que impide que la política diga una cosa en el
 * navegador y otra en el teléfono.
 */
export const metadata: Metadata = {
  title: 'Privacidad · NoteCore',
  description:
    'Qué datos guarda NoteCore, para qué, con quién se comparten y cómo borrar tu cuenta.',
};

export default function PrivacidadPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-nc-lg py-nc-3xl">
      <header className="space-y-nc-2xs">
        <Link
          href="/"
          className="text-sm text-tinta3 transition-colors duration-100 hover:text-tinta"
        >
          ← NoteCore
        </Link>
        <h1 className="text-4xl font-medium tracking-tight">Política de privacidad</h1>
        <p className="text-tinta3">
          Última actualización: {PRIVACIDAD_ACTUALIZADA}. Aplica a la app Android de NoteCore y
          a esta web.
        </p>
      </header>

      <div className="mt-nc-2xl space-y-nc-2xl">
        <Seccion titulo="En una línea">
          <p className="text-lg text-tinta">
            NoteCore guarda lo que necesitas para organizar tus clases, y nada más. No hay
            publicidad, no hay analítica de terceros y tus datos no se venden ni se ceden a
            nadie.
          </p>
        </Seccion>

        <Seccion titulo="Quién es el responsable">
          <p>
            NoteCore lo desarrolla y opera Brian Tellez a título personal. Para cualquier
            cuestión sobre tus datos —acceder a ellos, corregirlos o borrarlos— escribe a{' '}
            <a
              href={`mailto:${PRIVACIDAD_CONTACTO}`}
              className="text-acento underline underline-offset-2"
            >
              {PRIVACIDAD_CONTACTO}
            </a>
            .
          </p>
        </Seccion>

        <Seccion titulo="Qué se guarda y para qué">
          <p>
            La lista es completa: no hay ningún dato que NoteCore recoja y no esté aquí. Se
            indica también en qué tabla vive cada cosa, para que se pueda comprobar contra el
            código.
          </p>

          {/*
            Tabla en escritorio y lista en móvil, con el mismo contenido. Una tabla de cuatro
            columnas en 360 px se lee en diagonal o no se lee: la versión de móvil apila los
            campos por fila para que cada dato conserve su etiqueta.
          */}
          <div className="mt-nc-md overflow-x-auto">
            <table className="hidden w-full border-collapse text-sm sm:table">
              <thead>
                <tr className="border-b border-filete text-left">
                  <th className="py-nc-xs pr-nc-sm font-medium text-tinta2">Dato</th>
                  <th className="py-nc-xs pr-nc-sm font-medium text-tinta2">Para qué</th>
                  <th className="py-nc-xs pr-nc-sm font-medium text-tinta2">Dónde vive</th>
                  <th className="py-nc-xs font-medium text-tinta2">¿Obligatorio?</th>
                </tr>
              </thead>
              <tbody>
                {DATOS_DECLARADOS.map((dato) => (
                  <tr key={dato.donde} className="border-b border-filete align-top">
                    <td className="py-nc-sm pr-nc-sm font-medium text-tinta">{dato.que}</td>
                    <td className="py-nc-sm pr-nc-sm text-tinta2">{dato.paraQue}</td>
                    <td className="py-nc-sm pr-nc-sm font-mono text-xs text-tinta3">
                      {dato.donde}
                    </td>
                    <td className="py-nc-sm text-tinta3">
                      {dato.opcional ? 'Opcional' : 'Necesario'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="space-y-nc-md sm:hidden">
              {DATOS_DECLARADOS.map((dato) => (
                <li key={dato.donde} className="border-b border-filete pb-nc-sm">
                  <p className="font-medium text-tinta">{dato.que}</p>
                  <p className="mt-nc-3xs text-sm text-tinta2">{dato.paraQue}</p>
                  <p className="mt-nc-2xs font-mono text-xs text-tinta3">
                    {dato.donde} · {dato.opcional ? 'opcional' : 'necesario'}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </Seccion>

        <Seccion titulo="Qué NO se hace">
          <ul className="space-y-nc-xs">
            {NO_SE_HACE.map((linea) => (
              <li key={linea} className="flex gap-nc-xs">
                <span aria-hidden className="text-exito">
                  ·
                </span>
                <span>{linea}</span>
              </li>
            ))}
          </ul>
        </Seccion>

        <Seccion titulo="Permisos que pide la app">
          <ul className="space-y-nc-md">
            {PERMISOS_DECLARADOS.map((permiso) => (
              <li key={permiso.permiso}>
                <p className="font-medium text-tinta">{permiso.permiso}</p>
                <p className="mt-nc-3xs text-tinta2">{permiso.paraQue}</p>
              </li>
            ))}
          </ul>
        </Seccion>

        <Seccion titulo="Los mensajes y lo que publicas">
          <p>
            La mensajería y la sección social guardan datos que son de <em>dos</em> personas: un
            mensaje que te escriben vive en tu conversación y en la de quien lo escribió, y una
            publicación tuya la ven quienes tú decidas según tu configuración de visibilidad.
          </p>
          <p className="mt-nc-sm">
            Los mensajes se guardan en el servidor sin cifrado extremo a extremo. Eso significa
            que, técnicamente, quien administra la base de datos podría leerlos: el producto no
            ofrece ninguna pantalla para hacerlo, pero decirlo con claridad es más honesto que
            prometer una protección que no existe. No escribas por aquí nada que no escribirías
            en cualquier otra app de mensajería sin cifrado.
          </p>
          <p className="mt-nc-sm">
            Puedes bloquear a cualquier persona desde su perfil. Al bloquearla deja de poder
            escribirte.
          </p>
        </Seccion>

        <Seccion titulo="Cuánto tiempo se guardan">
          <p>
            Mientras tengas la cuenta abierta. Los periodos que cierras se archivan en lugar de
            borrarse, para que puedas consultar semestres anteriores: eso es intencional y
            forma parte del producto. Lo que compartes por QR, código o enlace caduca solo en
            la fecha que fijaste al crearlo.
          </p>
          <p className="mt-nc-sm">
            Las sesiones caducan a los 30 días sin uso y se borran solas del servidor.
          </p>
        </Seccion>

        <Seccion titulo="Cómo borrar tu cuenta">
          <p>
            Desde la app, en <strong>Ajustes → Borrar mi cuenta</strong>. Desde la web, en{' '}
            <strong>Mi cuenta → Borrar mi cuenta</strong>. También hay una{' '}
            <Link
              href="/borrar-cuenta"
              className="text-acento underline underline-offset-2"
            >
              página con las instrucciones
            </Link>{' '}
            que puedes consultar sin tener la app instalada.
          </p>
          <ul className="mt-nc-md space-y-nc-xs">
            {BORRADO_EXPLICADO.map((linea) => (
              <li key={linea} className="flex gap-nc-xs">
                <span aria-hidden className="text-tinta3">
                  ·
                </span>
                <span>{linea}</span>
              </li>
            ))}
          </ul>
        </Seccion>

        <Seccion titulo="El panel de quien mantiene NoteCore">
          <p>{PANEL_OPERADOR.que}</p>
          <p className="mt-nc-sm">{PANEL_OPERADOR.limite}</p>
        </Seccion>

        <Seccion titulo="Menores de edad">
          <p>
            NoteCore está pensado para estudiantes de nivel superior. No está dirigido a menores
            de 13 años y no se recoge deliberadamente información de ellos.
          </p>
        </Seccion>

        <Seccion titulo="Cambios en esta política">
          <p>
            Si cambia lo que se guarda o para qué, se actualiza esta página y con ella la fecha
            de arriba. Los cambios que afecten a datos que ya tienes guardados se avisarán
            dentro de la app.
          </p>
        </Seccion>
      </div>

      <footer className="mt-nc-3xl border-t border-filete pt-nc-lg text-sm text-tinta3">
        <Link href="/" className="transition-colors duration-100 hover:text-tinta">
          Volver a NoteCore
        </Link>
      </footer>
    </main>
  );
}

/** Un apartado del documento: título y cuerpo, con el ritmo vertical del sistema. */
function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-nc-sm">
      <h2 className="text-xl font-medium text-tinta">{titulo}</h2>
      <div className="space-y-nc-sm text-tinta2">{children}</div>
    </section>
  );
}
