# SceneryView

Cómo se ve la escenografía sin pagar por lo que no está en pantalla: qué celdas ve la cámara, cuánto se corre cada altura con el paralaje y cómo se lleva cada dibujo del atlas al mundo. TypeScript puro; las funciones que corren en cada cuadro son worklets.

## Tipos

- `CellRange`: `{ minColumn, maxColumn, minRow, maxRow }`, las celdas que ve la cámara.
- `SceneryGrid`: `{ cellSize, cells }`, índices de objetos por celda.
- `SpriteFrame`: `{ x, y, size }`, un recorte cuadrado de la textura, en píxeles.
- `SpriteLayout`: dónde está cada dibujo en la textura (lo define `render/SceneryAtlas`).
- `SpriteLayerId`: `shadows`, `tyres`, `bushes`, `treesSmall`, `treesLarge`.
- `SpriteEntry` / `SpriteLayer`: un dibujo ubicado en el mundo (recorte más RSXform) y una capa con su grilla.
- `SpriteTransform`: `{ scos, ssin, tx, ty }`, la transformación de Skia para `Atlas`.
- `SceneryDisplayConfig`: `{ visible, parallax, grassContrast, particles }`, lo que se ajusta en el panel.

## API

| Exporta | Qué hace |
|---|---|
| `buildSpriteLayers(scenery, layout, cellSize?)` | Una copa por árbol o arbusto en la capa de su altura, su sombra en el suelo (corrida según la altura) y un dibujo por neumático de las barreras. Cada capa con su grilla. |
| `getVisibleCellRange(view, viewport, cellSize, margin?)` | Celdas que tocan el círculo de la pantalla más un margen. Worklet. |
| `getItemsInRange(grid, range)` | Índices de las celdas del rango, de menor a mayor. Worklet. |
| `isSameCellRange(a, b)` | Si la cámara sigue en las mismas celdas. Worklet. |
| `getParallaxScale(height, intensity, cameraHeight?)` | Escala de una capa alrededor del centro de la pantalla según su altura. Worklet. |
| `getSpriteTransform(x, z, rotation, scale, anchorX, anchorY)` | RSXform de un dibujo del atlas. Worklet. |
| `buildSceneryGrid(points, cellSize)` / `getCellKey(column, row)` | La grilla. |
| `PARALLAX_LEVELS` | Alturas de las capas con paralaje: arbustos 1,5 m, carteles 3 m, árboles chicos 6 m y grandes 9 m. |
| `SCENERY_CELL_SIZE`, `VISIBLE_MARGIN`, `PARALLAX_CAMERA_HEIGHT`, `SHADOW_OFFSET` | 48 m, 8 m, 110 m y el corrimiento de las sombras por metro de altura. |
| `DEFAULT_SCENERY_DISPLAY` | Escenografía visible, paralaje 1, contraste 0,6 y partículas. |

## Ejemplo

```ts
const layers = buildSpriteLayers(scenery, SPRITE_LAYOUT);
// En el hilo de UI, en cada cuadro:
const range = getVisibleCellRange(cameraView, viewport, SCENERY_CELL_SIZE);
if (!isSameCellRange(lastRange, range)) {
  const visible = getItemsInRange(layers.treesLarge.grid, range);
  // ... armar los RSXform de `visible` para el Atlas
}
```

## Decisiones de diseño

- **Paralaje como escala de la capa entera:** vista desde arriba, la copa de un árbol se ve corrida hacia afuera del centro de la pantalla, más cuanto más lejos del centro y más alto. Es exactamente escalar la capa alrededor del centro de la pantalla (`1 + intensidad · altura / 110 m`). Una transformación por capa y ningún cálculo por objeto.
- **Pocas alturas:** los objetos de alturas parecidas comparten capa. Con cuatro capas alcanza para que arbustos, carteles, árboles chicos y grandes se muevan distinto.
- **Celdas de 48 m:** en pantalla entran unos 60 × 26 m (con el zoom más cercano) o 90 × 40 m (a fondo), así que se ven de 4 a 9 celdas. La cámara cambia de celdas cada uno o dos segundos a velocidad máxima; recién ahí se rearma la lista del atlas.
- **El círculo de la pantalla, no el rectángulo:** sirve igual con la cámara girada (`rotateWithCar`) y cuesta lo mismo.
- **Orden fijo de dibujo:** los índices visibles se ordenan, así dos copas que se tapan no cambian de lugar cuando entra o sale una celda.
- **Sombras en el suelo, corridas según la altura:** el sol viene de arriba a la izquierda, como la luz de las copas en el atlas. La sombra no tiene paralaje y la copa sí: así se nota la altura.
