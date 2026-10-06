# DevPanel

Panel desplegable **solo para desarrollo**. Permite ajustar en caliente los parámetros del modelo de manejo y de la cámara, y muestra lecturas en vivo de velocidad, rumbo, deriva y fps.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `drivingConfig` / `onDrivingConfigChange` | `DrivingConfig` | Parámetros del manejo (controlados por la pantalla). |
| `cameraConfig` / `onCameraConfigChange` | `CameraConfig` | Parámetros de la cámara. |
| `car` | `SharedValue<CarState>` | Estado del auto, para las lecturas. |
| `fps` | `SharedValue<number>` | fps suavizados. |
| `onResetCar` | `() => void` | Vuelve el auto a la largada. |

También exporta `DRIVING_SLIDERS`, `CAMERA_SLIDERS` (rangos de cada slider), `FIXED_DRIVING_KEYS` (parámetros sin slider) y `formatReadings`.

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
    car={loop.car}
    fps={loop.fps}
    onResetCar={loop.reset}
  />
) : null}
```

## Contenido

- **Lecturas:** velocidad (km/h), rumbo (0° arriba, sentido horario), deriva (m/s, positiva hacia la derecha del auto) y fps.
- **Manejo:** un slider por cada parámetro de `DrivingConfig`, salvo los de `FIXED_DRIVING_KEYS` (`wheelbase` y `collisionRadius`, que salen de las medidas del auto). El ángulo de giro se muestra en grados.
- **Cámara:** zoom, alejar con la velocidad, mirar adelante y su tope. `rotateWithCar` queda fuera hasta el hito 3.
- **Restablecer:** vuelve todos los parámetros a sus valores por defecto.
- **Reiniciar auto:** lo devuelve a la largada, detenido.

## Decisiones de diseño

- **Fuera de producción:** la pantalla lo carga con `require` detrás de `__DEV__`. En un build de release Metro reemplaza `__DEV__` por `false`, pliega la condición y descarta el `require` antes de resolver dependencias, así que el módulo no entra en el bundle. Se verifica generando el bundle con `npx expo export` y buscando sus textos.
- **Lecturas a 5 Hz y solo con el panel abierto:** re-renderizar React en cada cuadro competiría con el juego en el hilo de JS.
- **No tapa los controles:** ocupa la parte superior izquierda y termina por encima de los botones de dirección, así se puede manejar mientras se ajusta.
- **Scroll de gesture-handler:** convive con los gestos horizontales de los sliders.
- Cada rango de slider contiene el valor por defecto; un test lo verifica para que un cambio de valores iniciales no quede fuera de rango.
