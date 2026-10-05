# InputControls

Contrato común de la capa de entrada. Define cómo se conecta cualquier modo de control (botones hoy, inclinación en el hito 3) con la simulación.

## Contrato

```ts
interface InputControlsProps {
  input: SharedValue<DrivingInput>; // { steer: -1..1, brake: 0..1 }
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
| `InputControlsProps` | Props que recibe todo modo de control. |
| `InputControlsComponent` | Tipo de un componente de modo de control. |
| `InputMode` | `'buttons' \| 'tilt'`. |

## Ejemplo

```tsx
const input = useDrivingInput();
useDrivingLoop({ input, ... });

return <ButtonControls input={input} />; // o <TiltControls input={input} /> en el hito 3
```

## Decisiones de diseño

- La entrada es un valor compartido de Reanimated y no estado de React: los toques (gesture-handler) y el sensor (`useAnimatedSensor`) la escriben en el hilo de UI y el loop la lee en el mismo cuadro, sin pasar por el hilo de JS.
- Cada modo es un componente porque los dos tienen interfaz propia: botones de dirección y freno, o frenos laterales con indicador de inclinación (pantalla 07a del handoff).
- `DrivingInput` está definido en `core`; aquí solo se adapta a React.
