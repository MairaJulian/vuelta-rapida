# Ranking

Ranking por pista entre los perfiles del celular. Dos tipos de tabla: **mejor vuelta** y **carrera completa**, una por cada cantidad de vueltas. No se guarda nada aparte: las tablas se calculan con los récords de los perfiles (`core/Profiles`). TypeScript puro.

## Tipos

- `RankingTable`: `{ kind: 'lap' }` o `{ kind: 'race', laps }`.
- `RankingRow`: `{ position, profile, timeMs, setAt, gapToLeaderMs, gapToAboveMs }`. Una fila de la torre de tiempos.
- `RankingOutcome`: cómo le fue a un jugador en una tabla.
  - `position` y `previousPosition`: puesto después y antes de correr (`null` si no está).
  - `total`: jugadores en la tabla.
  - `personalBest`: mejoró su tiempo o entró en la tabla.
  - `overtaken`: perfiles que superó.
  - `trackRecord`: récord de la pista.
  - `above` y `gapToAboveMs`: el de arriba y cuánto le falta para alcanzarlo.
- `CelebrationKind`: `'trackRecord' | 'overtake' | 'personalBest'`.

## API

| Exporta | Qué hace |
|---|---|
| `getRanking(state, circuitId, table)` | La torre: filas ordenadas, con puesto y diferencias. |
| `getTrackRecord(state, circuitId, table)` | El líder de la tabla, o `null`. |
| `getRaceLapCounts(state, circuitId)` | Cantidades de vueltas con tiempos de carrera, de menor a mayor. |
| `getRankingOutcome(before, after, profileId, circuitId, table)` | Compara el ranking antes y después de correr. |
| `getRaceRanking(before, after, profileId, circuitId, laps)` | Las dos tablas de una carrera (`lap` y `race`) y la celebración más grande. Es lo que muestran los resultados. |
| `getCelebration(outcomes)` | La celebración más grande entre varias tablas, o `null`. |
| `getTableLabel(table)` | "Mejor vuelta" o "Carrera · 3 vueltas". |
| `LAP_TABLE`, `raceTable(laps)`, `isSameTable(a, b)` | Las tablas. |

## Ejemplo

```ts
const rows = getRanking(state, 'autodromo-del-lago', LAP_TABLE);
// [{ position: 1, profile: Tomi, timeMs: 70000, gapToLeaderMs: 0, ... },
//  { position: 2, profile: Male, timeMs: 70345, gapToLeaderMs: 345, gapToAboveMs: 345, ... }]

const lap = getRankingOutcome(before, after, male.id, circuitId, LAP_TABLE);
const race = getRankingOutcome(before, after, male.id, circuitId, raceTable(3));
getCelebration([lap, race]); // 'overtake'
```

## Reglas

- **Una fila por perfil y tabla,** con su mejor tiempo. Los récords solo se reemplazan si mejoran (`withLapRecord` y `withRaceRecord` en `core/Profiles`).
- **Orden:** por tiempo. Con el mismo tiempo, gana quien lo logró primero (`setAt`). Igualar el propio tiempo más tarde no cambia nada.
- **Diferencias:** con el líder y con el puesto de arriba, en milisegundos. El líder tiene 0.
- **Las filas toman el perfil actual:** si se edita el nombre, el color o el número, la tabla lo muestra. Si se borra el perfil, sus récords se borran y los demás suben.
- **Celebraciones**, de la más grande a la más chica:
  - **Récord de la pista:** mejoró, quedó primero y hay al menos otro jugador en la tabla. Mejorar el propio récord también cuenta. Solo en la tabla, es mejor tiempo personal.
  - **Superar a otro jugador:** mejoró y quedaron detrás jugadores que antes estaban adelante. Si entró por primera vez, cuentan los que tiene detrás.
  - **Mejor tiempo personal:** mejoró su tiempo o entró en la tabla.

## Decisiones de diseño

- **Calculado, no guardado:** el ranking sale de los récords. Así no puede quedar desfasado de los perfiles: editar o borrar se refleja solo.
- **"Antes" y "después" como estados completos:** el resultado compara dos `ProfilesState`, sin saber cómo se llegó de uno al otro. La pantalla de carrera toma el "antes" al largar (la mejor vuelta se guarda durante la carrera) y el "después" al llegar.
- **Desempate por fecha y, si coincide, por id:** el orden es siempre el mismo.
- **Sin perfil activo no hay ranking:** las vueltas sin dueño (`unassignedRecords`) no entran en las tablas hasta que pasan al primer perfil que se cree.
