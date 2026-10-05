# Track

Geometría del circuito. En el hito 2 es un óvalo tipo estadio sin límites ni vueltas: solo define dónde se dibuja el asfalto y dónde larga el auto. TypeScript puro.

## Tipos

- `OvalTrack`: `{ centerX, centerZ, straightLength, radius, width }`, en metros sobre la línea central.
- `Pose`: `{ x, z, heading }`.
- `TrackRect`, `TrackCurve`, `FinishLine`: piezas que usa el render.

## API

| Exporta | Qué hace |
|---|---|
| `DEFAULT_TRACK` | Óvalo de prueba: rectas de 200 m, curvas de 50 m de radio, 8 m de ancho (unos 714 m por vuelta). |
| `getCenterlineRect(track)` | Línea central como rectángulo redondeado (forma de estadio). |
| `getCurves(track)` | Las dos curvas (centro y radio), para dibujar los pianos. |
| `getFinishLine(track)` | Línea de meta en el centro de la recta superior. |
| `getStartPose(track)` | Largada: 15 m antes de la meta, mirando a la derecha. |

## Ejemplo

```ts
import { DEFAULT_TRACK, getStartPose } from '@/core/Track';
import { createCarState } from '@/core/DrivingModel';

const start = getStartPose(DEFAULT_TRACK);
const car = createCarState(start.x, start.z, start.heading);
```

## Decisiones de diseño

- **Estadio y no elipse:** dos rectas y dos semicírculos se parecen más a un circuito y tienen curvas de radio constante, más fáciles de tomar y de calcular (límites y vueltas en el hito siguiente).
- **Rectas horizontales:** en un celular en horizontal se ve más recta por delante.
- **Sentido horario:** la largada mira hacia +x en la recta superior, así que todas las curvas son a la derecha.
- **Medidas:** el auto mide 2 × 4,5 m y la pista 8 m de ancho, cerca de la proporción del handoff (auto de 30 dp sobre asfalto de 110 dp).
- La geometría vive en `core` porque la van a usar las reglas de carrera (límites de pista, meta, vueltas), no solo el render.
