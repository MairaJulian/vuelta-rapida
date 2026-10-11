# RacePositions

Puestos de una carrera como TypeScript puro y worklets: ordena a los autos por **vueltas completas + progreso en la vuelta actual** y da el puesto de cada uno. No sabe de React, Skia ni de los autos: trabaja con una lista de `PositionEntry`.

## Cómo se ordena

- **Distancia de carrera** (`getRaceDistance(laps, lapLength)`): `vueltas completas × largo de la vuelta + progreso`. Antes de cruzar la meta por primera vez (la grilla está detrás de la meta) el progreso se cuenta hacia atrás, en negativo: `progreso − largo`. Así el auto de adelante en la grilla tiene más distancia, y la distancia es continua al cruzar la meta.
- **Llegada:** los autos que ya completaron la carrera van primero, por orden de llegada (`finishTick`); el resto, por distancia de carrera.
- **Empate:** lo gana el auto que está antes en la lista. La carrera pone al jugador último: en un empate exacto, el rival va delante.

## API

| Exporta                            | Qué hace                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `getRaceDistance(laps, lapLength)` | Distancia de carrera de un auto, en metros, desde sus `LapState`. _worklet_ |
| `getStandings(entries)`            | Puesto (desde 1) de cada `PositionEntry`, en el mismo orden. _worklet_      |

La carrera arma las entradas y expone el resultado: `getRaceStandings(race)` y `getRacePlace(race)` (`{ place, total }` para el HUD "2/4") en `core/RaceFlow`.

## Decisiones de diseño

- **Sin ordenar la lista:** el puesto de cada auto es 1 + la cantidad de autos que van delante. Con cuatro autos es más simple y barato que ordenar, y no asigna listas nuevas más allá del resultado (se llama en cada cuadro desde el hilo de UI).
- **El progreso viene de `LapTimer`:** las vueltas completas son las de las puertas del circuito, así un atajo o una vuelta deshecha no suman. La carrera lee el progreso de cada auto desde el paso anterior: antes de largar, el de su puesto de la grilla.
