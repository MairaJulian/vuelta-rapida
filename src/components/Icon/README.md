# Icon

Íconos de Phosphor en peso fill, como pide el handoff (§Componentes), dibujados con Skia.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `name` | `IconName` | `play`, `pause`, `restart`, `signOut`, `trophy`, `speakerHigh`, `speakerSlash`, `vibrate`, `flagCheckered`, `wrench`, `gearSix`, `minus`, `plus`, `pencil`, `trash` o `userPlus`. |
| `color` | `string` | Color del ícono. |
| `size` | `number` | Lado en dp. Por defecto, 24. |
| `testID` | `string` | Para los tests. |

## Ejemplo

```tsx
<Pressable accessibilityRole="button" accessibilityLabel="Pausa">
  <Icon name="pause" color={COLORS.ink} size={22} />
</Pressable>
```

## Decisiones de diseño

- **Trazados copiados de `@phosphor-icons/core` 2.1.1** (licencia MIT, registrada en `CREDITOS.md`), no la biblioteca `phosphor-react-native`: esa depende de react-native-svg, una dependencia nativa más. Skia ya está en el proyecto y dibuja trazados SVG.
- **Solo los íconos que se usan**, en `Icon.styles.ts` (constantes visuales, como en los demás componentes de Skia). Para sumar uno, copiar el atributo `d` de `assets/fill/<nombre>-fill.svg` del paquete.
- **Decorativo:** no recibe toques ni lo lee el lector de pantalla. La etiqueta va en el botón que lo contiene.
- Cada ícono es un `Canvas` chico. Hay pocos por pantalla y ninguno se anima, así que no pesa en el rendimiento.
