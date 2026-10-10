# CarPalette

Colores de auto que puede elegir el jugador, y la cuenta para comprobar que un color se distingue de otro. TypeScript puro.

## Tipos

- `CarColorId`: `'blue' | 'coral' | 'lime' | 'pink' | 'teal' | 'violet' | 'orange' | 'white'`.
- `CarColor`: `{ id, name, hex, numberColor }`. `numberColor` es el color del número sobre ese color (blanco o tinta).

## API

| Exporta | Qué hace |
|---|---|
| `CAR_COLORS` | Los 8 colores, en el orden de la pantalla de personalización. |
| `DEFAULT_CAR_COLOR_ID` | `'blue'`: el auto sin perfil (escudería Cóndor). |
| `isCarColorId(value)` | Si un valor guardado es un color de la paleta. |
| `getCarColor(id)` | El color; con un id desconocido, el azul. |
| `colorDistance(a, b)` | Diferencia entre dos colores hex, como distancia en OKLab (0 a ~1). |
| `hexToOklab(hex)` | Un color hex en OKLab (`[L, a, b]`). |

## Ejemplo

```ts
const color = getCarColor(profile.colorId);
<CarShape transform={transform} bodyColor={color.hex} number={profile.number} />
```

## Decisiones de diseño

- **Los perfiles guardan el `id`, no el hex:** se puede retocar un color sin migrar los datos guardados.
- **Paleta del handoff con un cambio: Rosa (`#F164AF`) en lugar de Tinta.**
  - Una carrocería tinta se confunde con las gomas y los alerones, que también son tinta (distancia 0,04).
  - En la pista el auto pierde la silueta.
  - Los demás colores están a 0,37 o más de esas piezas y a 0,19 o más del asfalto (el mínimo es el azul que el auto usa desde el hito 2, que se ve bien en la pista).
  - El test de `CarShape` lo comprueba con los colores reales del auto y de la pista.
- **Hex convertidos del OKLCH del handoff;** Azul y Lima usan los hex de los tokens que ya usa la app.
- **El color del número** sigue la regla del handoff: blanco sobre Azul, Coral y Violeta; tinta sobre el resto. Rosa lleva tinta porque es claro.
- **Distancia en OKLab:** mide cuánto se distinguen dos colores mejor que el contraste de luminancia, que da bajo para colores saturados como el azul sobre el gris del asfalto aunque se vean bien.
