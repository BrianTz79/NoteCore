package net.ourocore.notecore.widget

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject

/**
 * Pinta los tres widgets de lista de la Fase 16: «Hoy», «Faltas» y «Vence pronto».
 *
 * ## Este archivo no decide nada
 *
 * Recibe un JSON que la app ya resolvió con `widgetDia()`, `widgetFaltas()` o
 * `widgetAgenda()` de `packages/shared/src/logic/widgets.ts`, y lo único que hace es
 * colocar cadenas en `TextView`s y colores en barras. **Ninguna regla vive aquí**: ni qué
 * materia está cerca del límite, ni qué actividad urge, ni cuántas filas caben —eso último
 * también lo decide `shared`, con `WIDGET_MAX_FILAS`—.
 *
 * Es el Principio II llevado hasta el lanzador. Si este archivo interpretara los datos, la
 * regla existiría en TypeScript y en Kotlin, y la copia de Kotlin envejecería sin que nadie
 * la revisara: nadie abre un widget para auditar una regla de negocio.
 *
 * ## Un solo pintor para los tres
 *
 * Los tres widgets tienen la misma forma —encabezado, hasta tres filas, pie— así que
 * comparten layout y comparten este código. Tres copias habrían divergido a la primera
 * corrección hecha en una y olvidada en las otras dos, que es exactamente lo que pasó con
 * la paleta antes de la Fase 11.
 */
internal object PintorDeListas {

  /**
   * Los ids de una fila, agrupados.
   *
   * Las tres filas son archivos de layout distintos con ids numerados y **no tres
   * `include` del mismo layout**: un `RemoteViews` direcciona las vistas por id global, sin
   * recorrer el árbol, así que tres copias con el mismo `fila_titulo` mostrarían las tres
   * el texto de la primera. Esta tabla es lo que sustituye a ese recorrido.
   */
  private data class IdsDeFila(
    val raiz: Int,
    val barra: Int,
    val titulo: Int,
    val detalle: Int,
    val cola: Int,
  )

  private val FILAS = listOf(
    IdsDeFila(R.id.fila_1_raiz, R.id.fila_1_barra, R.id.fila_1_titulo, R.id.fila_1_detalle, R.id.fila_1_cola),
    IdsDeFila(R.id.fila_2_raiz, R.id.fila_2_barra, R.id.fila_2_titulo, R.id.fila_2_detalle, R.id.fila_2_cola),
    IdsDeFila(R.id.fila_3_raiz, R.id.fila_3_barra, R.id.fila_3_titulo, R.id.fila_3_detalle, R.id.fila_3_cola),
  )

  /**
   * Título que se muestra cuando todavía no hay datos que pintar.
   *
   * Sale de los recursos y **no de `clave.uppercase()`**, que era lo que hacía antes: eso
   * ponía «DIA» —sin tilde— y «AGENDA» en la cabecera, que son los nombres técnicos de las
   * claves del JSON, no los que el widget usa cuando sí tiene datos. Un widget que cambia
   * de nombre al cerrar sesión parece otro widget.
   */
  private fun tituloVacio(context: Context, clave: String): String = when (clave) {
    "dia" -> context.getString(R.string.widget_lista_titulo_dia)
    "faltas" -> context.getString(R.string.widget_lista_titulo_faltas)
    "agenda" -> context.getString(R.string.widget_lista_titulo_agenda)
    else -> ""
  }

  /**
   * Construye la vista de un widget de lista.
   *
   * @param clave Cuál de los tres estados leer del JSON guardado: "dia", "faltas", "agenda".
   * @param destino Ruta de la app que se abre al tocarlo: `notecore://horario`, etc.
   */
  fun construir(context: Context, clave: String, destino: String): RemoteViews {
    val vista = RemoteViews(context.packageName, R.layout.widget_lista)

    val guardado = context
      .getSharedPreferences(HorarioWidgetProvider.PREFS, Context.MODE_PRIVATE)
      .getString(HorarioWidgetProvider.CLAVE_FAMILIA, null)

    try {
      val familia = if (guardado.isNullOrBlank()) null else JSONObject(guardado)
      val datos = familia?.optJSONObject(clave)

      if (datos == null) {
        // Nadie ha iniciado sesión todavía, o la app no se ha abierto desde que se
        // instaló. Se dice con claridad en lugar de mostrar un widget en blanco.
        pintarVacio(
          vista,
          tituloVacio(context, clave),
          context.getString(R.string.widget_lista_sin_datos),
        )
      } else {
        pintar(context, vista, datos)
      }
    } catch (e: Exception) {
      // Un JSON ilegible se trata como ausencia de datos: el widget nunca debe reventar el
      // lanzador del teléfono.
      pintarVacio(
        vista,
        tituloVacio(context, clave),
        context.getString(R.string.widget_lista_sin_datos),
      )
    }

    vista.setOnClickPendingIntent(R.id.widget_raiz, intentHacia(context, destino))
    return vista
  }

