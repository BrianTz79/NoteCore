package net.ourocore.notecore.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject

/**
 * Widget de pantalla principal: la clase en curso o la próxima (FR-051).
 *
 * Este archivo **no decide qué clase mostrar**. Esa regla vive en
 * packages/shared/src/logic/next-class.ts y la ejecuta la app, que escribe el resultado ya
 * resuelto donde este proveedor lo lee. Es el Principio II: la lógica no se duplica en un
 * cliente, y menos en un lenguaje donde nadie la revisaría al cambiarla.
 */
class HorarioWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray,
  ) {
    for (id in appWidgetIds) {
      appWidgetManager.updateAppWidget(id, construirVista(context))
    }
  }

  companion object {
    /** Donde la app deja el estado ya resuelto. Debe coincidir con WidgetHorarioModule. */
    const val PREFS = "notecore_widget"
    const val CLAVE = "snapshot"

    /**
     * Repinta todos los widgets colocados.
     *
     * La llama el módulo nativo cada vez que la app guarda un estado nuevo. Si no hay
     * ninguno colocado, `ids` viene vacío y no se hace nada.
     */
    fun refrescarTodos(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(
        ComponentName(context, HorarioWidgetProvider::class.java),
      )
      val vista = construirVista(context)
      for (id in ids) manager.updateAppWidget(id, vista)
    }

    private fun construirVista(context: Context): RemoteViews {
      val vista = RemoteViews(context.packageName, R.layout.widget_horario)

      val json = context
        .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .getString(CLAVE, null)

      if (json.isNullOrBlank()) {
        // Nadie ha iniciado sesión todavía, o la app no se ha abierto desde que se
        // instaló. Se dice con claridad en lugar de mostrar un widget en blanco.
        pintarVacio(vista, context.getString(R.string.widget_sin_datos))
      } else {
        try {
          pintar(vista, JSONObject(json))
        } catch (e: Exception) {
          // Un JSON ilegible se trata como ausencia de datos: el widget nunca debe
          // reventar el lanzador del teléfono.
          pintarVacio(vista, context.getString(R.string.widget_sin_datos))
        }
      }

      // Tocar cualquier parte del widget abre la app en el horario (criterio de
      // verificación de la Fase 11: "el widget abre la vista correspondiente").
      /*
       * La actividad se resuelve por el esquema `notecore://` y no por su clase.
       *
       * Este módulo no puede importar `MainActivity`: vive en su propia biblioteca de
       * Android y la app depende de él, no al revés. El intent implícito con el esquema
       * que el manifiesto ya registra hace el mismo trabajo sin invertir la dependencia.
       */
      val intent = Intent(Intent.ACTION_VIEW).apply {
        setPackage(context.packageName)
        data = android.net.Uri.parse("notecore://horario")
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      }
      val pending = PendingIntent.getActivity(
        context,
        0,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      vista.setOnClickPendingIntent(R.id.widget_raiz, pending)

      return vista
    }

    private fun pintarVacio(vista: RemoteViews, mensaje: String) {
      vista.setTextViewText(R.id.widget_materia, mensaje)
      vista.setTextViewText(R.id.widget_hora, "")
      vista.setTextViewText(R.id.widget_cuando, "")
      vista.setViewVisibility(R.id.widget_aula, View.GONE)
      vista.setTextViewText(R.id.widget_pie, "")
    }

    private fun pintar(vista: RemoteViews, datos: JSONObject) {
      val materia = datos.optString("subjectName", "")

      if (materia.isEmpty()) {
        pintarVacio(vista, datos.optString("whenLabel", ""))
        return
      }

      vista.setTextViewText(R.id.widget_materia, materia)
      vista.setTextViewText(R.id.widget_hora, datos.optString("timeRange", ""))
      vista.setTextViewText(R.id.widget_cuando, datos.optString("whenLabel", ""))

      val aula = datos.optString("room", "")
      if (aula.isEmpty() || aula == "null") {
        vista.setViewVisibility(R.id.widget_aula, View.GONE)
      } else {
        vista.setViewVisibility(R.id.widget_aula, View.VISIBLE)
        vista.setTextViewText(R.id.widget_aula, aula)
      }

      // El color de la materia es dato que viene de la base de datos, no un token: se
      // aplica al vuelo sobre la barra lateral.
      val color = datos.optString("color", "")
      if (color.startsWith("#")) {
        try {
          vista.setInt(R.id.widget_barra, "setBackgroundColor", Color.parseColor(color))
        } catch (e: IllegalArgumentException) {
          // Un color inválido deja la barra con el acento del drawable. No es motivo
          // para no mostrar la clase.
        }
      }

      val quedan = datos.optInt("remainingToday", 0)
      vista.setTextViewText(
        R.id.widget_pie,
        when (quedan) {
          0 -> "No quedan clases hoy"
          1 -> "Queda 1 clase hoy"
          else -> "Quedan $quedan clases hoy"
        },
      )
    }
  }
}
