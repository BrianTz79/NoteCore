# Design — NoteCore

Sistema de diseño bloqueado de NoteCore. Toda pantalla —web y app— lee este archivo antes
de tocar estilos. **No se regenera por pantalla**: se extiende o se enmienda aquí cuando el
sistema necesita crecer.

Los valores viven en [`packages/shared/src/design/tokens.ts`](packages/shared/src/design/tokens.ts),
una sola vez, y los dos clientes los derivan:

- **Web** → [`apps/web/tokens.css`](apps/web/tokens.css), propiedades CSS más el bloque
  `@theme` de Tailwind 4.
- **App** → [`apps/mobile/src/components/theme.ts`](apps/mobile/src/components/theme.ts),
  importado directamente.
- **Widget de Android** → los colores se **generan** en
  `apps/mobile/modules/widget-horario/android/src/main/res/values/notecore_tokens.xml`
  durante el `prebuild`, porque un `RemoteViews` no puede leer JavaScript. Es la única
  duplicación del sistema, y se regenera en cada compilación justamente para que no pueda
  quedarse atrás.

Este es el Principio VIII aplicado al diseño. Antes de la Fase 11 la paleta estaba escrita
dos veces y nada garantizaba que coincidieran.

## Género

**modern-minimal**, en registro oscuro.

NoteCore es una herramienta con sesión y estado que se consulta entre clases, no un sitio
de contenido: densidad de instrumento, tipografía sin gracias, un solo acento. El registro
oscuro no es una preferencia estética — la app ya lo declaraba en `app.json` y una pantalla
que se mira en un aula a media luz lo agradece.

Dos desviaciones deliberadas del canon del género:

1. **Papel oscuro** en lugar del blanco puro que el género prefiere.
2. **Los colores de materia mandan sobre el acento.** `SUBJECT_COLORS` ya es un arcoíris de
   diez tonos, y es información: distingue una materia de otra de un vistazo. El sistema no
   compite con él — por eso el resto de la interfaz es casi monocroma. El acento cobalto
   aparece solo en lo interactivo, y nunca en una superficie donde haya un color de materia
   cerca.

## Familias de macroestructura

Tres familias. Una pantalla pertenece a una y hereda su forma; lo que varía dentro de la
familia son los arquetipos de componente, nunca el tema.

- **Workbench** (aplicación) — horario, faltas, agenda, calendario, semestres, compartir,
  social, mensajes. Densidad alta, separación por filete de 1px y por espacio, nunca por
  tarjeta flotante con sombra. Los datos numéricos en mono tabular. Cabecera de pantalla
  fija con el título y la acción principal.
- **Stat-Led** (entrada) — inicio. Un dato real y grande arriba —la próxima clase—, después
  los avisos que exigen acción, y al final la navegación como rejilla compacta.
- **Letter** (formulario) — entrar, registro, perfil. Una columna estrecha centrada,
  medida de lectura corta, sin adornos.

### Qué se eliminó al adoptar esto

El inicio anterior eran **diez tarjetas visualmente idénticas**, cada una con título,
párrafo explicativo y enlace `→`. Es un menú disfrazado de contenido: obliga a leer diez
párrafos para encontrar dónde tocar, y el párrafo solo sirve la primera vez. Se sustituye
por dato + avisos + rejilla de navegación.

## Tema

Cobalto oscuro. Los valores canónicos están en `tokens.ts`; aquí van con su OKLCH de origen
para que un ajuste futuro sea perceptual y no a ojo.

