package net.ourocore.notecore.actualizador

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.content.FileProvider
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

/**
 * Descarga, verifica e instala el APK de una versión nueva (FR-052, Fase 17).
 *
 * ## Reparto de trabajo, igual que con el widget
 *
 * **La app decide, este módulo ejecuta.** Cuál es la última versión y si hay que actualizar
 * lo resuelve `hayActualizacion()` en `@notecore/shared`; aquí solo llega una URL y una suma
 * de verificación que ya se consideraron buenas. Este Kotlin no compara versiones ni habla
 * con la API: si lo hiciera, la regla existiría en dos idiomas.
 *
 * ## Lo que sí decide, porque solo se puede decidir aquí
 *
 * 1. **Que el binario descargado es el anunciado**, comparando su SHA-256. Esa comprobación
 *    tiene que ocurrir donde está el archivo, y el archivo está en el teléfono
 * 2. **Que Android tiene permiso para instalar** desde esta app, que es un estado del sistema
 *
 * ## Por qué el permiso se pide y no se da por hecho
 *
 * Desde Android 8, `REQUEST_INSTALL_PACKAGES` en el manifiesto **no basta**: el usuario tiene
 * que autorizar «instalar apps desconocidas» para esta app concreta, en una pantalla de
 * Ajustes a la que solo se llega con un intent. Lanzar el instalador sin ese permiso falla en
 * silencio —el diálogo simplemente no aparece— y desde fuera se ve como si el botón no
 * hiciera nada.
 */
class ActualizadorModule : Module() {

  /**
   * Dónde se guarda el APK descargado.
   *
   * En el directorio de caché **externo** de la app, no en el interno. No es una preferencia:
   * el instalador de Android es otro proceso y tiene que poder leer el archivo, y aunque el
   * `FileProvider` es lo que le concede ese acceso, el directorio interno añade restricciones
   * que en algunos fabricantes hacen fallar la lectura sin ningún mensaje útil.
   *
   * Es caché a propósito: si el sistema lo borra por falta de espacio, lo peor que pasa es
   * que haya que descargar otra vez. Un APK de decenas de megabytes no merece ocupar
   * almacenamiento permanente después de instalarse.
   */
  private fun directorio(context: Context): File =
    File(context.externalCacheDir ?: context.cacheDir, "actualizaciones").apply { mkdirs() }

  /** El SHA-256 de un archivo, en hexadecimal minúsculas: la forma que publica la API. */
  private fun sha256De(archivo: File): String {
    val digest = MessageDigest.getInstance("SHA-256")
    archivo.inputStream().use { entrada ->
      val bloque = ByteArray(8192)
      while (true) {
        val leidos = entrada.read(bloque)
        if (leidos <= 0) break
        digest.update(bloque, 0, leidos)
      }
    }
    return digest.digest().joinToString("") { "%02x".format(it) }
  }

  override fun definition() = ModuleDefinition {
    Name("Actualizador")

    /**
     * El `versionCode` de **esta** instalación.
     *
     * Es el dato que la app compara contra el publicado, y tiene que salir del paquete
     * instalado y no de una constante en JavaScript: una constante se olvida de actualizar al
     * publicar, y entonces la app se cree en otra versión de la que está.
     *
     * `longVersionCode` desde API 28; por debajo, el `versionCode` de siempre.
     */
    Function("versionInstalada") {
      val context: Context = appContext.reactContext ?: return@Function 0
      val info = context.packageManager.getPackageInfo(context.packageName, 0)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        info.longVersionCode.toInt()
      } else {
        @Suppress("DEPRECATION")
        info.versionCode
      }
    }

    /**
     * Si el usuario ya autorizó a esta app a instalar paquetes.
     *
     * Por debajo de Android 8 no existe el permiso por app —lo controlaba un ajuste global—,
     * así que se responde `true` y el instalador se encarga de lo que corresponda.
     */
    Function("puedeInstalar") {
      val context: Context = appContext.reactContext ?: return@Function false
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return@Function true
      context.packageManager.canRequestPackageInstalls()
    }

