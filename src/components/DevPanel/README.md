# DevPanel

Panel desplegable **solo para desarrollo**. Permite ajustar en caliente el modo de control, la inclinación, las vueltas, el sonido, la vibración, el modelo de manejo, el ancho de la pista, la escenografía y la cámara. Muestra lecturas en vivo de velocidad, rumbo, deriva y fps y, con inclinación, del ángulo leído y la dirección resultante.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `drivingConfig` / `onDrivingConfigChange` | `DrivingConfig` | Parámetros del manejo (controlados por la pantalla). |
| `cameraConfig` / `onCameraConfigChange` | `CameraConfig` | Parámetros de la cámara, incluido `rotateWithCar`. |
| `track` / `onTrackChange` | `TrackData` | Pista en uso. El panel solo cambia su ancho; el trazado queda igual. |
| `sceneryDisplay` / `onSceneryDisplayChange` | `SceneryDisplayConfig` | Cómo se ve la escenografía: si se dibuja, partículas, paralaje y contraste de las franjas. |
| `treeDensity` / `onTreeDensityChange` | `number` | Densidad de árboles y arbustos (×0 a ×2). La pantalla regenera la escenografía con la misma semilla. |
| `controlMode` / `onControlModeChange` | `ControlMode` | Modo de control; se cambia en caliente. |
| `tiltConfig` / `onTiltConfigChange` | `TiltConfig` | Inclinación efectiva. La pantalla decide qué se guarda como preferencia (la sensibilidad). |
| `tiltOutput` | `SharedValue<TiltSteeringResult>` | Resultado de la inclinación, para las lecturas. |
| `onRecalibrate` | `() => void` | Toma la posición actual del celular como "derecho". |
| `onOpenCalibration` | `() => void` | Abre la pantalla de calibración completa. |
| `car` | `SharedValue<CarState>` | Estado del auto, para las lecturas. |
| `fps` | `SharedValue<number>` | fps suavizados. |
| `onResetCar` | `() => void` | Reinicia la carrera: el auto vuelve a la largada. |
| `raceConfig` / `onRaceConfigChange` | `RaceConfig` | Reglas de la carrera. El panel solo cambia las vueltas. |
| `audioMix` / `onAudioMixChange` | `RaceAudioMix` | Volúmenes del motor y de los efectos, y tono del motor. |
| `hapticsConfig` / `onHapticsConfigChange` | `RaceHapticsConfig` | Intensidad de vibración de cada momento. |

También exporta:
- `DRIVING_SLIDERS`, `TILT_SLIDERS`, `RACE_SLIDERS`, `AUDIO_SLIDERS`, `TRACK_SLIDERS`, `SCENERY_SLIDERS`, `TREE_DENSITY_SLIDER` y `CAMERA_SLIDERS`: el rango de cada slider.
- `SCENERY_SWITCHES`: los interruptores de la escenografía.
- `HAPTIC_MOMENTS`: los momentos que vibran, con su nombre.
- `FIXED_DRIVING_KEYS`: los parámetros sin slider.
- `formatReadings` y `formatTiltReadings`.

## Ejemplo

```tsx
// Solo en desarrollo: en producción Metro reemplaza __DEV__ por false y elimina el require.
const DevPanel = __DEV__ ? require('@/components/DevPanel').DevPanel : null;

{DevPanel ? (
  <DevPanel
    drivingConfig={drivingConfig}
    onDrivingConfigChange={setDrivingConfig}
    cameraConfig={cameraConfig}
    onCameraConfigChange={setCameraConfig}
    track={track}
    onTrackChange={(next) => changeTrackWidth(next.width)}
    sceneryDisplay={sceneryDisplay}
    onSceneryDisplayChange={setSceneryDisplay}
    treeDensity={track.scenery?.spec.treeDensity ?? 1}
    onTreeDensityChange={changeTreeDensity}
    controlMode={controlMode}
    onControlModeChange={(mode) => updatePreferences({ controlMode: mode })}
    tiltConfig={tiltConfig}
    onTiltConfigChange={changeTiltConfig}
    tiltOutput={tiltOutput}
    onRecalibrate={recalibrate}
    onOpenCalibration={() => router.push('/calibracion')}
    car={loop.car}
    fps={loop.fps}
    onResetCar={restartRace}
    raceConfig={raceConfig}
    onRaceConfigChange={setRaceConfig}
    audioMix={audioMix}
    onAudioMixChange={setAudioMix}
    hapticsConfig={hapticsConfig}
    onHapticsConfigChange={setHapticsConfig}
  />
) : null}
```

## Contenido

- **Lecturas:**
  - Velocidad en km/h (negativa en marcha atrás), rumbo, deriva y fps.
  - Con inclinación, además: ángulo leído (ya calibrado, con signo) y dirección resultante (−1 a 1).
- **Control:** selector Inclinación / Botones. Cambia el modo en caliente y lo guarda como preferencia. Con la inclinación desactivada para el jugador (`FEATURE_FLAGS.tiltControl`), este es el único acceso a la inclinación. Dura hasta volver a abrir el juego: la entrada lo devuelve a botones.
- **Inclinación** (solo se ve en modo inclinación):
  - Sliders: zona muerta (1° a 9°, el rango del jugador), sensibilidad (1 a 10), filtro del temblor (0 a 0,3 s) y rampa de dirección (0 a 0,5 s).
  - Botón "Recalibrar": toma la posición del momento.
  - Botón "Calibración completa": abre la pantalla 03.
