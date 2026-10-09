# StartLights

Semáforo de largada (pantalla 06 del handoff): cinco columnas que se encienden de a una y, debajo, una píldora con "Preparate…" mientras se encienden, "Esperá…" con las cinco encendidas y "¡Largada!" al apagarse.

## Props

| Prop         | Tipo                  | Descripción                                       |
| ------------ | --------------------- | ------------------------------------------------- |
| `bus`        | `EventBus<RaceEvent>` | Bus de la carrera. El semáforo sigue sus eventos. |
| `lightCount` | `number`              | Luces. Por defecto, 5.                            |

También exporta `nextStartLightsView(view, event, lightCount)`, la regla pura de qué mostrar después de cada evento, y `GRID_VIEW`.

## Ejemplo

```tsx
const bus = useMemo(() => createEventBus<RaceEvent>(), []);
const loop = useRaceLoop({ ..., onEvents: bus.emitAll });

<StartLights bus={bus} />
```

## Diseño (handoff)

- **Carcasa** `ink` con radio 24, padding 12 y 10 dp entre columnas, arriba al centro (y = 22).
- **Columnas:** píldoras `#22262F` con dos lámparas de Ø 34. Se enciende la de abajo, en `light-on` (`#EC3B30`); apagadas, `light-off` (`#353A45`).
- **Píldora** blanca con texto 900/30 en mayúsculas.

## Decisiones de diseño

- **Sigue los eventos, no un reloj propio:** `lightOn`, `lightsOut` y `phase` llegan por el bus, igual que al sonido y a la vibración. Así las luces, los pitidos y la vibración quedan en sincronía, y la pausa congela el semáforo sin que el componente haga nada.
- **"¡Largada!" queda un segundo** (`GO_VISIBLE_MS`) y el semáforo se va. Reiniciar la carrera (evento `phase` hacia `grid`) lo vuelve a mostrar.
- **No recibe toques** (`pointerEvents: 'none'`): los controles siguen respondiendo.
- **Accesibilidad:** la píldora es una región viva (`accessibilityLiveRegion`), así el lector de pantalla anuncia cada cambio.
- **Una luz por segundo**, como pidió el hito 5. El handoff decía unos 700 ms; el ritmo lo marca `core/RaceFlow`, no este componente.
