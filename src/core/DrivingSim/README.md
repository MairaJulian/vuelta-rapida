# DrivingSim

Simulación de manejo de paso fijo. Une `FixedStep` (cuántos pasos corresponden a cada cuadro) con `DrivingModel` (qué pasa en cada paso) y ofrece el estado interpolado para dibujar. TypeScript puro.

## API

| Función | Qué hace |
|---|---|
| `createDrivingSim(car)` | Simulación nueva en el tick 0. |
| `advanceDrivingSim(sim, frameMs, input, drivingConfig, stepConfig)` | Avanza con el tiempo de un cuadro. Devuelve un estado nuevo. |
| `getRenderCar(sim, stepConfig)` | Estado del auto a dibujar, interpolado entre los dos últimos pasos. |
| `interpolateCar(previous, current, alpha)` | Mezcla dos estados (el rumbo por el arco corto). |

`DrivingSimState`: `{ car, previousCar, tick, accumulatorMs }`. Serializable.

## Ejemplo

```ts
// En el loop (hilo de UI), una vez por cuadro:
sim = advanceDrivingSim(sim, frame.timeSincePreviousFrame, input, drivingConfig, stepConfig);
const drawn = getRenderCar(sim, stepConfig);
```

## Decisiones de diseño

- **Interpolación para el render:** con la pantalla a 90 Hz y la física a 60 Hz, algunos cuadros avanzan un paso y otros ninguno. Dibujar el estado crudo se vería a tirones. Se dibuja la mezcla entre el paso anterior y el actual según el tiempo acumulado. La física no se toca: sigue siendo determinista.
- La entrada se lee una vez por cuadro y se aplica a todos los pasos de ese cuadro.
- `tick` cuenta pasos fijos. Con `stepHz` da el tiempo de carrera exacto, sin depender del reloj del sistema: base para tiempos de vuelta y el fantasma.
- En el plan la interpolación iba en un módulo `CarInterpolation` aparte. Se dejó aquí porque depende de `previousCar`, que solo existe en la simulación.
