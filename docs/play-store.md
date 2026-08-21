# Publicar NoteCore en Google Play

> Fase 23. Todo lo que hay que rellenar en la consola, con los textos listos para copiar.
> El artefacto lo genera `scripts/compilar-aab-tienda.sh`.

Los textos de privacidad y permisos de este documento salen de
[`packages/shared/src/logic/privacidad.ts`](../packages/shared/src/logic/privacidad.ts). **Si
cambian allí, cambian aquí**: Google compara la ficha con la política publicada, y dos
versiones del mismo dato es el hallazgo que suspende una publicación.

---

## 1. Antes de abrir la consola

| Requisito | Estado | Dónde |
|---|---|---|
| Política de privacidad pública, sin login | ✅ Fase 19 | `https://notecore.ourocore.net/privacidad` |
| Borrado de cuenta desde la app | ✅ Fase 20 | Ajustes → Borrar cuenta |
| Borrado de cuenta desde la web (URL para la ficha) | ✅ Fase 20 | `https://notecore.ourocore.net/borrar-cuenta` |
| Reportar contenido | ✅ Fase 21 | Publicaciones y mensajes |
| Bloquear usuarios | ✅ Fase 8 | Perfil ajeno |
| Permisos mínimos en el manifiesto | ✅ Fase 22 | 3 declarados |
| Actualizador apagado | ✅ Fase 24 | `EXPO_PUBLIC_UPDATER_ENABLED=false` |
| `.aab` firmado | ✅ Fase 23 | `scripts/compilar-aab-tienda.sh` |

---

## 2. Ficha de la tienda

### Nombre de la app (máx. 30 caracteres)

```
NoteCore
```

### Descripción breve (máx. 80 caracteres)

```
Tu horario, tus faltas y tus entregas. Sin anuncios y sin rastrearte.
```

*(68 caracteres.)*

### Descripción completa (máx. 4000 caracteres)

```
NoteCore organiza tu semestre en un solo sitio: qué clase toca ahora, cuántas faltas te
quedan y qué tienes que entregar esta semana.

HORARIO
Captura tus materias una vez y consulta al instante cuál es tu próxima clase, en qué aula
y a qué hora. Funciona también sin conexión: lo que ya consultaste se queda disponible
aunque te quedes sin datos.

CONTROL DE FALTAS
Registra tus inasistencias por materia y mira cuántas te quedan antes de pasarte del
límite. NoteCore te sugiere ese límite calculándolo como el 20% de las sesiones del
semestre —la norma del TecNM pide 80% de asistencia mínima—, pero siempre puedes
ajustarlo: cada profesor tiene su criterio, y la app te recuerda confirmarlo con él.

AGENDA DE ENTREGAS
Tareas, proyectos y exámenes ordenados por lo que vence antes. Con recordatorios que
llegan al teléfono a la hora que tú elijas, si los activas.

WIDGETS EN LA PANTALLA DE INICIO
Cuatro widgets para no tener ni que abrir la app: tu próxima clase, las clases que te
quedan hoy, tus faltas y lo que vence pronto.

COMPARTE CON TUS COMPAÑEROS
Pásale tu horario o tu agenda a alguien por código QR, por un código corto o por un
enlace. Quien lo recibe se queda con una copia suya, que puede editar sin que se toque la
tuya.

SEMESTRES Y CUATRIMESTRES
Al terminar el periodo se archiva completo y empiezas uno nuevo en limpio. Lo anterior no
se borra: sigue ahí para consultarlo.

TAMBIÉN EN EL NAVEGADOR
Tu cuenta funciona igual desde la computadora en notecore.ourocore.net, con los mismos
datos sincronizados.

QUÉ NO HACE NOTECORE
Sin publicidad. Sin analítica de terceros. No vendemos ni cedemos tus datos a nadie. No
pedimos tu ubicación ni leemos los contactos de tu teléfono.

Puedes borrar tu cuenta entera desde la propia app, en Ajustes, sin escribirle a nadie.

NoteCore es un proyecto independiente, hecho por un estudiante para estudiantes.
```

### Categoría y etiquetas

| Campo | Valor |
|---|---|
| Tipo de aplicación | Aplicación (no juego) |
| Categoría | **Educación** |
| Etiquetas | Educación, Productividad, Herramientas de estudio |
| Correo de contacto | `ourocore.contacto@gmail.com` |
| Sitio web | `https://notecore.ourocore.net` |
| Política de privacidad | `https://notecore.ourocore.net/privacidad` |

---

## 3. Material gráfico

| Recurso | Tamaño | Formato | Estado |
|---|---|---|---|
| Icono | 512 × 512 | PNG 32 bits | Derivar de `apps/mobile/assets/icon.png` |
| Gráfico de cabecera | 1024 × 500 | PNG o JPG | Pendiente |
| Capturas de teléfono | mín. 320 px, máx. 3840 px, ratio ≤ 2:1 | PNG o JPG | **Mínimo 2**, se recomiendan 4-8 |

**Capturas sugeridas**, en este orden — la primera es la que se ve en los resultados de
búsqueda:

1. **Inicio** con la próxima clase y lo que vence pronto (es el argumento de venta)
2. **Horario** de la semana con materias de colores
3. **Faltas** con el contador contra el límite
4. **Agenda** ordenada por vencimiento
5. **Widgets** en la pantalla de inicio del teléfono

> Tómalas del emulador o del teléfono con la app real y con datos de aspecto verosímil —un
> horario vacío no vende nada, y un horario con «Materia 1, Materia 2» tampoco—.

---

## 4. Clasificación de contenido

El cuestionario lo rellena Google a partir de tus respuestas. Para NoteCore:

