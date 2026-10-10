# useRaceRanking

El ranking de la pista con cada carrera del jugador activo: guarda el total de la carrera y compara cómo quedó en las dos tablas (mejor vuelta y carrera completa). Las reglas están en `core/Ranking` y `core/Profiles`.

## Parámetros

| Parámetro | Tipo | Descripción |
|---|---|---|
| `bus` | `EventBus<RaceEvent>` | El bus de la carrera. |
| `circuitId` | `string` | Pista de la carrera. |
| `stepHz` | `number` | Pasos por segundo, para pasar el total a milisegundos. |

## Devuelve

| Campo | Tipo | Descripción |
|---|---|---|
| `ranking` | `RaceRanking \| null` | Puesto en las dos tablas y celebración. `null` antes de la llegada, sin perfil activo, o al volver a la grilla. |

## Ejemplo

```tsx
const { ranking } = useRaceRanking({ bus, circuitId: track.id, stepHz: 60 });
<RaceResults results={results} ranking={ranking} ... />
```

## Cómo sigue la carrera

1. **`lightsOut`:** foto de los récords (el "antes").
2. **`finish`:** guarda el total si mejora el récord del perfil con esas vueltas (`withRaceRecord`) y compara el "antes" con los récords de ahora.
3. **`phase` → `grid`** ("Otra vez"): olvida el ranking.

## Decisiones de diseño

- **La foto se toma al largar y no al llegar:** la mejor vuelta ya se guardó durante la carrera (`useBestLapRecord`, evento `newRecord`, que llega antes que la llegada). Comparar con los récords al llegar no vería la mejora.
- **Sin perfil activo no hay ranking:** el total de la carrera no se guarda y no hay a quién compararle nada.
- **Guarda y compara en el mismo paso,** en el hilo de JS, con las lecturas síncronas de `useProfiles`.
- **La celebración la emite la pantalla,** no este hook: aparece junto con la tarjeta de resultados (1,5 s después de la llegada), y el sonido y la vibración escuchan ese evento.
