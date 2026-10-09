# useSceneryView

Prepara la escenografía para dibujarla rápido. Reparte los árboles, arbustos y neumáticos en celdas (`buildSpriteLayers`) y, en el hilo de UI, le entrega al `Atlas` de Skia solo los de las celdas que ve la cámara. También da la transformación de cada capa con paralaje. No dibuja nada.

## Parámetros

| Parámetro | Tipo | Descripción |
|---|---|---|
| `scenery` | `Scenery \| undefined` | Escenografía del circuito. Sin ella, el atlas queda vacío. |
| `cameraView` | `SharedValue<CameraView>` o `DerivedValue` | Lo que muestra la cámara (`useRaceLoop`). |
| `viewport` | `{ width, height }` | Área de dibujo en dp. |
| `parallax` | `number` | Intensidad del paralaje: 0 lo apaga, 1 es lo normal. En caliente. |

## Devuelve

| Valor | Descripción |
|---|---|
| `atlas` | Para cada capa (`shadows`, `tyres`, `bushes`, `treesSmall`, `treesLarge`): `{ sprites, transforms }`, valores compartidos para `Atlas`. |
| `levels` | Para cada capa con paralaje (`bushes`, `signs`, `treesSmall`, `treesLarge`): la transformación de su grupo. |

## Ejemplo

```tsx
const sceneryView = useSceneryView({
  scenery: track.scenery,
  cameraView: loop.cameraView,
  viewport,
  parallax: 1,
});

<Group transform={sceneryView.levels.treesLarge}>
  <Atlas
    image={atlas}
    sprites={sceneryView.atlas.treesLarge.sprites}
    transforms={sceneryView.atlas.treesLarge.transforms}
  />
</Group>
```

## Decisiones de diseño

- **Las listas se rearman solo al cambiar de celdas:** en cada cuadro calcula qué celdas ve la cámara (cuatro comparaciones). Si son las mismas que antes, no hace nada más. Si cambiaron (cada uno o dos segundos a fondo), arma los recortes y las transformaciones de los visibles: unos cientos de objetos de Skia, no miles.
- **Datos preparados en el hilo de JS:** `buildSpriteLayers` corre una vez por escenografía (o al cambiar la densidad o el ancho) y el resultado pasa al hilo de UI en un valor compartido.
- **Un `useFrameCallback` propio:** corre después del de `useRaceLoop`. Si alguna vez quedara un cuadro atrás, el margen de 8 m alrededor de la pantalla lo cubre.
- **Paralaje sin trabajo por objeto:** cada capa es una escala alrededor del centro de la pantalla (`getParallaxScale`), dentro del grupo de la cámara.
- **Importa el layout de la textura de `render/SceneryAtlas`:** las transformaciones dependen de dónde está cada dibujo en ella. Son solo datos; el núcleo los recibe como parámetro.
