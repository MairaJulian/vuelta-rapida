# CatmullRom

Curvas suaves para los trazados: una Catmull-Rom cerrada que pasa por los puntos de control, y el remuestreo a distancia constante. TypeScript puro, sin dependencias.

## API

| Exporta | Qué hace |
|---|---|
| `sampleClosedCatmullRom(controlPoints, samplesPerSegment, alpha = 0.5)` | Curva cerrada que pasa por todos los puntos, en orden. Devuelve `samplesPerSegment` puntos por tramo, empezando en el primer punto de control. |
| `resampleClosedPolyline(points, spacing)` | Lazo cerrado a distancia constante (lo más cerca posible de `spacing`). Devuelve `{ points, distances, length }`. |
| `PlanePoint` (tipo) | `{ x, z }` en metros, la misma forma que `TrackPoint`. |
| `ResampledLoop` (tipo) | Resultado del remuestreo. `distances[i]` es lo recorrido desde el primer punto. |

## Ejemplo

```ts
const smooth = sampleClosedCatmullRom(definition.controlPoints, 32);
const { points, distances, length } = resampleClosedPolyline(smooth, 2);
```

## Decisiones de diseño

- **Catmull-Rom y no Bézier:** la curva pasa exactamente por los puntos de control. Así un circuito se describe con los puntos por donde va la pista, sin manejar controles fuera de ella. El primer punto de control es la meta.
- **Centrípeta (`alpha` 0,5):** la parametrización según la raíz de la distancia evita rulos y cúspides cuando los puntos están espaciados de forma despareja, por ejemplo en una horquilla con puntos juntos después de una recta larga.
- **Remuestreo a distancia constante:** el trazado queda con puntos parejos (cada 2 m en los circuitos). Eso hace confiable la estimación de curvatura de los pianos y convierte el progreso del auto en una cuenta directa: distancia acumulada del segmento más la parte recorrida.
- **El primer punto se conserva:** la meta queda exactamente en el punto 0 del trazado.
- **Puntos repetidos:** se toleran (el paso entre nudos tiene un mínimo), pero la validación de la pista los rechaza.
