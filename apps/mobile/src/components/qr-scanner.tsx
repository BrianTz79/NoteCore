import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Button, RADIUS, TEXT, colors } from './ui';

/**
 * Escáner de códigos QR con la cámara (FR-028).
 *
 * Es lo único de la fase que la web no puede hacer igual: el navegador podría pedir la
 * cámara, pero el caso real es el compañero que enseña su pantalla y el otro la escanea con
 * el teléfono. La paridad se cumple donde importa —las tres modalidades existen en ambos
 * clientes— y aquí la app añade la comodidad del escaneo.
 *
 * El permiso se pide al abrir y no al arrancar la app: pedirlo antes de que haya nada que
 * escanear es lo que hace que la gente lo deniegue por costumbre.
 */
export function QrScanner({
  onLeido,
  onCancelar,
}: {
  onLeido: (texto: string) => void;
  onCancelar: () => void;
}) {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [error, setError] = useState<string>();

  /**
   * La cámara emite varias lecturas por segundo del mismo código.
   *
   * Sin este cerrojo, un solo QR delante del objetivo dispararía decenas de peticiones de
   * vista previa antes de que la pantalla llegara a cambiar.
   */
  const yaLeido = useRef(false);

  if (!permiso) {
    return (
      <View style={styles.centro}>
        <Text style={styles.texto}>Preparando la cámara…</Text>
      </View>
    );
  }

  if (!permiso.granted) {
    return (
      <View style={styles.centro}>
        <Text style={styles.titulo}>Escanear un QR</Text>
        <Text style={styles.texto}>
          NoteCore necesita la cámara para leer el código que te comparten. Solo se usa
          mientras esta pantalla está abierta.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title="Permitir la cámara"
          onPress={() => {
            void (async () => {
              const resultado = await pedirPermiso();
              if (!resultado.granted) {
                // `canAskAgain` en falso significa que hay que ir a los ajustes de Android:
                // volver a pedirlo desde aquí ya no muestra ningún diálogo.
                setError(
                  resultado.canAskAgain
                    ? 'Sin permiso de cámara no se puede escanear. Puedes escribir el código a mano.'
                    : 'Activa la cámara para NoteCore desde los ajustes de Android, o escribe el código a mano.',
                );
              }
            })();
          }}
        />
        <Button title="Volver" variant="secondary" onPress={onCancelar} />
      </View>
    );
  }

  return (
    <View style={styles.pantalla}>
      <CameraView
        style={StyleSheet.absoluteFill}
        // Solo QR: el lector no pierde tiempo buscando códigos de barras que aquí no aplican.
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }: BarcodeScanningResult) => {
          if (yaLeido.current) return;
          yaLeido.current = true;
          onLeido(data);
        }}
      />

      <View style={styles.superpuesto}>
        <Text style={styles.instruccion}>Apunta al QR de tu compañero</Text>
        <View style={styles.marco} />
        <View style={styles.acciones}>
          <Button title="Cancelar" variant="secondary" onPress={onCancelar} />
        </View>
      </View>
    </View>
  );
}

/*
 * El negro y el blanco de esta pantalla **no son tokens del sistema, y no deben serlo**.
 *
 * Aquí se pinta encima de la imagen en directo de la cámara, no sobre el papel de la
 * aplicación: el marco de puntería y su texto necesitan contraste contra un vídeo cuyo
 * contenido no se conoce —puede ser una hoja blanca o un aula a oscuras—. El blanco puro y
 * el negro puro son los únicos valores que lo garantizan en los dos casos. Un `c.tinta`
 * sobre un papel impreso desaparecería.
 */
const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#000000' },
  centro: {
    flex: 1,
    backgroundColor: colors.fondo,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 14,
  },
  titulo: { color: colors.textoFuerte, fontSize: TEXT.xl, fontWeight: '700' },
  texto: { color: colors.texto, fontSize: TEXT.md, textAlign: 'center', lineHeight: 21 },
  error: { color: colors.error, fontSize: TEXT.md, textAlign: 'center' },
  superpuesto: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  instruccion: {
    color: '#ffffff',
    fontSize: TEXT.lg,
    fontWeight: '600',
    textAlign: 'center',
    // Fondo propio para que se lea sobre cualquier cosa que enfoque la cámara.
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  marco: {
    width: 240,
    height: 240,
    borderColor: '#ffffff',
    borderWidth: 3,
    borderRadius: RADIUS.lg,
  },
  acciones: { width: '100%' },
});
