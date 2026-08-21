'use client';

import { useEffect, useState } from 'react';
import {
  tamanoLegible,
  type AndroidRelease,
  type LatestReleaseResponse,
} from '@notecore/shared';
import { updatesApi } from '@/lib/api';
import { Card, Notice, ScreenHeader } from '@/components/ui';

/**
 * Descargar la app Android (FR-052, Fase 17).
 *
 * ## Por qué esta página existe, si el actualizador está dentro de la app
 *
 * Porque **el actualizador solo alcanza a quien ya tiene la app instalada**. Quien todavía no
 * la tiene no puede recibir un aviso dentro de ella, así que necesita una dirección a la que
 * ir con el navegador del teléfono. Esa es esta página, y es también la que se manda por
 * WhatsApp cuando alguien pregunta cómo instalarla.
 *
 * Y es la mitad web de la fase (Principio I). La paridad aquí **no puede ser literal**: un
 * navegador no instala aplicaciones, y ningún cambio de código lo va a permitir. Lo que sí
 * es paritario es lo que se sabe: la misma versión, las mismas notas, la misma suma de
 * verificación, y la descarga del mismo binario. Lo que la web no puede hacer —lanzar el
 * instalador— lo hace la persona al abrir el archivo descargado.
 *
 * ## No pide sesión
 *
 * A diferencia del resto de la web. Es deliberado, por lo mismo que la ruta de la API: quien
 * llega aquí puede no tener cuenta todavía, y desde luego no tiene la app. Exigir sesión para
 * descargar la app con la que se entra es un círculo cerrado. No se expone nada de nadie: un
 * número de versión y un APK firmado son públicos por definición.
 */
