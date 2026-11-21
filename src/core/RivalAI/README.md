# RivalAI

La IA de los rivales como TypeScript puro y worklets: cada rival maneja con el **mismo modelo de manejo** (`stepCar` vía `stepDrivingSim`), los mismos límites de pista y las mismas vueltas que el jugador, y se gobierna con la **misma entrada** (`{ steer, brake }`). No hay física aparte ni atajos: si el rival gira o frena, es porque lo pidió igual que lo pide el jugador con los botones. No sabe de React, Skia ni del disco.

## Cómo maneja

1. **Dirección** (`getRivalInput`): persecución pura hacia un punto de la trazada, adelante a `lookAheadMin + lookAheadTime × velocidad` metros (la distancia crece con la velocidad). El ángulo de las ruedas que pide sale de la geometría de bicicleta del modelo (`atan(2·ejes·sen α / distancia)`) y se divide por el giro máximo a esa velocidad (`getMaxSteerAngle`) para obtener la entrada de −1 a 1.
2. **Velocidad** (`buildSpeedProfile`): una velocidad objetivo por cada punto del trazado, sacada de la curvatura de los tramos que vienen. En cada punto vale la menor entre la que permite la aceleración lateral del nivel (`√(a / curvatura)`) y la que permite el giro de las ruedas (que se achica con la velocidad). Después se recorre la vuelta hacia atrás con el freno que el nivel dice usar, así la frenada empieza antes de las curvas cerradas. El freno es proporcional a lo que el auto se pasa de ese objetivo (`brakeGain`); el acelerador es automático, como el del jugador.
3. **Imprecisión** (`stepDriver`): cada `lineChangeSeconds` se sortean, con un generador con semilla (`core/SeededRandom`), un desvío de la trazada (hasta `lineError` m, y nunca más de un 40 % del ancho libre) y un factor de la velocidad objetivo (error de frenada, `1 ± speedError`). El desvío se alcanza a `lineRate` m/s, así no hay saltos. La misma semilla da la misma carrera.
4. **Carril propio (hito 9b):** cada rival sortea con su semilla un carril de −1 a 1 y en recta se corre hacia él hasta `laneSpread` (50 %) del ancho libre, en vez de ir todos por el centro en fila. `getLaneScale` mira los próximos 200 m del perfil de velocidad: si viene una curva, el carril se apaga y el rival vuelve a la trazada (a `lineRate`, sin saltos). El desvío total no pasa del 80 % del ancho libre. Sale de la grilla ya desviado como su puesto (`startOffset`, de `getGridOffset`). Medido con 10 rivales en nivel fácil: en Autódromo del Lago y Gran Meseta el grupo ocupa 4–6 m de ancho en las rectas; en Las Sierras y Puerto Viejo, de curvas encadenadas, se junta casi todo el tiempo. Sin roces con el borde.
5. **Ritmo propio:** a cada rival se le sortea un ritmo entre `paceMin` y `paceMax` (fracción de la velocidad objetivo que usa), para que no vayan pegados. El ritmo, el error de frenada y el tope `maxPace` solo valen **en curva**: donde el límite del tramo es el tope del auto (recta) el rival va a fondo, como el jugador, y la transición es gradual (`CURVE_SPEED_SPAN`, el 15 % de `maxSpeed`). Antes el ritmo también recortaba las rectas y los rivales no pasaban de ~38 m/s contra los 42 del jugador.

## Ajuste de ritmo según el jugador (rubber banding)

Cada paso, el rival compara su distancia de carrera con la del jugador: si va detrás, su ritmo sube hasta `catchUpBoost` (+15 % en fácil, +14 % en medio y +12 % en difícil); si va delante, baja hasta `catchUpEase` (−6 %, −4 % y −2 %; hasta el hito 9b, −12 %, −10 % y −8 %, así que el jugador que se escapaba dejaba a los rivales aflojar), en proporción a la distancia y hasta `catchUpRange` (150 m). El objetivo nunca pasa de `maxPace` (97 %) del límite seguro del tramo, así que las curvas siguen con margen. Sin esto, un jugador que pasa a los rivales los pierde de vista: el jugador llega a 42 m/s y ellos, al 88–95 %, a unos 38. En las curvas cerradas la IA además mira menos adelante (`lookAheadCurveTime`), porque con el punto lejano cortaba la curva por dentro y tocaba el borde.