| Token | Hex | OKLCH | Uso |
|---|---|---|---|
| `papel` | `#0b0f18` | `oklch(17% 0.015 260)` | Fondo de la aplicación |
| `papel2` | `#131926` | `oklch(21% 0.018 260)` | Superficie elevada |
| `papel3` | `#1b2333` | `oklch(25% 0.020 260)` | Control sobre superficie |
| `tinta` | `#f2f5fa` | `oklch(97% 0.005 260)` | Texto principal · 15.8:1 |
| `tinta2` | `#c2ccdc` | `oklch(83% 0.015 260)` | Texto secundario · 9.1:1 |
| `tinta3` | `#8b97ad` | `oklch(65% 0.025 260)` | Metadatos · 5.2:1 |
| `filete` | `#242e40` | `oklch(29% 0.025 260)` | Separadores |
| `filete2` | `#33405a` | `oklch(36% 0.035 260)` | Borde de control |
| `acento` | `#5aa9ff` | `oklch(72% 0.135 250)` | Único color de marca · 8.3:1 |
| `foco` | `#8fd0ff` | `oklch(83% 0.090 240)` | Anillo de foco |
| `error` | `#ff8080` | `oklch(72% 0.150 25)` | Error · 6.4:1 |
| `exito` | `#4ade9b` | `oklch(82% 0.150 160)` | Confirmación · 8.9:1 |
| `aviso` | `#f2c14e` | `oklch(83% 0.130 85)` | Proximidad al límite · 9.7:1 |

**El acento arregla un fallo de contraste real.** El `sky-600` anterior (`#0284c7`) daba
3.4:1 sobre el fondo, y los enlaces de navegación lo usaban en texto de 14px — por debajo
del mínimo AA de 4.5:1. Subir la luminosidad conserva la densidad que la pantalla necesita;
agrandar la letra no lo habría hecho.

**El foco es un tono aparte del acento a propósito.** Si compartieran color, el anillo de
foco de un botón de acento sería invisible.

## Tipografía

| Rol | Fuente | Pesos | Para qué |
|---|---|---|---|
| Display | Space Grotesk | 500, 700 | Títulos de pantalla y de sección |
| Cuerpo | Inter | 400, 500, 600 | Todo lo que se lee |
| Mono | JetBrains Mono | 400, 500 | **Todo número que se compara con otro** |

El tercer rol existe por las **cifras tabulares**, no por decoración: en una columna de
faltas, unas cifras de ancho variable bailan y obligan a leer dígito a dígito. Horas del
horario, conteos de faltas, fechas cortas y códigos de compartición van en mono.

**La app usa la tipografía del sistema, no estas tres familias.** Es una desviación
deliberada: `monospace` en Android resuelve a Roboto Mono —que cumple el rol tabular, que es
el que importa— y `sans-serif` a Roboto, una grotesca del mismo registro. Empaquetar tres
familias con sus pesos son unos 700 KB en un APK que se instala a mano, y obliga a otro
`prebuild`. La paridad del Principio I **es de información y de estructura, no de archivo
tipográfico**: los dos clientes muestran lo mismo con la misma jerarquía y los mismos tres
roles. `FONT_FAMILY` sigue en los tokens para el día en que la app las empaquete.

- Tracking del display: `-0.02em`.
- Escala en `TEXT`, razón ~1.2, de 11 a 34px. No hay tamaños de titular de portada: esto es
  una herramienta, no una landing.
- Medida de lectura máxima: 68 caracteres.

## Espaciado

Escala de 4 puntos con nombres semánticos (`SPACE` en `tokens.ts`). Las pantallas usan el
nombre, nunca el número: `space.md` sobrevive a un cambio de densidad, un `16` repartido por
doscientos sitios no.

**En la web las clases llevan el prefijo `nc-`** (`p-nc-md`, `gap-nc-sm`), y no puede
quitarse. En Tailwind 4 el espacio de nombres `--spacing-*` no alimenta solo el relleno y la
separación: también las anchuras nombradas. Declarar `--spacing-md` redefine `max-w-md` de
28rem a 1rem, y una columna de formulario colapsa al ancho de una letra —ocurrió durante
esta fase, y desde fuera parecía un fallo de la rejilla—. Con el prefijo, las dos escalas
dejan de pisarse.

## Movimiento

Postura: **motion-cut**. Ninguna librería de animación en ninguno de los dos clientes, y no
entra ninguna en esta fase.

- Duraciones: `corta` 120ms (hover, pulsación), `media` 200ms (aparición de panel).
- Curvas: `salida` y `entradaSalida`. Sin rebote — un rebote en un control sugiere
  elasticidad física donde no la hay y retrasa la respuesta.
