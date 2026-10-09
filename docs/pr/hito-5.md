# Título

Hito 5: flujo de carrera (semáforo, pausa, resultados, sonido y vibración)

# Descripción

## Resumen

La pista pasa a ser una carrera completa, de la grilla a los resultados.

- **Inicio:** pantalla 01 del handoff en versión mínima (logo, "Correr" y récord). El juego arranca ahí y "Salir" vuelve ahí.
- **Semáforo:** cinco luces, una por segundo, y una espera al azar de 0,5 a 1,5 s antes de la largada.
- **Carrera:** 3 vueltas. La vuelta 1 se cuenta desde la largada y el total es la suma de las vueltas.
- **Pianos pisables:** en las curvas el auto puede ir hasta el borde exterior del piano.
- **Pausa:** botón del HUD, botón atrás de Android o pasar a segundo plano. Continuar, Reiniciar, Salir al menú e interruptores de sonido y vibración.
- **Resultados:** 1,5 s después de la llegada. Mejor vuelta en grande, total, delta contra el récord anterior, cada vuelta, papelitos si hubo récord, "Otra vez" y "Salir".
- **Sonido:** motor con tono según la velocidad, pitidos del semáforo, piano, golpe contra el borde, vuelta y jingle de llegada.
- **Vibración:** piano, borde, largada y llegada, con intensidad por momento. El freno también obedece el interruptor.
- **Panel de desarrollo:** vueltas (1 a 5), volúmenes y tono del motor, e intensidad de vibración de cada momento.
- **Ícono y nombre de la app:** el ícono "Dorsal · Itálica" del handoff reemplaza al de Expo, y el nombre bajo el ícono pasa de "vuelta-rapida" a "Vuelta Rápida".

**Hay que recompilar el dev build** (`npm run android`): se agregó `react-native-audio-api`, que tiene código nativo, y cambiaron el ícono y el nombre, que son recursos nativos.

## Arquitectura: la carrera avisa por eventos

La carrera (`core/RaceFlow`) corre en el hilo de UI y deja en su estado lo que pasa: luces, largada, vueltas, récord, toques de borde, pianos, llegada y cambios de estado. El loop retira esos eventos en cada cuadro y, solo si hay alguno, los manda al hilo de JS, a un bus tipado (`core/EventBus`).

Todo lo demás escucha el bus: el semáforo, la pausa y los resultados (`useRaceStatus`), el récord, el sonido y la vibración. Así ven exactamente lo mismo y en el mismo orden. Las órdenes de la pantalla (semáforo, pausa, reinicio) corren con `race.modify` entre dos cuadros.

```
RaceFlow (hilo de UI) ──eventos──> EventBus (hilo de JS) ──> StartLights · useRaceStatus · useBestLapRecord · useRaceAudio · useRaceHaptics
```

`core` sigue siendo TypeScript puro. La regla de ESLint ahora también le prohíbe importar `audio/` y `haptics/`.

## Cambios

### Paso 1: plan
Plan con las decisiones de abajo, confirmadas antes de empezar. Sin archivos.

### Paso 2: la carrera (core)
- **`core/SeededRandom`:** azar reproducible con semilla, para la espera del semáforo.
- **`core/EventBus`:** bus de eventos tipado (`on`, `onAny`, `emit`, `emitAll`).
- **`core/RaceFlow`:** estados grilla → semáforo → carrera → llegada, más la pausa.
  - Semáforo, cronómetro y tiempos mínimos entre avisos, todo en pasos de simulación: la misma semilla y la misma entrada dan la misma carrera a cualquier fps.
  - Récord: lo recibe al empezar y avisa con `newRecord` cuando una vuelta lo mejora.
  - Tras la llegada, el auto frena solo hasta detenerse.
