#!/usr/bin/env bash
#
# Compila el `.aab` firmado que se sube a Google Play (Fases 23 y 24).
#
# Play Store **no acepta `.apk`**: solo el App Bundle (`.aab`), del que Google deriva luego un
# APK por dispositivo. Este script produce ese artefacto con el actualizador **apagado**, que
# es la condición que impone la tienda.
#
# ## Por qué esto es un script y no un comando que se teclea
#
# La compilación para la tienda tiene cuatro requisitos y **los cuatro fallan en silencio**:
# el binario sale bien formado, Gradle dice «BUILD SUCCESSFUL», y el problema solo aparece
# cuando la app ya está instalada o cuando la tienda la rechaza.
#
#   1. **`EXPO_PUBLIC_API_URL` en la línea de comandos.** Gradle no lee el `.env` de la raíz,
#      así que un `bundleRelease` a secas incrusta `http://localhost:3101` y la app no conecta
#      con nada. Es la trampa de la Fase 12
#   2. **`EXPO_PUBLIC_UPDATER_ENABLED=false` en el prebuild**, no solo en la compilación. La
#      variable la leen `plugins/with-actualizador.js` y `src/lib/actualizacion.ts`; el plugin
#      corre en `prebuild`, de modo que recompilar sin rehacer el prebuild deja el permiso
#      `REQUEST_INSTALL_PACKAGES` dentro del `.aab` aunque el código ya no lo use. Es la
#      Fase 24
#   3. **Limpiar el caché de Gradle.** Cambiar una `EXPO_PUBLIC_*` no invalida el bundle de
#      JavaScript ya generado: la Fase 21 se compiló con el código nuevo y la URL vieja a la
#      vez, y «18 tareas ejecutadas» no lo delató. Por eso aquí se usa `clean`
#   4. **La firma.** La pone `plugins/with-firma-de-release.js` leyendo
#      `~/.notecore-release/keystore.properties`. Sin ella el `.aab` sale sin firmar y la
#      consola lo rechaza al subirlo
#
# El paso 2 es el que de verdad justifica el script: es invisible. Un `.aab` con el permiso de
# instalación de paquetes es motivo de rechazo, y nada en la compilación lo advierte.
#
# ## Uso
#
#   scripts/compilar-aab-tienda.sh [url-de-la-api]
#
# Sin argumento usa `PUBLIC_API_URL` del `.env`, y si tampoco está, la dirección de
# producción. Ejemplo explícito:
#
#   scripts/compilar-aab-tienda.sh https://notecore-api.ourocore.net
#
# Al terminar verifica el artefacto y **falla** si encuentra el permiso del actualizador o la
# URL equivocada dentro del bundle. Un `.aab` que no pasa esa verificación no se sube.

set -euo pipefail

# ---------------------------------------------------------------------------
# El fallo se anuncia en la ÚLTIMA línea, no solo en el código de salida.
#
# Este script se ejecuta casi siempre con la salida canalizada (`| tail`, `| tee`), y una
# tubería devuelve el estado del último comando: el script puede abortar a mitad y quien lo
# lanzó ve un «exit code 0». Pasó la primera vez que se corrió, y el `.aab` se dio por
# verificado cuando la verificación ni siquiera había podido ejecutarse.
#
# Con esto, un fallo termina siempre con una línea que se lee en cualquier `tail`.
# ---------------------------------------------------------------------------
# `TMP_MAN` se declara aquí, vacío, para que el `trap` pueda limpiarlo pase lo que pase sin
# necesitar un segundo `trap` que reemplazaría a este y se llevaría el aviso por delante.
TMP_MAN=""

al_salir() {
  local estado=$?
  [[ -n "$TMP_MAN" ]] && rm -rf "$TMP_MAN"
  if [[ $estado -ne 0 ]]; then
    echo
    echo "############################################################"
    echo "## LA COMPILACIÓN FALLÓ (código $estado) — NO SUBIR NADA"
    echo "############################################################"
  fi
  return $estado
}
trap al_salir EXIT

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOVIL="$RAIZ/apps/mobile"

# La dirección por defecto es la de producción: este script solo existe para la tienda, y un
# `.aab` apuntando a otro sitio no tiene ningún uso.
API_POR_DEFECTO="https://notecore-api.ourocore.net"

API_URL="${1:-}"
if [[ -z "$API_URL" && -f "$RAIZ/.env" ]]; then
  API_URL="$(grep -E '^PUBLIC_API_URL=' "$RAIZ/.env" | tail -1 | cut -d= -f2- || true)"
fi
API_URL="${API_URL:-$API_POR_DEFECTO}"

# Sin barra final: se concatena con rutas que ya la llevan.
API_URL="${API_URL%/}"

