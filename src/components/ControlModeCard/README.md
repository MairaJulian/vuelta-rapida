# ControlModeCard

Tarjeta de opción de la elección de control (pantalla 02 del handoff): la ilustración a la izquierda y, a la derecha, título, descripción y chip.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `mode` | `ControlMode` | `'tilt'` o `'buttons'`; define la ilustración. |
| `title` | `string` | Título, en mayúsculas. |
| `description` | `string` | Explicación del modo. |
| `chip` | `string` | Etiqueta corta, por ejemplo "Más real". |
| `selected` | `boolean` | Si es la opción elegida. |
| `onPress` | `() => void` | Al tocarla. |

## Ejemplo

```tsx
<ControlModeCard
  mode="tilt"
  title="Inclinación"
  description="Girá el celular como un volante. Frená con cualquier pulgar."
  chip="Más real"
  selected={mode === 'tilt'}
  onPress={() => setMode('tilt')}
/>
```

## Decisiones de diseño

- **Estados del handoff:** la elegida lleva borde de 2.5 en `blue`, y su ilustración pasa de `blue-tint` a `blue` con trazos blancos.
- **Ilustraciones con `View`**, sin SVG ni íconos:
  - Inclinación: un celular girado bajo un arco de puntos.
  - Botones: una pantalla con dos botones de dirección y el freno coral.
  - Alcanza para reconocer el modo sin sumar dependencias nativas.
- **Accesible como opción** (`radio`, con `checked`): un lector de pantalla anuncia cuál está elegida.
- **Título de 26 dp en lugar de 30**, por la tipografía del sistema, hasta que se incorpore Archivo.
