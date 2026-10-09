# TrackFeatures

Lo que se puede leer de un trazado más allá de su forma: curvas cerradas, rectas, la recta principal, puntos a un costado de la pista y la zona libre (pista más escapatoria) donde no puede ir ningún objeto. TypeScript puro. Lo usa la escenografía (`core/Scenery`); la simulación no.

## Tipos

- `TrackSample`: `{ x, z, heading, distance }`, un punto del trazado con el rumbo de su tramo.
- `TrackSide`: `1` (derecha del sentido de la marcha) o `-1` (izquierda).
- `TightCorner`: `{ start, length, direction, minRadius }`, una curva que obliga a frenar. `direction` es hacia dónde gira al entrar.
- `TrackStraight`: `{ start, length, heading }`, un tramo sin pianos entre dos curvas.
- `RunoffConfig`: `{ straightRunoff, curveRunoff }`, escapatorias en metros.
- `TrackClearance`: zona libre de cada lado de cada punto, más una grilla de tramos para consultar rápido. Serializable.

## API

| Exporta | Qué hace |
|---|---|
| `getPointAtDistance(circuit, distance)` | Punto del trazado a esa distancia de la meta (con vuelta, también negativa). |
| `getSegmentAtDistance(circuit, distance)` | Tramo donde cae esa distancia (búsqueda binaria). |
| `getSignedCurvature(circuit, distance, window?)` | Curvatura con signo en 1/m: positiva a la derecha. Mide con cuerdas de `window` metros (8 por defecto). |
| `getTightCorners(circuit, maxRadius?)` | Curvas con radio menor que `TIGHT_CORNER_RADIUS` (45 m). Une las dos mitades de una chicana. |
| `getStraights(circuit)` | Rectas: los tramos entre pianos. |
| `getMainStraight(circuit)` | La recta de la meta (o la más larga si la meta cae en una curva). |
| `isWithinSection(distance, start, length, lap)` | Si una distancia cae en un tramo, con vuelta. |
| `getSidePoint(sample, side, offset)` | Punto a `offset` metros de la pista hacia un lado. |
| `getReadableRotation(heading)` | Giro de un cartel alineado con la pista, con el texto nunca cabeza abajo. |
| `createTrackClearance(circuit, runoff?)` | Zona libre de cada punto: medio ancho (hasta el borde blanco, o hasta el piano donde hay) más la escapatoria. |
| `getClearanceAt(clearance, circuit, distance, side)` | Zona libre a esa distancia y de ese lado, en metros desde el trazado central. |
| `fitsClearance(clearance, circuit, x, z, radius)` | Si un círculo queda fuera de la zona libre de todos los tramos cercanos. |
| `getClearanceOverlap(clearance, circuit, x, z, radius)` | Cuánto la invade: positivo si entra, cero o negativo si queda afuera. Para tests y diagnóstico. |
| `DEFAULT_RUNOFF` | 3 m en las rectas y 12 m del lado de afuera de las curvas. |

## Ejemplo

```ts
const clearance = createTrackClearance(circuit);
for (const corner of getTightCorners(circuit)) {
  const sample = getPointAtDistance(circuit, corner.start - 100);
  const outside = corner.direction === 1 ? -1 : 1;
  const offset = getClearanceAt(clearance, circuit, corner.start - 100, outside) + 1.5;
  const board = getSidePoint(sample, outside, offset);
  if (fitsClearance(clearance, circuit, board.x, board.z, 1.3)) {
    // cartel de 100 m
  }
}
```

## Decisiones de diseño

- **Curvatura con cuerdas entre puntos interpolados:** no depende de cuán largos sean los tramos del trazado. Con el rumbo de cada tramo, un polígono grueso (el óvalo de prueba, de tramos de 5 m) da una curvatura escalonada que hace aparecer curvas cerradas donde no las hay.
- **Curva cerrada a menos de 45 m de radio:** en el Autódromo del Lago deja exactamente la chicana (unos 16 m) y la horquilla (unos 15 m), las dos frenadas del trazado. La siguiente más cerrada ronda los 50 m y se toma a fondo.
- **Escapatoria de 3 m en las rectas:** la cámara muestra unos 20 m a cada lado de la pista a velocidad máxima (y menos detenida). Con más escapatoria, los objetos que dan la sensación de movimiento quedarían fuera de cuadro justo en las rectas, donde más hacen falta. Del lado de afuera de las curvas es de 12 m, y ahí terminan las barreras de neumáticos.
- **La zona libre mira todos los tramos cercanos, no solo el más próximo:** un objeto entre la horquilla y la recta de al lado tiene que respetar las dos. La grilla de tramos (celdas de 16 m) evita recorrer toda la vuelta en cada consulta.
- **Dentro de un tramo, la zona libre se interpola** entre la de sus dos puntos. Con puntos cada 2 m es casi lo mismo que tomar la mayor; en un trazado de tramos largos evita que la escapatoria de una curva se extienda a toda la recta vecina.
- **`fitsClearance` aparte de `getClearanceOverlap`:** el generador hace miles de consultas. La primera corta en el primer tramo invadido y compara distancias al cuadrado.
