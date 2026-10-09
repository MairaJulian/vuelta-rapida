# InputControls

Contrato común de la capa de entrada. Define cómo se conecta cualquier modo de control (botones o inclinación) con la simulación, y comparte las piezas que usan los dos.

## Contrato

```ts
interface InputControlsProps {
  input: SharedValue<DrivingInput>; // { steer: -1..1, brake: 0..1 }
  brakeVibration?: boolean; // vibrar al empezar a frenar; por defecto, sí
}
```

- La **pantalla** crea la entrada con `useDrivingInput()` y se la pasa al modo elegido y al loop.
- El **modo de control** es un componente (`InputControlsComponent`) que dibuja sus controles y escribe `input`.
- La **simulación** solo lee `input`; no sabe qué modo lo escribió.

## API

| Exporta | Qué es |
|---|---|
| `useDrivingInput()` | Crea el valor compartido de entrada, en neutro. |
| `NEUTRAL_INPUT` | `{ steer: 0, brake: 0 }`, congelado. |
| `createHoldGesture(testId, onChange)` | Gesto de "mantener presionado" para un botón: `onChange(true)` al apoyar el dedo y `onChange(false)` al levantarlo, en el hilo de UI. |
| `vibrateOnBrake()` | Vibración corta al empezar a frenar. No falla en equipos sin motor de vibración. |
| `InputControlsProps` | Props que recibe todo modo de control. |
| `InputControlsComponent` | Tipo de un componente de modo de control. |
| `InputMode` | `'buttons' \| 'tilt'`. Es `ControlMode` de `core/PlayerPreferences`, donde se guarda la elección. |

## Ejemplo

```tsx
const input = useDrivingInput();
useRaceLoop({ input, ... });

return controlMode === 'tilt'
  ? <TiltControls input={input} config={tiltConfig} />
  : <ButtonControls input={input} />;
```

## Decisiones de diseño

- **Valor compartido, no estado de React:** los toques (gesture-handler) y el sensor (`useAnimatedSensor`) escriben la entrada en el hilo de UI, y el loop la lee en el mismo cuadro sin pasar por el hilo de JS.
- **Cada modo es un componente** porque los dos tienen interfaz propia: botones de dirección y freno, o frenos laterales con indicador de inclinación (pantalla 07a del handoff).
- **Gesto y vibración compartidos:** el freno se siente igual en los dos modos.
- `DrivingInput` está definido en `core`; aquí solo se adapta a React.
