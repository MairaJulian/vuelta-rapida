# DrivingModel

Modelo de manejo arcade del monoplaza. TypeScript puro: no importa React, React Native, Reanimated ni Skia. Trabaja en el plano x/z para poder reutilizarse en la versión 3D.

## Convenciones

- Unidades: metros, segundos y radianes.
- Ejes: plano x/z con y hacia arriba. En la vista cenital, x crece a la derecha y z hacia abajo de la pantalla.
- Rumbo: 0 mira hacia -z (arriba de la pantalla); positivo gira en sentido horario (a la derecha). Siempre en (-π, π].

## API

| Función | Qué hace |
|---|---|
| `stepCar(car, input, config, dt)` | Avanza el auto un paso de `dt` segundos. Pura y determinista. |
| `createCarState(x, z, heading)` | Auto detenido en una posición. |
| `clampDrivingInput(input)` | Limita la entrada a sus rangos; `NaN` cuenta como 0. |
| `getForwardSpeed(car)` | Velocidad en la dirección del rumbo (m/s). |
| `getDriftSpeed(car)` | Velocidad lateral, es decir, el derrape (m/s). |
| `getSpeed(car)` | Módulo de la velocidad (m/s). |
| `getTurnAuthority(speed, config)` | Cuánto puede girar según la velocidad (0 a 1). |
| `DEFAULT_DRIVING_CONFIG` | Valores iniciales de los parámetros. |

### Tipos

- `CarState`: `{ x, z, heading, vx, vz, steer }`. Serializable (solo números).
- `DrivingInput`: `{ steer: -1..1, brake: 0..1 }`. La aceleración es automática.
- `DrivingConfig`: parámetros ajustables (ver tabla).

## Parámetros

| Parámetro | Unidad | Inicial | Efecto |
|---|---|---|---|
| `maxSpeed` | m/s | 50 | Tope duro (180 km/h). |
| `acceleration` | m/s² | 20 | Empuje del acelerador automático. |
| `drag` | 1/s | 0.35 | Resistencia proporcional a la velocidad. |
| `brakeDeceleration` | m/s² | 25 | Frenado a fondo. |
| `maxTurnRate` | rad/s | 2.2 | Giro máximo. |
| `fullTurnSpeed` | m/s | 8 | Velocidad con autoridad de giro completa. |
| `highSpeedTurnFactor` | 0..1 | 0.55 | Giro que queda a velocidad máxima (subviraje). |
| `lateralGrip` | 1/s | 8 | Agarre lateral; más bajo, más derrape. |
| `steerRate` | 1/s | 8 | Rapidez con que la dirección sigue a la entrada. |

## Ejemplo

```ts
import { createCarState, DEFAULT_DRIVING_CONFIG, stepCar } from '@/core/DrivingModel';

let car = createCarState(0, 0, 0);
car = stepCar(car, { steer: 0.5, brake: 0 }, DEFAULT_DRIVING_CONFIG, 1 / 60);
```

## Cada paso

1. `steer` se acerca a la entrada a ritmo `steerRate`, para que los botones digitales no se sientan bruscos.
2. Giro: `steer × maxTurnRate × autoridad(velocidad)`. Detenido no gira.
3. La velocidad se descompone respecto del **nuevo** rumbo. Al girar, el vector queda por detrás del rumbo: esa componente lateral es el derrape.
4. Hacia delante: `+acceleration − drag·v − brakeDeceleration·brake`. Frenar corta el acelerador. Se limita a [0, `maxSpeed`] y no hay marcha atrás.
5. Lateral: decae con `exp(−lateralGrip·dt)`, estable con cualquier `dt`.
6. Se recompone la velocidad, se respeta el tope total y se integra la posición.

## Decisiones de diseño

- La velocidad se guarda como vector en el mundo (`vx`, `vz`) y no como escalar: es lo que permite el derrape.
- La velocidad hacia delante y el derrape se derivan del vector; no se guardan para no duplicar estado.
- Las funciones llevan la directiva `'worklet'` porque el loop corre en el hilo de UI. Es un texto, no un import.
- `stepCar` no usa el reloj ni números aleatorios: con la misma entrada da exactamente el mismo resultado, base del auto fantasma.
