# useRaceStatus

Traduce los eventos de la carrera a lo que la pantalla necesita para mostrar sus capas: en qué estado está (para abrir la pausa), la vuelta en el momento de pausar y los resultados, un rato después de la llegada. Corre en el hilo de JS y solo cambia cuando llega un evento.

## Parámetros

| Parámetro | Tipo | Descripción |
|---|---|---|
| `bus` | `EventBus<RaceEvent>` | Bus de la carrera. |
| `lapView` | `DerivedValue<RaceLapView>` | Vuelta en curso, de `useRaceLoop`. Se lee una vez por pausa. |
| `resultsDelayMs` | `number` (opcional) | Espera entre la llegada y los resultados. Por defecto, `RESULTS_DELAY_MS` (1500 ms). |

## Devuelve

| Valor | Descripción |
|---|---|
| `phase` | `RacePhase` del último aviso `phase`. Empieza en `grid`. |
| `pausedLap` | `RaceLapView` del momento de pausar; `null` fuera de la pausa. |
| `results` | `RaceResults` desde `resultsDelayMs` después de `finish`; `null` antes y desde que se reinicia. |

## Ejemplo

```tsx
const status = useRaceStatus({ bus, lapView: loop.lapView });

{status.pausedLap ? <PauseMenu lap={status.pausedLap.lap} ... /> : null}
{status.results ? <RaceResults results={status.results} ... /> : null}
```

## Decisiones de diseño

- **Solo eventos:** el estado sale de los avisos `phase` y los resultados del evento `finish` (`getFinishResults`), que los trae completos. No lee la carrera desde el hilo de JS.
- **Una lectura por pausa:** el tiempo de la vuelta no viaja en los eventos. Al pausar, la carrera queda congelada, así que se lee `lapView` una vez y vale para toda la pausa.
- **1,5 s antes de los resultados:** se ve cruzar la meta y frenar al auto. Si se reinicia antes, la espera se cancela.
- **Reiniciar limpia:** el aviso hacia `grid` borra los resultados y la espera pendiente.
