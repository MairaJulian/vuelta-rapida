# DevSlider

Control deslizante simple para el panel de desarrollo: etiqueta, valor formateado y una pista con su marcador. También lo usa la sensibilidad de la calibración, porque ya tiene la pista, el relleno azul y el pulgar del handoff; a diferencia del panel, esa pantalla sí está en producción.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `label` | `string` | Nombre del parámetro. |
| `value` | `number` | Valor actual (controlado). |
| `min`, `max` | `number` | Rango. |
| `step` | `number` | Paso al que se redondea. |
| `onChange` | `(value) => void` | Recibe el valor nuevo, solo si cambió. |
| `formatValue` | `(value) => string` | Opcional; por defecto `String`. |
| `testID` | `string` | Opcional. El gesto se llama `${testID}-gesture` y la pista `${testID}-track`. |

También exporta `ratioToValue` y `valueToRatio`, las conversiones puras entre posición y valor.

## Ejemplo

```tsx
<DevSlider
  label="Agarre lateral"
  value={config.lateralGrip}
  min={1}
  max={20}
  step={0.5}
  onChange={(lateralGrip) => setConfig({ ...config, lateralGrip })}
  formatValue={(v) => `${v} /s`}
/>
```

## Decisiones de diseño

- **Propio, sin `@react-native-community/slider`:** ese paquete agrega código nativo (obliga a recompilar) y quedaría en el binario de producción aunque el panel no exista allí. Este usa gesture-handler, que ya está en la app.
- **Convive con el scroll:** el gesto se activa con un desplazamiento horizontal (`activeOffsetX`) y falla con uno vertical (`failOffsetY`), así el panel puede hacer scroll arrastrando sobre los sliders.
- **El gesto se reconstruye con cada valor sin cortar el arrastre:** gesture-handler solo vuelve a enganchar el gesto nativo si cambia su tipo o su cantidad; si no, actualiza los callbacks en el sitio.
- **`runOnJS(true)`:** es una herramienta de desarrollo que actualiza estado de React; no necesita correr en el hilo de UI.
- **Accesible:** rol `adjustable` con acciones de incrementar y decrementar.
- **Área táctil de 48 dp**, el mínimo del handoff.
