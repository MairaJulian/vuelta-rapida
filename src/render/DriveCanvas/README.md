# DriveCanvas

Lienzo Skia de la pantalla de manejo. Dentro del grupo de la cámara, en coordenadas del mundo, dibuja el pasto, la pista, la escenografía, las partículas y el auto.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `track` | `TrackData` (con `scenery` opcional) | Circuito a dibujar. Si trae escenografía, se dibuja también. |
| `cameraTransform` | `SharedValue<Transforms3d>` | Transformación de la cámara. |
| `carTransform` | `SharedValue<Transforms3d>` | Posición y rumbo del auto. |
| `sceneryView` | `UseSceneryViewResult` (opcional) | Árboles visibles y paralaje (`useSceneryView`). Sin esto no hay escenografía. |
| `atlas` | `SkImage \| null` (opcional) | Textura de árboles, sombras y partículas (`useSceneryAtlas`). |
| `particles` | `SharedValue<ParticleState>` (opcional) | Polvo y humo (`useParticles`). |
| `display` | `SceneryDisplayConfig` (opcional) | Qué se muestra y con qué intensidad. Por defecto, `DEFAULT_SCENERY_DISPLAY`. |
| `carColor` | `string` (opcional) | Color de la carrocería (el del perfil activo). Por defecto, el azul. |
| `carNumber` | `number \| null` (opcional) | Número del auto (el del perfil activo). Sin número, el disco queda vacío. |

Las dos transformaciones las produce `useRaceLoop`.

## Ejemplo

```tsx
const loop = useRaceLoop({ input, track, viewport, drivingConfig, cameraConfig, raceConfig, recordTicks });
const atlas = useSceneryAtlas();
const sceneryView = useSceneryView({ scenery: track.scenery, cameraView: loop.cameraView, viewport, parallax: 1 });
const particles = useParticles({ race: loop.race, car: loop.car, input, enabled: true });

<DriveCanvas
  track={track}
  cameraTransform={loop.cameraTransform}
  carTransform={loop.carTransform}
  sceneryView={sceneryView}
  atlas={atlas}
  particles={particles}
/>
```

## Capas (de abajo hacia arriba)

1. Pasto con franjas (`GrassLayer`).
2. Pista (`TrackLayer`).
3. Detalles del asfalto (`AsphaltDetails`).
4. Escenografía del suelo: sombras y barreras (`SceneryLayer`, `ground`).
5. Partículas (`ParticleLayer`).
6. Auto (`CarShape`).
7. Escenografía con altura y paralaje: arbustos, carteles, tribuna y árboles (`SceneryLayer`, `raised`).

## Decisiones de diseño

- **Una sola cámara para todo el mundo:** todo se dibuja en metros y un único grupo lo lleva a pantalla. Agregar elementos del mundo (rivales, fantasma) es sumarlos dentro de ese grupo.
- **El pasto pinta el fondo:** `GrassLayer` cubre todo el lienzo, así que ya no hay un `Fill` de fondo aparte (antes se pintaban dos fondos a pantalla completa).
- **La escenografía con altura va encima del auto:** visto desde arriba, una copa que se asoma sobre la pista tapa al auto que pasa por debajo.
- **El panel la puede apagar:** con `display.visible` en falso no se dibujan los detalles del asfalto ni la escenografía, para comparar los fps con y sin ella. El pasto y la pista quedan.
- **El HUD y los controles no van aquí:** se superponen como vistas de React Native encima del lienzo, porque son interfaz y no parte del mundo.
- **Sin lógica:** solo aplica valores compartidos; los cálculos están en `core` y en los hooks.
