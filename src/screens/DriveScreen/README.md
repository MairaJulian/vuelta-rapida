# DriveScreen

Pantalla de manejo libre del hito 2: el auto acelera solo por el óvalo, se dobla y se frena con los botones, y la cámara lo sigue. Todavía sin límites de pista, vueltas ni tiempos.

## Props

Ninguna. Usa `DEFAULT_TRACK`, `DEFAULT_DRIVING_CONFIG` y `DEFAULT_CAMERA_CONFIG`, y toma el tamaño de `useWindowDimensions`.

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

## Decisiones de diseño

- La pantalla solo compone: la entrada, la simulación y el dibujo son piezas independientes que se comunican por valores compartidos.
- `useKeepAwake` evita que el celular apague la pantalla mientras se maneja sin tocar (la aceleración es automática).
- Reemplaza a `LoopTestScreen`, la pantalla de diagnóstico del hito 1.
