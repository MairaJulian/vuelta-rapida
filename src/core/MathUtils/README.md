# MathUtils

Funciones matemáticas puras que comparten el modelo de manejo, la simulación y la cámara.

## Funciones

| Función | Qué hace |
|---|---|
| `clamp(value, min, max)` | Limita un valor a un rango. |
| `lerp(from, to, t)` | Interpolación lineal. |
| `wrapAngle(angle)` | Normaliza un ángulo en radianes a (-π, π]. |
| `lerpAngle(from, to, t)` | Interpola ángulos por el arco más corto. |

## Ejemplo

```ts
import { lerpAngle, wrapAngle } from '@/core/MathUtils';

const heading = wrapAngle(previous + yawRate * dt);
const drawn = lerpAngle(previousHeading, heading, alpha);
```

## Decisiones de diseño

- Todas llevan la directiva `'worklet'` porque se llaman desde el loop en el hilo de UI. Es un texto, no un import: el módulo sigue siendo TypeScript puro.
- `wrapAngle` mantiene el rumbo acotado para que el estado serializado no crezca sin límite tras muchas vueltas.
- `lerpAngle` evita que el auto "gire 360°" en pantalla al interpolar entre -179° y 179°.