- **Pianos como datos del circuito** (`core/Track`): `Circuit.kerbs` y `getKerbFactor`, que crece a lo largo de 4 m en cada punta del piano.
- **`core/TrackBounds`:** `resolveTrackContact` devuelve el auto corregido y el contacto (`touching`, `impactSpeed`, `onKerb`). En las curvas el límite llega al borde exterior del piano.
- **`core/TrackValidation`:** el radio mínimo de una curva ahora cuenta el piano, que se puede pisar.
- **`core/DrivingSim`:** `stepDrivingSim` (un paso, para `RaceFlow`) y el contacto en el estado.
- **`hooks/useDrivingLoop` → `hooks/useRaceLoop`:** corre la carrera, entrega los eventos y la velocidad del motor, y recibe las órdenes.

### Paso 3: pantallas
- **`screens/HomeScreen`** y la ruta `/inicio`. `StartScreen` ahora redirige a Inicio.
- **`components/StartLights`:** semáforo de la pantalla 06; sigue los eventos del bus.
- **`components/PauseMenu`:** pantalla 08, con Reiniciar en lugar de Recalibrar y Cambiar control (la inclinación está desactivada).
- **`components/RaceResults`** y **`components/Confetti`:** pantalla 09.
- **`components/Icon`** (Phosphor dibujado con Skia) y **`components/MenuButton`**.
- **`components/LapHud`:** "Vuelta 2/3" y botón de pausa.
- **`core/LapTimer`:** `formatLapDelta` ("−0.578").
- **`core/PlayerPreferences`:** `soundEnabled` y `vibrationEnabled`, prendidos al empezar.
- **`hooks/useRaceStatus`:** estado de la carrera, vuelta al pausar y resultados 1,5 s después de la llegada.
  - El evento `finish` ahora trae los resultados completos (`getFinishResults`), así la pantalla no lee la carrera desde el hilo de JS.

### Paso 4: sonido
- **`react-native-audio-api` 0.13.6** con su plugin en `app.json`: sin servicio en primer plano, sin permisos, sin FFmpeg y sin las bibliotecas externas. El APK queda más chico, pero solo lee WAV, MP3 y FLAC.
- **`audio/RaceAudio`:** el motor en loop con tono y volumen según la velocidad, los efectos con su volumen, silencio general, `suspend`/`resume` y `close`. `getSoundCue` (pura) decide qué suena con cada evento.
  - El borde suena más fuerte cuanto más fuerte el golpe, y el piano cuanto más rápido se lo pisa.
  - La última vuelta no suena como vuelta: suena la llegada. Para eso `lapCompleted` ahora trae `totalLaps`.
- **`hooks/useRaceAudio`:** crea el sonido al entrar y lo cierra al salir. Se congela en la pausa y en segundo plano (también en los resultados) y obedece el interruptor.
- **Sonidos** en `assets/sounds/`, WAV mono de 16 bits. Fuentes y licencias en `CREDITOS.md`:
  - Motor: loop CC0 de Ziph (OpenGameArt), pasado a mono.
  - Efectos: sintetizados con `scripts/generate-sounds.mjs` (Node, sin dependencias, siempre los mismos archivos).
- **Mock de Jest:** el oficial de la biblioteca (`test/setup/audio-api.ts`).

### Paso 5: vibración
- **`haptics/RaceHaptics`:** intensidades Apagada, Leve, Media, Fuerte y Doble (dos golpes fuertes a 140 ms). Valores iniciales: piano Leve, borde Fuerte, largada Media, llegada Doble.
- **`hooks/useRaceHaptics`:** vibra con cada evento si la vibración está prendida.
- **Freno:** `ButtonControls` y `TiltControls` reciben `brakeVibration` (nueva prop opcional del contrato común `InputControlsProps`). La pantalla les pasa la preferencia.

### Paso 6: panel de ajuste y pantalla de carrera
- **Panel de desarrollo**, tres secciones nuevas, solo para la sesión:
  - **Carrera:** vueltas de 1 a 5, desde la próxima carrera.
  - **Sonido:** volumen del motor y de los efectos; tono del motor detenido y a fondo.
  - **Vibración:** intensidad de piano, borde, largada y llegada.
  - "Restablecer" también las vuelve a sus valores iniciales.
