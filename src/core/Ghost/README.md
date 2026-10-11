# Ghost

El auto fantasma como TypeScript puro: grabar una vuelta, guardarla en un formato compacto, reproducirla por interpolación y medir la diferencia en vivo con el jugador. No sabe de React, Skia ni del disco.

## Flujo

1. **Grabar** (`core/RaceFlow`): durante la carrera, cada `getGhostSampleGap(stepHz)` pasos (2 a 60 pasos por segundo, o sea 30 muestras por segundo) se suma la pose del auto (`x`, `z`, rumbo) a `RaceState.lapTrace`, contado desde el inicio de la vuelta. Al completar una vuelta que mejora el récord, la carrera emite `recordTrace` con las muestras (la última cae en la meta). La vuelta 1 empieza en la grilla, al apagarse las luces; las siguientes, al cruzar la meta.
2. **Guardar** (`encodeGhost`): pasa las muestras a `GhostRecording`. `core/Profiles` la guarda como el fantasma del perfil en esa pista (uno por perfil y pista, el de la vuelta más rápida).
3. **Reproducir** (`createGhostPlayback`, `getGhostPose`): al largar se decodifica la grabación y se calcula su progreso sobre la pista. Cada cuadro, `getGhostPose` interpola entre las dos muestras que rodean el tiempo de la vuelta.
4. **Comparar** (`getLapProgress`, `getGhostGap`): la diferencia en segundos entre el jugador y el fantasma.

## API

| Exporta | Qué hace |
|---|---|
| `GHOST_SAMPLE_HZ` | Muestras por segundo de la grabación: 30. |
| `getGhostSampleGap(stepHz)` | Pasos de simulación entre dos muestras. |
| `encodeGhost(samples, hz, lapMs)` | De una lista plana `[x, z, rumbo, ...]` a `GhostRecording`; `null` si no alcanza o trae valores rotos. |
| `parseGhostRecording(value)` | Valida una grabación guardada; `null` si no sirve. |
| `decodeGhost(recording)` | Tiempos, posiciones y rumbos de cada muestra. |
| `createGhostPlayback(recording, circuit)` | Lo anterior más el progreso de cada muestra sobre el circuito. Una vez por carrera, en el hilo de JS. |
| `getGhostPose(playback, timeMs)` | Posición y rumbo del fantasma a `timeMs` del inicio de su vuelta. *worklet* |
| `getLapProgress(laps, lapLength)` | Progreso del auto en su vuelta, en las mismas unidades que el del fantasma. *worklet* |
| `getGhostGap(playback, lapMs, progress)` | Diferencia en segundos: positiva si el jugador va atrás. *worklet* |
| `GHOST_SOURCES`, `DEFAULT_GHOST_SOURCE` | Las tres opciones (`mine`, `record`, `none`) y la de por defecto. |

## Formato guardado (`GhostRecording`)

```ts
{ v: 1, hz: 30, lapMs: 69412.5, d: [x0, z0, h0, dx1, dz1, dh1, ...] }
```

- Enteros: posiciones en centímetros y rumbo en milésimas de radián. La primera muestra es absoluta y las demás son la diferencia con la anterior, así los números son chicos y el JSON ocupa unos 8–10 caracteres por muestra (unos 20 KB una vuelta de 70 s).
- El rumbo se guarda continuo (sin saltar de π a −π) y se interpola derecho.
- Las muestras están a `1000 / hz` ms, salvo la última, que cae en la meta: su tiempo es `lapMs`.
- `v` es la versión del formato de la grabación. La de los datos guardados (`core/SaveData`, v4) es otra: ver la migración v3 → v4.
- `parseGhostRecording` descarta lo que no cierra (versión desconocida, no enteros, tiempos que no encajan): sin fantasma antes que un fantasma que salta por la pista.

## Decisiones de diseño

- **Interpolación entre muestras, sin depender de los fps:** el fantasma se pide por tiempo. La pantalla le pasa el reloj de la vuelta con la fracción del paso en curso (`getRaceLapClockMs`), la misma con que se interpola el auto del jugador.
- **El fantasma reinicia en cada cruce de meta:** el reloj es el de la vuelta en curso (`getRaceLapView`), no el de la carrera. Si el jugador es más lento, el fantasma espera en la meta; si es más rápido, vuelve a salir.
- **La diferencia compara el progreso:** `getGhostGap` busca el instante en que el fantasma estaba donde está el auto y lo resta del tiempo de la vuelta. Es el mismo dato que comparar progresos en un mismo instante, pero ya en segundos reales: dividir los metros de ventaja por una velocidad se rompe en las curvas lentas y a velocidad casi nula. El progreso del fantasma nunca retrocede (un trompo no hace que "desande"), así que la búsqueda es binaria.
- **Progreso negativo antes de la meta:** la vuelta 1 empieza en la grilla, 15 m antes de la meta. Su progreso arranca en negativo, igual para el auto (`getLapProgress`, con las puertas pasadas) y para las muestras de una grabación de la vuelta 1. Un fantasma grabado en una vuelta lanzada (que parte en la meta) contra la vuelta 1 de una carrera nueva sale "por delante": la diferencia es real, la vuelta de la grilla es más lenta.
- **Solo se graba una vuelta que mejora el récord del perfil:** no se graban las demás, así el disco guarda un fantasma por perfil y pista y la carrera no copia listas largas cuando no hace falta.
- **Muestras desde la simulación a 60 Hz:** a 30 muestras por segundo las posiciones son las de los pasos pares; la interpolación suaviza el resto.
