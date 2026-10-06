# TiltControls

Modo de control por inclinación: el celular es el volante. En pantalla quedan solo los dos frenos laterales (que también dan marcha atrás) y el indicador de volante, según la pantalla 07a del handoff. Implementa el contrato de [InputControls](../InputControls/README.md), así que es intercambiable con [ButtonControls](../ButtonControls/README.md). La aceleración es automática.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `input` | `SharedValue<DrivingInput>` | Entrada que escriben la inclinación (`steer`) y los frenos (`brake`). |
| `config` | `TiltConfig` | Calibración, zona muerta, sensibilidad y filtro. |
| `output` | `SharedValue<TiltSteeringResult>` (opcional) | Dónde publicar la lectura procesada, para que la pantalla (y el panel) la lean. |

También exporta `brakesToInput(pressed)`: freno a fondo si hay cualquier freno apretado.

## Ejemplo

```tsx
const input = useDrivingInput();
const tiltOutput = useTiltOutput();

{controlMode === 'tilt' ? (
  <TiltControls input={input} config={tiltConfig} output={tiltOutput} />
) : (
  <ButtonControls input={input} />
)}
```

## Diseño (handoff, pantalla 07a)

- **Frenos laterales:** 76 × 128 dp, radio 38, `coral` (`#E04A3A`), uno en cada costado a 20 dp del borde y 22 de abajo. Texto blanco "Freno" 800 de 20. Presionado: `coral-pressed` (`#C0352A`).
- **Indicador de volante:** abajo al centro, a 14 dp ([SteeringIndicator](../../components/SteeringIndicator/README.md)).

## Decisiones de diseño

- **Dos frenos, "Frená con cualquier pulgar":**
  - Cualquiera de los dos frena a fondo, y los dos juntos frenan igual que uno.
  - Soltar uno mientras el otro sigue apretado no suelta el freno.
  - Vibra solo al empezar a frenar, no al apoyar el segundo pulgar.
- **Cada pieza escribe su parte:** la inclinación escribe `steer` en cada cuadro y los frenos escriben `brake`. Las dos corren en el hilo de UI, una después de la otra, así que no se pisan.
- **Mismos gestos que los botones:** usa `createHoldGesture` y `vibrateOnBrake` de InputControls, así que el freno se comporta igual en los dos modos.
- **Al desmontarse deja la entrada en neutro:** si se cambia de modo con el celular girado o un freno apretado, el auto no sigue doblando ni frenando.
- **Área segura:** los márgenes del handoff se suman a los insets, para que la barra de navegación no tape un freno.
