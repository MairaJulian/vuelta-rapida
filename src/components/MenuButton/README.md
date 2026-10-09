# MenuButton

Botón de los menús con las variantes del handoff (§Componentes). Lo usan la Pausa, los Resultados e Inicio.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `label` | `string` | Texto. |
| `onPress` | `() => void` | Acción. |
| `variant` | `'primary' \| 'secondary' \| 'danger' \| 'run'` | Estilo (ver abajo). |
| `icon` | `IconName` | Ícono antes del texto (opcional). |
| `circleIcon` | `IconName` | Ícono en un círculo al final, solo en `primary` y `run` (opcional). |
| `trailing` | `ReactNode` | Algo a la derecha del texto, por ejemplo un chip (opcional). |
| `height` | `number` | Alto en dp. Por defecto, el de la variante. |
| `disabled` | `boolean` | Deshabilitado: no responde y se ve al 50 %. |
| `selected` | `boolean` | Para interruptores: el botón se anuncia como `switch` prendido o apagado. |
| `accessibilityLabel` | `string` | Etiqueta del lector de pantalla. Por defecto, `label`. |
| `style`, `testID` | | Estilo extra y prueba. |

## Variantes

| Variante | Fondo | Presionado | Texto e ícono | Alto |
|---|---|---|---|---|
| `primary` | `blue` | `blue-pressed` | blanco, 800/21 | 52 (Continuar: 56) |
| `secondary` | `card` con sombra sm | `soft` | `ink` 800/18, ícono `blue` | 50 |
| `danger` | ninguno | `oklch(0.95 0.03 28)` | `coral-text` | 50 |
| `run` | `ink` | `#2A2F3A` | blanco 800/26, círculo `lime` Ø 46 con ícono `ink` | 64 |

## Ejemplo

```tsx
<MenuButton label="Continuar" variant="primary" circleIcon="play" height={56} onPress={resume} />
<MenuButton label="Reiniciar" variant="secondary" icon="restart" onPress={restart} />
<MenuButton label="Salir al menú" variant="danger" icon="signOut" onPress={exit} />
```

## Decisiones de diseño

- **Un solo botón para todos los menús nuevos:** las variantes del handoff comparten forma (píldora) y comportamiento. `PrimaryButton` sigue en las pantallas de control y calibración, que no lo necesitan.
- **Presionado con color, sin animaciones:** el handoff pide usar el color de "presionado" de cada componente.
- **Interruptores accesibles:** con `selected`, el botón es un `switch` con su estado; el chip de la derecha lo muestra a la vista.
- Todo lo tocable mide 48 dp o más.
