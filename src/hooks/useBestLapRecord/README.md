# useBestLapRecord

Récord de un circuito: lo lee de las preferencias guardadas y guarda una vuelta nueva si es más rápida.

## Parámetros

| Parámetro | Tipo | Descripción |
|---|---|---|
| `circuitId` | `string` | `id` del circuito: la clave del récord. |
| `stepHz` | `number` | Pasos de simulación por segundo, para pasar las vueltas a milisegundos. |

## Devuelve

| Campo | Tipo | Descripción |
|---|---|---|
| `recordMs` | `number \| null` | Récord guardado, en milisegundos; `null` si todavía no hay. |
| `saveLap` | `(lapTicks: number) => void` | Guarda la vuelta (en pasos) si mejora el récord. Estable mientras no cambien `circuitId` ni `stepHz`. |

## Ejemplo

```tsx
const { recordMs, saveLap } = useBestLapRecord({ circuitId: circuit.id, stepHz: 60 });
const loop = useDrivingLoop({ ..., track: circuit, onBestLap: saveLap });
<LapHud laps={loop.laps} recordMs={recordMs} stepHz={60} />
```

## Decisiones de diseño

- **El loop avisa, el hook decide:** la simulación (hilo de UI) solo sabe cuál es la mejor vuelta de la sesión. Cuando mejora, `useDrivingLoop` llama a `saveLap` en el hilo de JS con `scheduleOnRN`, y aquí se compara con el récord guardado.
- **Compara con las preferencias del momento** (`readPlayerPreferences`), no con las del último render, y la regla está en `withBestLap` (`core/PlayerPreferences`).
- **`saveLap` es estable:** el loop la captura en su worklet, así que no cambia cuando cambian las preferencias.
- **Se guarda en milisegundos:** el récord sigue valiendo aunque cambie la frecuencia de la física.
