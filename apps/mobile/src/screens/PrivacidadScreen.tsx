import { Linking, StyleSheet, Text, View } from 'react-native';
import {
  BORRADO_EXPLICADO,
  DATOS_DECLARADOS,
  NO_SE_HACE,
  PANEL_OPERADOR,
  PERMISOS_DECLARADOS,
  PRIVACIDAD_ACTUALIZADA,
  PRIVACIDAD_CONTACTO,
} from '@notecore/shared';
import { useBotonAtras } from '../lib/boton-atras';
import {
  Card,
  RULE,
  SPACE,
  ScreenBody,
  ScreenHeader,
  TEXT,
  base,
  c,
  colors,
  fuente,
} from '../components/ui';

/**
 * Política de privacidad dentro de la app (Fase 19).
 *
 * ## Por qué está dentro y no es solo un enlace al navegador
 *
 * Porque Google exige que sea alcanzable **desde dentro de la app**, y porque un enlace que
 * abre el navegador falla justo cuando más importa: sin conexión, o con el wifi del campus
 * detrás de un portal cautivo. El texto viene de `@notecore/shared`, así que está compilado
 * dentro del binario y se lee sin red.
 *
 * Sigue existiendo la página web —`/privacidad`— y sigue siendo la URL que se declara en la
 * consola de Play, porque el revisor la abre sin instalar nada. Las dos dicen exactamente lo
 * mismo por construcción: comparten origen, no copia.
 *
 * ## Por qué cuelga de Ajustes y no del inicio
 *
 * Es un documento que se consulta una vez, no una sección que se navega a diario. Ponerlo en
 * el menú principal lo haría competir con el horario y la agenda; ponerlo en Ajustes lo deja
 * donde alguien lo busca cuando se pregunta qué se está guardando de él.
 */
export function PrivacidadScreen({ onVolver }: { onVolver: () => void }) {
  useBotonAtras([{ cuando: true, hacer: onVolver }]);

  return (
    <ScreenBody>
      <ScreenHeader
        title="Privacidad"
        subtitle={`Actualizada el ${PRIVACIDAD_ACTUALIZADA}`}
        onBack={onVolver}
        backLabel="Ajustes"
      />

      <Card>
        <Text style={base.cuerpo}>
          NoteCore guarda lo que necesitas para organizar tus clases, y nada más. No hay
          publicidad, no hay analítica de terceros y tus datos no se venden ni se ceden a
          nadie.
        </Text>
      </Card>

      <Card title="Qué se guarda y para qué">
        {DATOS_DECLARADOS.map((dato, indice) => (
          <View key={dato.donde} style={indice === 0 ? undefined : styles.entrada}>
            <Text style={styles.datoQue}>{dato.que}</Text>
            <Text style={base.tenue}>{dato.paraQue}</Text>
            <Text style={styles.tabla}>
              {dato.donde} · {dato.opcional ? 'opcional' : 'necesario'}
            </Text>
          </View>
        ))}
      </Card>

      <Card title="Qué NO se hace">
        {NO_SE_HACE.map((linea) => (
          <Text key={linea} style={base.cuerpo}>
            · {linea}
          </Text>
        ))}
      </Card>

      <Card title="Permisos que pide la app">
        {PERMISOS_DECLARADOS.map((permiso, indice) => (
          <View key={permiso.permiso} style={indice === 0 ? undefined : styles.entrada}>
            <Text style={styles.datoQue}>{permiso.permiso}</Text>
            <Text style={base.tenue}>{permiso.paraQue}</Text>
          </View>
        ))}
      </Card>

      <Card title="Los mensajes y lo que publicas">
        <Text style={base.cuerpo}>
          Los mensajes se guardan en el servidor sin cifrado extremo a extremo. Técnicamente,
          quien administra la base de datos podría leerlos: el producto no ofrece ninguna
          pantalla para hacerlo, pero decirlo con claridad es más honesto que prometer una
          protección que no existe.
        </Text>
        <Text style={base.cuerpo}>
          Puedes bloquear a cualquier persona desde su perfil. Al bloquearla deja de poder
          escribirte.
        </Text>
      </Card>

      <Card title="Cuánto tiempo se guardan">
        <Text style={base.cuerpo}>
          Mientras tengas la cuenta abierta. Los periodos que cierras se archivan en lugar de
          borrarse, para que puedas consultar semestres anteriores. Lo que compartes por QR,
          código o enlace caduca solo en la fecha que fijaste al crearlo.
        </Text>
      </Card>

      <Card title="Si borras tu cuenta">
        {BORRADO_EXPLICADO.map((linea) => (
          <Text key={linea} style={base.cuerpo}>
            · {linea}
          </Text>
        ))}
      </Card>

      <Card title="El panel de quien mantiene NoteCore">
        <Text style={base.cuerpo}>{PANEL_OPERADOR.que}</Text>
        <Text style={base.cuerpo}>{PANEL_OPERADOR.limite}</Text>
      </Card>

      <Card title="A quién escribir">
        <Text style={base.cuerpo}>
          NoteCore lo desarrolla y opera Brian Tellez a título personal. Para acceder a tus
          datos, corregirlos o borrarlos:
        </Text>
        <Text
          style={styles.enlace}
          accessibilityRole="link"
          onPress={() => void Linking.openURL(`mailto:${PRIVACIDAD_CONTACTO}`)}
        >
          {PRIVACIDAD_CONTACTO}
        </Text>
      </Card>
    </ScreenBody>
  );
}

const styles = StyleSheet.create({
  /**
   * Separación entre entradas de una misma tarjeta, con filete.
   *
   * El filete va arriba y no abajo para que la última entrada no cierre con una línea
   * suelta pegada al borde de la tarjeta.
   */
  entrada: {
    borderTopColor: colors.borde,
    borderTopWidth: RULE,
    paddingTop: SPACE.sm,
    gap: 2,
  },
  datoQue: { color: c.tinta, fontFamily: fuente.cuerpo, fontSize: TEXT.md, fontWeight: '500' },
  tabla: { color: c.tinta3, fontFamily: fuente.mono, fontSize: TEXT.xs },
  enlace: { color: c.acento, fontFamily: fuente.cuerpo, fontSize: TEXT.md },
});
