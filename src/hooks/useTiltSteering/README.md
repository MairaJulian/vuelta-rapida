# useTiltSteering

Lee el sensor de gravedad del celular y lo convierte en dirección con `core/TiltSteering`, una vez por cuadro en el hilo de UI. No dibuja nada. Lo usan el modo de control por inclinación (`TiltControls`) y, más adelante, la pantalla de calibración.

## Parámetros

| Parámetro | Tipo | Descripción |
|---|---|---|
| `config` | `TiltConfig` | Calibración, zona muerta, sensibilidad y filtro. En caliente. |
| `input` | `SharedValue<DrivingInput>` (opcional) | Si se pasa, cada cuadro escribe `steer` sin tocar `brake`. |
| `output` | `SharedValue<TiltSteeringResult>` (opcional) | Dónde publicar el resultado. Si no se pasa, el hook crea el suyo. |

## Devuelve

| Valor | Descripción |
|---|---|
| `output` | Último resultado: dirección, ángulo calibrado, confianza y estado del filtro. |
| `calibrate(config)` | Devuelve `config` con el ángulo actual como nuevo "derecho". |

También exporta:
- `useTiltOutput()`: crea el valor compartido del resultado, para que lo posea la pantalla.
- `orientationToRotation`.
- Las constantes `SENSOR_INTERVAL_MS`, `FALLBACK_DELAY_MS` e `IDLE_TILT_RESULT`.

## Ejemplo

```tsx
const tilt = useTiltSteering({ config: tiltConfig, input });

// Al tocar Listo:
setTiltConfig(tilt.calibrate(tiltConfig));
```

## Cómo llegan los datos

```
sensor de gravedad (Android) ──> useAnimatedSensor: valor compartido escrito en el hilo de UI
useFrameCallback (hilo de UI) ──> stepTiltSteering (core, puro) ──> output e input.steer
```

## Decisiones de diseño

- **Sensor de gravedad de Reanimated** (`useAnimatedSensor(SensorType.GRAVITY)`) en lugar de expo-sensors: escribe el valor compartido directamente en el hilo de UI y cada lectura trae la rotación de la pantalla. La simulación lo lee en el mismo hilo, sin pasar por el de JS ni por React, así que no afecta los 60 fps.
- **Sin el ajuste automático por orientación** (`adjustToInterfaceOrientation: false`): la única corrección es la de `core/TiltSteering`. Si se hicieran las dos, el ángulo quedaría girado 90°. Un test verifica cómo se registra el sensor.
- **Una lectura cada 16 ms:** el loop corre a 60 Hz, así que leer más seguido no cambia nada y gasta batería.
- **Respaldo con el acelerómetro de expo-sensors:**
  - En Android, el sensor de gravedad necesita giroscopio, y algunos celulares de gama baja no lo tienen.
  - Si a los 500 ms no llegó ninguna lectura, el hook escucha el acelerómetro (con el signo invertido: mide la reacción al peso) y toma la rotación de expo-screen-orientation.
  - Ese camino pasa por el hilo de JS. El filtro de `core` quita las sacudidas que el sensor de gravedad ya filtraba.
- **La disponibilidad se detecta por los datos, no con `isAvailable`:** el objeto que devuelve `useAnimatedSensor` en el primer render no se actualiza hasta el siguiente.
- **El resultado lo puede poseer la pantalla** (`output`), igual que la entrada: el modo de control lo escribe, y el panel y el indicador lo leen.
