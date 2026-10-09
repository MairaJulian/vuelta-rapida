# SceneryLayer

Dibuja la escenografía del circuito (`core/Scenery`) en coordenadas del mundo. Va dos veces dentro del grupo de la cámara: el suelo debajo de los autos y lo elevado encima, cada altura en su capa con paralaje. Solo dibuja: qué árboles se ven y cuánto se corre cada capa lo calcula `useSceneryView`.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `scenery` | `Scenery` | Escenografía del circuito. |
| `atlas` | `SkImage \| null` | Textura de árboles, sombras y neumáticos (`useSceneryAtlas`). Sin ella no se dibujan; los carteles y la tribuna sí. |
| `view` | `UseSceneryViewResult` | Dibujos visibles del atlas y transformaciones del paralaje. |
| `level` | `'ground' \| 'raised'` | Suelo (sombras y barreras) o elevado (arbustos, carteles, tribuna y árboles). |

## Ejemplo

```tsx
<Group transform={cameraTransform}>
  <TrackLayer track={track} />
  <SceneryLayer scenery={scenery} atlas={atlas} view={sceneryView} level="ground" />
  <CarShape transform={carTransform} />
  <SceneryLayer scenery={scenery} atlas={atlas} view={sceneryView} level="raised" />
</Group>
```

## Capas (de abajo hacia arriba)

1. **Suelo:** sombras de árboles y arbustos, y barreras de neumáticos (atlas).
2. *(Las partículas y el auto van acá, entre las dos.)*
3. **Arbustos** (1,5 m): atlas.
4. **Carteles y gradas** (3 m): carteles de distancia, publicidad y tribuna.
5. **Árboles chicos** (6 m): atlas.
6. **Árboles grandes y techo de la tribuna** (9 m): atlas y techo.

## Decisiones de diseño

- **Lo que se repite va en el atlas; lo que lleva texto, en vectores.** Cientos de árboles en una llamada de dibujo por capa. Los carteles y la tribuna son unos treinta objetos y llevan texto: se dibujan como vectores, como el cartel META.
- **Neumáticos en el atlas, no en `Points`:** son unos 1800. En la GPU, Skia dibuja cada punto redondo de un `Points` como un óvalo aparte, en cada cuadro y aunque esté fuera de pantalla. En el atlas son una sola llamada y solo los de las celdas visibles: círculos `ink` con el agujero un poco más claro, como los de la escena del handoff.
- **Lo alto tapa a lo bajo y al auto:** si el paralaje lleva una copa sobre el borde de la pista, pasa por encima del auto, como una rama.
- **Fuente única para los carteles:** la del sistema en itálica negrita (`BOARD_FONT`), de 1 m, escalada en cada cartel.
- **El público de la tribuna sí usa `Points`:** son unos 230 puntos de una sola tribuna; no vale la pena otra capa del atlas.

## Piezas

### SceneryBoard (`src/render/SceneryBoard`)

Cartel visto desde arriba: una placa con el texto derecho. Componente chico: se documenta acá y tiene test porque ajusta el texto.

| Prop | Tipo | Descripción |
|---|---|---|
| `board` | `SceneryObject` | Un `distanceBoard` (blanco, número en `ink`, franja coral) o un `billboard` (colores de su marca). |
| `font` | `SkFont` | Fuente de 1 m, compartida. |

- Cada marca tiene sus colores de la paleta (`BRAND_STYLES`): RAYO MATE en lima, GOMAS ÑANDÚ en `ink`, ALFAJORES COMETA en coral, LUBRI TERO en azul y RADIO VELOZ en blanco con texto azul.
- Una marca larga se achica hasta ocupar el 86 % del cartel.

### Grandstand (`src/render/Grandstand`)

Tribuna vista desde arriba. Componente chico, con test porque arma el público.

| Prop | Tipo | Descripción |
|---|---|---|
| `stand` | `SceneryObject` | La tribuna (`grandstand`): su frente (y local negativa) mira a la pista. |
| `part` | `'stands' \| 'roof'` | Gradas con el público, o el techo. |

- Cinco filas de público en los colores de los autos del handoff, un `Points` por color. Algunos lugares vacíos, siempre los mismos.
- El techo azul cubre las últimas filas y va en una capa más alta: con el paralaje se corre más que las gradas y se nota la altura.
