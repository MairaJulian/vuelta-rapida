# CarShape

Monoplaza visto desde arriba, dibujado con Skia. Reproduce la silueta del handoff (`docs/design`, `Monoplaza.dc.html`): ruedas, alerones, carrocería, nariz, cockpit, casco, halo y disco del número.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `transform` | `SharedValue<Transforms3d> \| Transforms3d` | Posición y rumbo en el mundo; en la carrera lo actualiza `useRaceLoop` cada cuadro. En un menú (Inicio) puede ser una transformación fija. |
| `bodyColor` | `string` (opcional) | Color de la carrocería. Por defecto, azul `#2F6BDD`. |

## Ejemplo

```tsx
<Group transform={cameraTransform}>
  <TrackLayer track={track} />
  <CarShape transform={carTransform} />
</Group>
```

## Decisiones de diseño

- **Medidas reales:** el viewBox de 40 × 90 se escala a 2 × 4,5 m (0,05 m por unidad), centrado en la posición del auto. Con el zoom inicial de la cámara mide 28 dp de ancho, cerca de los 30 dp del handoff.
- **Mira hacia -z:** igual que el viewBox (hacia arriba). Así `rotate: heading` lo orienta sin ajustes, porque el rumbo 0 también mira hacia -z.
- **Sin número ni decoración real:** el disco queda en blanco; los números y las escuderías inventadas llegan con la personalización.
- **Formas en `CarShape.styles.ts`:** son constantes visuales, como pide la convención para componentes de Skia.
- **Memorizado:** la transformación es un valor compartido, así que moverlo no re-renderiza React.
