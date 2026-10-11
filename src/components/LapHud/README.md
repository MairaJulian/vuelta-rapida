# LapHud

HUD de la carrera (pantalla 07 del handoff): "Vuelta 2/3" arriba a la izquierda, el tiempo de la vuelta en curso al centro, y "Mejor" y el botón de pausa arriba a la derecha. Con un fantasma, debajo del tiempo va el chip de diferencia. El minimapa todavía no está.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `lapView` | `DerivedValue<RaceLapView>` | Vuelta en curso, total de vueltas y tiempo de la vuelta (de `useRaceLoop`). |
| `recordMs` | `number \| null` | Récord guardado del circuito, en ms (de `useBestLapRecord`). |
| `stepHz` | `number` | Pasos de simulación por segundo, para pasar los pasos a tiempo. |
| `ghostDelta` | `DerivedValue<number | null>` (opcional) | Diferencia con el fantasma en segundos, positiva si el jugador va atrás (de `useRaceGhost`). Con un número se muestra el chip; con `null` o sin la prop, no. |
| `onPause` | `() => void` (opcional) | Abre la pausa. Sin esta prop no hay botón. |
| `style` | `StyleProp<ViewStyle>` | Estilo extra del contenedor. |

También exporta `getLapHudTexts(view, recordMs, stepHz)`, que arma los textos, y `getGhostDeltaChip(deltaSeconds)`, que arma el chip.

## Ejemplo

```tsx
<LapHud lapView={loop.lapView} recordMs={recordMs} stepHz={DEFAULT_FIXED_STEP_CONFIG.stepHz} />
```

## Diseño (handoff, pantalla 07)

- **Píldoras blancas** con sombra `0 2 6` al 14 %, a 14 dp del borde de arriba y 28 dp de los costados, más el área segura.
- **"Vuelta":** radio 16, padding 6/14. Rótulo 600/11 en `muted`; número 900/30, cifras tabulares, y el total ("/3") en `faint`.
- **Tiempo:** píldora redonda, padding 4/22. 800/32, cifras tabulares, formato `m:ss.mmm`. El handoff usa 36 con Archivo Narrow; con la fuente del sistema, que es más ancha, baja a 32.
- **"Mejor":** como "Vuelta", con el valor en 800/20. Sin récord muestra `–:––.–––`.
- **Chip de diferencia con el fantasma:** debajo del cronómetro, píldora con padding 3/12, texto blanco 800 de 16 (el handoff, 19 con Archivo) y el ícono del fantasma de 16. Verde `delta-faster` (`#2E9A55`) si el jugador va más rápido, rojo `delta-slower` (`#D83B3B`) si va más lento. **Siempre con signo** (`−0.412` / `+0.236`, con el menos tipográfico) para que no dependa del color. Aparece solo en carrera.
- **Pausa:** botón blanco Ø 48 con el ícono de Phosphor y la misma sombra, a la derecha de "Mejor"; presionado, `soft`.

## Decisiones de diseño

- **El tiempo corre desde la largada:** la vuelta 1 se cuenta desde que se apagan las luces (`core/RaceFlow`). En la grilla y durante el semáforo dice "Vuelta 1/3" con el tiempo en cero.
- **"Mejor" es el récord guardado:** el loop guarda cada mejora apenas ocurre (`useBestLapRecord`), así que el récord ya incluye la mejor vuelta de la sesión.
- **Textos por React, unas 20 veces por segundo:** un `Text` no cambia desde un worklet. Leer las vueltas cada 50 ms alcanza para que el cronómetro se vea fluido, y la simulación del hilo de UI no espera a React. Si los textos no cambiaron, no se vuelve a dibujar.
- **Solo la pausa recibe toques** (`pointerEvents: 'box-none'` en el contenedor y `'none'` en las píldoras): el resto es información y no tapa los botones ni el panel.
- **La diferencia sale del hilo de UI** (`useRaceGhost`) y se lee con el mismo intervalo que el cronómetro; si el texto no cambió, no se redibuja.
- **El ícono del fantasma es propio:** Phosphor tiene uno, pero se dibujó a mano uno parecido (ver CREDITOS.md) en lugar de copiar de memoria un trazado ajeno.
- **Fuente del sistema** hasta que se incorpore Archivo.