- **`components/DevSegmented`:** el selector en píldora, ahora compartido por el modo de control y las vibraciones.
- **`screens/DriveScreen`** junta todo:
  - el semáforo al entrar;
  - la pausa con el botón, el atrás de Android (con `useFocusEffect`, para no tapar el de la calibración) y el segundo plano;
  - los resultados;
  - la salida con `router.dismissTo('/inicio')`, que vuelve a la Inicio que ya estaba en la pila.

### Cierre
- `CLAUDE.md`: estructura de carpetas (`audio/`, `haptics/`, `assets/sounds/`, `scripts/`), el bus de eventos, los sonidos en WAV y los mocks de Jest.
- `eslint.config.js`: `core` no puede importar `@/audio` ni `@/haptics`.

### Paso 7: ícono y nombre de la app
Se sumó después del cierre, al probar en el celular.

- **Ícono "Dorsal · Itálica"** (opción 3g del handoff): el monoplaza blanco con el número 7, girado sobre el azul del juego, con "VR" en Archivo itálica de fondo.
  - **Ícono adaptativo de Android** en tres capas, para que cada celular le aplique su forma: fondo azul con "VR"; el auto con fondo transparente, dentro de la zona segura; y la silueta monocroma para los íconos temáticos de Android 13 o posterior.
  - **Ícono genérico** de 1024 × 1024, para los celulares sin ícono adaptativo.
- **`assets/icono/`:** los cuatro PNG, tal cual vienen del handoff. Expo genera las densidades de Android (`mipmap-*`) al regenerar `android/`.
- **`app.json`:**
  - `icon` y `android.adaptiveIcon` apuntan a los archivos nuevos. El fondo pasa de `#E6F4FE` (el de Expo) a `#2F6BDD`, el azul del juego.
  - `name` pasa de "vuelta-rapida" a "Vuelta Rápida": es el nombre bajo el ícono. El `slug`, el paquete y el esquema del dev build no cambian, así que el récord y las preferencias se conservan.
- **Borrados:** `assets/icon.png` y los tres `assets/android-icon-*.png` de Expo, que ya no usaba nadie.
- **Handoff:** se suman `IconoApp.dc.html` y la carpeta `icono/` a `docs/design/`. Esa carpeta incluye la vista de control (`_preview.png`) y el ícono de 512 para la ficha de Google Play, que no van en la app.
- **`CREDITOS.md`:** el ícono (obra propia, del handoff) y la fuente Archivo de las letras "VR" (SIL Open Font License).
- **`CLAUDE.md`:** dónde vive el ícono y que, si cambia, hay que regenerar `android/`.

### Proceso (`CLAUDE.md`)
- **Convención por componente en dos niveles:**
  - Los módulos de `core`, los hooks y los componentes principales (pantallas y componentes reutilizables) siguen con los seis archivos.
  - Los componentes chicos de interfaz llevan componente, estilos, tipos e index. Test solo si tienen lógica, y sin README propio: se documentan en el README de quien los usa.
  - Los componentes anteriores quedan como están. El primero con la regla nueva es `DevSegmented`, documentado en el README de `DevPanel`.
- **Commits:** uno por paso del hito, no uno por cada cambio.
- **Confirmaciones:** Claude solo frena por decisiones de arquitectura o dependencias nuevas. Agregar dependencias pasa de las autorizaciones permanentes a "requiere confirmación".

## Cómo probarlo

### Tests y calidad

```bash
npm test            # 615 tests en 53 suites
npm run typecheck
npm run lint
```

Tests destacados:
- **Carrera:**
  - Es determinista: misma semilla y misma entrada dan la misma carrera, también con cuadros irregulares.
  - Se pausa en grilla, semáforo o carrera, pero no tras la llegada.
  - La llegada trae los mismos resultados que se calculan del estado.
- **Pianos:** se pisan hasta su borde exterior, con la transición en las puntas. Con entradas al azar, el auto nunca sale de los límites.
- **Pantalla de carrera:**
  - Semáforo al entrar.
  - Pausa con el botón, el atrás y el segundo plano; Continuar, Reiniciar y Salir.
  - Los interruptores se guardan.
  - El freno vibra según la preferencia.
  - Las vueltas del panel valen desde el reinicio.
  - Resultados con y sin récord.
