# PauseMenu

Menú de pausa (pantalla 08 del handoff): un velo sobre la carrera congelada, el panel con las acciones y el tiempo de la vuelta en curso.

## Props

| Prop                                 | Tipo         | Descripción                                  |
| ------------------------------------ | ------------ | -------------------------------------------- |
| `lap`, `totalLaps`                   | `number`     | Para "Vuelta 2 de 3".                        |
| `circuitName`                        | `string`     | Nombre del circuito.                         |
| `lapTime`                            | `string`     | Tiempo de la vuelta en curso, ya formateado. |
| `soundEnabled`, `vibrationEnabled`   | `boolean`    | Estado de los interruptores.                 |
| `onResume`, `onRestart`, `onExit`    | `() => void` | Continuar, Reiniciar y Salir al menú.        |
| `onToggleSound`, `onToggleVibration` | `() => void` | Prender o apagar el sonido y la vibración.   |

## Ejemplo

```tsx
<PauseMenu
  lap={view.lap}
  totalLaps={view.totalLaps}
  circuitName={track.name}
  lapTime={formatLapTime(ticksToMs(view.lapTicks, 60))}
  soundEnabled={preferences.soundEnabled}
  vibrationEnabled={preferences.vibrationEnabled}
  onResume={loop.resume}
  onRestart={restartRace}
  onToggleSound={() => updatePreferences({ soundEnabled: !preferences.soundEnabled })}
  onToggleVibration={() => updatePreferences({ vibrationEnabled: !preferences.vibrationEnabled })}
  onExit={exit}
/>
```

## Diseño (handoff, pantalla 08)

- **Velo** `backdrop` (`rgba(20,23,31,0.55)`) sobre toda la escena: la única capa translúcida.
- **Panel** `bg` a la izquierda: margen 14, 340 de ancho, radio 24, padding 22/24.
  - "PAUSA" 900/42 y "Vuelta 2 de 3 · Autódromo del Lago" en `muted` 13.
  - Continuar: primario de 56 con un círculo blanco y el ícono de play.
  - Reiniciar: secundario con ícono `blue`.
  - Salir al menú: botón de peligro.
- **A la derecha**, en blanco sobre el velo: "Vuelta actual" y el tiempo en 800/40.

## Decisiones de diseño

- **Reiniciar en lugar de Recalibrar y Cambiar control:** la inclinación está desactivada (`FEATURE_FLAGS.tiltControl`), así que esas dos opciones no aplican. Reiniciar lo pidió el hito 5.
- **Sonido y vibración abajo a la derecha, sobre el velo:** el handoff no tiene interruptores en la pausa, y en el panel no entran sin pasar los 360 dp de alto del diseño. Son botones secundarios que se anuncian como interruptores, con un chip "Sí"/"No" (azul o gris) y, sin sonido, el parlante tachado.
- **Sin lógica:** no sabe nada de la carrera. La pantalla le pasa los textos y las acciones.
- **Modal para el lector de pantalla** (`accessibilityViewIsModal`): mientras está abierto, no se leen los controles de abajo.