## Otros autos: defender, pasar y esquivar (hito 10)

`stepRival` recibe, además, `traffic` (el jugador y los rivales, en ese orden; se arma con `getTrafficCar`) y `selfIndex` (el lugar del rival en esa lista). Sin ellos el rival corre solo, como antes. Con ellos, `stepTactics` mira a los autos de los `reactRange` metros de carrera de alrededor y decide, sin azar (la carrera sigue siendo reproducible):

- **Esquivar:** si un auto está a su lado (a menos de 5 m de carrera) y más cerca que `sideSpace` de lateral, se corre hacia el otro lado (hasta 4 m, a `tacticRate`). Con `sideSpace` menor que el ancho del auto (2,6 m) deja que se rocen.
- **Pasar:** si va pegado (a menos de `max(20, 2,5 × followDistance)` m) a un auto que le estorba (desvío a menos de 2,9 m), prueba los dos lados del de adelante: apunta a `passGap` m de su carril, en el lado con más lugar, si entra en el asfalto y no hay otro auto en ese carril. Mantiene la maniobra mientras haya un auto junto a su carril o recién superado.
- **Defender:** si un auto lo ataca desde atrás (a menos de la mitad de `reactRange`, sin quedarse atrás y a menos de 5,8 m de lateral), se corre hacia su línea (`defendStrength` de la distancia que los separa) y la mantiene `tacticHold` segundos.
- **No zigzaguear:** después de cada maniobra espera `tacticCooldown` segundos antes de otra.
- **Seguir:** si no puede pasar y el auto de adelante le estorba, no pasa de la velocidad que lo deja a `followDistance` m de él (`speedCap` de `stepTactics`, que `getRivalInput` usa como tope).
- No maniobra en curva (mira 80 m adelante con el mismo criterio que el carril propio) ni a menos de 8 m/s, así que en la grilla parados no se pasan.

La lista no es un reloj compartido: cada rival ve a los demás como estaban al principio del paso, igual que los ve el jugador.

| Nivel  | Defiende | Separación al pasar / al costado | Sigue a | Maniobra a  |
| ------ | -------- | -------------------------------- | ------- | ----------- |
| easy   | 30 %     | 3,4 m / 3,6 m                    | 12 m    | 1,5 m/s     |
| medium | 60 %     | 3,2 m / 3,2 m                    | 9 m     | 2 m/s       |
| hard   | 100 %    | 2,8 m / 2,5 m                    | 5 m     | 3,2 m/s     |

Fácil y medio son "justos": se dejan lugar y no se tocan. El difícil es "picante": cierra la puerta del todo, pasa y sigue pegado, y a veces se rozan; las colisiones del hito 9b hacen el resto.

## Dificultad

`AI_LEVELS` guarda los parámetros de cada nivel (`AiLevel`) y `AI_LEVEL_IDS` los ordena de menos a más exigente. `easy` corre en curva al 82–90 % de la velocidad segura (`lineError` 1 m, freno al 66 %); `medium`, al 89–95 % (0,7 m, freno al 78 %); `hard`, al 98–103 % (0,4 m, freno al 90 %; hasta el hito 9b, 97–102 %, y su `maxPace` pasó de 1,03 a 1,04). En recta los tres van al tope del auto, así que la diferencia está en las curvas: en las pistas con curvas, cada nivel es unos 2 m/s más rápido de media que el anterior (en Gran Meseta, casi toda de rectas, casi no se nota). Los tres frenan menos y más tarde que antes (`lateralAccel` 31/33/35 m/s², antes 30; `steerReserve` 0,67/0,74/0,82, antes 0,65/0,7/0,75). Los tres se prueban en todas las pistas con la grilla llena. `DEFAULT_AI_LEVEL_ID` es `medium` (hasta el hito 9b era `easy`).

**Dificultad dinámica:** es el ajuste de ritmo de arriba (activo cuando el jugador va muy adelante o muy atrás). `withDynamicDifficulty(level, false)` devuelve el nivel con `catchUpBoost` y `catchUpEase` en 0: los rivales corren a su ritmo sorteado, sin mirar al jugador.

