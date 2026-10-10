# ConfirmDialog

Pregunta antes de algo que no se puede deshacer, como borrar un perfil. Muestra un velo sobre la pantalla y un panel con la pregunta, una explicación, "Cancelar" y el botón de peligro que confirma.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `visible` | `boolean` | Si se muestra. |
| `title` | `string` | La pregunta ("¿Borrar a MALE?"). |
| `message` | `string` | Qué pasa si se confirma. |
| `confirmLabel` | `string` | Texto del botón que confirma ("Borrar"). |
| `confirmIcon` | `IconName` (opcional) | Ícono del botón que confirma. |
| `cancelLabel` | `string` (opcional) | Texto del botón que cancela. Por defecto, "Cancelar". |
| `onConfirm` | `() => void` | Confirmar. |
| `onCancel` | `() => void` | Cancelar: el botón, tocar el velo o el botón Atrás de Android. |

## Ejemplo

```tsx
<ConfirmDialog
  visible={confirming}
  title="¿Borrar a MALE?"
  message="También se borran sus récords. No se puede deshacer."
  confirmLabel="Borrar"
  confirmIcon="trash"
  onConfirm={remove}
  onCancel={() => setConfirming(false)}
/>
```

## Decisiones de diseño

- **Estilo de la Pausa:** velo `backdrop` (la única capa translúcida del handoff) y panel `bg` con radio 24 y padding 22/24. El handoff no tiene un diálogo; se usa lo más parecido.
- **Cancelar con fondo y confirmar sin fondo:**
  - "Cancelar" es secundario (blanco con sombra).
  - El botón que confirma es de peligro (texto coral, sin fondo), con ícono.
  - Lo destacado es lo que no rompe nada.
- **`Modal` de React Native:** tapa toda la pantalla, también el encabezado, y el botón Atrás de Android llega como `onRequestClose`, que cancela.
- **El velo cancela:** tocar afuera del panel es "no". El lector de pantalla no lo ve como botón (el panel es modal); para él está "Cancelar".