- Solo se animan `transform` y `opacity`.
- **El anillo de foco nunca se anima**: aparece al instante.
- `prefers-reduced-motion: reduce` colapsa todo a un fundido de 120ms o a nada.

## Microinteracciones

- **Éxito silencioso.** Un cambio guardado se refleja en la pantalla; no se celebra con un
  aviso emergente. El usuario ve el número nuevo, que es la confirmación.
- **Sin diálogos de confirmación en lo reversible.** Marcar una falta se deshace marcando
  otra vez.
- **Los diálogos se reservan para lo destructivo**: borrar una materia, cerrar un semestre.
  Ahí sí, porque el Principio VI lo exige.
- Estado de carga: el control que se pulsó, nunca una capa sobre toda la pantalla.

## Voz de los controles

- **Primario**: fondo `acento`, texto `acentoTinta`, radio 6px. Copy en imperativo y
  concreto — «Guardar materia», nunca «Enviar».
- **Secundario**: fondo `papel3`, texto `tinta`, borde `filete2`, mismo radio.
- **Destructivo**: texto `error` sobre `errorFondo`, borde tenue.
- **Etiqueta de estado**: radio de píldora. La forma **significa** «esto es una etiqueta, no
  un botón» — nunca se usa la píldora en algo pulsable.
- Altura táctil mínima en la app: 48px.

## Lo que todas las pantallas comparten

- La paleta y su reparto: el acento no supera ~5% de lo visible.
- Las tres familias tipográficas y sus roles.
- La voz de los controles: forma, radio, ritmo de relleno.
- La cabecera de pantalla: título en display, acción principal a la derecha, filete debajo.
- El estado vacío: una línea que dice qué falta y un solo control que lo resuelve. Nunca una
  ilustración.
- Los colores de materia de `SUBJECT_COLORS`, intactos.

## Lo que puede variar

- La macroestructura, dentro de la familia que le toca a la pantalla.
- La densidad: el horario es más apretado que el perfil, y debe serlo.
- La app puede colapsar a una columna lo que en la web son dos. La información es la misma
  —Principio I—; la disposición no tiene por qué serlo.

## Lo que ninguna pantalla puede hacer

- Introducir un color que no esté en `tokens.ts`.
- Usar una sombra para separar. Filete o espacio.
- Degradados, cristal esmerilado, texto con degradado.
- Cursiva en un título.
- Animar la aparición del anillo de foco.
- Un emoji como icono de una acción.

## Exports

### tokens.css

Generado en [`apps/web/tokens.css`](apps/web/tokens.css) a partir de `tokens.ts`. Incluye el
bloque `@theme` que Tailwind 4 necesita para exponer los tokens como utilidades
(`bg-papel`, `text-tinta3`, `border-filete`).

### React Native

[`apps/mobile/src/components/theme.ts`](apps/mobile/src/components/theme.ts) reexporta los
tokens y añade los estilos base que RN no puede derivar de CSS.

### Android (widget)

`apps/mobile/modules/widget-horario/android/src/main/res/values/notecore_tokens.xml` — copia
de los colores que el widget necesita, **generada** en cada `prebuild` por
`plugins/with-widget-horario.js` a partir de `tokens.ts`. Un `RemoteViews` solo entiende
colores compilados en recursos: no puede leer JavaScript. Regenerarla en lugar de mantenerla
es lo que impide que la única duplicación del sistema se convierta en una divergencia.

Dos restricciones del widget que conviene no volver a descubrir:

- **`android.view.View` no se puede inflar en un `RemoteViews`.** La barra con el color de
  la materia es un `ImageView`; con un `View` a secas el lanzador responde «Class not
  allowed to be inflated» y el widget entero no carga.
- **El widget es un módulo local de Expo**, no código generado dentro de `android/app`. Los
  módulos se registran desde una clase que genera el autolinking; un módulo que no pasa por
  él no aparece en el runtime aunque sus clases estén en el APK.
