/**
 * El texto de la política de privacidad (Fase 19).
 *
 * ## Por qué el texto vive en `shared` y no en la página web
 *
 * Porque hay **tres** sitios que tienen que decir exactamente lo mismo: la página pública de
 * la web —la que Google revisa sin instalar nada—, la pantalla dentro de la app, y el
 * cuestionario de Data Safety de la consola de Play. Los dos primeros son código y pueden
 * compartir origen; el tercero es un formulario que se rellena a mano, y por eso este archivo
 * exporta además `DATOS_DECLARADOS`, que es la lista contra la que se rellena.
 *
 * Si el texto viviera en `apps/web`, la app tendría que copiarlo, y una política copiada es
 * una política que diverge: se corrige una frase en un cliente y en el otro se queda la
 * anterior. Google compara la política con lo declarado, y dos versiones distintas del mismo
 * documento son exactamente el hallazgo que suspende una publicación.
 *
 * ## La regla que gobierna este archivo
 *
 * **Todo lo que aquí se enumera existe en el esquema, y todo lo que el esquema guarda está
 * aquí.** No es una redacción legal genérica: cada entrada nombra los campos reales de las
 * tablas de `apps/api/src/db/schema.ts`. Al añadir una columna que guarde algo de la persona,
 * se añade aquí — y si no se puede explicar aquí, probablemente no se debería guardar.
 */

/** Cuándo se revisó por última vez, para que la página pueda decirlo. */
export const PRIVACIDAD_ACTUALIZADA = '2026-08-21';

/**
 * Contacto para ejercer derechos sobre los datos.
 *
 * Es el correo del responsable del proyecto, y Google exige que sea uno alcanzable de verdad:
 * el revisor puede escribir a comprobar.
 */
export const PRIVACIDAD_CONTACTO = 'lucio.tellez@gmail.com';

/**
 * Las cadenas de este archivo van en **texto plano, sin Markdown**.
 *
 * Las pintan tres sitios con motores distintos —una página de Next, una pantalla de React
 * Native y el formulario de la consola de Play—, y ninguno interpreta Markdown: unos
 * asteriscos de énfasis salen como asteriscos literales en la pantalla, que es como se
 * descubrió. El énfasis que haga falta lo pone cada cliente con sus propios elementos.
 */

/** Un dato que se recoge, con su justificación y su origen en el esquema. */
export interface DatoDeclarado {
  /** Cómo lo llamaría la persona, no cómo se llama la columna. */
  readonly que: string;
  /** Las columnas y tablas reales que lo guardan. Es lo que hace el texto comprobable. */
  readonly donde: string;
  /** Para qué sirve. Si no hay un para qué claro, el dato sobra. */
  readonly paraQue: string;
  /** `true` si la persona puede no darlo y la app sigue funcionando. */
  readonly opcional: boolean;
}

/**
 * Todo lo que NoteCore guarda de una persona.
 *
 * Es la lista que se traslada al cuestionario de Data Safety. El orden va de lo que hace
 * falta para entrar a lo que la persona añade por su cuenta.
 */
export const DATOS_DECLARADOS: readonly DatoDeclarado[] = [
  {
    que: 'Correo electrónico',
    donde: 'users.email',
    paraQue: 'Es con lo que entras. No se usa para enviarte nada más.',
    opcional: false,
  },
  {
    que: 'Nombre y @usuario',
    donde: 'users.display_name, users.username',
    paraQue: 'Para que tus compañeros te encuentren y te reconozcan al compartir.',
    opcional: false,
  },
  {
    que: 'Contraseña',
    donde: 'users.password_hash',
    paraQue:
      'Se guarda cifrada con bcrypt, nunca en claro. Ni siquiera quien administra el servidor puede leerla.',
    opcional: false,
  },
  {
    que: 'Perfil ampliado: descripción, carrera, escuela y edad',
    donde: 'users.bio, users.career, users.school, users.age',
    paraQue: 'Lo que quieras contar de ti. Puedes dejarlo vacío entero.',
    opcional: true,
  },
  {
    que: 'Tu ajuste de visibilidad del perfil',
    donde: 'users.profile_visibility',
    paraQue:
      'Si tu perfil ampliado y tus publicaciones los ven todos o solo tus contactos. Arranca en «solo contactos».',
    opcional: false,
  },
  {
    que: 'Tu horario: materias, aulas y horas de clase',
    donde: 'subjects, schedule_blocks',
    paraQue: 'Es la función principal de la app: saber qué clase toca.',
    opcional: true,
  },
  {
    que: 'Tus faltas',
    donde: 'absence_records',
    paraQue: 'Para contarlas contra el límite de cada materia y avisarte antes de pasarte.',
    opcional: true,
  },
  {
    que: 'Tu agenda: tareas, proyectos y exámenes',
    donde: 'agenda_items',
    paraQue: 'Para recordarte lo que tienes que entregar.',
    opcional: true,
  },
  {
    que: 'Tus periodos: semestres y cuatrimestres',
    donde: 'semesters',
    paraQue: 'Para separar lo de este periodo de lo que ya cerraste.',
    opcional: true,
  },
  {
    que: 'Tus contactos y solicitudes',
    donde: 'contacts',
    paraQue: 'Para saber con quién puedes escribirte y a quién bloqueaste.',
    opcional: true,
  },
  {
    que: 'Tus publicaciones',
    donde: 'posts',
    paraQue: 'El texto que publicas en tu perfil, visible según lo que tengas configurado.',
    opcional: true,
  },
  {
    que: 'Tus mensajes',
    donde: 'conversations, messages',
    paraQue:
      'Para entregarlos a la persona con la que hablas. Se guardan sin cifrado extremo a extremo: quien administra el servidor tendría acceso técnico a la base de datos, aunque el producto no ofrece ninguna pantalla para leerlos.',
    opcional: true,
  },
  {
    que: 'Lo que compartes por QR, código o enlace',
    donde: 'shares',
    paraQue:
      'Una copia congelada de tu horario o tu agenda, que caduca sola y puedes retirar cuando quieras.',
    opcional: true,
  },
  {
    que: 'Tus ajustes de recordatorios',
    donde: 'user_settings',
    paraQue: 'Si quieres avisos de tus entregas, con cuánta anticipación y a qué hora.',
    opcional: true,
  },
  {
    que: 'Tus sesiones abiertas',
    donde: 'sessions',
    paraQue:
      'Para mantenerte dentro sin volver a escribir la contraseña, y para que puedas cerrar la sesión de un dispositivo desde otro. Guarda de qué cliente vino (app o navegador), cuándo se usó por última vez y qué versión de la app tiene instalada.',
    opcional: false,
  },
];

