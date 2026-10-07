# SteeringIndicator

Indicador de volante del HUD en modo inclinación (pantalla 07a del handoff): una píldora con la zona muerta al centro, dos marcas de giro completo y un punto que sigue la inclinación del celular.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `output` | `SharedValue<TiltSteeringResult>` | Resultado de la inclinación en cada cuadro (de `useTiltSteering`). |
| `config` | `TiltConfig` | Zona muerta y sensibilidad, para la franja y las marcas. |
| `style` | `StyleProp<ViewStyle>` | Ubicación en pantalla. La píldora no se posiciona sola. |

También exporta `indicatorOffset(relativeAngle)` y `getDeadZoneWidth(deadZone)`.

## Ejemplo

```tsx
<SteeringIndicator output={tiltOutput} config={tiltConfig} style={{ position: 'absolute', bottom: 14 }} />
```

## Diseño (handoff)

- Píldora blanca de 168 × 24 dp con sombra md.
- Zona muerta en `blue-zone` (`#B5C8F2`).
- Punto `blue` (`#2F6BDD`) de 16 dp.
- Marcas de giro completo (no están en el handoff): trazos `muted` de 2 × 12 dp.

## Decisiones de diseño

- **Escala fija en grados** (cambio tras la primera prueba con usuarios): 50° de inclinación llevan el punto al borde, con cualquier ajuste, igual que en el medidor de calibración. Antes la escala dependía de la sensibilidad y la franja azul se ensanchaba al subirla, como si la zona muerta creciera.
  - Con el punto dentro de la franja, el auto va derecho. La franja solo cambia con la zona muerta.
  - Cuando el centro del punto llega a una marca, la dirección está a fondo. Al subir la sensibilidad, las marcas se acercan al centro.
- **Hilo de UI:** el punto se mueve con `useAnimatedStyle`, que lee el resultado de la inclinación en cada cuadro. React no se re-renderiza.
- **Celular plano:** el punto baja al 35 % de opacidad cuando la lectura no es confiable, así el jugador entiende por qué el auto no dobla.
- **Oculto para los lectores de pantalla:** es una referencia visual del movimiento del celular, no un control.