## API

| Exporta                                                                     | Qué hace                                                                                                                                               |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `RIVAL_COUNT`, `MAX_RIVALS`                                                 | Rivales por defecto (3) y tope que se puede elegir (10).                                                                                               |
| `AI_LEVELS`, `AI_LEVEL_IDS`, `DEFAULT_AI_LEVEL_ID`                          | Parámetros de los niveles, su orden y el de por defecto.                                                                                               |
| `withDynamicDifficulty(level, enabled)`                                     | El nivel con o sin el ajuste de ritmo según el jugador.                                                                                                |
| `createRivalRoster(playerColorId, count?)`                                  | Nombre y color de cada rival (`RivalIdentity`): nombres inventados, colores de la paleta distintos entre sí y al del jugador.                          |
| `buildSpeedProfile(circuit, drivingConfig, level)`                          | Velocidad objetivo de cada punto del trazado. Una vez por carrera, en el hilo de JS.                                                                   |
| `createRival(setup)`                                                        | Rival quieto en su puesto de la grilla, con el ritmo sorteado de la semilla. _worklet_                                                                 |
| `getRivalInput(rival, circuit, profile, drivingConfig)`                     | La entrada del rival en este paso. Pura. _worklet_                                                                                                     |
| `stepRival(rival, circuit, profile, drivingConfig, coastConfig, rules, dt)` | Un paso fijo: azar de la imprecisión, entrada y `stepDrivingSim`. Al completar las vueltas frena solo (sin acelerador) siguiendo la trazada. _worklet_ |

## Ejemplo

```ts
const level = AI_LEVELS.easy;
const profile = buildSpeedProfile(circuit, drivingConfig, level);
let rival = createRival({ id: 'rival-1', car, startProgress, seed: 7, level });
// En cada paso fijo:
rival = stepRival(
  rival,
  circuit,
  profile,
  drivingConfig,
  coastConfig,
  { totalLaps: 3, finishBrake: 0.5 },
  1 / 60,
);
```

## Decisiones de diseño

- **Con otros autos a la vista (hito 10):** hasta el hito 9b los rivales no veían a nadie (ni al jugador) y se atravesaban; desde el 9b chocan, y desde el 10 maniobran (ver arriba). Sin `traffic` en `stepRival` siguen corriendo solos.
- **Hasta 10 rivales:** hay un nombre inventado distinto por cada uno (`RIVAL_NAMES`), pero la paleta tiene 8 colores y uno es del jugador, así que del octavo rival en adelante los colores se repiten. La grilla de 11 autos, en dos columnas, ocupa unos 60 m (`GRID_ROW_GAP`). La prueba de la IA corre la grilla llena en las cuatro pistas y los tres niveles. Con tantos autos conviene medir los fps en el celular: cada rival es un paso de simulación más por cuadro, en el hilo de UI y sin JIT.
- **Mismo modelo, misma interfaz:** la IA solo produce `DrivingInput`. Así cualquier ajuste del manejo (panel de desarrollo) vale para todos y el rival no puede hacer nada que el jugador no pueda.
- **El perfil de velocidad se calcula una vez por carrera** con el manejo de ese momento, no en cada paso: el hilo de UI corre sin JIT. Si el panel cambia el manejo a mitad de carrera, el perfil recién se actualiza en la carrera siguiente.
- **Persecución pura, no trazada de carrera:** el rival apunta a la línea central (con un desvío al azar). Es suficiente para el nivel fácil y es robusto: el test lo corre con tres semillas en todos los circuitos del juego, y comprueba que nunca toca el borde y completa la carrera.
- **Un circuito con un pico en el trazado rompe la IA:** los puntos de control de Las Sierras tenían dos puntos que doblaban el trazado hacia atrás (un pico de unos 3 m); el progreso retrocedía ahí y el rival se estrellaba. Se quitaron los dos puntos erróneos.
- **Sin azar en el estado compartido:** el azar vive en cada `RivalDriver` (`random` es el estado de `SeededRandom`), así la carrera entera sigue siendo reproducible con su semilla.
