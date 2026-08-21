package net.ourocore.notecore.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.graphics.Color
import android.widget.RemoteViews
import org.json.JSONObject

/**
 * Widget compacto: la clase en curso o la próxima (FR-051).
 *
 * Este archivo **no decide qué clase mostrar**. Esa regla vive en
 * packages/shared/src/logic/next-class.ts y la ejecuta la app, que escribe el resultado ya
 * resuelto donde este proveedor lo lee. Es el Principio II: la lógica no se duplica en un
 * cliente, y menos en un lenguaje donde nadie la revisaría al cambiarla.
 *
 * ## Qué cambió en la Fase 16
 *
 * Encogió de 4×2 celdas a **3×1** y el nombre de la materia pasó de 17sp a 24sp: el
 * síntoma que abrió la fase era que ocupaba mucho para lo poco que mostraba. El aula y el
 * pie de "quedan N clases" se fueron al widget «Hoy», que es donde el día completo tiene
 * sitio; aquí la hora y el aula van juntas en una línea que redacta `widgetLineaCompacta`
 * en `shared`.
 *
 * También dejó de ser el único: ahora es la cabeza de una familia de cuatro. Los otros
 * tres —[DiaWidgetProvider], [FaltasWidgetProvider] y [AgendaWidgetProvider]— comparten
 * layout y pintor, y se refrescan con este en el mismo broadcast.
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

    /**
     * Clave del widget compacto.
     *
     * Sigue siendo `snapshot` y no se renombró en la Fase 16 a propósito: quien actualice
     * la app con el widget ya colocado tiene ese valor escrito en su teléfono, y cambiar
     * la clave le habría dejado el widget en blanco hasta la siguiente sincronización.
     */
    const val CLAVE = "snapshot"

    /** Clave del estado de los tres widgets de lista, guardado junto (Fase 16). */
    const val CLAVE_FAMILIA = "familia"

    /**
     * Repinta **todos los widgets colocados de las cuatro clases**.
     *
     * La llama el módulo nativo cada vez que la app guarda un estado nuevo. Van juntos y no
     * uno por uno porque los cuatro salen del mismo `widgetFamily()`: refrescarlos por
     * separado abriría la ventana en la que el widget del día ya cambió y el de faltas
     * todavía no.
     *
     * Si de una clase no hay ninguno colocado, sus `ids` vienen vacíos y no se hace nada.
     */
    fun refrescarTodos(context: Context) {
      val manager = AppWidgetManager.getInstance(context)

      refrescarClase(context, manager, HorarioWidgetProvider::class.java) {
        construirVista(context)
      }
      refrescarClase(context, manager, DiaWidgetProvider::class.java) {
        DiaWidgetProvider.construirVista(context)
      }
      refrescarClase(context, manager, FaltasWidgetProvider::class.java) {
        FaltasWidgetProvider.construirVista(context)
      }
      refrescarClase(context, manager, AgendaWidgetProvider::class.java) {
        AgendaWidgetProvider.construirVista(context)
      }
    }

    /**
     * Repinta los widgets de una clase, construyendo la vista **una sola vez**.
     *
     * La vista se construye fuera del bucle a propósito: leer y parsear el JSON por cada
     * widget colocado es trabajo repetido en el hilo principal del receptor, y con cuatro
     * clases y varios widgets de cada una se nota.
     */
    private fun refrescarClase(
      context: Context,
      manager: AppWidgetManager,
      clase: Class<*>,
      construir: () -> RemoteViews,
    ) {
      val ids = manager.getAppWidgetIds(ComponentName(context, clase))
      if (ids.isEmpty()) return

      val vista = construir()
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
          pintar(context, vista, JSONObject(json))
        } catch (e: Exception) {
          // Un JSON ilegible se trata como ausencia de datos: el widget nunca debe
          // reventar el lanzador del teléfono.
          pintarVacio(vista, context.getString(R.string.widget_sin_datos))
        }
      }

      // Tocar cualquier parte del widget abre la app en el horario (criterio de
      // verificación de la Fase 11: "el widget abre la vista correspondiente").
      vista.setOnClickPendingIntent(
        R.id.widget_raiz,
        PintorDeListas.intentHacia(context, "notecore://horario"),
      )

      return vista
    }

    private fun pintarVacio(vista: RemoteViews, mensaje: String) {
      vista.setTextViewText(R.id.widget_materia, mensaje)
      vista.setTextViewText(R.id.widget_hora, "")
      vista.setTextViewText(R.id.widget_cuando, "")
    }

    private fun pintar(context: Context, vista: RemoteViews, datos: JSONObject) {
      val materia = datos.optString("subjectName", "")

      if (materia.isEmpty()) {
        // `subjectShort` y no `whenLabel`: lo acorta `widgetMateriaCorta` en shared, porque
        // este hueco va a 24sp y «Sin horario todavía» no cabe entero.
        pintarVacio(vista, datos.optString("subjectShort", ""))
        return
      }

      vista.setTextViewText(R.id.widget_materia, materia)
      // `whenShort` y no `whenLabel`: lo acorta `widgetCuandoCorto` en shared para que
      // «Ahora mismo» no le robe el ancho a la materia. Ver la nota de esa función.
      vista.setTextViewText(R.id.widget_cuando, datos.optString("whenShort", ""))

      // La hora y el aula llegan ya compuestas en una línea: las redacta
      // `widgetLineaCompacta` en shared, para que este archivo no decida qué recortar
      // cuando el aula es larga.
      vista.setTextViewText(R.id.widget_hora, datos.optString("compactLine", ""))

      // El color de la materia es dato que viene de la base de datos, no un token: se
      // aplica al vuelo sobre la barra lateral.
      PintorDeListas.aplicarColorDeFondo(vista, R.id.widget_barra, datos.optString("color", ""))

      // Verde si la clase está ocurriendo, acento si aún no. Lo decide `widgetColorCuando`
      // en shared, que es la misma señal que usa el inicio de la app.
      val colorCuando = datos.optString("whenColor", "")
      if (colorCuando.startsWith("#")) {
        try {
          vista.setTextColor(R.id.widget_cuando, Color.parseColor(colorCuando))
        } catch (e: IllegalArgumentException) {
          // Se queda con el acento del layout. No es motivo para no mostrar la clase.
        }
      }
    }
  }
}
