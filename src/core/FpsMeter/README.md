# FpsMeter

Lectura de fps suavizada para el contador en pantalla.

## Parámetros

`smoothFps(previousFps, dtMs, smoothing = 0.1)`

| Parámetro     | Tipo     | Descripción                                                             |
| ------------- | -------- | ----------------------------------------------------------------------- |
| `previousFps` | `number` | Lectura anterior. `0` significa "sin muestras todavía".                 |
| `dtMs`        | `number` | Tiempo del último cuadro en ms. Con `dtMs <= 0` devuelve `previousFps`. |
| `smoothing`   | `number` | Peso de la muestra nueva (0 a 1). Por defecto `0.1`.                    |

## Ejemplo

```ts
import { smoothFps } from '@/core/FpsMeter';

let fps = 0;
fps = smoothFps(fps, 16.7); // ~59.9
```

## Decisiones de diseño

- Función pura en TypeScript, sin dependencias de React ni de Skia.
- Media móvil exponencial: el número se lee sin saltos y un cuadro lento aislado no lo desploma.
- `FpsMeter.types.ts` solo declara alias (`Milliseconds`, `FramesPerSecond`) para que las firmas expliquen las unidades.
