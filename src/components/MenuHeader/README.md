# MenuHeader

Encabezado de los menús (pantallas 02 a 05 del handoff): botón Volver a la izquierda, título y subtítulo, y el botón principal de la pantalla a la derecha.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `title` | `string` | Título; se muestra en mayúsculas. |
| `subtitle` | `string` | Texto chico debajo, por ejemplo "Paso 1 de 2". |
| `onBack` | `() => void` | Si se pasa, muestra Volver. |
| `action` | `ReactNode` | Botón principal, a la derecha. |

## Ejemplo

```tsx
<MenuHeader
  title="¿Cómo querés manejar?"
  subtitle="Paso 1 de 2"
  action={<PrimaryButton label="Seguir" onPress={next} />}
/>
```

## Decisiones de diseño

- **Medidas del handoff:**
  - Volver: círculo blanco de 48 dp con sombra sm.
  - Título: 900 en mayúsculas.
  - Subtítulo: `muted` de 13.
- **Título de 32 dp en lugar de 36:** con la tipografía del sistema, más ancha que Archivo ExtraCondensed, 36 no entra en una línea. Vuelve a 36 cuando se incorpore Archivo.
- **Flecha como texto (←)** hasta que se incorporen los íconos Phosphor, para no sumar una dependencia nativa (react-native-svg) solo por un ícono.
- El título es un `header` accesible.