  /**
   * Abre la app en la pantalla que corresponde a cada widget.
   *
   * El intent es **implícito, por esquema**, y no apunta a `MainActivity`: este módulo vive
   * en su propia biblioteca de Android y la app depende de él, no al revés. Importar la
   * actividad invertiría esa dependencia; el esquema `notecore://` que el manifiesto ya
   * registra hace el mismo trabajo sin tocar la estructura.
   *
   * El `requestCode` es el hash de la ruta y no un 0 fijo: con el mismo código, los cuatro
   * widgets compartirían el mismo `PendingIntent` y `FLAG_UPDATE_CURRENT` haría que el
   * último en crearse reescribiera el destino de todos —los cuatro abrirían la misma
   * pantalla—.
   */
  fun intentHacia(context: Context, destino: String): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW).apply {
      setPackage(context.packageName)
      data = Uri.parse(destino)
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }

    return PendingIntent.getActivity(
      context,
      destino.hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun pintarVacio(vista: RemoteViews, titulo: String, mensaje: String) {
    vista.setTextViewText(R.id.lista_titulo, titulo)
    vista.setTextViewText(R.id.lista_resumen, "")
    vista.setTextViewText(R.id.lista_vacio, mensaje)
    vista.setViewVisibility(R.id.lista_vacio, View.VISIBLE)
    vista.setViewVisibility(R.id.lista_pie, View.GONE)
    for (fila in FILAS) vista.setViewVisibility(fila.raiz, View.GONE)
  }

  private fun pintar(context: Context, vista: RemoteViews, datos: JSONObject) {
    vista.setTextViewText(R.id.lista_titulo, datos.optString("title", ""))
    vista.setTextViewText(R.id.lista_resumen, datos.optString("summary", ""))

    val filas = datos.optJSONArray("rows")
    val cuantas = filas?.length() ?: 0

    if (cuantas == 0) {
      pintarVacio(
        vista,
        datos.optString("title", ""),
        datos.optString("emptyMessage", context.getString(R.string.widget_lista_sin_datos)),
      )
      return
    }

    vista.setViewVisibility(R.id.lista_vacio, View.GONE)

    for ((indice, ids) in FILAS.withIndex()) {
      if (indice >= cuantas) {
        vista.setViewVisibility(ids.raiz, View.GONE)
        continue
      }

      val fila = filas!!.getJSONObject(indice)
      vista.setViewVisibility(ids.raiz, View.VISIBLE)
      vista.setTextViewText(ids.titulo, fila.optString("title", ""))
      vista.setTextViewText(ids.detalle, fila.optString("detail", ""))
      vista.setTextViewText(ids.cola, fila.optString("trailing", ""))

      // El color viene de la materia o de la urgencia, resuelto en `shared`. Aquí solo se
      // aplica.
      aplicarColorDeFondo(vista, ids.barra, fila.optString("color", ""))

      // `alert` marca lo que exige atención —una falta pasada del límite, una entrega
      // vencida— y se señala tiñendo el título. Solo eso: si además cambiara el fondo o el
      // tamaño, dos filas de alerta llenarían el widget de rojo y el rojo dejaría de
      // significar algo.
      val colorTitulo =
        if (fila.optBoolean("alert", false)) R.color.nc_error else R.color.nc_tinta
      vista.setTextColor(ids.titulo, context.getColor(colorTitulo))
    }

    val pie = datos.optString("footer", "")
    if (pie.isEmpty()) {
      vista.setViewVisibility(R.id.lista_pie, View.GONE)
    } else {
      vista.setViewVisibility(R.id.lista_pie, View.VISIBLE)
      vista.setTextViewText(R.id.lista_pie, pie)
    }
  }

  /**
   * Pinta el fondo de una vista con un color `#RRGGBB` que viene de los datos.
   *
   * Un color inválido deja el drawable como está. No es motivo para no mostrar la fila: el
   * color es la señal secundaria, el texto es el dato.
   */
  fun aplicarColorDeFondo(vista: RemoteViews, id: Int, color: String) {
    if (!color.startsWith("#")) return
    try {
      vista.setInt(id, "setBackgroundColor", Color.parseColor(color))
    } catch (e: IllegalArgumentException) {
      // Deliberadamente vacío: ver la nota de arriba.
    }
  }
}
