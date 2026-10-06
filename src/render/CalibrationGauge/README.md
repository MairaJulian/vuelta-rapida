# CalibrationGauge

Medidor de la pantalla de calibración (03 del handoff): un arco con la zona muerta al centro, un marcador que sigue la dirección y la silueta del teléfono, que gira con el ángulo y muestra los grados con signo.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `output` | `SharedValue<TiltSteeringResult>` | Resultado de la inclinación en cada cuadro (de `useTiltSteering`). |
| `config` | `TiltConfig` | Zona muerta y sensibilidad, para la escala del arco. |

También exporta las funciones de dibujo: `gaugeAngle`, `arcPoint`, `arcPath` y `formatSignedDegrees`.

## Ejemplo

```tsx
const tilt = useTiltSteering({ config: previewConfig });

<CalibrationGauge output={tilt.output} config={previewConfig} />
```

## Diseño (handoff)

- **Arco** de 260 dp con trazo `#E3E6EB` de 14 y extremos redondeados.
- **Zona muerta** en `blue-zone`.
- **Marcador:** punto `blue` con anillo blanco.
- **Silueta del teléfono:** tarjeta blanca de 132 × 68 que gira con el ángulo y muestra los grados con signo ("+14°", "−12°", con el signo menos tipográfico).

## Decisiones de diseño

- **Dos escalas a la vista:**
  - La silueta gira con el ángulo real, para que el jugador vea cuánto está inclinando.
  - El marcador y la zona muerta se escalan con la sensibilidad: el marcador llega a 75° del arco justo cuando la dirección llega a fondo. Al mover el slider de sensibilidad, el arco muestra el efecto sin manejar.
- **Hilo de UI para el movimiento:** el marcador son círculos de Skia con posición derivada (`useDerivedValue`), y la silueta gira con `useAnimatedStyle`.
- **Solo el texto pasa por React,** unas 10 veces por segundo, porque un `Text` de React Native no cambia su contenido desde un worklet. A esa velocidad los números se leen bien y no cargan el hilo de JS.
- **Silueta como vista y no en Skia:** así el texto usa la tipografía del sistema sin cargar fuentes en Skia, y la sombra sale igual que en el resto de la interfaz.
