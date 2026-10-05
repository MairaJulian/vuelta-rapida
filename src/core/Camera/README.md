# Camera

Cámara cenital que sigue al auto. Calcula qué punto del mundo va en el centro de la pantalla, con qué zoom y con qué giro. TypeScript puro: no sabe nada de Skia; el hook arma la transformación a partir de `CameraView`.

## API

| Exporta | Qué hace |
|---|---|
| `getCameraView(car, viewport, config, maxSpeed)` | Devuelve `{ targetX, targetZ, scale, rotation }`. |
| `worldToScreen(x, z, view, viewport)` | Convierte un punto del mundo a dp de pantalla. |
| `DEFAULT_CAMERA_CONFIG` | Valores iniciales (ver tabla). |

## Parámetros (`CameraConfig`)

| Parámetro | Inicial | Efecto |
|---|---|---|
| `pixelsPerMeter` | 14 | Zoom detenido. El auto (2 m de ancho) mide 28 dp, cerca de los 30 dp del handoff. |
| `speedZoomOut` | 0.35 | A velocidad máxima el zoom baja un 35 %: se ve más pista cuando más hace falta. |
| `lookAheadSeconds` | 0.5 | La cámara se adelanta en la dirección de la velocidad. |
| `maxLookAheadFraction` | 0.3 | Tope del adelanto: 30 % del lado menor de la pantalla. |
| `rotateWithCar` | false | Si es true, el mundo gira y el auto mira siempre hacia arriba. Se prueba en el hito 3 con la inclinación. |

## Ejemplo

```ts
const view = getCameraView(car, { width, height }, DEFAULT_CAMERA_CONFIG, drivingConfig.maxSpeed);
// En Skia: trasladar al centro, girar -rotation, escalar y trasladar -target.
```

## Decisiones de diseño

- **Adelanto y zoom según la velocidad:** con el zoom del handoff, a 180 km/h el auto cruza el alto de la pantalla en medio segundo. Adelantar la cámara y alejarla con la velocidad da tiempo para ver la curva. Se pueden poner en 0 para una cámara fija sobre el auto.
- **Sin suavizado propio:** la cámara se calcula sobre el estado interpolado del auto, que ya es continuo; no hace falta otro filtro que agregue retraso.
- **Rotación como opción de configuración:** con botones, el norte fijo es más fácil de leer; con inclinación puede convenir que el auto mire siempre hacia arriba. Se decide en el hito 3.
- `worldToScreen` replica exactamente la transformación que aplica el render; los tests la usan para comprobar dónde aparece el auto en pantalla.
