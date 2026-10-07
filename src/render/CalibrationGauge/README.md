# CalibrationGauge

Medidor de la pantalla de calibración (03 del handoff): un arco en escala fija de grados con la zona muerta al centro, dos marcas de giro completo, un marcador que sigue la inclinación y la silueta del teléfono, que gira con el ángulo y muestra los grados con signo.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `output` | `SharedValue<TiltSteeringResult>` | Resultado de la inclinación en cada cuadro (de `useTiltSteering`). |
| `config` | `TiltConfig` | Zona muerta y sensibilidad, para la zona azul y las marcas de giro completo. |

También exporta las funciones de dibujo: `gaugeAngle`, `getGaugeMarks`, `arcPoint`, `arcPath`, `tickPath` y `formatSignedDegrees`.

## Ejemplo

```tsx
const tilt = useTiltSteering({ config: previewConfig });

<CalibrationGauge output={tilt.output} config={previewConfig} />
```

## Diseño (handoff)

- **Arco** de 260 dp con trazo `#E3E6EB` de 14 y extremos redondeados.
- **Zona muerta** en `blue-zone`.
- **Marcas de giro completo** (no están en el handoff): trazos `muted` de 22 × 3 que cruzan el arco.
- **Marcador:** punto `blue` con anillo blanco.
- **Silueta del teléfono:** tarjeta blanca de 132 × 68 que gira con el ángulo y muestra los grados con signo ("+14°", "−12°", con el signo menos tipográfico).

## Decisiones de diseño

- **Escala fija en grados** (cambio tras la primera prueba con usuarios):
  - Antes, el arco se escalaba con la sensibilidad y al subirla la zona azul se veía casi 4 veces más grande, aunque siempre eran los mismos 5°. Un tester entendió que tenía que girar más el celular.
  - Ahora 50° de inclinación llegan a 75° del arco, con cualquier ajuste. La zona azul mide lo que mide la zona muerta y solo cambia con ella. Al subir la sensibilidad, las marcas de giro completo se acercan al centro.
  - La escala alcanza para el giro completo más suave posible (`MAX_FULL_TURN_ANGLE`, 49°); un test lo verifica.
- **La silueta y el marcador muestran el mismo ángulo real:** la silueta gira lo que gira el celular y el marcador lo ubica sobre la escala.
- **Hilo de UI para el movimiento:** el marcador son círculos de Skia con posición derivada (`useDerivedValue`), y la silueta gira con `useAnimatedStyle`.
- **Solo el texto pasa por React,** unas 10 veces por segundo, porque un `Text` de React Native no cambia su contenido desde un worklet. A esa velocidad los números se leen bien y no cargan el hilo de JS.
- **Silueta como vista y no en Skia:** así el texto usa la tipografía del sistema sin cargar fuentes en Skia, y la sombra sale igual que en el resto de la interfaz.
