# Título

Hito 2: el auto se maneja (modelo arcade de paso fijo, botones multitáctiles, pista, cámara y panel de ajuste)

# Descripción

## Resumen

Primer hito jugable: un monoplaza que acelera solo por un óvalo, se dobla y se frena con botones en pantalla, con una cámara que lo sigue. Todavía sin límites de pista, vueltas ni tiempos. Reemplaza la pantalla de prueba del loop del hito 1.

### Preparación
- `react-native-gesture-handler` pasa a ser dependencia directa, en la versión oficial de Expo SDK 57 (`~2.32.0`). Antes llegaba la 3.3.0 como peer de expo-router. **Cambia código nativo: hay que recompilar el dev build.**
- Regla de ESLint (`no-restricted-imports` en `src/core/**`): `core` no puede importar React, React Native, Reanimated, Worklets, Skia, Expo ni otras capas del proyecto.
- `CLAUDE.md`: la simulación corre en el hilo de UI y la pureza de `core` se valida con lint.

### Modelo de manejo (`src/core`, TypeScript puro)
- **`DrivingModel`:** `stepCar` arcade.
  - Aceleración automática progresiva hasta la velocidad máxima, resistencia y freno que corta el acelerador, sin marcha atrás.
  - Giro proporcional a la velocidad (detenido no gira) con subviraje a alta velocidad.
  - La velocidad es un vector en el mundo, y el agarre lateral corrige el derrape de forma exponencial: derrape leve y controlable.
  - Todos los parámetros en `DrivingConfig`, con valores por defecto en `DEFAULT_DRIVING_CONFIG`.
- **`FixedStep`:** acumulador para pasos fijos de 60 Hz, independiente de los fps. Limita los cuadros a 100 ms para evitar la "espiral de la muerte".
- **`DrivingSim`:** une los dos anteriores y guarda el paso anterior para **interpolar el render**. Con la pantalla a 90 Hz y la física a 60 Hz evita tirones sin tocar la física. El estado (`car`, `previousCar`, `tick`, `accumulatorMs`) es serializable.
- **`Track`:** óvalo tipo estadio (rectas de 200 m, curvas de 50 m de radio, 8 m de ancho) con largada, curvas y meta.
- **`Camera`:** sigue al auto, se adelanta en la dirección del movimiento y se aleja con la velocidad. La opción `rotateWithCar` queda preparada en la configuración, desactivada, para probarla en el hito 3.
- **`MathUtils`:** `clamp`, `lerp`, `wrapAngle` y `lerpAngle`.
- Ejes x/z en metros con y hacia arriba, pensados para el 3D. Rumbo 0 hacia -z (arriba en pantalla), positivo en sentido horario.

### Capa de entrada (`src/input`)
- **`InputControls`:** contrato común. Cada modo de control es un componente que recibe `input: SharedValue<DrivingInput>` (`steer` -1..1, `brake` 0..1) y lo escribe. La inclinación del hito 3 implementará el mismo contrato.
- **`ButtonControls`:** izquierda, derecha y freno según la pantalla 07b del handoff (círculos de 76 y 96 dp, colores y estados presionados de los tokens).
  - **Multitáctil:** un gesto de gesture-handler por botón, así que se puede frenar y doblar a la vez.
  - Los gestos corren en el hilo de UI.
  - Vibración corta al empezar a frenar.
  - Respeta el área segura, porque en horizontal la barra de navegación tapaba el freno.

### Render (`src/render`) y loop (`src/hooks`)
- **`useDrivingLoop`:** avanza la simulación en `useFrameCallback` (hilo de UI) y produce las transformaciones de cámara y auto. Acepta cambios de configuración en caliente y tiene `reset()`.
- **`TrackLayer`:** césped con franjas diagonales infinitas, pianos en las curvas, borde blanco, asfalto y meta a cuadros, con colores y proporciones del handoff.
- **`CarShape`:** la silueta del Monoplaza del handoff, a 2 × 4,5 m.
- **`DriveCanvas`:** un único grupo de cámara para todo el mundo.
- **`DriveScreen`:** compone todo. Reemplaza a `LoopTestScreen`. Se eliminaron `LoopTestScreen`, `LoopTestCanvas`, `useBoxLoop` y `BoxMotion`.

