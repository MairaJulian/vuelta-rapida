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

Hoy la inclinación está desactivada para el jugador (`FEATURE_FLAGS.tiltControl`): el juego arranca directo con botones y esta pantalla no se muestra. Queda en el proyecto, con sus tests, para cuando se reevalúe la inclinación (fase 3D). Con la inclinación activada:

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
- **Sin modo por defecto** (cambio tras la primera prueba con usuarios): la primera vez no hay ninguna tarjeta marcada y Seguir queda desactivado hasta que el jugador elige. Antes se proponía inclinación, como en la captura del handoff. Las dos opciones se muestran siempre; no hay ningún interruptor que oculte la inclinación. Si ya hay una elección guardada, aparece marcada.
- **"Paso 1 de 2" en lugar de "1 de 3":** la personalización del auto (paso 3 del handoff) todavía no existe.
- **Volver solo si hay a dónde volver:** la primera vez es la pantalla inicial.
- **El pie menciona la pausa,** que llega con la carrera. Mientras tanto, el modo se cambia desde el panel de desarrollo.
- Las tarjetas forman un `radiogroup` accesible.