| Pregunta | Respuesta |
|---|---|
| Categoría | Utilidad / Productividad / Comunicación |
| Violencia, sexo, lenguaje, sustancias, apuestas | **No** a todo |
| ¿Los usuarios interactúan o intercambian contenido? | **Sí** — mensajería y publicaciones |
| ¿Se puede compartir la ubicación? | **No** |
| ¿Se comparte información personal con terceros? | **No** |
| ¿Hay compras digitales? | **No** |

Como hay interacción entre usuarios, Google exige lo que ya está hecho: **reportar** (Fase 21),
**bloquear** (Fase 8) y una política de moderación. Resultado esperado: **PEGI 3 / Todos**.

---

## 5. Seguridad de los datos (Data Safety)

Lo que sigue traduce `DATOS_DECLARADOS` al vocabulario del formulario.

**Se recopilan** (todos: transmitidos cifrados con HTTPS, y el usuario puede solicitar su
borrado):

| Categoría de Google | Dato | ¿Obligatorio? | Para qué |
|---|---|---|---|
| Información personal → Correo | `users.email` | Sí | Iniciar sesión |
| Información personal → Nombre | `display_name`, `username` | Sí | Que te reconozcan al compartir |
| Información personal → Otra | bio, carrera, escuela, edad | No | Perfil, opcional entero |
| Mensajes → Otros mensajes | `messages` | No | Entregarlos al destinatario |
| Fotos y vídeos | — | **No se recopilan** | La app no puede subirlos |
| Ubicación | — | **No se recopila** | Nunca se pide el permiso |
| Contactos del teléfono | — | **No se recopilan** | Nunca se pide el permiso |

**Respuestas clave del formulario**:

- ¿Se cifran los datos en tránsito? → **Sí** (HTTPS en toda la API)
- ¿Puede el usuario pedir que se borren sus datos? → **Sí**, desde la app y desde la web
- ¿Se comparten datos con terceros? → **No**
- ¿Se recopilan datos para publicidad o marketing? → **No**
- ¿Hay analítica de terceros? → **No**

> **Los mensajes no llevan cifrado extremo a extremo** y la política lo dice con esas
> palabras. No lo maquilles en el formulario: Google contrasta ficha y política.

**URL de borrado de cuenta** (campo obligatorio desde 2024):
`https://notecore.ourocore.net/borrar-cuenta`

---

## 6. Subir el `.aab`

```bash
scripts/compilar-aab-tienda.sh
```

El script apaga el actualizador, regenera el prebuild, compila y **verifica el artefacto**:
falla si encuentra `REQUEST_INSTALL_PACKAGES` o una dirección de desarrollo dentro del
bundle. Un `.aab` que no pasa esa verificación no se sube.

Sale en:
```
apps/mobile/android/app/build/outputs/bundle/release/app-release.aab
```

### Probarlo antes de subirlo

No se da por bueno un artefacto que solo se ha compilado. Con
[`bundletool`](https://github.com/google/bundletool/releases):

```bash
bundletool build-apks --mode=universal \
  --bundle=apps/mobile/android/app/build/outputs/bundle/release/app-release.aab \
  --output=/tmp/notecore.apks \
  --ks=$HOME/.notecore-release/notecore-release.keystore \
  --ks-key-alias=<el de keystore.properties>
bundletool install-apks --apks=/tmp/notecore.apks
```

Comprobar en el teléfono: **arranca, entra y sincroniza contra producción**, y que no aparece
por ningún lado el aviso de actualización.

### Play App Signing

Al subir el primer `.aab`, Google ofrece gestionar la clave de distribución. **Se acepta.**

Lo que cambia: Google firma lo que se distribuye, y `~/.notecore-release/` pasa a ser la clave
de **carga** — la que autoriza a subir. Si se pierde, se puede pedir un reemplazo; sin Play App
Signing, perder la clave significa **no poder volver a actualizar la app nunca**, y la única
salida sería publicarla de nuevo con otro nombre de paquete perdiendo instalaciones y reseñas.

Es una decisión de una sola vez y no se revierte.

---

## 7. Antes de pulsar «Enviar a revisión»

- [ ] La web y la API están **desplegadas y respondiendo** — un revisor que no puede entrar
      rechaza la app
- [ ] La política de privacidad carga **sin sesión** en una ventana de incógnito
- [ ] Existe una **cuenta de prueba** para el revisor, con datos dentro (horario, alguna
      tarea), y sus credenciales van en «Acceso a la app» de la consola
- [ ] El `.aab` se instaló y se probó en un teléfono real
- [ ] `versionCode` mayor que el de cualquier subida anterior
- [ ] País/precio: **gratis**, y los países donde se distribuye

> **Con la app publicada**, apagar el actualizador del servidor: `UPDATER_ENABLED=false` en el
> `.env` de producción y reiniciar la API. Eso desactiva el mecanismo en los teléfonos que ya
> tienen la app instalada por fuera, y `/app` pasa a decir «Busca NoteCore en Google Play»
> sola, sin desplegar nada más.

---

## 8. Qué esperar de la revisión

La primera revisión de una cuenta nueva **tarda más**: de unos días a un par de semanas.
Google revisa además el historial de la cuenta de desarrollador, no solo la app.

Los rechazos más comunes, y por qué NoteCore no debería tropezar con ellos:

| Motivo de rechazo | Cubierto por |
|---|---|
| Sin política de privacidad accesible | Fase 19 |
| Sin borrado de cuenta | Fase 20 |
| Contenido de usuarios sin reportar/bloquear | Fases 21 y 8 |
| Permisos sin justificar | Fase 22 — quedan 3 |
| Actualización fuera de la tienda | Fase 24 |
| Data Safety que no coincide con la política | Ambas salen de `privacidad.ts` |
