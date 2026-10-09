# TrackBounds

Límites de pista: el auto nunca sale del asfalto, salvo en las curvas, donde puede pisar los pianos hasta su borde exterior. Al tocar el límite se desliza a lo largo de él perdiendo velocidad, sin rebotar. También cuenta cómo fue el contacto (toque, golpe y piano), para los avisos de la carrera. TypeScript puro.

## API

| Exporta | Qué hace |
|---|---|
| `constrainToTrack(car, track, config, dt)` | Devuelve el auto dentro de la pista. Si ya estaba dentro, devuelve el mismo objeto. |
| `constrainToHit(car, hit, track, config, dt, kerbFactor?)` | Lo mismo, con el punto más cercano del trazado ya calculado. Con `kerbFactor` (de `getKerbFactor`), el límite llega hasta el borde exterior del piano. |
| `resolveTrackContact(car, hit, track, config, dt, kerbFactor?)` | `{ car, contact }`: el auto corregido y el contacto (`touching`, `impactSpeed`, `onKerb`). Lo usa `DrivingSim` en cada paso. |
| `getKerbReach(track)` | Cuánto más afuera se puede ir sobre un piano a pleno: del borde del asfalto al borde exterior del piano (1,78 m con 14 m de ancho). |
| `getKerbContactDistance(track, config)` | Desde qué distancia al trazado la carrocería pisa el piano: pasado el borde blanco. |
| `NO_CONTACT` | Contacto vacío. |
| `getTrackLimit(track, config)` | Distancia máxima del centro del auto al trazado: `width / 2 − collisionRadius`, nunca negativa. |
| `TrackBoundsConfig` | `{ collisionRadius, wallFriction }`. `DrivingConfig` los incluye, así que se le pasa esa configuración. |

## Ejemplo

```ts
// Después de cada paso fijo (así lo hace DrivingSim):
car = constrainToTrack(stepCar(car, input, drivingConfig, dt), track, drivingConfig, dt);
```

## Cómo funciona

El límite es `getTrackLimit` más `kerbFactor × getKerbReach` (0 fuera de los pianos). Si el centro del auto quedó más lejos del trazado central que el límite:

1. **Posición:** vuelve justo sobre el borde, en la dirección que une el trazado con el auto.
2. **Sin rebote:** se anula la componente de la velocidad que va hacia afuera. La que va a lo largo del borde se conserva.
3. **Roce:** mientras lo toca, toda la velocidad cae con `exp(−wallFriction·dt)`, igual con cualquier `dt`.

Pegar de costado cuesta poco; pegar de frente, casi toda la velocidad. Mientras el auto siga apuntando hacia el borde, el roce lo sigue frenando: conviene doblar para despegarse. Si pega de frente se detiene, y la marcha atrás sirve para salir.

## Decisiones de diseño

- **Pianos pisables:** en las curvas, el límite pasa del borde del asfalto al borde exterior del piano (`KERB_WIDTH_RATIO`, la misma medida con que se dibuja). En las puntas de cada piano el límite crece a lo largo de 4 m (`KERB_TAPER`), así un auto que sale del piano no salta hacia adentro. Primero se pisa el piano (vibración leve) y, si el auto sigue, toca el límite (vibración fuerte).
- **`impactSpeed`** es la velocidad hacia afuera que se anula al tocar: mide el golpe. Deslizarse en paralelo al borde da casi 0; pegar de frente, casi toda la velocidad.
- **Mismo límite que el dibujo:** el borde está a medio ancho del trazado y `TrackLayer` dibuja el asfalto como un trazo de ese ancho con juntas redondeadas. Lo que se ve es exactamente lo que choca.
- **El auto como círculo** de `collisionRadius` (medio ancho del auto). Con un rectángulo, las esquinas quedarían fuera al ir en diagonal; el círculo es más simple y alcanza para una vista cenital.
- **Corrección de posición y no física de impulsos:** no hay rebotes ni giros por el choque, que en un juego para chicos se sienten injustos. El auto sigue mirando hacia donde miraba, y el agarre lateral del modelo lo endereza a lo largo del borde.
- **Va después de `stepCar` y no dentro**, para que el modelo de manejo siga sin saber nada de la pista y sirva igual en el 3D.
- **Un solo punto más cercano por paso:** `constrainToHit` recibe el que ya buscó la simulación. Al corregir, el auto se mueve sobre la normal de ese punto, así que el mismo punto sirve después para medir el progreso.
- **Funciona en cualquier circuito validado:** los tests corren entradas aleatorias en el óvalo y en el Autódromo del Lago (chicana y horquilla incluidas) y el auto nunca sale del límite.