if [[ "$API_URL" != https://* ]]; then
  echo "La API de la tienda debe ir por HTTPS. Recibido: $API_URL" >&2
  echo "Android bloquea el tráfico en claro, y la app no conectaría con nada." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# La firma tiene que estar ANTES de compilar.
#
# Comprobarlo aquí y no al final ahorra los ~10 minutos de una compilación que iba a salir
# sin firmar. El plugin de firma lee este archivo; si no está, Gradle usa la clave de
# depuración y el `.aab` resultante lo rechaza la consola al subirlo.
# ---------------------------------------------------------------------------
CLAVE="$HOME/.notecore-release/keystore.properties"
if [[ ! -f "$CLAVE" ]]; then
  echo "No está la clave de firma: $CLAVE" >&2
  echo "Sin ella el .aab sale firmado con la clave de depuración y Play Store lo rechaza." >&2
  exit 1
fi

if [[ -z "${ANDROID_HOME:-}" && -d "$HOME/Android/Sdk" ]]; then
  # `expo prebuild --clean` borra `android/local.properties`, y la primera compilación
  # después falla con «SDK location not found». Es el tropiezo documentado en la Fase 22.
  export ANDROID_HOME="$HOME/Android/Sdk"
fi

echo "==> Compilando el .aab para Play Store"
echo "    API             $API_URL"
echo "    actualizador    APAGADO (Fase 24)"
echo

# ---------------------------------------------------------------------------
# 1. Prebuild con el actualizador apagado.
#
# `--clean` regenera `android/` entero. Es necesario y no una precaución: los plugins solo
# corren en el prebuild, así que un `android/` heredado de una compilación con el actualizador
# encendido conserva el permiso y el `FileProvider` en su manifiesto.
# ---------------------------------------------------------------------------
echo "==> [1/4] Prebuild (regenera android/ sin el actualizador)"
cd "$MOVIL"
EXPO_PUBLIC_UPDATER_ENABLED=false \
EXPO_PUBLIC_API_URL="$API_URL" \
  npx expo prebuild --platform android --clean

# ---------------------------------------------------------------------------
# 2. Compilar el bundle.
#
# `clean` antes de `bundleRelease` por la trampa del caché: sin él, Gradle reutiliza el bundle
# de JavaScript anterior y el artefacto lleva la URL de la compilación pasada.
# ---------------------------------------------------------------------------
echo
echo "==> [2/4] Gradle clean + bundleRelease"
cd "$MOVIL/android"
EXPO_PUBLIC_UPDATER_ENABLED=false \
EXPO_PUBLIC_API_URL="$API_URL" \
  ./gradlew clean bundleRelease

AAB="$MOVIL/android/app/build/outputs/bundle/release/app-release.aab"
if [[ ! -f "$AAB" ]]; then
  echo "Gradle terminó pero no hay .aab en $AAB" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# 3. Verificar el manifiesto del artefacto, no el código fuente.
#
# El `.aab` no se puede leer con `aapt2 dump badging` como un APK: su manifiesto va en
# formato binario dentro de `base/manifest/AndroidManifest.xml`. `aapt2 dump xmltree` sí lo
# lee, y es lo único que prueba de verdad qué permisos viajan en el artefacto.
# ---------------------------------------------------------------------------
echo
echo "==> [3/4] Verificando permisos dentro del .aab"

# ---------------------------------------------------------------------------
# El manifiesto de un `.aab` NO se lee con `aapt2 dump`.
#
# `aapt2` responde «could not identify format of APK»: un App Bundle no es un APK, y su
# manifiesto va en **protobuf**, no en el XML binario de Android. Se extrae del zip y se lee
# directamente.
#
# Y se buscan los permisos **precedidos de `uses-permission`**, no cualquier cadena que
# contenga «permission»: el manifiesto también nombra permisos en los atributos
# `android:permission` de sus componentes internos (`BIND_JOB_SERVICE`, `DUMP`, `c2dm.SEND`),
# que son permisos que un componente *exige a quien lo invoque*, no permisos que la app
# solicite. Confundirlos daría una lista alarmante y falsa.
# ---------------------------------------------------------------------------
TMP_MAN="$(mktemp -d)"

unzip -q -o "$AAB" 'base/manifest/AndroidManifest.xml' -d "$TMP_MAN"

PERMISOS="$(python3 - "$TMP_MAN/base/manifest/AndroidManifest.xml" <<'PY'
import re, sys

datos = open(sys.argv[1], 'rb').read().decode('latin-1')
patron = re.compile(
    r'((?:android|com|me)\.[A-Za-z0-9_.]*permission[A-Za-z0-9_.]*'
    r'|[A-Za-z0-9_.]*permission\.[A-Z_]+)'
)

declarados = set()
for etiqueta in re.finditer(r'uses-permission', datos):
    trozo = datos[etiqueta.start():etiqueta.start() + 300]
    nombres = patron.findall(trozo)
    if nombres:
        declarados.add(nombres[0])

for nombre in sorted(declarados):
    print(nombre)
PY
)"

if [[ -z "$PERMISOS" ]]; then
  echo "No se pudo leer ningún permiso del manifiesto del .aab." >&2
  echo "La verificación no puede darse por buena sin leerlos: no se sube." >&2
  exit 1
fi

echo "$PERMISOS" | sed 's/^/    /'

# El permiso del actualizador es el que hace que la tienda rechace la app. Que aparezca aquí
# significa que el prebuild no corrió con la variable apagada.
if grep -q 'REQUEST_INSTALL_PACKAGES' <<<"$PERMISOS"; then
  echo >&2
  echo "RECHAZADO: el .aab declara REQUEST_INSTALL_PACKAGES." >&2
  echo "El prebuild no corrió con EXPO_PUBLIC_UPDATER_ENABLED=false." >&2
  exit 1
fi

if grep -q 'SYSTEM_ALERT_WINDOW' <<<"$PERMISOS"; then
  echo >&2
  echo "RECHAZADO: el .aab declara SYSTEM_ALERT_WINDOW (dibujar sobre otras apps)." >&2
  echo "Debería quitarlo plugins/with-permisos-declarados.js (Fase 22)." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# 4. Verificar la URL dentro del bundle de JavaScript.
#
# Esto es lo que no se hizo en la Fase 21 y costó una compilación entera: comprobar la
# dirección **dentro del artefacto**, no fiarse de la variable que se pasó.
# ---------------------------------------------------------------------------
echo
echo "==> [4/4] Verificando la API dentro del bundle de JavaScript"

unzip -q -o "$AAB" 'base/assets/index.android.bundle' -d "$TMP_MAN" 2>/dev/null || true
BUNDLE="$TMP_MAN/base/assets/index.android.bundle"

if [[ -f "$BUNDLE" ]]; then
  # ---------------------------------------------------------------------------
  # El bundle es **bytecode de Hermes**, no JavaScript en texto.
  #
  # Un `grep` directo no encuentra nada —ni siquiera las URL de las librerías—, porque las
  # cadenas viven en una tabla del binario y aparecen pegadas unas a otras sin separador. Hay
  # que pasar `strings` primero, y buscar la dirección **contenida en** una línea, no como
  # línea completa: `https://notecore-api.ourocore.net` sale unida a la cadena siguiente.
  #
  # Sin esto la comprobación da un falso negativo y rechaza un artefacto correcto, que es
  # justo lo que pasó la primera vez que se ejecutó este script.
  # ---------------------------------------------------------------------------
  CADENAS="$(strings -n 8 "$BUNDLE")"

  if grep -qF "$API_URL" <<<"$CADENAS"; then
    echo "    La dirección $API_URL está en el bundle."
  else
    echo >&2
    echo "RECHAZADO: $API_URL no aparece en el bundle de JavaScript." >&2
    echo "Gradle reutilizó un bundle en caché. Es la trampa de la Fase 21." >&2
    exit 1
  fi

  if grep -qE 'localhost:3101|10\.0\.2\.2' <<<"$CADENAS"; then
    echo >&2
    echo "RECHAZADO: el bundle contiene una dirección de desarrollo." >&2
    exit 1
  fi
else
  echo "    Aviso: no se pudo extraer el bundle para comprobar la dirección." >&2
  echo "    Compruébalo a mano antes de subir." >&2
fi

# El `versionCode` sale de `app.json`, que es donde se escribe y lo que el prebuild copia al
# manifiesto. Leerlo del protobuf exigiría descodificar el formato entero para un dato que
# aquí solo se imprime como referencia.
VERSION_CODE="$(python3 -c "
import json
print(json.load(open('$MOVIL/app.json'))['expo']['android']['versionCode'])
" 2>/dev/null || true)"

TAM="$(du -h "$AAB" | cut -f1)"

echo
echo "==> Listo para subir a Play Store"
echo "    archivo       $AAB"
echo "    tamaño        $TAM"
[[ -n "$VERSION_CODE" ]] && echo "    versionCode   $VERSION_CODE"
echo "    permisos      $(wc -l <<<"$PERMISOS") declarados, sin el del actualizador"
echo
echo 'Antes de subirlo, pruébalo en un teléfono real (Fase 23: no se da por bueno'
echo 'un artefacto que solo se ha compilado):'
echo

# El alias sale del propio archivo de credenciales para que la orden se pueda copiar tal
# cual. La contraseña no se imprime: `bundletool` la pide por teclado si no se le pasa.
ALIAS="$(grep -E '^NOTECORE_KEY_ALIAS=' "$CLAVE" | tail -1 | cut -d= -f2- || true)"
ALMACEN="$(grep -E '^NOTECORE_STORE_FILE=' "$CLAVE" | tail -1 | cut -d= -f2- || true)"

echo "    bundletool build-apks --mode=universal \\"
echo "      --bundle=$AAB \\"
echo "      --output=/tmp/notecore.apks \\"
echo "      --ks=$ALMACEN \\"
echo "      --ks-key-alias=$ALIAS"
echo "    bundletool install-apks --apks=/tmp/notecore.apks"
