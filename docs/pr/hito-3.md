# Título

Hito 3: control por inclinación (sensor de gravedad, calibración, elección de control, preferencias guardadas y ajuste tras la prueba con usuarios)

# Descripción

## Resumen

Segundo modo de control: el celular es el volante. Es control por **posición**: el ángulo del celular respecto de la gravedad, girado como un volante, equivale al ángulo de dirección. No se usa la velocidad angular del giroscopio.

Se suman:
- las pantallas de elección de control (02) y de calibración (03) del handoff,
- las preferencias guardadas entre partidas,
- la sección de inclinación del panel de ajuste,
- la corrección de zona muerta y sensibilidad tras la primera prueba con usuarios (paso 6).

**Requiere recompilar el dev build:** `expo-sqlite` tiene código nativo.

## Cambios

### Paso 2: mapeo puro (`core/TiltSteering`)
- `stepTiltSteering(state, reading, config, dt)`: de la lectura del sensor a dirección de −1 a 1. TypeScript puro.
  1. **Orientación:** pasa el vector a coordenadas de pantalla según la rotación (90 o 270 en horizontal). Es la única corrección por orientación del proyecto.
  2. **Ángulo de volante:** `atan2(gx, −gy)` sobre el plano de la pantalla. No depende de cuánto se eche el celular hacia atrás.
  3. **Filtro exponencial contra el temblor:** 0,06 s.
  4. **Calibración:** resta el ángulo neutro.
  5. **Zona muerta** (5° de inicio) y **sensibilidad** de 1 a 10. Después de la prueba con usuarios, la sensibilidad define el rango útil desde el borde de la zona muerta: 1 = 40°, 5 = 19,6° y 10 = 8°, en escala geométrica (ver paso 6).
- **Celular casi plano:**
  - Con menos del 25 % de la gravedad sobre la pantalla (unos 15° de la horizontal), la dirección cae a 0 y el filtro se congela.
  - Hasta el 40 % se atenúa de forma gradual.
- **Cambio de orientación:** el filtro se reinicia con el ángulo nuevo, sin volantazo.
- **`withTiltSteering`:** en modo inclinación, la rampa del modelo de manejo baja a 0,08 s. La señal ya es continua y filtrada; la rampa de 0,25 s se sentiría como retraso.

### Paso 3: entrada por inclinación
- **`hooks/useTiltSteering`:** lee el sensor de gravedad con `useAnimatedSensor` de Reanimated.
  - El valor compartido se escribe **en el hilo de UI**.
  - Un `useFrameCallback` procesa cada cuadro con `core/TiltSteering` y escribe `input.steer`.
  - Nada pasa por el hilo de JS ni por React, así que no afecta los 60 fps.
  - El sensor se registra con `adjustToInterfaceOrientation: false`, para que la corrección no se aplique dos veces. Un test lo verifica.
- **Respaldo:** si a los 500 ms no llegó ninguna lectura de gravedad (en Android ese sensor necesita giroscopio), usa el acelerómetro de expo-sensors, con el signo invertido. La rotación la toma de expo-screen-orientation.
- **`input/TiltControls`:** intercambiable con `ButtonControls`. Según la 07a:
  - **Dos frenos laterales** de 76 × 128. Cualquiera frena (y da marcha atrás); los dos juntos frenan igual que uno. Vibra una sola vez al empezar a frenar.
  - **Indicador de volante** (`components/SteeringIndicator`): píldora de 168 × 24 en escala fija de grados, con la zona muerta, dos marcas de giro completo y un punto que sigue la inclinación. Con el celular plano, el punto se atenúa.
- **`hooks/useLandscapeLock`:** `"orientation": "landscape"` de app.json fijaba una sola orientación horizontal en Android. Ahora se permiten las dos (`sensorLandscape`), y el cambio durante la carrera se detecta en cada lectura del sensor.
- **`InputControls`:** comparte con los botones el gesto de mantener presionado y la vibración del freno.
- **`CLAUDE.md`:** la línea del Stack pasa al sensor de Reanimated con expo-sensors de respaldo; se agrega la nota de "Recalibrar" en el menú de pausa.

