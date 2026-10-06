# PrimaryButton

Botón primario de los menús: píldora azul con texto blanco, según el handoff (§Componentes).

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `label` | `string` | Texto del botón; también es su etiqueta accesible. |
| `onPress` | `() => void` | Acción. |
| `height` | `52 \| 56` | 52 en general; 56 para Listo y Continuar. Por defecto, 52. |
| `disabled` | `boolean` | No responde y se ve atenuado. |
| `testID` | `string` | Para tests. |

## Ejemplo

```tsx
<PrimaryButton label="Listo" height={56} onPress={confirm} />
```

## Decisiones de diseño

- **Colores del handoff:** `blue` (`#2F6BDD`); presionado, `blue-pressed` (`#1F55BC`).
- **Píldora** (radio 999), padding horizontal de 28 dp y texto 800 de 20.
- **Tipografía del sistema** hasta que se incorpore Archivo.