    /**
     * Abre los Ajustes donde el usuario concede el permiso de instalación.
     *
     * No hay forma de concederlo desde la app: lo otorga la persona en una pantalla del
     * sistema. Lo único que se puede hacer es llevarla directamente ahí en lugar de pedirle
     * que la busque.
     */
    AsyncFunction("pedirPermisoDeInstalacion") {
      val context: Context = appContext.reactContext ?: return@AsyncFunction false
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return@AsyncFunction true
      val intent = Intent(
        android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
        Uri.parse("package:${context.packageName}"),
      ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      true
    }

    /**
     * Descarga el APK y comprueba su suma antes de devolverlo.
     *
     * **Verificar es parte de descargar, no un paso aparte que la app pueda saltarse.** Si
     * fueran dos funciones, un camino de la interfaz acabaría llamando a instalar sin haber
     * verificado —el caso típico es un reintento— y ese es exactamente el fallo del que
     * protege la suma. Aquí, o el archivo coincide o no hay archivo.
     *
     * Un APK que no coincide **se borra**: dejarlo en caché haría que el siguiente intento se
     * encontrara un archivo con el nombre correcto y lo diera por bueno.
     *
     * Devuelve la ruta del archivo verificado.
     */
    AsyncFunction("descargar") { url: String, sha256Esperado: String, nombre: String ->
      val context: Context = appContext.reactContext
        ?: throw CodedException("sin_contexto", "La app no está lista para descargar.", null)

      /*
       * El nombre viene del lado JS, así que se recorta a su última parte.
       *
       * Un nombre con `../` dentro escribiría fuera del directorio de caché. Hoy lo compone
       * la propia app a partir de la versión, pero el dato original viene de la API, y
       * acotarlo aquí cuesta una línea.
       */
      val destino = File(directorio(context), File(nombre).name)
      if (destino.exists()) destino.delete()

      val conexion = (URL(url).openConnection() as HttpURLConnection).apply {
        connectTimeout = 30_000
        readTimeout = 60_000
        instanceFollowRedirects = true
      }

      try {
        if (conexion.responseCode !in 200..299) {
          throw CodedException(
            "descarga_fallida",
            "El servidor respondió ${conexion.responseCode} al pedir la actualización.",
            null,
          )
        }

        conexion.inputStream.use { entrada ->
          destino.outputStream().use { salida -> entrada.copyTo(salida) }
        }
      } catch (e: CodedException) {
        destino.delete()
        throw e
      } catch (e: Exception) {
        destino.delete()
        throw CodedException("descarga_fallida", "No se pudo descargar la actualización.", e)
      } finally {
        conexion.disconnect()
      }

      val obtenido = sha256De(destino)
      if (!obtenido.equals(sha256Esperado, ignoreCase = true)) {
        destino.delete()
        throw CodedException(
          "verificacion_fallida",
          "La descarga no coincide con la versión publicada. No se instaló nada.",
          null,
        )
      }

      destino.absolutePath
    }

    /**
     * Lanza el instalador de Android sobre un APK ya descargado y verificado.
     *
     * El archivo se entrega por un `FileProvider` y no como `file://`: desde Android 7 pasar
     * una ruta de archivo directa a otro proceso lanza `FileUriExposedException` y **tumba la
     * app**. La URI del proveedor, con `FLAG_GRANT_READ_URI_PERMISSION`, es la única forma de
     * que el instalador —que es otro proceso— pueda leer el archivo.
     *
     * A partir de aquí decide Android y decide el usuario: el sistema muestra su diálogo de
     * instalación, y esta app no puede saltárselo ni saber cómo termina. Si el APK está
     * firmado con otra clave, el sistema lo rechaza ahí, y es lo correcto —esa comprobación
     * es lo que impide que un binario ajeno sustituya la app—.
     */
    AsyncFunction("instalar") { ruta: String ->
      val context: Context = appContext.reactContext
        ?: throw CodedException("sin_contexto", "La app no está lista para instalar.", null)

      val archivo = File(ruta)
      if (!archivo.exists()) {
        throw CodedException(
          "sin_archivo",
          "La descarga ya no está en el teléfono. Vuelve a intentarlo.",
          null,
        )
      }

      val uri: Uri = FileProvider.getUriForFile(
        context,
        "${context.packageName}.actualizador",
        archivo,
      )

      val intent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(uri, "application/vnd.android.package-archive")
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        // Se lanza desde fuera de una actividad, así que necesita su propia tarea.
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }

      /*
       * Que haya alguien que atienda el intent se comprueba antes de lanzarlo.
       *
       * `startActivity` sin destino lanza `ActivityNotFoundException`, que en release
       * cerraría la app. Pasa en emuladores sin el instalador de paquetes, que es justo donde
       * se prueba esto.
       */
      if (intent.resolveActivity(context.packageManager) == null) {
        throw CodedException(
          "sin_instalador",
          "Este dispositivo no tiene con qué instalar el archivo.",
          null,
        )
      }

      context.startActivity(intent)
      true
    }

    /**
     * Borra los APK descargados.
     *
     * Se llama después de lanzar el instalador no —el archivo tiene que seguir ahí mientras
     * el diálogo del sistema está abierto— sino al comprobar, al abrir la app, que ya se está
     * ejecutando una versión igual o más nueva que la descargada. Ese es el momento en que el
     * archivo dejó de servir para algo, y son decenas de megabytes.
     */
    AsyncFunction("limpiarDescargas") {
      val context: Context = appContext.reactContext ?: return@AsyncFunction false
      directorio(context).listFiles()?.forEach { it.delete() }
      true
    }
  }
}
