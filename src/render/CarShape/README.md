# CarShape

Monoplaza visto desde arriba, dibujado con Skia. Reproduce la silueta del handoff (`docs/design`, `Monoplaza.dc.html`): ruedas, alerones, carrocería, nariz, cockpit, casco, halo y el disco con el número.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `transform` | `SharedValue<Transforms3d> \| Transforms3d` | Posición y rumbo en el mundo; en la carrera lo actualiza `useRaceLoop` cada cuadro. En un menú puede ser una transformación fija. |
| `bodyColor` | `string` (opcional) | Color de la pintura: carrocería, trompa y alerón delantero. Por defecto, azul `#2F6BDD`. |
| `number` | `number \| null` (opcional) | Número sobre el disco blanco. Sin número, el disco queda vacío. |

## Ejemplo

```tsx
const color = getCarColor(profile.colorId);

<Group transform={cameraTransform}>
  <TrackLayer track={track} />
  <CarShape transform={carTransform} bodyColor={color.hex} number={profile.number} />
</Group>
```

## CarPreview (`src/render/CarPreview`)

Componente chico: el mismo `CarShape` centrado en un `Canvas` propio, para los menús. Lo usan "¿Quién juega?", la personalización e Inicio.

| Prop | Tipo | Descripción |
|---|---|---|
| `bodyColor` | `string` | Color de la carrocería. |
| `number` | `number \| null` (opcional) | Número sobre el disco. |
| `carWidth` | `number` | Ancho del auto, en dp. |
| `rotation` | `number` (opcional) | Giro en radianes: 0 mira hacia arriba y `SIDEWAYS` (π/2), hacia la derecha. |
| `width`, `height` | `number` | Tamaño del lienzo, en dp. |

Es decorativo: no recibe toques ni lo lee el lector de pantalla.

## Decisiones de diseño

- **Medidas reales:** el viewBox de 40 × 90 se escala a 2 × 4,5 m (0,05 m por unidad), centrado en la posición del auto. Con el zoom inicial de la cámara mide 28 dp de ancho, cerca de los 30 dp del handoff.
- **Mira hacia -z:** igual que el viewBox (hacia arriba). Así `rotate: heading` lo orienta sin ajustes, porque el rumbo 0 también mira hacia -z.
- **Un solo asset, recoloreado por capas** (hito 6a):
  - La silueta vectorial se divide en dos capas.
  - La "pintura" (carrocería, trompa y alerón delantero) toma `bodyColor`.
  - El resto es fijo: gomas, alerones, cockpit y halo en tinta, casco amarillo y disco blanco.
  - Se descartó una imagen PNG con un filtro de color (`ColorMatrix` o `BlendColor` sobre una máscara): pedía dos imágenes, se vería borrosa en los tamaños de los menús (hasta 100 dp de ancho) y cuesta más en la GPU.
  - El vector se ve nítido en cualquier tamaño, y sus piezas pasan tal cual a materiales planos en la versión 3D.
- **El número:**
  - Es un `Text` de Skia sobre el disco, en el color de las gomas: siempre se lee, sea cual sea el color del auto.
  - Usa la fuente del sistema en itálica negrita, con `matchFont` y sin dependencias (el handoff usa una serif).
  - Va centrado en el disco. Si no entra, se achica hacia el centro.
  - Los colores y el número de cada jugador vienen de su perfil (`core/Profiles`, `core/CarPalette`).
- **Paleta probada sobre la pista:** un test comprueba que cada color de la paleta se distingue del asfalto (`TrackLayer`) y de las gomas (distancia OKLab).
- **Formas en `CarShape.styles.ts`:** son constantes visuales, como pide la convención para componentes de Skia.
- **Memorizado:** la transformación es un valor compartido, así que moverlo no re-renderiza React. El color y el número no cambian durante la carrera; la fuente se crea una vez por auto.
