import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  BORRADO_EXPLICADO,
  DELETE_ACCOUNT_CONFIRMATION,
  deleteAccountSchema,
  toFormErrors,
  type FormErrors,
} from '@notecore/shared';
import { useAuth } from '../lib/auth-context';
import { useBotonAtras } from '../lib/boton-atras';
import {
  Button,
  Card,
  Field,
  FormError,
  RADIUS,
  RULE,
  SPACE,
  ScreenBody,
  ScreenHeader,
  TEXT,
  base,
  c,
  fuente,
} from '../components/ui';

/**
 * Borrar la cuenta desde la app (Fase 20).
 *
 * Es el camino que Google exige que exista **dentro** de la app: quien se registró aquí tiene
 * que poder irse aquí, sin abrir un navegador ni escribir a nadie. La web tiene su equivalente
 * en «Mi cuenta», y `/borrar-cuenta` explica el proceso a quien ya no tiene la app instalada.
 *
 * ## Por qué pide contraseña *y* una palabra
 *
 * Son dos cosas distintas. La contraseña prueba **quién** es —sin ella, un teléfono
 * desbloqueado sobre una mesa basta para vaciar la cuenta de su dueño, que en un salón de
 * clases no es un caso hipotético—. Escribir BORRAR prueba que **entendió**: un diálogo de
 * «¿seguro?» se acepta por reflejo, y teclear una palabra no. La API vuelve a exigir las dos
 * por su cuenta (Principio II); esto es lo que evita llegar hasta allí por accidente.
 *
 * No hay pantalla de «listo, se borró»: al terminar, la sesión ya no existe y la app cae sola
 * en la de entrar. Una confirmación de éxito sobre una cuenta que acaba de dejar de existir
 * no tendría dónde vivir.
 */
export function BorrarCuentaScreen({ onVolver }: { onVolver: () => void }) {
  const { deleteAccount } = useAuth();

  const [values, setValues] = useState({ password: '', confirmation: '' });
  const [errors, setErrors] = useState<FormErrors>({ fields: {} });
  const [borrando, setBorrando] = useState(false);

  // Atrás vuelve a Ajustes mientras no se esté borrando: interrumpir la petición a mitad
  // dejaría la app sin saber si la cuenta se fue o no.
  useBotonAtras([{ cuando: !borrando, hacer: onVolver }]);

  async function onSubmit() {
    setBorrando(true);
    setErrors({ fields: {} });

    const parsed = deleteAccountSchema.safeParse(values);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[issue.path.join('.')] = issue.message;
      setErrors({ fields });
      setBorrando(false);
      return;
    }

    try {
      await deleteAccount(parsed.data);
      // No se navega a ningún sitio: al quedarse sin usuario, `App` pinta la pantalla de
      // entrar por su cuenta. Navegar aquí además sería una transición de más sobre una
      // pantalla que ya se está desmontando.
    } catch (error) {
      setErrors(toFormErrors(error));
      setBorrando(false);
    }
  }

  return (
    <ScreenBody>
      <ScreenHeader title="Borrar mi cuenta" onBack={onVolver} backLabel="Ajustes" />

      <View style={styles.aviso}>
        <Text style={styles.avisoTexto}>
          Esto borra tu cuenta y todos tus datos. No hay vuelta atrás.
        </Text>
      </View>

      <Card title="Qué se borra">
        {BORRADO_EXPLICADO.map((linea) => (
          <Text key={linea} style={base.tenue}>
            · {linea}
          </Text>
        ))}
      </Card>

      <Card title="Confirma que eres tú">
        <FormError message={errors.general} />

        <Field
          label="Tu contraseña"
          value={values.password}
          onChangeText={(password) => setValues((valores) => ({ ...valores, password }))}
          error={errors.fields.password}
          secureTextEntry
          autoCapitalize="none"
        />

        <Field
          label={`Escribe ${DELETE_ACCOUNT_CONFIRMATION} para confirmar`}
          value={values.confirmation}
          onChangeText={(confirmation) => setValues((valores) => ({ ...valores, confirmation }))}
          error={errors.fields.confirmation}
          autoCapitalize="characters"
        />

        <Button
          title="Borrar mi cuenta para siempre"
          variant="danger"
          onPress={() => void onSubmit()}
          loading={borrando}
        />
        <Button title="Cancelar" variant="secondary" onPress={onVolver} />
      </Card>
    </ScreenBody>
  );
}

const styles = StyleSheet.create({
  /*
   * El bloque de aviso, con los tokens del sistema y no con colores a pelo: `errorFondo` es
   * el fondo que `design.md` define para un bloque de error, y `error` el texto que va encima.
   */
  aviso: {
    backgroundColor: c.errorFondo,
    borderColor: c.error,
    borderRadius: RADIUS.md,
    borderWidth: RULE,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
  },
  avisoTexto: {
    color: c.error,
    fontFamily: fuente.cuerpo,
    fontSize: TEXT.md,
    fontWeight: '500',
  },
});
