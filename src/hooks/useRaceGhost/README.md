# useRaceGhost

El auto fantasma de la carrera: elige cuál corre según las preferencias, lo reproduce y calcula la diferencia en vivo con el jugador. La matemática es de `core/Ghost` y la elección, de `core/GhostChoice`; este hook las conecta con el hilo de UI.

## Parámetros

| Parámetro    | Tipo                       | Descripción                                                                 |
| ------------ | -------------------------- | --------------------------------------------------------------------------- |
| `bus`        | `EventBus<RaceEvent>`      | El bus de la carrera: al volver a la grilla se vuelve a elegir el fantasma. |
| `circuit`    | `Circuit`                  | Circuito de la carrera (para el progreso del fantasma sobre el trazado).    |
| `race`       | `SharedValue<RaceState>`   | Estado de la carrera, de `useRaceLoop`.                                     |
| `cameraView` | `DerivedValue<CameraView>` | La cámara, de `useRaceLoop`: su giro mantiene el nombre derecho.            |

## Devuelve

| Campo   | Tipo                           | Descripción                                                                                                            |
| ------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `ghost` | `RaceGhostView \| null`        | Nombre y color del dueño más `transform`, `labelTransform` y `opacity` (valores derivados). `null` si no hay fantasma. |
| `delta` | `DerivedValue<number \| null>` | Diferencia con el fantasma, en segundos (positiva: el jugador va atrás). `null` fuera de la carrera o sin fantasma.    |

## Ejemplo

```tsx
const { ghost, delta } = useRaceGhost({ bus, circuit: track, race: loop.race, cameraView: loop.cameraView });
<DriveCanvas ... ghost={ghost} />
<LapHud ... ghostDelta={delta} />
```

## Decisiones de diseño

- **Se elige al abrir la carrera y al volver a la grilla,** con las lecturas síncronas de los perfiles y las preferencias. Una vuelta récord grabada en plena carrera no cambia el fantasma a mitad de camino: las vueltas siguientes siguen contra el mismo. Al tocar "Otra vez" corre el nuevo.
- **La preparación corre una vez por fantasma:** `createGhostPlayback` decodifica la grabación y mide su progreso sobre la pista (unas miles de búsquedas), en el hilo de JS, y la deja en un valor compartido. El hilo de UI solo interpola.
- **Reloj de la vuelta:** el fantasma se reproduce con `getRaceLapClockMs` (tiempo de la vuelta en curso más la fracción del paso, igual que el auto interpolado), así reinicia solo en cada cruce de meta y es independiente de los fps. En la grilla y el semáforo espera en la primera muestra.
- **El nombre queda derecho:** `labelTransform` aplica el giro de la cámara al revés, así el texto no gira con el mapa.
- **Tras la llegada se oculta** (`opacity` 0); durante la pausa queda congelado, como la carrera.
- **Sin colisión:** el fantasma solo se dibuja; la simulación del auto del jugador no lo conoce.
