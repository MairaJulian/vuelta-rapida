# FeatureFlags

Interruptores de configuración: partes del juego que existen en el código pero se activan o no para el jugador. TypeScript puro.

## API

| Exporta | Qué hace |
|---|---|
| `FEATURE_FLAGS` | Valores de los interruptores, congelados. Se cambian en `FeatureFlags.ts`. |
| `FeatureFlags` (tipo) | Lista de interruptores. |

## Interruptores

| Interruptor | Valor | Efecto |
|---|---|---|
| `tiltControl` | `false` | Control por inclinación para el jugador. Desactivado: el juego arranca directo con botones, sin elección de control ni calibración. La inclinación sigue disponible desde el panel de desarrollo. |

## Ejemplo

```tsx
import { FEATURE_FLAGS } from '@/core/FeatureFlags';

export function StartScreen({ tiltEnabled = FEATURE_FLAGS.tiltControl }: StartScreenProps) {
  // ...
}
```

## Decisiones de diseño

- **Constante en el código, no variable de entorno:** activar la inclinación es una decisión de producto que pasa por un PR, no un ajuste por compilación.
- **Se lee en un solo lugar** (`StartScreen`), que lo pasa como parámetro a las reglas puras (`getStartStep`, `isControlModeAvailable`). Así los tests prueban los dos estados sin simular el módulo.
- **`tiltControl` desactivado:** en dos pruebas con usuarios (la segunda con la inclinación corregida) los testers prefirieron los botones. Se reevalúa en la fase 3D, con la cámara detrás del auto. El código, las pantallas y los tests de la inclinación siguen en el proyecto.
- **Para activarla:** `tiltControl: true` en `FeatureFlags.ts`. Vuelven la elección de control y la calibración al abrir el juego.