/**
 * Lo que NoteCore **no** hace.
 *
 * Va en la política a propósito y no solo como omisión: en una app de estudiantes, «no hay
 * analítica ni anunciantes» es información que la persona quiere leer explícitamente, y
 * Google lo pregunta campo por campo en Data Safety. Decir "no" a cada uno por escrito es
 * más rápido de verificar que deducirlo de lo que no se menciona.
 */
export const NO_SE_HACE: readonly string[] = [
  'No hay publicidad ni anunciantes.',
  'No hay analítica de terceros: ni Google Analytics, ni Firebase, ni ninguna otra.',
  'No se venden ni se ceden datos a nadie.',
  'No se rastrea tu ubicación. La app nunca pide ese permiso.',
  'No se leen tus contactos del teléfono.',
  'No se guardan fotos ni vídeos: la app no tiene forma de subirlos.',
];

/**
 * Los permisos que la app pide y para qué.
 *
 * La cámara es la que necesita explicación: se usa para leer códigos QR de compartición y
 * **nada más** —no se guarda ninguna imagen, ni se sube a ningún sitio—. Decirlo aquí ahorra
 * la pregunta del revisor, que es la que retrasa una publicación una semana.
 */
export interface PermisoDeclarado {
  readonly permiso: string;
  readonly paraQue: string;
}

export const PERMISOS_DECLARADOS: readonly PermisoDeclarado[] = [
  {
    permiso: 'Cámara',
    paraQue:
      'Solo para leer códigos QR cuando alguien te comparte su horario. La imagen se procesa en el momento en el teléfono; no se guarda ni se envía a ningún servidor.',
  },
  {
    permiso: 'Notificaciones',
    paraQue:
      'Solo para los recordatorios de tus entregas, y solo si los activas. Vienen apagados de fábrica.',
  },
  {
    permiso: 'Internet',
    paraQue: 'Para sincronizar tus datos con tu cuenta.',
  },
];

/**
 * El panel de números del operador (Fase 25), declarado aquí a propósito.
 *
 * La Fase 25 construye una pantalla que agrega datos de **todas** las cuentas. Si la política
 * dice "no compartimos datos con nadie" y esa pantalla existe sin mencionarse, la política es
 * falsa por omisión — y esa es la clase de discrepancia que se descubre en el peor momento.
 * Se declara qué mira y, sobre todo, qué no puede mirar.
 */
export const PANEL_OPERADOR = {
  que: 'Quien mantiene NoteCore consulta un panel con números agregados: cuántas cuentas hay, cuántas capturaron su horario, cuántos mensajes se han enviado en total, cuánta gente entra desde la app y cuánta desde el navegador.',
  limite:
    'Ese panel cuenta cuántos, no quién: no muestra el contenido de ningún mensaje, ninguna tarea, ningún horario ni ninguna publicación de nadie en particular.',
} as const;

/**
 * Qué pasa al borrar la cuenta (Fase 20).
 *
 * La política lo describe porque Google exige que el borrado esté explicado antes de
 * ofrecerlo, y porque el matiz de los mensajes enviados es justo lo que una persona quiere
 * saber antes de pulsar: lo que mandó a otro sigue en la conversación del otro.
 */
export const BORRADO_EXPLICADO: readonly string[] = [
  'Se borran de la base de datos, sin copia ni papelera: tu cuenta, tu horario, tus materias, tus faltas, tu agenda, tus periodos, tus publicaciones, tus comparticiones, tus ajustes y todas tus sesiones abiertas.',
  'Los mensajes que enviaste a otras personas se quedan en la conversación de esa persona, porque también son suyos, pero dejan de estar ligados a ti: aparecen como enviados por «Usuario eliminado» y tu nombre, tu @usuario y tu correo desaparecen de ellos.',
  'Lo que compartiste y alguien ya aceptó es una copia independiente suya desde el momento en que la aceptó, así que se queda en su cuenta. Borrar la tuya no vacía la de nadie más.',
  'El borrado es inmediato e irreversible. No hay periodo de gracia ni forma de recuperar la cuenta después.',
];
