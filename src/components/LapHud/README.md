# LapHud

HUD mínimo y provisorio de la carrera (pantalla 07 del handoff): "Vuelta" arriba a la izquierda, el tiempo de la vuelta en curso al centro y "Mejor" arriba a la derecha. El HUD completo (minimapa, delta con el fantasma, "Vuelta 2/3", pausa) llega con el hito de pantallas.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `laps` | `DerivedValue<LapState>` | Vueltas de la simulación (de `useDrivingLoop`). |
| `recordMs` | `number \| null` | Récord guardado del circuito, en ms (de `useBestLapRecord`). |
| `stepHz` | `number` | Pasos de simulación por segundo, para pasar los pasos a tiempo. |
| `style` | `StyleProp<ViewStyle>` | Estilo extra del contenedor. |

También exporta `getLapHudTexts(laps, recordMs, stepHz)`, que arma los tres textos.

## Ejemplo

```tsx
<LapHud laps={loop.laps} recordMs={recordMs} stepHz={DEFAULT_FIXED_STEP_CONFIG.stepHz} />
```

## Diseño (handoff, pantalla 07)

- **Píldoras blancas** con sombra `0 2 6` al 14 %, a 14 dp del borde de arriba y 28 dp de los costados, más el área segura.
- **"Vuelta":** radio 16, padding 6/14. Rótulo 600/11 en `muted`; número 900/30, cifras tabulares.
- **Tiempo:** píldora redonda, padding 4/22. 800/32, cifras tabulares, formato `m:ss.mmm`. El handoff usa 36 con Archivo Narrow; con la fuente del sistema, que es más ancha, baja a 32.
- **"Mejor":** como "Vuelta", con el valor en 800/20. Sin récord muestra `–:––.–––`.

## Decisiones de diseño

- **Antes de largar dice "Vuelta 1"** con el tiempo en cero. La vuelta 1 empieza al cruzar la meta, 15 m después de la largada; "Vuelta 0" confundiría.
- **"Mejor" es el récord guardado:** el loop guarda cada mejora apenas ocurre (`useBestLapRecord`), así que el récord ya incluye la mejor vuelta de la sesión.
- **Textos por React, unas 20 veces por segundo:** un `Text` no cambia desde un worklet. Leer las vueltas cada 50 ms alcanza para que el cronómetro se vea fluido, y la simulación del hilo de UI no espera a React. Si los textos no cambiaron, no se vuelve a dibujar.
- **No recibe toques** (`pointerEvents: 'none'`): es solo información y no tapa los botones ni el panel.
- **Provisorio:** fuente del sistema y sin íconos, hasta que se incorporen Archivo y Phosphor.
