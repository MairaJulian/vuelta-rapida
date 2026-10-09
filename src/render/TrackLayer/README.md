# TrackLayer

Dibuja el circuito con Skia en coordenadas del mundo (1 unidad = 1 metro), a partir de sus datos (`TrackData`). Va dentro del grupo de la cámara, que lo mueve, gira y escala.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `track` | `TrackData` | Circuito a dibujar (de `core/Track`; un `Circuit` también sirve). |

## Ejemplo

```tsx
<Group transform={cameraTransform}>
  <TrackLayer track={DEFAULT_CIRCUIT} />
</Group>
```

## Capas (de abajo hacia arriba)

El pasto va debajo, en `GrassLayer`; los detalles del asfalto, encima, en `AsphaltDetails`.

1. Pianos en los tramos curvos (`getCurveSections`): blanco con rayas coral.
2. Borde blanco.
3. Asfalto.
4. Línea de meta a cuadros en el punto 0 del trazado, girada según el primer tramo: 1,8 m de grosor con cuadros de unos 0,9 m (14 y 7 dp del handoff).
5. Cartel "META": píldora blanca de 8,1 × 2,8 m con el texto en itálica negrita, afuera del circuito y justo después de la línea (`getFinishSign`).

## Decisiones de diseño

- **Un solo path del trazado, dibujado varias veces** con distinto grosor, como pide el handoff (`EscenaPista`): pianos, borde y asfalto con grosores 138 / 120 / 110 relativos al ancho de la pista. Los oklch se convirtieron a hex (React Native no acepta oklch).
- **Pianos desde los datos:** `core/Track` detecta las curvas por su radio (menos de 150 m), así que cualquier trazado nuevo los tiene sin marcarlos a mano. Asoman por fuera del borde blanco y se pueden pisar: en las curvas, el límite de pista llega hasta su borde exterior. Las proporciones (`EDGE_WIDTH_RATIO`, `KERB_WIDTH_RATIO`) vienen de `core/Track`, así el dibujo y la simulación usan las mismas medidas.
- **Juntas redondeadas (`strokeJoin="round"`):** el trazo cubre exactamente los puntos a menos de medio ancho del trazado, la misma zona que usa `TrackBounds`. Lo que se ve es lo que choca.
- **El pasto salió a `GrassLayer`** (hito 5b): sus franjas dependen del circuito y de un ajuste del panel, y la pista no.
- **Cartel con la fuente del sistema:** el handoff usa Archivo, que todavía no se carga. `matchFont` de Skia toma la del sistema (sans-serif, itálica, negrita) sin dependencias nuevas; el texto se centra con `measureText`. Va en coordenadas del mundo, así que la cámara lo escala con la pista.
- **Cuadros enteros:** el ancho de la pista no es múltiplo de 0,9 m, así que los cuadros se estiran apenas para que entre un número entero a lo ancho (16 en 14 m) y la bandera no se salga del asfalto.
- **Meta en coordenadas locales:** los cuadros se calculan una vez a lo ancho de la pista y un `Group` los ubica y gira. Sirve para cualquier trazado, no solo para rectas horizontales.
- **Estático y memorizado (`memo`):** solo cambia si cambia el circuito (por ejemplo, el ancho desde el panel). La cámara lo anima desde afuera con valores compartidos, sin re-renderizar React.
