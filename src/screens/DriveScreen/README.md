# DriveScreen

Pantalla de manejo libre del hito 2: el auto acelera solo por el óvalo, se dobla y se frena con los botones, y la cámara lo sigue. Todavía sin límites de pista, vueltas ni tiempos.

## Props

Ninguna. Usa `DEFAULT_TRACK`, arranca con `DEFAULT_DRIVING_CONFIG` y `DEFAULT_CAMERA_CONFIG`, y toma el tamaño de `useWindowDimensions`.

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
| `ButtonControls` | Escribe la entrada (botones multitáctiles). |
| `useDrivingLoop` | Avanza la simulación en el hilo de UI y produce las transformaciones. |
| `DriveCanvas` | Dibuja pista y auto con Skia. |
| `DevPanel` | Solo en desarrollo: ajusta `drivingConfig` y `cameraConfig` en caliente y muestra lecturas. |

## Decisiones de diseño

- La pantalla solo compone: la entrada, la simulación y el dibujo son piezas independientes que se comunican por valores compartidos.
- La configuración del manejo y de la cámara es estado de la pantalla: arranca en los valores por defecto y el panel de desarrollo la modifica. `useDrivingLoop` la aplica en caliente.
- El panel se carga con `require` detrás de `__DEV__`, para que Metro lo elimine del bundle de producción (ver el README de `DevPanel`).
- `useKeepAwake` evita que el celular apague la pantalla mientras se maneja sin tocar (la aceleración es automática).
- Reemplaza a `LoopTestScreen`, la pantalla de diagnóstico del hito 1.
