# ControlChoiceScreen

Elección de control (pantalla 02 del handoff): inclinación o botones. La elección se guarda y se recuerda.

## Props

Ninguna. Lee y guarda las preferencias con `usePlayerPreferences` y navega con `useRouter`.

## Ejemplo

```tsx
// src/app/control.tsx
import { ControlChoiceScreen } from '@/screens/ControlChoiceScreen';

export default ControlChoiceScreen;
```

## Flujo

| Elección | Ya calibró | Va a |
|---|---|---|
| Inclinación | no | `/calibracion` (push: Volver regresa aquí) |
| Inclinación | sí | `/pista` |
| Botones | — | `/pista` |

## Decisiones de diseño

- **Textos del handoff:**
  - Inclinación: "Girá el celular como un volante. Frená con cualquier pulgar.", chip "Más real".
  - Botones: "Izquierda y derecha con el pulgar izquierdo, freno con el derecho.", chip "Más preciso".
  - Pie: "En los dos modos el auto acelera solo. Podés cambiarlo después desde la pausa."
- **Preselección:** la elección guardada o, la primera vez, inclinación (como en la captura del handoff).
- **"Paso 1 de 2" en lugar de "1 de 3":** la personalización del auto (paso 3 del handoff) todavía no existe.
- **Volver solo si hay a dónde volver:** la primera vez es la pantalla inicial.
- **El pie menciona la pausa,** que llega con la carrera. Mientras tanto, el modo se cambia desde el panel de desarrollo.
- Las tarjetas forman un `radiogroup` accesible.
