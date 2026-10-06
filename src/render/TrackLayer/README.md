# TrackLayer

Dibuja el circuito con Skia en coordenadas del mundo (1 unidad = 1 metro), a partir de sus datos (`TrackData`). Va dentro del grupo de la cámara, que lo mueve, gira y escala.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `track` | `TrackData` | Circuito a dibujar (de `core/Track`). |

## Ejemplo

```tsx
<Group transform={cameraTransform}>
  <TrackLayer track={DEFAULT_TRACK} />
</Group>
```

## Capas (de abajo hacia arriba)

1. Césped con franjas diagonales, infinito.
2. Pianos en los tramos curvos (`getCurveSections`): blanco con rayas coral.
3. Borde blanco.
4. Asfalto.
5. Línea de meta a cuadros en el punto 0 del trazado, girada según el primer tramo.

## Decisiones de diseño

- **Un solo path del trazado, dibujado varias veces** con distinto grosor, como pide el handoff (`EscenaPista`): pianos, borde y asfalto con grosores 138 / 120 / 110 relativos al ancho de la pista. Los oklch se convirtieron a hex (React Native no acepta oklch).
- **Pianos desde los datos:** `core/Track` detecta las curvas por su radio (menos de 150 m), así que cualquier trazado nuevo los tiene sin marcarlos a mano. Asoman por fuera del borde blanco, más allá del límite: marcan dónde está el borde y el auto nunca los pisa.
- **Juntas redondeadas (`strokeJoin="round"`):** el trazo cubre exactamente los puntos a menos de medio ancho del trazado, la misma zona que usa `TrackBounds`. Lo que se ve es lo que choca.
- **Franjas en lugar de puntos en el césped:** el handoff usa puntos cada 8 dp. Con miles de puntos el costo sube; un único `LinearGradient` repetido da las franjas de "césped cortado" en una sola operación y sirve igual como referencia de movimiento, también en las rectas, donde los bordes de la pista no cambian.
- **Franjas infinitas con `Fill`:** `Fill` pinta todo el lienzo y el gradiente, dentro del grupo de la cámara, sigue las coordenadas del mundo: las franjas se mueven con el mundo y nunca terminan. Solo se calcula en los píxeles visibles.
- **Meta en coordenadas locales:** los cuadros se calculan una vez a lo ancho de la pista y un `Group` los ubica y gira. Sirve para cualquier trazado, no solo para rectas horizontales.
- **Estático y memorizado (`memo`):** solo cambia si cambia el circuito (por ejemplo, el ancho desde el panel). La cámara lo anima desde afuera con valores compartidos, sin re-renderizar React.
