#!/usr/bin/env bash
#
# Publica un APK para que el actualizador de la app lo ofrezca (Fase 17).
#
# Copia el binario al directorio de publicación, calcula su SHA-256 y escribe el
# `latest.json` que la API lee. A partir de ahí, la app avisa sola en su próximo arranque.
#
# ## Lo que hace este script y por qué no se hace a mano
#
# Publicar son cuatro pasos y **tres de ellos fallan en silencio** si se saltan:
#
#   1. Copiar el APK — si no se copia, la API detecta que falta y no anuncia nada
#   2. Calcular su SHA-256 — si se pega mal, la app descarga y rechaza la instalación
#   3. Leer el `versionCode` del propio APK — si se escribe a mano y no coincide, la app
#      compara contra un número equivocado y nadie recibe la actualización
#   4. Escribir el `latest.json`
#
# El paso 3 es el que más veces se hará mal, porque el `versionCode` no se ve por ningún
# lado: hay que sacarlo del APK con `aapt`. Este script lo lee del binario, no de `app.json`,
# para que sea imposible publicar un manifiesto que no describa el archivo que lo acompaña.
#
# ## Uso
#
#   scripts/publicar-apk.sh <ruta-al-apk> [notas de la versión]
#
# Ejemplo:
#   scripts/publicar-apk.sh apps/mobile/android/app/build/outputs/apk/release/app-release.apk \
#     "Arregla el widget de faltas y añade cuatrimestres."
#
# El directorio de destino sale de `RELEASES_HOST_DIR` en `.env`, o `./releases` por defecto.

set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ $# -lt 1 ]]; then
  echo "Uso: $0 <ruta-al-apk> [notas de la versión]" >&2
  exit 1
fi

APK="$1"
NOTAS="${2:-}"

if [[ ! -f "$APK" ]]; then
  echo "No existe el APK: $APK" >&2
  exit 1
fi

# El destino sale del `.env` si está; si no, `./releases` junto al repositorio.
DESTINO="${RELEASES_HOST_DIR:-}"
if [[ -z "$DESTINO" && -f "$RAIZ/.env" ]]; then
  DESTINO="$(grep -E '^RELEASES_HOST_DIR=' "$RAIZ/.env" | tail -1 | cut -d= -f2- || true)"
fi
DESTINO="${DESTINO:-$RAIZ/releases}"
# Las rutas relativas del `.env` son relativas a `infra/` (es donde vive el compose).
[[ "$DESTINO" = /* ]] || DESTINO="$RAIZ/infra/$DESTINO"

mkdir -p "$DESTINO"

# ---------------------------------------------------------------------------
# El `versionCode` y el `versionName` se leen DEL APK, no de `app.json`.
#
# Es la única forma de garantizar que el manifiesto describe el binario que lo acompaña.
# Publicar un `versionCode` mayor que el del APK haría que la app se descargara la
# actualización una y otra vez: Android instalaría el binario real —con su código menor—, la
# app volvería a compararse contra el número publicado y volvería a creerse desactualizada.
# ---------------------------------------------------------------------------
AAPT="$(command -v aapt2 || command -v aapt || true)"
if [[ -z "$AAPT" ]]; then
  # `aapt` vive en el SDK de Android y no siempre está en el PATH.
  AAPT="$(find "${ANDROID_HOME:-$HOME/Android/Sdk}/build-tools" -name 'aapt2' -type f 2>/dev/null | sort -V | tail -1 || true)"
fi

if [[ -z "$AAPT" ]]; then
  echo "No se encontró aapt/aapt2 (viene en el SDK de Android, en build-tools)." >&2
  echo "Sin él no se puede leer el versionCode del APK, y escribirlo a mano es" >&2
  echo "exactamente el error que este script existe para evitar." >&2
  exit 1
fi

BADGING="$("$AAPT" dump badging "$APK")"
VERSION_CODE="$(sed -n "s/.*versionCode='\([0-9]*\)'.*/\1/p" <<<"$BADGING" | head -1)"
VERSION_NAME="$(sed -n "s/.*versionName='\([^']*\)'.*/\1/p" <<<"$BADGING" | head -1)"

if [[ -z "$VERSION_CODE" || -z "$VERSION_NAME" ]]; then
  echo "No se pudo leer versionCode/versionName del APK." >&2
  exit 1
fi

NOMBRE="NoteCore-${VERSION_NAME}-${VERSION_CODE}.apk"

cp "$APK" "$DESTINO/$NOMBRE"

# La suma se calcula sobre el archivo YA COPIADO, no sobre el original: si la copia se
# truncara por falta de espacio, una suma del original daría por bueno un archivo incompleto.
SHA="$(sha256sum "$DESTINO/$NOMBRE" | cut -d' ' -f1)"
echo "$SHA  $NOMBRE" > "$DESTINO/$NOMBRE.sha256"

cat > "$DESTINO/latest.json" <<JSON
{
  "versionCode": $VERSION_CODE,
  "versionName": "$VERSION_NAME",
  "file": "$NOMBRE",
  "sha256": "$SHA",
  "notes": $(printf '%s' "$NOTAS" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'),
  "publishedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON

echo "Publicado en $DESTINO"
echo "  versión     $VERSION_NAME (versionCode $VERSION_CODE)"
echo "  archivo     $NOMBRE"
echo "  sha256      $SHA"
echo
echo 'La API lo sirve sin reiniciar: latest.json se relee en cada petición.'
echo "Comprueba con:  curl -s \$PUBLIC_API_URL/releases/android/latest | python3 -m json.tool"
