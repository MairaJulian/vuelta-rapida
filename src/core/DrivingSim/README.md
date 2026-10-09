# DrivingSim

Simulación de manejo de paso fijo. Une varias piezas y ofrece el estado interpolado para dibujar. TypeScript puro.

- `FixedStep`: cuántos pasos corresponden a cada cuadro.
- `DrivingModel`: qué pasa en cada paso.
- `TrackBounds`: el auto no sale de la pista.
- `LapTimer`: vueltas y tiempos.

## API

| Función | Qué hace |
|---|---|
| `createDrivingSim(car)` | Simulación nueva en el tick 0, con las vueltas sin empezar. |
| `advanceDrivingSim(sim, frameMs, input, drivingConfig, circuit, stepConfig)` | Avanza con el tiempo de un cuadro. En cada paso fijo aplica el límite de pista y actualiza las vueltas. Devuelve un estado nuevo. |
| `stepDrivingSim(sim, input, drivingConfig, circuit, dt)` | Un solo paso fijo, sin tocar el tiempo acumulado. Lo usa `RaceFlow`, que maneja sus propios pasos (el semáforo avanza sin mover el auto). |
| `getRenderCar(sim, stepConfig)` | Estado del auto a dibujar, interpolado entre los dos últimos pasos. |
| `interpolateCar(previous, current, alpha)` | Mezcla dos estados (el rumbo por el arco corto). |

`DrivingSimState`: `{ car, previousCar, tick, accumulatorMs, trackSegment, laps, contact }`. Serializable. `contact` es el contacto con los bordes y los pianos del último paso (`TrackContact`).

## Ejemplo

```ts
// En el loop (hilo de UI), una vez por cuadro:
sim = advanceDrivingSim(sim, frame.timeSincePreviousFrame, input, drivingConfig, circuit, stepConfig);
const drawn = getRenderCar(sim, stepConfig);
const lap = getCurrentLap(sim.laps);
```

## Cada paso fijo

1. `stepCar` mueve el auto.
2. Se busca el punto del trazado más cercano, una sola vez, empezando por el segmento del paso anterior (`trackSegment`).
3. Con el progreso de ese punto se ve si hay piano (`getKerbFactor`), y `resolveTrackContact` mantiene el auto dentro de la pista (sobre los pianos, hasta su borde exterior) y cuenta el contacto.
4. Con el mismo punto se calcula el progreso, y `stepLapTimer` actualiza las vueltas con el número de paso.

## Decisiones de diseño

- **Interpolación para el render:** con la pantalla a 90 Hz y la física a 60 Hz, algunos cuadros avanzan un paso y otros ninguno. Dibujar el estado crudo se vería a tirones. Se dibuja la mezcla entre el paso anterior y el actual según el tiempo acumulado. La física no se toca: sigue siendo determinista.
- La entrada se lee una vez por cuadro y se aplica a todos los pasos de ese cuadro.
- **El límite de pista y las vueltas van en cada paso fijo**, no en cada cuadro. Así el resultado sigue siendo independiente de los fps, el fantasma reproduce también los roces con el borde y los tiempos de vuelta son exactos.
- **Un solo punto más cercano por paso, buscado cerca del anterior:** el circuito tiene más de mil segmentos y la simulación corre en el hilo de UI sin JIT. Revisar unos 50 segmentos en vez de todos, una vez en lugar de dos, mantiene el costo por paso bajo y parejo.
- `tick` cuenta pasos fijos. Con `stepHz` da el tiempo de carrera exacto, sin depender del reloj del sistema. De ahí salen los tiempos de vuelta y, más adelante, el fantasma.
- **Tests con piloto automático:** un controlador simple que apunta 10 m adelante da vueltas completas. En el óvalo, los tiempos de vuelta coinciden con los cruces de la meta detectados aparte. En el Autódromo del Lago, el progreso avanza sin saltos y la vuelta se cuenta.
- En el plan la interpolación iba en un módulo `CarInterpolation` aparte. Se dejó aquí porque depende de `previousCar`, que solo existe en la simulación.
