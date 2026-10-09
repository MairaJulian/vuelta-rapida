# DriveCanvas

Lienzo Skia de la pantalla de manejo. Pinta el césped de fondo y, dentro del grupo de la cámara, la pista (`TrackLayer`) y el auto (`CarShape`) en coordenadas del mundo.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `track` | `TrackData` | Circuito a dibujar. |
| `cameraTransform` | `SharedValue<Transforms3d>` | Transformación de la cámara. |
| `carTransform` | `SharedValue<Transforms3d>` | Posición y rumbo del auto. |

Las dos transformaciones las produce `useRaceLoop`.

## Ejemplo

```tsx
const loop = useRaceLoop({ input, track, viewport, drivingConfig, cameraConfig, raceConfig, recordTicks });

<DriveCanvas
  track={track}
  cameraTransform={loop.cameraTransform}
  carTransform={loop.carTransform}
/>
```

## Decisiones de diseño

- **Una sola cámara para todo el mundo:** la pista y el auto se dibujan en metros y un único grupo los lleva a pantalla. Agregar elementos del mundo (rivales, fantasma) es sumarlos dentro de ese grupo.
- **El HUD y los controles no van aquí:** se superponen como vistas de React Native encima del lienzo, porque son interfaz y no parte del mundo.
- **Sin lógica:** solo aplica valores compartidos; los cálculos están en `core/Camera` y `useRaceLoop`.
