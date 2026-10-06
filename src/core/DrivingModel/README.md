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
| `getMaxSteerAngle(speed, config)` | Ángulo máximo de las ruedas para esa velocidad (rad). |
| `getTurnRate(forwardSpeed, steer, config)` | Velocidad de giro (rad/s). Con velocidad negativa, el giro se invierte. |
| `approachSteer(current, target, config, dt)` | Rampa de la dirección aplicada hacia la entrada. |
| `DEFAULT_DRIVING_CONFIG` | Valores iniciales de los parámetros. |

### Tipos

- `CarState`: `{ x, z, heading, vx, vz, steer, reverseTimer }`. Serializable (solo números).
- `DrivingInput`: `{ steer: -1..1, brake: 0..1 }`. La aceleración es automática; el freno mantenido da marcha atrás.
- `DrivingConfig`: parámetros ajustables (ver tabla).

## Parámetros

| Parámetro | Unidad | Inicial | Efecto |
|---|---|---|---|
| `maxSpeed` | m/s | 42 | Tope duro (151 km/h). |
| `acceleration` | m/s² | 20 | Empuje del acelerador automático y de la marcha atrás. |
| `drag` | 1/s | 0.35 | Resistencia proporcional a la velocidad. |
| `brakeDeceleration` | m/s² | 25 | Frenado a fondo. |
| `wheelbase` | m | 2.2 | Distancia entre ejes del Monoplaza. Fija: no tiene slider. |
| `maxSteerAngle` | rad | 0.5 | Ángulo de las ruedas a baja velocidad (≈29°). |
| `highSpeedSteerFactor` | 0..1 | 0.12 | Fracción del ángulo que queda a velocidad máxima. |
| `steerFalloff` | exponente | 0.5 | Forma de la curva: 1 lineal, menos de 1 recorta el giro antes. |
| `lateralGrip` | 1/s | 8 | Agarre lateral; más bajo, más derrape. |
| `steerInTime` | s | 0.25 | Tiempo de la dirección aplicada para ir del centro a fondo. |
| `steerReturnTime` | s | 0.15 | Tiempo para volver de fondo al centro. |
| `reverseDelay` | s | 0.4 | Pausa detenido con el freno apretado antes de la marcha atrás. |
| `maxReverseSpeed` | m/s | 6 | Tope en marcha atrás (22 km/h). |
| `wallFriction` | 1/s | 1 | Roce contra el borde de la pista. Lo usa `TrackBounds`. |
| `collisionRadius` | m | 1 | Medio ancho del auto para el límite de pista. Fijo: no tiene slider. |

Con estos valores, la velocidad de giro con la dirección a fondo queda así:

| Velocidad | Ángulo | Giro | Radio de giro |
|---|---|---|---|
| 6 m/s | 19° | 0,95 rad/s | 6,3 m |
| 20 m/s | 11° | 1,8 rad/s | 11 m |
| 42 m/s | 3,4° | 1,15 rad/s | 37 m |

## Ejemplo

```ts
import { createCarState, DEFAULT_DRIVING_CONFIG, stepCar } from '@/core/DrivingModel';

let car = createCarState(0, 0, 0);
car = stepCar(car, { steer: 0.5, brake: 0 }, DEFAULT_DRIVING_CONFIG, 1 / 60);
```

## Cada paso

1. `steer` se acerca a la entrada con una rampa lineal: `steerInTime` para alejarse del centro, `steerReturnTime` para volver (o cambiar de lado). Un toque corto da una corrección chica.
2. Giro de bicicleta: `velocidadAdelante × tan(steer × ánguloMáx(velocidad)) / wheelbase`, con `ánguloMáx(v) = maxSteerAngle × (1 − (1 − highSpeedSteerFactor) × (|v| / maxSpeed)^steerFalloff)`. Detenido no gira.
3. La velocidad se descompone respecto del **nuevo** rumbo. Al girar, el vector queda por detrás del rumbo: esa componente lateral es el derrape.
4. Hacia delante, según el freno:
   - Suelto: `+acceleration − drag·v`. Si venía en marcha atrás, el mismo empuje primero la frena.
   - Apretado y avanzando: `−brakeDeceleration·brake − drag·v`, sin pasar de 0.
   - Apretado y detenido: cuenta `reverseTimer` hasta `reverseDelay` y luego retrocede con `acceleration·brake`.
   - Se limita a [−`maxReverseSpeed`, `maxSpeed`].
5. Lateral: decae con `exp(−lateralGrip·dt)`, estable con cualquier `dt`.
6. Se recompone la velocidad, se respeta el tope total y se integra la posición.

## Decisiones de diseño

- **Modelo de bicicleta** en lugar de una velocidad de giro fija: detenido no gira y en marcha atrás el giro se invierte sin casos especiales, como en un auto real (con la dirección a la derecha, la cola va hacia la derecha). En el 3D, las ruedas delanteras pueden girar con el mismo ángulo.
- **El ángulo baja con la velocidad** porque, con un ángulo fijo, el giro crecería sin límite al acelerar. La curva (`steerFalloff`) recorta el giro ya a velocidades medias: el auto es ágil al maniobrar y estable a fondo.
- **Rampa lineal, no suavizado exponencial:** llega exactamente a la entrada en un tiempo conocido, que es lo que se ajusta en el panel. Volver al centro es más rápido que girar, para enderezar con facilidad.
- **Freno y marcha atrás en el mismo botón**, con una pausa detenido: una frenada normal nunca termina en reversa por accidente. `reverseTimer` vive en el estado, así que el fantasma reproduce también las maniobras.
- La velocidad se guarda como vector en el mundo (`vx`, `vz`) y no como escalar: es lo que permite el derrape.
- La velocidad hacia delante y el derrape se derivan del vector; no se guardan para no duplicar estado.
- Las funciones llevan la directiva `'worklet'` porque el loop corre en el hilo de UI. Es un texto, no un import.
- `stepCar` no usa el reloj ni números aleatorios: con la misma entrada da exactamente el mismo resultado, base del auto fantasma.