### Paso 4: pantallas y preferencias
- **Preferencias** con `expo-sqlite/kv-store`:
  - Lectura síncrona, sin pantalla de carga.
  - `core/PlayerPreferences` valida (un dato corrupto vuelve al valor por defecto) y decide el primer paso.
  - `hooks/usePlayerPreferences` guarda y avisa a todas las pantallas (`useSyncExternalStore`).
  - Se guardan el modo, el ángulo neutro, la sensibilidad y la zona muerta.
- **Rutas:**
  - `/`: `StartScreen` decide y redirige.
  - `/control`: elección de control.
  - `/calibracion`: calibración.
  - `/pista`: la pista.
- **Elección de control (02):** tarjetas Inclinación ("Más real") y Botones ("Más preciso"), con ilustraciones dibujadas con `View`. Sin modo por defecto: Seguir espera la elección. La elección se guarda.
- **Calibración (03):**
  - "Sostené el celular como vas a jugar y tocá **Listo**."
  - Medidor (`render/CalibrationGauge`): el arco en escala fija de grados con la zona muerta, las marcas de giro completo y el marcador van en Skia; la silueta del teléfono gira con el ángulo y muestra los grados con signo. Todo se mueve en el hilo de UI.
  - Sensibilidad de 1 a 10 (Suave / Rápida), zona muerta de 1 a 5 (Chica / Grande) y botón Listo.
  - Se muestra al elegir inclinación por primera vez.
- **`DriveScreen`** toma el modo, la calibración y la sensibilidad de las preferencias.
- **Componentes de menú:** `PrimaryButton`, `MenuHeader` y `ControlModeCard`.

### Paso 5: panel de ajuste
- **Selector Inclinación / Botones** en caliente. Se guarda.
- **Sección Inclinación:**
  - Zona muerta (1° a 9°) y sensibilidad, que se guardan como preferencias del jugador; filtro del temblor y rampa de dirección, solo en la sesión.
  - "Recalibrar": toma la posición del momento.
  - "Calibración completa": abre la pantalla 03.
- **Interruptor "Cámara gira con el auto"** (`rotateWithCar`, preparado en el hito 2).
- **Lecturas:** ángulo leído (calibrado, con signo) y dirección resultante.
- **Restablecer** vuelve los ajustes a sus valores por defecto sin tocar la calibración.

### Paso 6: corrección tras la primera prueba con usuarios

**Feedback original.** A los testers les costó mucho controlar el auto con inclinación. Uno reportó:

> "Cuando aumenté la sensibilidad para poder doblar más rápido, se aumentaba el punto muerto (lo azul del medio). Yo aumento la sensibilidad, pero eso se aumenta también, entonces tengo que girar más el teléfono. Yo pensé que al aumentar la sensibilidad iba a ser más sensible todo el tiempo."

**Diagnóstico.**
- **El cálculo no estaba invertido.** La zona muerta era siempre de 5°, y a más sensibilidad, igual o más dirección.
- **El problema estaba en los indicadores.** El medidor de calibración y el indicador del HUD se escalaban con el ángulo de giro completo. Al subir la sensibilidad de 1 a 10, la zona azul se veía casi 4 veces más grande (de ±8° a ±31° del arco), aunque seguía siendo de 5°. El tester lo entendió, con razón, como "tengo que girar más el teléfono".
- **El control costaba porque la zona muerta se descontaba del giro completo.** Con sensibilidad 10 ocupaba 5° de 12°, y en los 7° restantes el auto pasaba de recto a giro completo. Se sentía como un interruptor.
- **Había un caso con salto, solo desde el panel de desarrollo.** El panel permitía zonas muertas de hasta 15°. Si la zona muerta superaba el giro completo, la dirección pasaba de 0 a giro completo de golpe.

**Corrección.**
- **Zona muerta y sensibilidad independientes** (`core/TiltSteering`):
  - La sensibilidad define el rango útil a partir del borde de la zona muerta (40° con 1, 19,6° con 5, 8° con 10) y la zona muerta se suma aparte.
  - Cambiar una no toca la otra. Subir la sensibilidad reduce el ángulo necesario para cualquier dirección.
  - Al salir de la zona muerta la dirección crece desde 0, sin saltos. El caso del salto ya no puede ocurrir.
- **Escala fija en grados** en el medidor y en el HUD: 50° llegan al extremo de los dos.
  - La zona azul ocupa siempre lo mismo y solo cambia con la zona muerta.
  - Nuevas marcas de giro completo, que se acercan al centro al subir la sensibilidad.
  - Debajo del medidor: "En la zona azul el auto va derecho. En las marcas, dobla a fondo."
