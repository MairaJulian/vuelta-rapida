# DriveScreen

Pantalla de manejo libre: el auto acelera solo por el óvalo y se maneja con botones o inclinando el celular. Frena y da marcha atrás, no puede salir de la pista y la cámara lo sigue con anticipación. Todavía sin vueltas ni tiempos.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `controlMode` | `InputMode` (opcional) | `'buttons'` (por defecto) o `'tilt'`. |

Usa `DEFAULT_TRACK`, arranca con `DEFAULT_DRIVING_CONFIG`, `DEFAULT_CAMERA_CONFIG` y `DEFAULT_TILT_CONFIG`, y toma el tamaño de `useWindowDimensions`.

## Ejemplo

```tsx
// src/app/index.tsx
import { DriveScreen } from '@/screens/DriveScreen';

export default DriveScreen;
```

## Composición

| Pieza | Rol |
|---|---|
| `useDrivingInput` | Crea la entrada compartida. |
| `ButtonControls` o `TiltControls` | Escriben la entrada: botones multitáctiles, o inclinación con frenos laterales. |
| `useTiltOutput` | Crea el resultado de la inclinación, para que lo lean el modo de control y el panel. |
| `useDrivingLoop` | Avanza la simulación en el hilo de UI y produce las transformaciones. |
| `DriveCanvas` | Dibuja pista y auto con Skia. |
| `DevPanel` | Solo en desarrollo: ajusta configuración en caliente y muestra lecturas. |

## Decisiones de diseño

- La pantalla solo compone: la entrada, la simulación y el dibujo son piezas independientes que se comunican por valores compartidos.
- **Rampa según el modo:** con inclinación, el loop recibe `withTiltSteering(drivingConfig, tiltConfig)`, con la rampa de dirección corta, porque la señal ya llega continua y filtrada. Con botones usa la rampa normal.
- La configuración del manejo, de la cámara y de la inclinación, y la pista, son estado de la pantalla: arrancan en los valores por defecto y el panel de desarrollo las modifica (de la pista, solo el ancho). `useDrivingLoop` las aplica en caliente.
- El panel se carga con `require` detrás de `__DEV__`, para que Metro lo elimine del bundle de producción (ver el README de `DevPanel`).
- `useKeepAwake` evita que el celular apague la pantalla mientras se maneja sin tocar (la aceleración es automática).
