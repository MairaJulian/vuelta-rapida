# DriveScreen

Pantalla de manejo: el auto acelera solo por el Autódromo del Lago y se maneja con botones (o, desde el panel de desarrollo, inclinando el celular). Frena y da marcha atrás, no puede salir de la pista y la cámara lo sigue con anticipación. Cuenta las vueltas y los tiempos, y guarda el récord del circuito.

## Props

Ninguna. El modo de control, la calibración, la sensibilidad y el récord salen de las preferencias del jugador (`usePlayerPreferences`). Sin modo elegido, usa botones.

Corre en `DEFAULT_CIRCUIT` (`core/Circuits`), arranca con `DEFAULT_DRIVING_CONFIG`, `DEFAULT_CAMERA_CONFIG` y `DEFAULT_TILT_CONFIG`, y toma el tamaño de `useWindowDimensions`.

## Ejemplo

```tsx
// src/app/pista.tsx
import { DriveScreen } from '@/screens/DriveScreen';

export default DriveScreen;
```

## Composición

| Pieza | Rol |
|---|---|
| `useDrivingInput` | Crea la entrada compartida. |
| `ButtonControls` o `TiltControls` | Escriben la entrada: botones multitáctiles, o inclinación con frenos laterales. |
| `useTiltOutput` | Crea el resultado de la inclinación, para que lo lean el modo de control y el panel. |
| `useBestLapRecord` | Lee el récord del circuito y guarda las vueltas que lo mejoran. |
| `useDrivingLoop` | Avanza la simulación (con las vueltas) en el hilo de UI y produce las transformaciones. Avisa a `useBestLapRecord` cuando mejora la mejor vuelta. |
| `DriveCanvas` | Dibuja pista y auto con Skia. |
| `LapHud` | HUD provisorio: vuelta, tiempo de la vuelta y mejor vuelta. |
| `DevPanel` | Solo en desarrollo: ajusta configuración en caliente y muestra lecturas. |

## Decisiones de diseño

- La pantalla solo compone: la entrada, la simulación y el dibujo son piezas independientes que se comunican por valores compartidos.
- **Rampa según el modo:** con inclinación, el loop recibe `withTiltSteering(drivingConfig, tiltConfig)`, con la rampa de dirección corta, porque la señal ya llega continua y filtrada. Con botones usa la rampa normal.
- **Dos orígenes para la inclinación:** la calibración, la sensibilidad y la zona muerta son del jugador y vienen de las preferencias guardadas; el filtro y la rampa son ajustes de desarrollo y viven en la pantalla. `withTiltPreferences` los junta.
- **El modo cambia en caliente:** si las preferencias cambian (por ejemplo, desde el panel), la pantalla monta el otro modo de control sin reiniciar la carrera.
- **Acciones del panel:**
  - El selector de modo guarda la preferencia.
  - Los sliders de sensibilidad y de zona muerta las guardan, porque son del jugador (las mismas que elige en la calibración). El filtro y la rampa quedan solo en la sesión.
  - "Recalibrar" toma el ángulo filtrado del momento (`calibrateTilt` sobre el resultado que publica `TiltControls`) y lo guarda.
  - "Calibración completa" navega a `/calibracion`.
- La configuración del manejo y de la cámara, y el circuito, son estado de la pantalla: arrancan en los valores por defecto y el panel de desarrollo las modifica (del circuito, solo el ancho). `useDrivingLoop` las aplica en caliente.
- **Un solo circuito por ahora:** hasta que exista la selección de pista (hito de pantallas), siempre es `DEFAULT_CIRCUIT`. Su `id` es la clave del récord.
- **"Reiniciar auto" del panel** también reinicia las vueltas: el auto vuelve a la largada, antes de la meta.
- El panel se carga con `require` detrás de `__DEV__`, para que Metro lo elimine del bundle de producción (ver el README de `DevPanel`).
- `useKeepAwake` evita que el celular apague la pantalla mientras se maneja sin tocar (la aceleración es automática).