- **Zona muerta ajustable en la calibración:**
  - Control separado de la sensibilidad, en 5 niveles (1°, 3°, 5°, 7° y 9°), de "Chica" a "Grande". Arranca en el nivel 3 (5°, el valor anterior).
  - Se guarda con las demás preferencias. Las preferencias guardadas antes de este cambio arrancan en el nivel 3.
  - El slider del panel de desarrollo pasa a ir de 1° a 9° y guarda la misma preferencia.
  - La tarjeta se compactó para que los dos sliders y Listo entren en un celular de 360 dp de alto.
- **Elección de control sin modo por defecto:** la primera vez no hay tarjeta marcada y Seguir queda desactivado hasta elegir. Antes se proponía Inclinación. Las dos opciones se ven siempre: no hay ningún interruptor que oculte la inclinación.
- **`CLAUDE.md`:** la decisión de ocultar la inclinación queda pendiente de una segunda prueba con usuarios, hecha con esta corrección.

## Cómo probarlo

### Tests y calidad

```bash
npm install
npm test            # 326 tests en 31 suites
npm run typecheck
npm run lint
```

Si `typecheck` marca las rutas nuevas (`/control`, `/calibracion`, `/pista`) como inválidas, corre `npx expo start` una vez: Expo Router regenera los tipos de rutas en `.expo/types`.

Tests destacados:
- **Mapeo:** zona muerta, límites en −1 y 1, misma dirección en las dos orientaciones horizontales (con la lectura cruda invertida), efecto de la calibración, celular plano, filtro contra el temblor y reinicio al cambiar de orientación.
- **No hay doble corrección:** el sensor se registra sin ajuste automático, y un vector ya ajustado daría otro ángulo.
- **Frenos laterales:** cualquiera frena, los dos igual que uno, y vibran una sola vez.
- **Preferencias:** se guardan, se recuerdan y toleran datos corruptos.
- **Zona muerta y sensibilidad (paso 6):** recorren el cálculo real (`stepTiltSteering`) con zonas muertas de 1° a 9° y sensibilidades de 1 a 10, de a medio punto.
  - Fuera de la zona muerta, más sensibilidad da igual o más dirección en todo el recorrido. Antes del tope, estrictamente más.
  - La sensibilidad no mueve el borde de la zona muerta, y la zona muerta no cambia la pendiente: solo desplaza la curva.
  - Continuidad en el borde: en pasos de 0,01°, la dirección nunca cambia más de lo que permite el rango útil más corto.
  - En los indicadores, la zona azul no cambia con la sensibilidad y las marcas se acercan al centro.

### En el celular

**Recompilar el dev build** (nuevo módulo nativo `expo-sqlite`), con el celular conectado por USB:

```bash
npm run android
```

Si al abrir aparece un error de módulo nativo de SQLite, ejecuta `npx expo prebuild --platform android --clean` y vuelve a correr `npm run android`.

1. **Primera vez** (si la app ya estaba instalada, borra sus datos desde los ajustes de Android):
   - Aparece "¿Cómo querés manejar?" sin ninguna opción marcada y con Seguir desactivado.
   - Elige Inclinación y toca Seguir.
2. **Calibración:**
   - Sostén el celular como para jugar.
   - Al girarlo como un volante, la tarjeta del teléfono gira y muestra los grados ("+14°", "−8°").
   - El punto azul recorre el arco. Dentro de la zona azul, el auto iría derecho; en las marcas, dobla a fondo.
   - Mueve la sensibilidad de Suave a Rápida: **la zona azul no cambia** y las marcas se acercan al centro.
   - Mueve la zona muerta de Chica a Grande: la zona azul se agranda y las marcas se corren con ella. La sensibilidad no se mueve.
   - Toca Listo con el celular en tu posición cómoda.
3. **Manejar con inclinación:**
   - Girar el celular dobla el auto; volver a la posición calibrada lo endereza.
   - El punto del indicador, abajo al centro, sigue el giro. Al llegar a una marca, la dirección está a fondo.
   - Con sensibilidad Rápida, al salir de la zona azul el auto empieza a doblar suave y crece de a poco, sin volantazo.
   - Cualquiera de los dos frenos frena y, mantenido con el auto detenido, da marcha atrás. Los dos juntos, igual.
