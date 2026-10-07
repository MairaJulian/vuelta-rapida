# useDrivingLoop

Conecta el loop de Reanimated (`useFrameCallback`, hilo de UI) con la simulación pura de `core`. En cada cuadro avanza `DrivingSim` con el tiempo transcurrido y la entrada actual, y publica el estado interpolado del auto, las transformaciones de cámara y auto para Skia y las vueltas para el HUD. No dibuja nada.

## Parámetros

| Parámetro | Tipo | Descripción |
|---|---|---|
| `input` | `SharedValue<DrivingInput>` | Entrada que escribe el modo de control. |
| `track` | `Circuit` | Circuito: define la largada, los límites y las vueltas. Se puede cambiar en caliente (el ancho, desde el panel). |
| `viewport` | `{ width, height }` | Área de dibujo en dp. |
| `drivingConfig` | `DrivingConfig` | Parámetros del modelo; los cambios se aplican en caliente. |
| `cameraConfig` | `CameraConfig` | Parámetros de la cámara; también en caliente. |
| `onBestLap` | `(bestLapTicks) => void` (opcional) | Se llama en el hilo de JS cuando mejora la mejor vuelta de la sesión. Tiene que ser estable. |

## Devuelve

| Valor | Descripción |
|---|---|
| `car` | `SharedValue<CarState>` interpolado, para dibujar y para las lecturas del panel. |
| `fps` | fps suavizados. |
| `cameraTransform` | Transformación del grupo del mundo: centro de pantalla, giro, zoom y objetivo. |
| `carTransform` | Posición y rumbo del auto en el mundo. |
| `laps` | `DerivedValue<LapState>`: vueltas y tiempos de la sesión, en pasos. |
| `reset()` | Vuelve el auto a la largada, detenido, con las vueltas sin empezar. |

## Ejemplo

```tsx
const input = useDrivingInput();
const { saveLap } = useBestLapRecord({ circuitId: track.id, stepHz: 60 });
const loop = useDrivingLoop({ input, track, viewport, drivingConfig, cameraConfig, onBestLap: saveLap });

<DriveCanvas track={track} cameraTransform={loop.cameraTransform} carTransform={loop.carTransform} />
```

## Decisiones de diseño

- **Hilo de UI:** la simulación avanza dentro de `useFrameCallback`; lee la entrada y la configuración desde valores compartidos y no pasa por React en ningún cuadro.
- **Configuración en caliente:** los objetos de configuración llegan como props (estado de React del panel) y se copian a valores compartidos con `useEffect`; el loop lee siempre la última versión.
- **Transformaciones derivadas:** `useDerivedValue` arma los arreglos de transformación de Skia a partir de `getCameraView` (core). El render solo los aplica.
- **Cámara con estado propio:** en cada cuadro, después de la simulación, `stepCamera` acerca el adelanto al objetivo con el tiempo del cuadro. Es presentación: no entra en `DrivingSim` ni en su determinismo. `reset()` también la centra.
- **Pista en caliente:** la pista llega como valor compartido, igual que la configuración. Si el panel cambia el ancho, el límite se aplica desde el paso siguiente.
- **Vueltas en la simulación, aviso al hilo de JS:** las vueltas avanzan con cada paso fijo dentro de `DrivingSim`. Cuando mejora la mejor vuelta de la sesión, el loop llama a `onBestLap` con `scheduleOnRN` (de react-native-worklets, como la vibración de los frenos), para que se guarde el récord sin frenar el cuadro.
- Usa `.get()`/`.set()` en lugar de `.value`, como recomienda Reanimated 4 para que el React Compiler no marque mutaciones.
