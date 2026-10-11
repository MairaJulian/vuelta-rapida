# useGhostRecording

Guarda la vuelta que mejora el récord del perfil activo como su fantasma en esa pista. La grabación la hace la carrera (`core/RaceFlow`) y el formato es de `core/Ghost`; este hook solo une el evento con el guardado.

## Parámetros

| Parámetro   | Tipo                  | Descripción                                                          |
| ----------- | --------------------- | -------------------------------------------------------------------- |
| `bus`       | `EventBus<RaceEvent>` | El bus de la carrera.                                                |
| `circuitId` | `string`              | Pista de la carrera.                                                 |
| `stepHz`    | `number`              | Pasos por segundo, para pasar el tiempo de la vuelta a milisegundos. |

No devuelve nada.

## Ejemplo

```tsx
useGhostRecording({ bus, circuitId: track.id, stepHz: 60 });
```

## Decisiones de diseño

- **Solo las vueltas récord:** `RaceFlow` emite `recordTrace` únicamente cuando la vuelta mejora el récord vigente, así no se codifica ni se envía una grabación por cada vuelta.
- **Un fantasma por perfil y pista:** `withGhost` reemplaza el que había solo si el nuevo es más rápido. Sin perfil activo no se guarda (los récords sin dueño no tienen fantasma).
- **Guarda en el mismo paso, con las lecturas síncronas de `useProfiles`:** `updateProfiles` aplica el cambio sobre los datos del momento.