4. **Celular plano:** apoya el celular sobre la mesa. El auto va derecho y el punto del indicador se atenúa.
5. **Dar vuelta el celular:** gíralo 180° (de una orientación horizontal a la otra). La pantalla se da vuelta y la dirección sigue correcta: girar a la derecha sigue doblando a la derecha.
6. **Inclinar a fondo no da vuelta la pantalla:** gira el celular como volante lo más que puedas, incluso más de 45°, hacia los dos lados. La pantalla **no** debe cambiar de orientación.
7. **Recordar:** cierra la app y vuelve a abrirla. Va directo a la pista, en inclinación y con la misma calibración.
8. **Panel "Ajustes":**
   - Con inclinación, se ven "Ángulo leído" y "Dirección".
   - Cambia el modo a Botones y vuelve a Inclinación, en caliente.
   - "Recalibrar" toma la posición del momento como derecho.
   - "Calibración completa" abre la pantalla 03.
   - Prueba la zona muerta (queda guardada: al abrir la calibración aparece en el nivel más cercano), el filtro del temblor y la rampa.
   - Activa "Cámara gira con el auto": el auto mira siempre hacia arriba y el mundo gira.

## Decisiones y cambios respecto del plan y del handoff

- **Sensor de gravedad de Reanimated** en lugar de `DeviceMotion` de expo-sensors (handoff) o expo-sensors (`CLAUDE.md`): escribe en el hilo de UI y cada lectura trae la rotación de la pantalla. expo-sensors queda de respaldo. Se actualizó `CLAUDE.md`.
- **`expo-sqlite/kv-store`** en lugar de AsyncStorage o MMKV (handoff): es oficial de Expo, viene fijado por el SDK y lee de forma síncrona.
- **Dos orientaciones horizontales** (`sensorLandscape`) en tiempo de ejecución, con expo-screen-orientation. No hizo falta otro plugin.
- **Rampa de 0,08 s y filtro de 0,06 s** en modo inclinación. Los dos se ajustan en el panel.
- **"Recalibrar" del panel** toma la posición en el momento. En el juego final, el de la pausa abrirá la pantalla completa (anotado en `CLAUDE.md`). Para repetir la calibración completa, el panel tiene "Calibración completa".
- **La disponibilidad del sensor se detecta por los datos:** el objeto que devuelve `useAnimatedSensor` en el primer render no actualiza `isAvailable`.
- **Sin dependencias nuevas de UI:** las ilustraciones y la flecha de Volver van con `View` y texto. La fuente Archivo y los íconos Phosphor quedan para el HUD.
  - Por la tipografía del sistema, los títulos bajan de 36 a 32 dp y los de las tarjetas de 30 a 26.
  - El slider de sensibilidad reutiliza `DevSlider`, que ya tiene la pista, el relleno y el pulgar del handoff.
- **"Paso 1 de 2" y "Paso 2 de 2"** en lugar de "de 3": la personalización del auto todavía no existe.
- **`InputMode`** pasa a ser `ControlMode` de `core/PlayerPreferences`, donde se guarda la elección.
- **Sin modo preseleccionado** en la elección de control, aunque la captura del handoff muestra Inclinación elegida: el jugador elige sin sugerencia (paso 6).
- **Zona muerta y marcas de giro completo** en la calibración y en el HUD: no están en el handoff y siguen sus tokens (`blue-zone`, `muted`) y el formato del slider de sensibilidad.

## Notas

- **Pendiente de verificar en el celular:**
  - Que inclinar a fondo no dé vuelta la pantalla (paso 6). Por cómo funciona `sensorLandscape`, Android solo propone la otra orientación horizontal cerca de los 180° de giro.
  - El respaldo con acelerómetro. Si el Galaxy A15 no tiene sensor de gravedad, es el camino que va a usar.
- **Segunda prueba con usuarios, pendiente:** con esta corrección. De ella depende si se oculta la inclinación (anotado en `CLAUDE.md`). Hasta entonces, las dos opciones siguen visibles.
- **Pendiente de verificar en un celular chico:** que la tarjeta de la calibración, con los dos sliders, entre completa en 360 dp de alto.
- **Valores para afinar jugando:** sensibilidad, zona muerta, filtro y rampa.
- **Para más adelante:** la pausa con "Recalibrar" y "Cambiar control", la fuente Archivo y los íconos Phosphor.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