### Panel de ajuste (`src/components`, solo desarrollo)
- **`DevPanel`:**
  - Se despliega con "Ajustes".
  - Lecturas en vivo a 5 Hz: velocidad, rumbo, deriva y fps.
  - Un slider por cada parámetro del manejo y otros para la cámara (zoom, alejar con la velocidad, mirar adelante).
  - Botones "Restablecer" y "Reiniciar auto".
- **`DevSlider`:** slider propio con gesture-handler, sin dependencias nativas nuevas. Convive con el scroll del panel y es accesible.
- **No existe en producción:** la pantalla lo carga con `require` detrás de `__DEV__`. Verificado con `npx expo export --platform android`: el bundle de producción no contiene ningún texto del panel; el de desarrollo, sí.

## Cómo probarlo

### Tests y calidad

```bash
npm install
npm test            # 128 tests en 16 suites
npm run typecheck
npm run lint
```

Tests destacados del modelo:
- No supera la velocidad máxima.
- No gira detenido.
- Frena hasta detenerse sin marcha atrás.
- **Determinismo:** 3000 entradas pseudoaleatorias dan exactamente el mismo estado.
- **Independencia de fps:** el mismo tiempo en cuadros de 60 Hz, 90 Hz o irregulares da el mismo estado.

### En el celular

Hay que **recompilar el dev build**, porque cambió la versión nativa de gesture-handler. Con el celular conectado por USB y la depuración USB activada:

```bash
npm run android
```

1. La app abre en horizontal con el auto azul en la recta superior, acelerando solo hacia la derecha.
2. **Doblar:** mantener presionada la flecha izquierda o derecha. El auto no gira si está detenido.
3. **Frenar:** mantener "Freno". El celular vibra al empezar a frenar.
4. **Multitáctil:** mantener "Freno" y, sin soltarlo, una flecha. El auto frena y dobla a la vez.
5. **Derrape:** a fondo en la recta, doblar con fuerza. La trompa gira antes que la trayectoria y el auto se acomoda al enderezar.
6. **Cámara:** sigue al auto, muestra más pista por delante y se aleja a alta velocidad.
7. **Panel de ajuste:** tocar "Ajustes" arriba a la izquierda.
   - Ver las lecturas (FPS debería marcar unos 90 en el A15, 60 en pantallas de 60 Hz).
   - Arrastrar en horizontal un slider (por ejemplo "Agarre lateral" o "Zoom") y manejar para notar el cambio.
   - "Reiniciar auto" vuelve a la largada. "Restablecer" vuelve a los valores por defecto.
8. Todavía no hay límites: si sales de la pista, el césped con franjas sigue indicando el movimiento. Usa "Reiniciar auto" para volver.

### Que el panel no está en producción (opcional)

```bash
npx expo export --platform android
```

En `dist/_expo/static/js/android/*.hbc` no aparece el texto "Reiniciar auto". `dist/` está en `.gitignore`.

## Decisiones y cambios respecto del plan

- **Simulación en el hilo de UI** (worklets de Reanimated). `core` sigue puro: la directiva `'worklet'` es un texto, no un import.
- **gesture-handler 2.32 y no 3.3:** se usa la versión oficial del SDK 57.
- **`lateralGrip` empieza en 8** (el plan decía 6), para un derrape más leve. Se afina con el panel.
- **`FixedStep` sin `maxStepsPerFrame`:** con `maxFrameMs = 100` ya queda limitado a 6 pasos por cuadro.
- **La interpolación vive en `DrivingSim`**, no en un módulo aparte, porque necesita el paso anterior.
- **Cámara con adelanto y zoom según la velocidad:** con el zoom del handoff, a 180 km/h el auto cruzaría la pantalla en medio segundo.
- **Césped con franjas en lugar de puntos:** un solo gradiente repetido, barato y útil como referencia de movimiento.
- **Colores:** los tokens del handoff con su hex de referencia. Los colores que no son tokens (césped y asfalto) se convirtieron de oklch.

## Notas

- Probado en un Samsung Galaxy A15 (90 Hz): 90 FPS con el panel abierto.
- `android/` sigue en `.gitignore`. La CMake 3.31.6 del hito 1 sigue fijada con `expo-build-properties`.
- Para más adelante: modo inmersivo (ocultar la barra de navegación durante la carrera) con `expo-navigation-bar`, que requiere recompilar.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
