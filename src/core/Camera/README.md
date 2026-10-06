# Camera

Cámara cenital que sigue al auto con anticipación: se adelanta en la dirección del movimiento, proporcional a la velocidad y con una transición suavizada. Calcula qué punto del mundo va en el centro de la pantalla, con qué zoom y con qué giro. TypeScript puro: no sabe nada de Skia; el hook arma la transformación a partir de `CameraView`.

## API

| Exporta | Qué hace |
|---|---|
| `createCameraState()` | Cámara sin adelanto (`{ lookX: 0, lookZ: 0 }`), para empezar o reiniciar. |
| `stepCamera(state, car, viewport, config, maxSpeed, dt)` | Acerca el adelanto al objetivo durante `dt` segundos. Devuelve un estado nuevo. |
| `getLookAheadTarget(car, viewport, config, maxSpeed)` | Adelanto objetivo en metros: velocidad × `lookAheadSeconds`, con tope. |
| `getCameraScale(car, config, maxSpeed)` | Zoom en dp por metro según la velocidad. |
| `getCameraView(car, camera, config, maxSpeed)` | Devuelve `{ targetX, targetZ, scale, rotation }`. |
| `worldToScreen(x, z, view, viewport)` | Convierte un punto del mundo a dp de pantalla. |
| `DEFAULT_CAMERA_CONFIG` | Valores iniciales (ver tabla). |

`CameraState`: `{ lookX, lookZ }`, el adelanto ya suavizado. Serializable.

## Parámetros (`CameraConfig`)

| Parámetro | Inicial | Efecto |
|---|---|---|
| `pixelsPerMeter` | 14 | Zoom detenido. El auto (2 m de ancho) mide 28 dp, cerca de los 30 dp del handoff. |
| `speedZoomOut` | 0.35 | A velocidad máxima el zoom baja un 35 %: se ve más pista cuando más hace falta. |
| `lookAheadSeconds` | 0.5 | Intensidad de la anticipación: cuántos segundos de recorrido se adelanta la cámara. |
| `maxLookAheadFraction` | 0.3 | Tope del adelanto: 30 % del lado menor de la pantalla. |
| `lookAheadSmoothing` | 0.5 | Suavizado del adelanto, en segundos: en ese tiempo recorre el 63 % de la diferencia con el objetivo. 0 = instantáneo. |
| `rotateWithCar` | false | Si es true, el mundo gira y el auto mira siempre hacia arriba. Se prueba en el hito 3 con la inclinación. |

## Ejemplo

```ts
let camera = createCameraState();

// En cada cuadro, con el auto ya interpolado:
camera = stepCamera(camera, car, viewport, DEFAULT_CAMERA_CONFIG, maxSpeed, frameMs / 1000);
const view = getCameraView(car, camera, DEFAULT_CAMERA_CONFIG, maxSpeed);
// En Skia: trasladar al centro, girar -rotation, escalar y trasladar -target.
```

## Decisiones de diseño

- **Adelanto y zoom según la velocidad:** con el zoom del handoff, a 150 km/h el auto cruza el alto de la pantalla en menos de un segundo. Adelantar la cámara y alejarla con la velocidad da tiempo para ver la curva. Se pueden poner en 0 para una cámara fija sobre el auto.
- **Adelanto suavizado:** sin suavizar, el adelanto copiaba la velocidad al instante. Al frenar, al chocar con el borde o al pasar a marcha atrás, la velocidad cambia de golpe y la cámara saltaba. Ahora se acerca al objetivo con un filtro exponencial (`1 − e^(−dt/lookAheadSmoothing)`), que da el mismo resultado a 60, 90 o 120 Hz.
- **En la dirección del movimiento, no del rumbo:** en marcha atrás la cámara mira hacia atrás del auto, que es hacia donde va.
- **Fuera de la simulación:** la cámara es presentación. Avanza con el tiempo de cada cuadro sobre el auto interpolado y no entra en el estado determinista de la carrera.
- **Rotación como opción de configuración:** con botones, el norte fijo es más fácil de leer; con inclinación puede convenir que el auto mire siempre hacia arriba. Se decide en el hito 3.
- `worldToScreen` replica exactamente la transformación que aplica el render; los tests la usan para comprobar dónde aparece el auto en pantalla.
