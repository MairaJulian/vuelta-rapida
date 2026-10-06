# DevPanel

Panel desplegable **solo para desarrollo**. Permite ajustar en caliente el modo de control, la inclinación, el modelo de manejo, el ancho de la pista y la cámara. Muestra lecturas en vivo de velocidad, rumbo, deriva y fps y, con inclinación, del ángulo leído y la dirección resultante.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `drivingConfig` / `onDrivingConfigChange` | `DrivingConfig` | Parámetros del manejo (controlados por la pantalla). |
| `cameraConfig` / `onCameraConfigChange` | `CameraConfig` | Parámetros de la cámara, incluido `rotateWithCar`. |
| `track` / `onTrackChange` | `TrackData` | Pista en uso. El panel solo cambia su ancho; el trazado queda igual. |
| `controlMode` / `onControlModeChange` | `ControlMode` | Modo de control; se cambia en caliente. |
| `tiltConfig` / `onTiltConfigChange` | `TiltConfig` | Inclinación efectiva. La pantalla decide qué se guarda como preferencia (la sensibilidad). |
| `tiltOutput` | `SharedValue<TiltSteeringResult>` | Resultado de la inclinación, para las lecturas. |
| `onRecalibrate` | `() => void` | Toma la posición actual del celular como "derecho". |
| `onOpenCalibration` | `() => void` | Abre la pantalla de calibración completa. |
| `car` | `SharedValue<CarState>` | Estado del auto, para las lecturas. |
| `fps` | `SharedValue<number>` | fps suavizados. |
| `onResetCar` | `() => void` | Vuelve el auto a la largada. |

También exporta:
- `DRIVING_SLIDERS`, `TILT_SLIDERS`, `TRACK_SLIDERS` y `CAMERA_SLIDERS`: el rango de cada slider.
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
    onTrackChange={setTrack}
    controlMode={controlMode}
    onControlModeChange={(mode) => updatePreferences({ controlMode: mode })}
    tiltConfig={tiltConfig}
    onTiltConfigChange={changeTiltConfig}
    tiltOutput={tiltOutput}
    onRecalibrate={recalibrate}
    onOpenCalibration={() => router.push('/calibracion')}
    car={loop.car}
    fps={loop.fps}
    onResetCar={loop.reset}
  />
) : null}
```

## Contenido

- **Lecturas:**
  - Velocidad en km/h (negativa en marcha atrás), rumbo, deriva y fps.
  - Con inclinación, además: ángulo leído (ya calibrado, con signo) y dirección resultante (−1 a 1).
- **Control:** selector Inclinación / Botones. Cambia el modo en caliente y lo guarda como preferencia.
- **Inclinación:**
  - Sliders: zona muerta (0 a 15°), sensibilidad (1 a 10), filtro del temblor (0 a 0,3 s) y rampa de dirección (0 a 0,5 s).
  - Botón "Recalibrar": toma la posición del momento. Solo funciona en modo inclinación.
  - Botón "Calibración completa": abre la pantalla 03.
- **Manejo:** un slider por cada parámetro de `DrivingConfig`, salvo los de `FIXED_DRIVING_KEYS` (`wheelbase` y `collisionRadius`, que salen de las medidas del auto). Incluye:
  - La curva de giro según la velocidad: ángulo máximo en grados, giro a velocidad máxima y exponente de la curva.
  - Los tiempos de giro y de vuelta al centro (con botones).
  - La pausa y la velocidad de la marcha atrás.
  - La pérdida contra el borde.
- **Pista:** ancho, de 8 a 30 m. Con 30 m las curvas del óvalo (radio de 50 m) todavía no se cierran por dentro.
- **Cámara:**
  - Interruptor "Cámara gira con el auto" (`rotateWithCar`).
  - Zoom, alejar con la velocidad, y la intensidad, el tope y el suavizado de la anticipación.
- **Restablecer:** vuelve los ajustes y el ancho de la pista a sus valores por defecto. **No** toca la calibración, que la elige el jugador.
- **Reiniciar auto:** lo devuelve a la largada, detenido.

## Decisiones de diseño

- **Fuera de producción:** la pantalla lo carga con `require` detrás de `__DEV__`. En un build de release Metro reemplaza `__DEV__` por `false`, pliega la condición y descarta el `require` antes de resolver dependencias, así que el módulo no entra en el bundle. Se verifica generando el bundle con `npx expo export` y buscando sus textos.
- **Recalibrar en el momento:** el botón del panel no abre la pantalla 03, para poder probar calibraciones sin salir de la pista. En el juego final, "Recalibrar" del menú de pausa abrirá la calibración completa (anotado en `CLAUDE.md`).
- **Dos rampas a la vista:** "Tiempo de giro" y "Tiempo de vuelta al centro" (Manejo) se aplican con botones. "Rampa de dirección (inclinación)" las reemplaza en modo inclinación.
- **Lecturas a 5 Hz y solo con el panel abierto:** re-renderizar React en cada cuadro competiría con el juego en el hilo de JS.
- **No tapa los controles:** ocupa la parte superior izquierda y termina por encima de los controles, así se puede manejar mientras se ajusta.
- **Scroll de gesture-handler:** convive con los gestos horizontales de los sliders.
- **Tests de cobertura:**
  - Cada rango de slider contiene el valor por defecto, para que un cambio de valores iniciales no quede fuera de rango.
  - Cada parámetro ajustable del manejo, la inclinación y la cámara tiene su slider, para que un parámetro nuevo no quede sin panel.