- **Carrera:** vueltas, de 1 a 5. Valen desde la próxima carrera (Reiniciar auto, o Reiniciar en la pausa).
- **Sonido:** volumen del motor y de los efectos (0 a 100 %), y tono del motor detenido (×0,25 a ×2) y a fondo (×0,5 a ×4), como velocidad de reproducción del loop.
- **Vibración:** para piano, borde, largada y llegada, una de cinco intensidades: Apagada, Leve, Media, Fuerte o Doble.
- **Manejo:** un slider por cada parámetro de `DrivingConfig`, salvo los de `FIXED_DRIVING_KEYS` (`wheelbase` y `collisionRadius`, que salen de las medidas del auto). Incluye:
  - La curva de giro según la velocidad: ángulo máximo en grados, giro a velocidad máxima y exponente de la curva.
  - Los tiempos de giro y de vuelta al centro (con botones).
  - La pausa y la velocidad de la marcha atrás.
  - La pérdida contra el borde.
- **Pista:** ancho, de 8 a 20 m. Con más de 20 m, las dos ramas de la horquilla del Autódromo del Lago (a 40 m de centro a centro) dejarían de estar separadas por pasto. Cambiarlo vuelve a generar la escenografía, para que nada pise la pista más ancha.
- **Escenografía:**
  - Interruptores "Partículas de polvo y humo" y "Dibujar la escenografía". Apagar la escenografía sirve para comparar los fps con y sin ella en el celular.
  - Densidad de árboles (×0 a ×2): vuelve a generar la escenografía con la misma semilla, así que tarda un momento.
  - Intensidad del paralaje (×0 a ×2) y contraste de las franjas del pasto (0 a 100 %).
- **Cámara:**
  - Interruptor "Cámara gira con el auto" (`rotateWithCar`).
  - Zoom, alejar con la velocidad, y la intensidad, el tope y el suavizado de la anticipación.
- **Restablecer:** vuelve los ajustes (también las vueltas, el sonido, la vibración y la escenografía) y el ancho de la pista a sus valores por defecto. **No** toca la calibración, que la elige el jugador. La densidad de árboles solo se restablece si cambió: regenerar la escenografía tarda.
- **Reiniciar auto:** reinicia la carrera: el auto vuelve a la grilla y arranca el semáforo.

## Decisiones de diseño

- **Debajo del HUD:** el botón "Ajustes" está a 80 dp del borde de arriba, debajo de la píldora "Vuelta" del HUD de carrera, para no taparla.
- **Fuera de producción:** la pantalla lo carga con `require` detrás de `__DEV__`. En un build de release Metro reemplaza `__DEV__` por `false`, pliega la condición y descarta el `require` antes de resolver dependencias, así que el módulo no entra en el bundle. Se verifica generando el bundle con `npx expo export` y buscando sus textos.
- **Recalibrar en el momento:** el botón del panel no abre la pantalla 03, para poder probar calibraciones sin salir de la pista. En el juego final, "Recalibrar" del menú de pausa abrirá la calibración completa (anotado en `CLAUDE.md`).
- **Dos rampas a la vista:** "Tiempo de giro" y "Tiempo de vuelta al centro" (Manejo) se aplican con botones. "Rampa de dirección (inclinación)" las reemplaza en modo inclinación.
- **Con botones, la sección Inclinación se oculta** (no se borra): sus ajustes no hacen nada en ese modo, y en la segunda prueba con usuarios se subió la rampa de inclinación creyendo que afectaba a los botones. Al elegir Inclinación en el selector, vuelve a aparecer. Las lecturas de inclinación ("Ángulo leído" y "Dirección") ya se ocultaban igual. "Restablecer" sigue llevando también los ajustes ocultos a sus valores por defecto.
- **Vueltas, sonido, vibración y escenografía solo en la sesión:** son ajustes para probar en el celular, no preferencias del jugador. Al salir de la pista vuelven a sus valores iniciales.
- **Lecturas a 5 Hz y solo con el panel abierto:** re-renderizar React en cada cuadro competiría con el juego en el hilo de JS.
- **No tapa los controles:** ocupa la parte superior izquierda y termina por encima de los controles, así se puede manejar mientras se ajusta.
- **Scroll de gesture-handler:** convive con los gestos horizontales de los sliders.
- **Tests de cobertura:**
  - Cada rango de slider contiene el valor por defecto, para que un cambio de valores iniciales no quede fuera de rango.
  - Cada parámetro ajustable del manejo, la inclinación y la cámara tiene su slider, para que un parámetro nuevo no quede sin panel.

## Piezas

### DevSegmented (`src/components/DevSegmented`)

Selector de una opción entre varias, en una píldora. Lo usan el selector de control y las intensidades de vibración. Es un componente chico de interfaz: no tiene README ni test propios (no tiene lógica); se documenta acá y se prueba a través del panel.

| Prop | Tipo | Descripción |
|---|---|---|
| `options` | `{ value, label }[]` | Opciones, en orden. |
| `value` / `onChange` | `string` | Opción elegida. |
| `label` | `string` (opcional) | Nombre del grupo para el lector de pantalla. |
| `compact` | `boolean` (opcional) | Texto de 11 en lugar de 14, para que entren cinco opciones en los 340 dp del panel. |
| `testID` | `string` (opcional) | Para los tests. |

Se anuncia como un `radiogroup` con un `radio` por opción (`checked` en la elegida). Antes, los estilos del selector estaban en el panel; ahora viven en `DevSegmented.styles.ts`.
