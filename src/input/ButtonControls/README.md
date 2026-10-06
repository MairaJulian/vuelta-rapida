# ButtonControls

Modo de control con botones en pantalla: izquierda, derecha y freno. Implementa el contrato de [InputControls](../InputControls/README.md). La aceleración es automática.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `input` | `SharedValue<DrivingInput>` | Entrada que escriben los botones y lee la simulación. |

También exporta `buttonsToInput(pressed)`, el mapeo puro de botones presionados a `DrivingInput`.

## Ejemplo

```tsx
const input = useDrivingInput();

return (
  <View style={{ flex: 1 }}>
    <DriveCanvas ... />
    <ButtonControls input={input} />
  </View>
);
```

## Mapeo

| Botones | `steer` | `brake` |
|---|---|---|
| Ninguno | 0 | 0 |
| Izquierda | -1 | 0 |
| Derecha | 1 | 0 |
| Izquierda + derecha | 0 | 0 |
| Freno (con o sin dirección) | -1, 0 o 1 | 1 |

La dirección digital (-1/0/1) se suaviza en el modelo (`steerInTime` y `steerReturnTime`), no aquí. El freno mantenido con el auto detenido da marcha atrás; también lo resuelve el modelo, por eso la etiqueta accesible es "Frenar o retroceder".

## Diseño (handoff, pantalla 07b)

- **Dirección:** círculos blancos de 76 dp en `left 28`, `bottom 18`, separados 14. Sombra lg. Presionado: `blue-soft` (`#E9EFFC`). Chevron color tinta.
- **Freno:** círculo `coral` (`#E04A3A`) de 96 dp en `right 28`, `bottom 14`, texto blanco "Freno" 800 de 20. Presionado: `coral-pressed` (`#C0352A`). Vibración corta al empezar a frenar.

## Decisiones de diseño

- **Multitáctil con gesture-handler:** cada botón tiene su propio gesto (`Pan` con `minDistance(0)`: empieza al apoyar el dedo y termina al levantarlo). Los gestos de vistas distintas con dedos distintos no compiten entre sí, así que se puede frenar y doblar a la vez. Con `Pressable` no se podría: React Native admite un solo responder táctil a la vez.
- **Hilo de UI:** los callbacks son worklets y escriben `input` directamente; el toque llega a la simulación en el mismo cuadro, sin pasar por React. El color presionado también se resuelve en el hilo de UI (`useAnimatedStyle`).
- **Al desmontarse** deja la entrada en neutro, para que el auto no quede frenando si se cambia de modo con un botón apretado.
- **Chevron con bordes:** triángulo dibujado con `View`, sin agregar una librería de iconos.
- **Sombra con `boxShadow`:** React Native 0.86 la soporta en Android con la nueva arquitectura y permite usar el valor exacto del handoff (`0 3px 8px` al 18 %) en lugar de aproximarlo con `elevation`.
- **Tipografía:** de momento usa la del sistema; Archivo se incorpora con el HUD.
- **Área segura:** los márgenes del handoff (28 dp a los lados) se suman a los insets de `useSafeAreaInsets`. En horizontal, la barra de navegación de Android queda a un costado y, con edge-to-edge, tapaba el freno.
