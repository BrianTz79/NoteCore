import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BORRADO_EXPLICADO,
  BORRADO_PARCIAL_EXPLICADO,
  PRIVACIDAD_CONTACTO,
} from '@notecore/shared';

/**
 * Cómo borrar la cuenta, sin necesidad de tener la app (Fase 20).
 *
 * ## Por qué existe una página aparte del botón
 *
 * Porque Google exige **dos** caminos y son distintos: uno dentro de la app, y otro por una
 * URL web alcanzable **sin instalarla**. El segundo existe para quien desinstaló la app y
 * quiere irse del todo, para quien nunca la tuvo pero se registró desde el navegador, y para
 * el revisor de Play, que lo comprueba sin instalar nada.
 *
 * Por eso no pide sesión: si la pidiera, quien ya no puede entrar —el caso más común de
 * alguien que quiere borrar su cuenta— se quedaría fuera del mecanismo pensado para él. La
 * página explica y encamina; el borrado en sí sigue exigiendo sesión y contraseña, porque es
 * la única forma de saber que quien borra es el dueño.
 */
export const metadata: Metadata = {
  title: 'Borrar tu cuenta · NoteCore',
  description:
    'Cómo eliminar tu cuenta de NoteCore y todos tus datos, desde la app o desde la web.',
};

export default function BorrarCuentaPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-nc-lg py-nc-3xl">
      <header className="space-y-nc-2xs">
        <Link
          href="/"
          className="text-sm text-tinta3 transition-colors duration-100 hover:text-tinta"
        >
          ← NoteCore
        </Link>
        <h1 className="text-4xl font-medium tracking-tight">Borrar tu cuenta</h1>
        <p className="text-tinta3">
          Cómo eliminar tu cuenta de NoteCore y todos tus datos, con o sin la app instalada.
        </p>
      </header>

      <div className="mt-nc-2xl space-y-nc-2xl">
        <section className="space-y-nc-sm">
          <h2 className="text-xl font-medium text-tinta">Desde la web</h2>
          <ol className="space-y-nc-xs text-tinta2">
            <li>
              1. Entra en{' '}
              <Link href="/entrar" className="text-acento underline underline-offset-2">
                notecore.ourocore.net
              </Link>{' '}
              con tu correo y contraseña.
            </li>
            <li>2. Ve a «Mi cuenta».</li>
            <li>3. Abajo del todo, en «Borrar mi cuenta», sigue los pasos.</li>
          </ol>
        </section>

        <section className="space-y-nc-sm">
          <h2 className="text-xl font-medium text-tinta">Desde la app Android</h2>
          <ol className="space-y-nc-xs text-tinta2">
            <li>1. Abre NoteCore y entra con tu cuenta.</li>
            <li>2. Ve a Ajustes.</li>
            <li>3. En «Tus datos», toca «Borrar mi cuenta» y sigue los pasos.</li>
          </ol>
        </section>

        <section className="space-y-nc-sm">
          <h2 className="text-xl font-medium text-tinta">Si ya no puedes entrar</h2>
          <p className="text-tinta2">
            Escribe a{' '}
            <a
              href={`mailto:${PRIVACIDAD_CONTACTO}?subject=Borrar%20mi%20cuenta%20de%20NoteCore`}
              className="text-acento underline underline-offset-2"
            >
              {PRIVACIDAD_CONTACTO}
            </a>{' '}
            desde el correo con el que te registraste, diciendo que quieres borrar tu cuenta.
            Se hace a mano y se confirma por respuesta.
          </p>
        </section>

        <section className="space-y-nc-sm">
          <h2 className="text-xl font-medium text-tinta">
            Qué se borra al eliminar la cuenta
          </h2>
          <ul className="space-y-nc-xs text-tinta2">
            {BORRADO_EXPLICADO.map((linea) => (
              <li key={linea} className="flex gap-nc-xs">
                <span aria-hidden className="text-tinta3">
                  ·
                </span>
                <span>{linea}</span>
              </li>
            ))}
          </ul>
        </section>

        {/*
          Va después del borrado total y antes del aviso rojo porque es la salida menos
          drástica: quien llegó aquí buscando quitar una cosa concreta —no irse— encuentra
          que puede hacerlo sin borrar la cuenta, justo antes de leer que lo otro no tiene
          vuelta atrás. Google lo pregunta aparte, y sin esta sección la respuesta «sí» de
          la ficha no estaría respaldada por nada visible.
        */}
        <section className="space-y-nc-sm">
          <h2 className="text-xl font-medium text-tinta">
            Borrar solo una parte, sin borrar la cuenta
          </h2>
          <p className="text-tinta2">
            No hace falta irte para quitar algo. Cada dato se borra por su cuenta, desde la app
            o desde la web, y el borrado es inmediato en ambos sitios:
          </p>
          <ul className="space-y-nc-xs text-tinta2">
            {BORRADO_PARCIAL_EXPLICADO.map((linea) => (
              <li key={linea} className="flex gap-nc-xs">
                <span aria-hidden className="text-tinta3">
                  ·
                </span>
                <span>{linea}</span>
              </li>
            ))}
          </ul>
          <p className="text-tinta2">
            Si prefieres que lo hagamos por ti, escribe a{' '}
            <a
              href={`mailto:${PRIVACIDAD_CONTACTO}?subject=Borrar%20datos%20de%20mi%20cuenta%20de%20NoteCore`}
              className="text-acento underline underline-offset-2"
            >
              {PRIVACIDAD_CONTACTO}
            </a>{' '}
            desde el correo con el que te registraste, diciendo qué datos quieres que se borren.
          </p>
        </section>

        {/*
          El aviso va al final y no arriba: quien llega aquí ya decidió irse, y abrirle la
          página con una advertencia en rojo antes de decirle cómo hacerlo es ponerle un
          obstáculo, no informarle. Al final, lo lee justo antes de actuar.
        */}
        <section className="rounded-md border border-error/40 bg-error/10 px-nc-md py-nc-sm">
          <p className="text-sm text-tinta2">
            <strong className="text-error">No hay vuelta atrás.</strong> El borrado es inmediato
            y no existe forma de recuperar la cuenta ni sus datos después. Si solo quieres dejar
            de recibir avisos, apaga los recordatorios en Ajustes en lugar de borrar la cuenta.
          </p>
        </section>
      </div>

      <footer className="mt-nc-3xl border-t border-filete pt-nc-lg text-sm text-tinta3">
        <Link
          href="/privacidad"
          className="transition-colors duration-100 hover:text-tinta"
        >
          Política de privacidad
        </Link>
      </footer>
    </main>
  );
}
