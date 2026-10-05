# TrackLayer

Dibuja el circuito con Skia en coordenadas del mundo (1 unidad = 1 metro). Va dentro del grupo de la cámara, que lo mueve, gira y escala.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `track` | `OvalTrack` | Circuito a dibujar (de `core/Track`). |

## Ejemplo

```tsx
<Group transform={cameraTransform}>
  <TrackLayer track={DEFAULT_TRACK} />
</Group>
```

## Capas (de abajo hacia arriba)

1. Césped con franjas diagonales, infinito.
2. Pianos en las curvas: blanco con rayas coral.
3. Borde blanco.
4. Asfalto.
5. Línea de meta a cuadros en la recta superior.

## Decisiones de diseño

- **Colores y proporciones del handoff** (`EscenaPista`): asfalto, borde y pianos con grosores 110 / 120 / 138 relativos al ancho de la pista. Los oklch se convirtieron a hex (React Native no acepta oklch).
- **Franjas en lugar de puntos en el césped:** el handoff usa puntos cada 8 dp. Con miles de puntos el costo sube; un único `LinearGradient` repetido da las franjas de "césped cortado" en una sola operación y sirve igual como referencia de movimiento, también en las rectas, donde los bordes de la pista no cambian.
- **Franjas infinitas con `Fill`:** sin límites de pista el auto puede alejarse kilómetros; si el césped con franjas se acabara, en el verde liso no se percibiría el movimiento. `Fill` pinta todo el lienzo y el gradiente, dentro del grupo de la cámara, sigue las coordenadas del mundo: las franjas se mueven con el mundo y nunca terminan. Solo se calcula en los píxeles visibles.
- **Forma de estadio con `RoundedRect`:** un rectángulo redondeado con radio igual a la mitad del alto es exactamente un estadio; no hace falta construir un path.
- **Estático y memorizado (`memo`):** solo cambia si cambia el circuito. La cámara lo anima desde afuera con valores compartidos, sin re-renderizar React.
- La geometría (línea central, curvas, meta) viene de `core/Track`; aquí solo se traduce a primitivas de Skia y se reparte la bandera a cuadros.
