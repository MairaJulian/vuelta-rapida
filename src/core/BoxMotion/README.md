# BoxMotion

Movimiento de un rectángulo que rebota entre los bordes de un área. Solo existe para la pantalla de prueba del loop de juego (hito 1); no es jugabilidad.

## Parámetros

`advanceBoxMotion(state, dtMs, config)`

| Parámetro | Tipo              | Descripción                                                                       |
| --------- | ----------------- | --------------------------------------------------------------------------------- |
| `state`   | `BoxMotionState`  | `x` (px) y `direction` (`1` derecha, `-1` izquierda).                             |
| `dtMs`    | `number`          | Tiempo desde el cuadro anterior, en ms. Con `dtMs <= 0` devuelve el mismo estado. |
| `config`  | `BoxMotionConfig` | `speed` (px/s), `boxWidth` y `areaWidth` (px).                                    |

Devuelve un `BoxMotionState` nuevo.

## Ejemplo

```ts
import { advanceBoxMotion } from '@/core/BoxMotion';

const next = advanceBoxMotion({ x: 0, direction: 1 }, 16, {
  speed: 300,
  boxWidth: 40,
  areaWidth: 800,
});
```

## Decisiones de diseño

- TypeScript puro: no importa React, React Native, Skia ni Reanimated (regla de arquitectura del proyecto).
- Lleva la directiva `'worklet'` para poder llamarse desde `useFrameCallback`. Es un string literal, no una dependencia.
- Al rebotar refleja el exceso en vez de recortarlo, así la velocidad media no depende del tamaño del `dt`.
- El resultado siempre queda dentro de `[0, areaWidth - boxWidth]`.
