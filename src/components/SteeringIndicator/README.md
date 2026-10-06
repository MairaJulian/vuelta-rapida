# SteeringIndicator

Indicador de volante del HUD en modo inclinación (pantalla 07a del handoff): una píldora con la zona muerta al centro y un punto que sigue la inclinación del celular.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `output` | `SharedValue<TiltSteeringResult>` | Resultado de la inclinación en cada cuadro (de `useTiltSteering`). |
| `config` | `TiltConfig` | Zona muerta y sensibilidad, para la escala. |
| `style` | `StyleProp<ViewStyle>` | Ubicación en pantalla. La píldora no se posiciona sola. |

También exporta `indicatorOffset(relativeAngle, fullTurnAngle)` y `getDeadZoneWidth(deadZone, fullTurnAngle)`.

## Ejemplo

```tsx
<SteeringIndicator output={tiltOutput} config={tiltConfig} style={{ position: 'absolute', bottom: 14 }} />
```

## Diseño (handoff)

- Píldora blanca de 168 × 24 dp con sombra md.
- Zona muerta en `blue-zone` (`#B5C8F2`).
- Punto `blue` (`#2F6BDD`) de 16 dp.

## Decisiones de diseño

- **Escala según la sensibilidad:** el punto llega al borde justo cuando la dirección llega a fondo, y la franja de zona muerta mide lo que mide en grados. Con el punto dentro de la franja, el auto va derecho.
- **Hilo de UI:** el punto se mueve con `useAnimatedStyle`, que lee el resultado de la inclinación en cada cuadro. React no se re-renderiza.
- **Celular plano:** el punto baja al 35 % de opacidad cuando la lectura no es confiable, así el jugador entiende por qué el auto no dobla.
- **Oculto para los lectores de pantalla:** es una referencia visual del movimiento del celular, no un control.
