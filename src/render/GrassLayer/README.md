# GrassLayer

El pasto de la escena: franjas de corte que alternan dos verdes, en coordenadas del mundo. Va dentro del grupo de la cámara, debajo de la pista.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `angle` | `Radians` | Rumbo de las franjas (de `scenery.grassStripeAngle`). |
| `contrast` | `number` | De 0 (pasto liso) a 1 (franja oscura del handoff). Se ajusta en el panel. |

## Ejemplo

```tsx
<Group transform={cameraTransform}>
  <GrassLayer angle={scenery.grassStripeAngle} contrast={0.6} />
  <TrackLayer track={track} />
</Group>
```

## Decisiones de diseño

- **Un solo `Fill` con un `LinearGradient` repetido:** las franjas cubren todo el lienzo en una sola operación, sin geometría. El gradiente sigue la transformación de la cámara, así que las franjas quedan fijas en el mundo y nunca terminan.
- **Ángulo según el circuito:** paralelas a una recta, las franjas no darían ninguna referencia de movimiento en ella. `core/Scenery` elige el rumbo que mejor cruza todas las rectas largas.
- **Franjas de 8 m:** a la velocidad máxima pasan unas cinco por segundo bajo el auto. Más finas parpadearían; más anchas casi no se notarían en las rectas.
- **El contraste mezcla los dos verdes del handoff** (`mixColors` de Skia): el pasto `oklch(0.9 0.05 150)` y la trama `oklch(0.84 0.07 150)`. Con 0 queda el pasto liso del handoff.
- **Reemplaza el fondo del lienzo y el césped de `TrackLayer`:** antes se pintaban dos fondos a pantalla completa; ahora uno solo.