- **Sonido:** qué suena con cada evento y a qué volumen; tono y volumen del motor; silencio, pausa, cierre (también si se cierra mientras carga).
- **Vibración:** intensidad de cada momento, momentos apagados, el doble golpe y su cancelación al salir.

### En el celular

Primero recompilar el dev build con el celular conectado. En Windows, desde PowerShell, `react-native-audio-api` necesita las herramientas de Git en el PATH:

```powershell
$env:Path = "C:\Program Files\Git\usr\bin;$env:Path"
npm run android
```

0. **Ícono y nombre:** en la pantalla de inicio de Android, el ícono nuevo con la forma que use el launcher, y "Vuelta Rápida" debajo. Con los íconos temáticos de Android 13 o posterior, la silueta del auto en un solo color. Si sigue el ícono viejo, reiniciá el celular: algunos launchers lo guardan en caché.
1. **Inicio:** al abrir, la pantalla de Inicio con "Correr" y el récord. "Correr" lleva a la pista.
2. **Semáforo:** "Preparate…", cinco luces rojas de a una (una por segundo) con un pitido cada una, "Esperá…" y, después de una espera distinta cada vez, "¡Largada!" con un pitido más agudo y una vibración media. El auto no se mueve antes.
3. **Motor:** grave en la grilla; sube de tono y de volumen al acelerar y baja al frenar.
4. **Pianos y bordes:** en las curvas se puede pisar el piano ("brrr" y vibración leve). Contra el borde: golpe y vibración fuerte, más fuerte cuanto más fuerte el choque.
5. **Vueltas:** al cruzar la meta, dos notas que suben. La última vuelta no las tiene: suena el jingle de llegada y vibra dos veces.
6. **Resultados:** aparecen 1,5 s después de la llegada, con papelitos si hubo récord. "Otra vez" larga de nuevo; "Salir" vuelve a Inicio.
7. **Pausa:** probar el botón del HUD, el atrás de Android y salir de la app (botón de inicio o una notificación). El sonido se congela.
   - Atrás en la pausa continúa la carrera.
   - "Reiniciar" vuelve a la grilla con un semáforo nuevo.
   - "Salir al menú" vuelve a Inicio.
8. **Interruptores (pausa):** sin sonido no suena nada, y al prenderlo vuelve al instante. Sin vibración no vibra nada, tampoco el freno. Cerrar y abrir la app: siguen como se dejaron.
9. **Panel "Ajustes":** vueltas, volúmenes, tono del motor e intensidades. Las vueltas se aplican con "Reiniciar auto".

### Fluidez: qué revisar (60 fps)

Con el contador de fps del panel abierto:
- **Largada:** las luces y los pitidos, sin tirones al apagarse.
- **Motor:** a fondo en la recta y frenando en la chicana; el tono no tiene que "escalonar".
- **Choques seguidos contra el borde:** cada golpe suena y vibra sin que caigan los fps.
- **Llegada y resultados:** los papelitos y la tarjeta, con el motor en ralentí de fondo.
- **Pausa y vuelta:** abrir y cerrar la pausa varias veces.
- **Después de varias carreras con "Otra vez":** los fps no tienen que ir bajando (cada efecto suelto libera sus nodos al terminar).

## Decisiones y cambios respecto del plan

Decisiones confirmadas en el plan:

1. **Pianos pisables** hasta el borde exterior, con 4 m de transición en cada punta.
2. **Inicio mínimo** según la pantalla 01; "Salir" vuelve ahí.
3. **La vuelta 1 se cuenta desde la largada** y el total es la suma de las vueltas.
4. **Resultados:**
   - el número grande es la mejor vuelta, más el total;
   - delta contra el récord anterior;
   - botones "Otra vez" y "Salir".
5. **Luces cada 1 s** (el handoff decía unos 700 ms) y espera final de 0,5 a 1,5 s.
6. **Interruptores de sonido y vibración en la pausa,** guardados en las preferencias. La vibración del freno también obedece.
7. **Panel de ajuste:** volúmenes, tono del motor, intensidad por momento y vueltas de 1 a 5. Todo solo para la sesión.
8. **Los 60 fps los verifico yo en el celular,** con la lista de arriba.

