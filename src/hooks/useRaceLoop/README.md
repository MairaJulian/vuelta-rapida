# useRaceLoop

Conecta el loop de Reanimated (`useFrameCallback`, hilo de UI) con la carrera pura de `core/RaceFlow`. En cada cuadro avanza la carrera con el tiempo transcurrido y la entrada actual, y publica el estado interpolado del auto, las transformaciones de cámara y auto para Skia y la vuelta para el HUD. Entrega los eventos de la carrera y la velocidad del motor al hilo de JS, y recibe las órdenes de la pantalla. No dibuja nada.

Antes se llamaba `useDrivingLoop`: corría solo la simulación de manejo.

## Parámetros

| Parámetro | Tipo | Descripción |
|---|---|---|
| `input` | `SharedValue<DrivingInput>` | Entrada que escribe el modo de control. |
| `track` | `Circuit` | Circuito: la largada, los límites, los pianos y las vueltas. El ancho se puede cambiar en caliente. |
| `viewport` | `{ width, height }` | Área de dibujo en dp. |
| `drivingConfig` | `DrivingConfig` | Parámetros del modelo; en caliente. |
| `cameraConfig` | `CameraConfig` | Parámetros de la cámara; en caliente. |
| `raceConfig` | `RaceConfig` | Reglas de la carrera. Valen desde la próxima carrera. |
| `recordTicks` | `number \| null` | Récord del circuito, en pasos. Vale desde la próxima carrera. |
| `onEvents` | `(events) => void` (opcional) | Eventos de la carrera, en orden, en el hilo de JS. Estable. |
| `onEngine` | `(speedRatio) => void` (opcional) | Velocidad de 0 a 1 para el motor, cada `ENGINE_SAMPLE_MS` (50 ms). Estable. |
| `rivalCount` | `number` (opcional) | Rivales con IA; por defecto 0 (el jugador corre solo y larga 15 m antes de la meta). Con rivales, ellos ocupan los primeros puestos de la grilla y el jugador el último. Vale desde la próxima carrera. |
| `aiLevel` | `AiLevelId` (opcional) | Dificultad de los rivales; por defecto `easy`. Vale desde la próxima carrera. |
| `createSeed` | `() => number` (opcional) | Semilla de cada carrera. Por defecto, la hora. |

## Devuelve

| Valor | Descripción |
|---|---|
| `race` | `SharedValue<RaceState>`: la carrera completa. |
| `car` | `SharedValue<CarState>` interpolado, para dibujar y para las lecturas del panel. |
| `rivalCars` | `SharedValue<CarState[]>`: los rivales interpolados, en el orden de la grilla; vacío sin rivales. |
| `placeView` | `DerivedValue<RacePlaceView>`: puesto del jugador y autos en carrera, para el HUD ("2/4"). |
| `fps` | fps suavizados. |
| `cameraView` | `DerivedValue<CameraView>`: punto del mundo en el centro de la pantalla, zoom y giro. Lo usan el paralaje y la escenografía visible (`useSceneryView`). |
| `cameraTransform` / `carTransform` | Transformaciones del mundo y del auto para Skia. |
| `lapView` | `DerivedValue<RaceLapView>`: vuelta en curso, total de vueltas y tiempo de la vuelta. |
| `startLights()` / `pause()` / `resume()` / `restart()` | Órdenes de la pantalla. |

## Ejemplo

```tsx
const bus = useMemo(() => createEventBus<RaceEvent>(), []);
const loop = useRaceLoop({
  input, track, viewport, drivingConfig, cameraConfig,
  raceConfig: DEFAULT_RACE_CONFIG,
  recordTicks,
  onEvents: bus.emitAll,
});

useEffect(() => loop.startLights(), [loop.startLights]);
<DriveCanvas track={track} cameraTransform={loop.cameraTransform} carTransform={loop.carTransform} />
```

## Decisiones de diseño

- **Hilo de UI:** la carrera avanza dentro de `useFrameCallback`; lee la entrada y la configuración desde valores compartidos y no pasa por React en ningún cuadro.
- **Eventos al hilo de JS solo cuando hay:** en cada cuadro, `takeRaceEvents` retira los eventos de la carrera. Si hay alguno, van con `scheduleOnRN` a `onEvents` (por ejemplo, al bus). La mayoría de los cuadros no tienen ninguno y no cruzan de hilo.
- **El motor recibe la velocidad, no la lee:** cada 50 ms el loop manda la velocidad con `scheduleOnRN`. Leer un valor compartido desde el hilo de JS puede bloquearlo hasta que responda el hilo de UI; mandarlo no bloquea a ninguno de los dos.
- **Órdenes con `modify`:** pausa, reanudar, semáforo y reinicio corren en el hilo de UI entre dos cuadros (`race.modify`), así nunca pisan un paso de la simulación. En los tests el mock de Reanimated aplica `modify` en el momento (`test/setup/reanimated.ts`).
- **Reglas y récord para la próxima carrera:** `raceConfig` y `recordTicks` se usan al crear la carrera. Cambiarlos no altera la que está en curso; `restart()` arma la nueva con los valores del momento (y una semilla nueva).
- **Configuración en caliente:** el manejo, la cámara, el viewport y el circuito llegan como props y se copian a valores compartidos con `useEffect`; el loop lee siempre la última versión.
- **Cámara con estado propio:** se suaviza con el tiempo del cuadro, fuera de la simulación y de su determinismo. `restart()` la centra.
- Usa `.get()`/`.set()` en lugar de `.value`, como recomienda Reanimated 4 para el React Compiler.
