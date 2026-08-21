import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tamanoLegible, type AndroidRelease, type EstadoDeActualizacion } from '@notecore/shared';
import {
  actualizadorDisponible,
  buscarActualizacion,
  descargarEInstalar,
} from '../lib/actualizacion';
import { Button, Notice, SPACE, TEXT, c, fuente } from './ui';

/**
 * Aviso de que hay una versión nueva de la app, con su descarga (FR-052, Fase 17).
 *
 * ## Por qué es un componente aparte y no unas líneas en `InicioScreen`
 *
 * Porque el actualizador tiene que **poder desaparecer**. Las tiendas prohíben que una app se
 * actualice por fuera, así que el día que NoteCore suba a Play Store esto se apaga con
 * `EXPO_PUBLIC_UPDATER_ENABLED` y se borra. Con el aviso repartido por la pantalla de inicio,
 * quitarlo sería ir sacando trozos de un componente de cuatrocientas líneas; así es borrar un
 * archivo y una línea de importación.
 *
 * Con el actualizador apagado no renderiza nada **y no pregunta a la API**: no es un
 * componente oculto, es un componente que no hace nada.
 *
 * ## Dónde vive el aviso y por qué no es un diálogo
 *
 * Es un bloque al principio del inicio, no un modal. Un diálogo al abrir la app interrumpe a
 * alguien que la abrió para ver a qué hora es su próxima clase, y lo que aprende esa persona
 * es a descartar el diálogo sin leerlo. Aquí el aviso espera: quien tenga prisa lo ignora, y
 * sigue estando la próxima vez.
 */
export function AvisoDeActualizacion() {
  const [release, setRelease] = useState<AndroidRelease | null>(null);
  const [estado, setEstado] = useState<EstadoDeActualizacion>('inactivo');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!actualizadorDisponible) return;

    let vigente = true;
    // `buscarActualizacion` no lanza: comprueba al abrir la app sin que nadie lo pida, y un
    // fallo de red no puede convertirse en un error en la pantalla de inicio.
    void buscarActualizacion().then((encontrada) => {
      if (vigente) setRelease(encontrada);
    });

    return () => {
      vigente = false;
    };
  }, []);

  const actualizar = useCallback(async () => {
    if (release === null) return;
    setError(null);
    const resultado = await descargarEInstalar(release, setEstado);
    if (resultado.estado === 'error') setError(resultado.error ?? null);
  }, [release]);

  if (!actualizadorDisponible || release === null) return null;

  const trabajando = estado === 'descargando' || estado === 'verificando';

  return (
    <View style={styles.contenedor}>
      <Notice tone="info">
        <View style={styles.cuerpo}>
          <Text style={styles.titulo}>Hay una versión nueva: {release.versionName}</Text>

          {release.notes.length > 0 ? (
            <Text style={styles.notas}>{release.notes}</Text>
          ) : null}

          <Text style={styles.detalle}>
            {tamanoLegible(release.sizeBytes)} · se descarga y se instala desde aquí
          </Text>

          {error !== null ? <Text style={styles.error}>{error}</Text> : null}

          {/*
            El estado se cuenta mientras dura. Una descarga de decenas de megabytes sin
            ninguna señal se lee como una app colgada, y la reacción natural es volver a
            pulsar el botón.
          */}
          {estado === 'instalando' ? (
            <Text style={styles.detalle}>
              Android está pidiendo confirmación para instalarla.
            </Text>
          ) : (
            <Button
              title={trabajando ? 'Descargando…' : 'Descargar e instalar'}
              onPress={() => void actualizar()}
              loading={trabajando}
            />
          )}
        </View>
      </Notice>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { marginBottom: SPACE.md },
  cuerpo: { gap: SPACE.xs },
  titulo: { fontFamily: fuente.cuerpoMedio, fontSize: TEXT.md, color: c.tinta },
  notas: { fontFamily: fuente.cuerpo, fontSize: TEXT.sm, color: c.tinta2 },
  detalle: { fontFamily: fuente.cuerpo, fontSize: TEXT.sm, color: c.tinta3 },
  error: { fontFamily: fuente.cuerpo, fontSize: TEXT.sm, color: c.error },
});