export default function DescargarAppPage() {
  const [respuesta, setRespuesta] = useState<LatestReleaseResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let vigente = true;

    updatesApi
      .latestAndroid()
      .then((datos) => {
        if (vigente) setRespuesta(datos);
      })
      .catch(() => {
        if (vigente) setFallo(true);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  /*
   * `<main>` propio y no `AppShell`, porque esta página no exige sesión.
   * La barra lateral la monta `RequireSession`, y aquí no lo hay a propósito: quien viene a
   * descargar la app puede no tener cuenta todavía.
   */
  return (
    <main className="mx-auto w-full max-w-2xl space-y-nc-md px-nc-md pb-nc-3xl">
      <ScreenHeader
        title="App para Android"
        subtitle="NoteCore en el teléfono, con widgets y consulta sin conexión"
        back={{ href: '/', label: 'Inicio' }}
      />

      {cargando ? (
        <p className="text-sm text-tinta3">Consultando la última versión…</p>
      ) : fallo ? (
        <Notice tone="aviso">
          No se pudo consultar la última versión. Inténtalo de nuevo en un momento.
        </Notice>
      ) : (
        <Publicacion respuesta={respuesta} />
      )}

      <ComoSeInstala />
    </main>
  );
}

function Publicacion({ respuesta }: { respuesta: LatestReleaseResponse | null }) {
  /*
   * Los dos casos sin descarga se cuentan distinto, porque significan cosas distintas.
   *
   * `disponible: false` es «esto está apagado» —lo que pasará el día que la app suba a Play
   * Store—, y entonces lo correcto es mandar a la tienda, no disculparse. Sin publicación es
   * «encendido pero todavía no hay APK». Una sola frase para los dos dejaría a la mitad de
   * los visitantes con la información equivocada.
   */
  if (respuesta === null || !respuesta.disponible) {
    return (
      <Notice tone="info">
        La descarga directa no está habilitada. Busca NoteCore en Google Play.
      </Notice>
    );
  }

  if (respuesta.release === null) {
    return (
      <Notice tone="info">Todavía no hay ninguna versión publicada para descargar.</Notice>
    );
  }

  return <VersionPublicada release={respuesta.release} />;
}

function VersionPublicada({ release }: { release: AndroidRelease }) {
  const publicado = new Date(release.publishedAt);

  return (
    <Card title={`Versión ${release.versionName}`}>
      {release.notes.length > 0 ? (
        <p className="text-md text-tinta2">{release.notes}</p>
      ) : null}

      <dl className="grid grid-cols-[auto_1fr] gap-x-nc-md gap-y-nc-2xs text-sm">
        <dt className="text-tinta3">Tamaño</dt>
        <dd className="text-tinta2">{tamanoLegible(release.sizeBytes)}</dd>

        <dt className="text-tinta3">Publicada</dt>
        <dd className="text-tinta2">
          {Number.isNaN(publicado.getTime())
            ? '—'
            : publicado.toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
        </dd>

        <dt className="text-tinta3">Versión interna</dt>
        {/*
          El `versionCode` se muestra porque es **el número que decide** si una instalación es
          una actualización, y sin él no hay forma de comprobar desde fuera qué versión tiene
          uno instalada frente a la publicada. En tabular para que se lea como el dato que es.
        */}
        <dd className="font-mono tabular-nums text-tinta2">{release.versionCode}</dd>
      </dl>

      {/*
        Descarga con `<a download>` y no con un botón que llame a la API.
        El navegador de Android sabe descargar un archivo grande —con su barra de progreso,
        su reanudación y su notificación al terminar— y nada de eso se puede reproducir
        desde JavaScript sin empeorarlo.
      */}
      <a
        href={release.downloadUrl}
        download
        className="inline-flex items-center justify-center gap-nc-xs self-start rounded-md bg-acento px-nc-md py-nc-xs text-md font-medium text-acento-tinta transition-colors duration-100 hover:bg-foco"
      >
        Descargar el APK
      </a>

      <details className="text-sm">
        <summary className="cursor-pointer text-tinta3 transition-colors duration-100 hover:text-tinta">
          Verificar la descarga
        </summary>
        <div className="mt-nc-xs space-y-nc-2xs">
          <p className="text-tinta3">
            Esta es la suma SHA-256 del archivo publicado. Si la del archivo que descargaste
            coincide, la descarga llegó íntegra. Dentro de la app, esta comprobación se hace
            sola antes de instalar.
          </p>
          <code className="block overflow-x-auto rounded-md border border-filete bg-papel3 p-nc-xs font-mono text-xs text-tinta2">
            {release.sha256}
          </code>
          <code className="block overflow-x-auto rounded-md border border-filete bg-papel3 p-nc-xs font-mono text-xs text-tinta3">
            sha256sum NoteCore-{release.versionName}.apk
          </code>
        </div>
      </details>
    </Card>
  );
}

/**
 * Qué esperar al instalar.
 *
 * No es relleno: instalar un APK fuera de la tienda enseña a Android una advertencia que
 * asusta —«este tipo de archivo puede dañar tu dispositivo»— y hay que autorizar «instalar
 * apps desconocidas» en una pantalla de Ajustes. Quien no lo espera abandona ahí, y concluye
 * que la descarga estaba mal.
 */
function ComoSeInstala() {
  return (
    <Card title="Cómo se instala">
      <ol className="list-decimal space-y-nc-2xs pl-nc-md text-sm text-tinta2">
        <li>Descarga el archivo desde el navegador del teléfono.</li>
        <li>
          Ábrelo. Android pedirá autorizar a tu navegador a «instalar apps desconocidas»: es
          el permiso que hace falta para instalar algo que no viene de Play Store.
        </li>
        <li>Confirma la instalación.</li>
      </ol>

      <Notice tone="info">
        A partir de la primera instalación no hace falta volver aquí: la app avisa sola cuando
        hay una versión nueva y la instala desde dentro.
      </Notice>

      <p className="text-sm text-tinta3">
        Las actualizaciones se instalan encima de la anterior y{' '}
        <strong className="font-medium text-tinta2">no borran tus datos</strong>. Android solo
        las acepta si vienen firmadas con la misma clave, que es lo que garantiza que la
        actualización es de NoteCore y no de otro.
      </p>
    </Card>
  );
}
