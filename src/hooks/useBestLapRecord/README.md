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
const loop = useRaceLoop({ ..., track: circuit, onEvents: bus.emitAll });
useEffect(() => bus.on('newRecord', (event) => saveLap(event.lapTicks)), [bus, saveLap]);
<LapHud lapView={loop.lapView} recordMs={recordMs} stepHz={60} />
```

## Decisiones de diseño

- **La carrera avisa, el hook guarda:** la carrera (hilo de UI) recibe el récord al empezar y emite `newRecord` cuando una vuelta lo mejora. La pantalla escucha ese evento en el bus y llama a `saveLap`, que igual vuelve a comparar con el récord guardado.
- **Compara con las preferencias del momento** (`readPlayerPreferences`), no con las del último render, y la regla está en `withBestLap` (`core/PlayerPreferences`).
- **`saveLap` es estable:** no cambia cuando cambian las preferencias, así la suscripción al bus no se rehace.
- **Se guarda en milisegundos:** el récord sigue valiendo aunque cambie la frecuencia de la física.