Cambios respecto del plan, decididos durante el hito:

- **Efectos sintetizados en lugar de los packs de Kenney:** el plan usaba sonidos de Kenney para el borde, la vuelta y la llegada. Esos packs vienen solo en OGG, y el decodificador sin las bibliotecas externas no lo lee. Las alternativas eran dos:
  - activar esas bibliotecas, con un APK más grande y otro build nativo;
  - agregar una dependencia para convertirlos.

  Elegí sintetizarlos, como ya estaba previsto para los pitidos y el piano. Si al escucharlos no convencen, los podemos reemplazar por WAV de otra fuente.
- **Volumen del motor al 25 %** (antes 50 %): en la primera prueba en el celular, el motor cansaba.
- **Motor:** de los 13 loops del pack de Ziph usé `motorseamless11`, uno de los más graves y con la costura más limpia (lo analicé con un script). Así queda más margen para subir el tono con la velocidad.
- **El evento `finish` trae los resultados completos** y **`lapCompleted` trae `totalLaps`:** la pantalla, el sonido y la vibración trabajan solo con eventos, sin leer la carrera desde el hilo de JS.
- **El botón de pausa queda visible tras la llegada** (no hace nada): sacarlo correría la píldora "Mejor" durante el segundo y medio previo a los resultados.
- **Mock de Reanimated:** ahora conserva cada valor compartido entre renders, como en la app. Antes creaba uno nuevo en cada render, y no se podía probar pausar y continuar en la pantalla.
- **`DevSegmented`** salió de los estilos del panel, para no repetir el selector en las cuatro filas de vibración.
- **Ícono sin pantalla de carga nueva:** el handoff no trae una. En Android 12 o posterior, el sistema ya muestra el ícono de la app al abrirla. Darle un color de fondo propio pediría `expo-splash-screen`, una dependencia nueva.

### Autorizaciones permanentes usadas
- **Configuración nativa:** el plugin de `react-native-audio-api`, el ícono y el nombre en `app.json`, y la regeneración de `android/` con `npx expo prebuild --platform android`. Hay que recompilar.
- **Borrado de archivos:** los cuatro íconos de Expo que se reemplazaron.
- **Renombrado:** `hooks/useDrivingLoop` → `hooks/useRaceLoop`.
- **Carpetas nuevas:** `src/audio/`, `src/haptics/`, `assets/sounds/` y `scripts/`.
- **Módulos nuevos:**
  - `core/SeededRandom`, `core/EventBus` y `core/RaceFlow`;
  - `audio/RaceAudio` y `haptics/RaceHaptics`;
  - `hooks/useRaceLoop`, `useRaceStatus`, `useRaceAudio` y `useRaceHaptics`;
  - `components/Icon`, `MenuButton`, `StartLights`, `PauseMenu`, `RaceResults` y `Confetti`;
  - `screens/HomeScreen`.

  Todos con la convención completa. `components/DevSegmented` es un componente chico, con la convención nueva.
- **Dependencia:** `react-native-audio-api` se instaló al principio del hito, cuando todavía estaba autorizado sin confirmación. Después del cambio de reglas no se agregó ninguna.
- **Sin cambios en los valores del manejo.**

## Notas

- **Pendiente de verificar en el celular:**
  - los fps (lista de arriba);
  - que los sonidos sintetizados se escuchen bien en el parlante del celular;
  - que el tono del motor (×0,8 a ×2,4) suene a monoplaza;
  - que las intensidades de vibración se distingan.
- **Valores para afinar jugando:** la mezcla de sonido y las intensidades se prueban en el panel. Si algún valor convence, se pasa a `DEFAULT_RACE_AUDIO_MIX` o a `DEFAULT_RACE_HAPTICS`.
- **Jingle de llegada provisorio.**
- **Para más adelante:** el fantasma (con su delta en el HUD y en los resultados), la selección de pista, Garage y Ajustes en Inicio, y la fuente Archivo.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
