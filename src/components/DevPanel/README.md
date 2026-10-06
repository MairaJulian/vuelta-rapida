# DevPanel

Panel desplegable **solo para desarrollo**. Permite ajustar en caliente los parámetros del modelo de manejo, el ancho de la pista y la cámara, y muestra lecturas en vivo de velocidad, rumbo, deriva y fps.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `drivingConfig` / `onDrivingConfigChange` | `DrivingConfig` | Parámetros del manejo (controlados por la pantalla). |
| `cameraConfig` / `onCameraConfigChange` | `CameraConfig` | Parámetros de la cámara. |
| `track` / `onTrackChange` | `TrackData` | Pista en uso. El panel solo cambia su ancho; el trazado queda igual. |
| `car` | `SharedValue<CarState>` | Estado del auto, para las lecturas. |
| `fps` | `SharedValue<number>` | fps suavizados. |
| `onResetCar` | `() => void` | Vuelve el auto a la largada. |

También exporta:
- `DRIVING_SLIDERS`, `TRACK_SLIDERS` y `CAMERA_SLIDERS`: el rango de cada slider.
- `FIXED_DRIVING_KEYS`: los parámetros sin slider.
- `formatReadings`.

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
    car={loop.car}
    fps={loop.fps}
    onResetCar={loop.reset}
  />
) : null}
```

## Contenido

- **Lecturas:**
  - Velocidad en km/h, negativa en marcha atrás.
  - Rumbo: 0° arriba, en sentido horario.
  - Deriva en m/s, positiva hacia la derecha del auto.
  - fps.
- **Manejo:** un slider por cada parámetro de `DrivingConfig`, salvo los de `FIXED_DRIVING_KEYS` (`wheelbase` y `collisionRadius`, que salen de las medidas del auto). Incluye:
  - La curva de giro según la velocidad: ángulo máximo en grados, giro a velocidad máxima y exponente de la curva.
  - Los tiempos de giro y de vuelta al centro.
  - La pausa y la velocidad de la marcha atrás.
  - La pérdida contra el borde.
- **Pista:** ancho, de 8 a 30 m. Con 30 m las curvas del óvalo (radio de 50 m) todavía no se cierran por dentro.
- **Cámara:** zoom, alejar con la velocidad, intensidad de la anticipación, su tope y su suavizado. `rotateWithCar` queda fuera hasta el hito 3.
- **Restablecer:** vuelve todos los parámetros y el ancho de la pista a sus valores por defecto.
- **Reiniciar auto:** lo devuelve a la largada, detenido.

## Decisiones de diseño

- **Fuera de producción:** la pantalla lo carga con `require` detrás de `__DEV__`. En un build de release Metro reemplaza `__DEV__` por `false`, pliega la condición y descarta el `require` antes de resolver dependencias, así que el módulo no entra en el bundle. Se verifica generando el bundle con `npx expo export` y buscando sus textos.
- **Lecturas a 5 Hz y solo con el panel abierto:** re-renderizar React en cada cuadro competiría con el juego en el hilo de JS.
- **No tapa los controles:** ocupa la parte superior izquierda y termina por encima de los botones de dirección, así se puede manejar mientras se ajusta.
- **Scroll de gesture-handler:** convive con los gestos horizontales de los sliders.
- **Tests de cobertura:**
  - Cada rango de slider contiene el valor por defecto, para que un cambio de valores iniciales no quede fuera de rango.
  - Cada parámetro ajustable del manejo y de la cámara tiene su slider, para que un parámetro nuevo no quede sin panel.
