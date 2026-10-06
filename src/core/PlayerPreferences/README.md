# PlayerPreferences

Preferencias del jugador que se guardan entre partidas: modo de control, calibración de la inclinación y sensibilidad. Aquí solo están los tipos, la validación y las reglas; el guardado lo hace el hook `usePlayerPreferences`. TypeScript puro.

## Tipos

- `ControlMode`: `'tilt' | 'buttons'`.
- `PlayerPreferences`: `{ controlMode, tiltNeutralAngle, tiltSensitivity }`.
  - `controlMode`: `null` hasta que el jugador elige.
  - `tiltNeutralAngle`: en radianes; `null` sin calibrar.
  - `tiltSensitivity`: de 1 a 10.
- `StartStep`: `'choose-control' | 'calibrate' | 'drive'`.

## API

| Exporta | Qué hace |
|---|---|
| `parsePlayerPreferences(raw)` | Lee el texto guardado. Cada campo inválido vuelve a su valor por defecto. |
| `serializePlayerPreferences(preferences)` | Texto para guardar, solo con los campos conocidos. |
| `getStartStep(preferences)` | Primer paso al abrir el juego. |
| `withTiltPreferences(config, preferences)` | Aplica la calibración y la sensibilidad guardadas a un `TiltConfig`. |
| `DEFAULT_PLAYER_PREFERENCES` | Sin elegir ni calibrar, sensibilidad 5. |
| `CONTROL_MODES` | Los modos válidos. |

## Ejemplo

```ts
const preferences = parsePlayerPreferences(Storage.getItemSync(KEY));
if (getStartStep(preferences) === 'calibrate') {
  // abrir la calibración
}
```

## Decisiones de diseño

- **Validación tolerante:** un JSON roto, un campo con un tipo inesperado o un valor fuera de rango no impiden arrancar. Ese campo vuelve a su valor por defecto y el resto se conserva. Sirve también si una versión futura cambia el formato.
- **`null` para "todavía no":** distingue "nunca eligió" o "nunca calibró" de un valor real. Así el flujo sabe cuándo mostrar la elección de control o la calibración.
- **El flujo de inicio es una regla pura** (`getStartStep`), testeable sin navegación.
- **Solo lo que elige el jugador:** la zona muerta, el filtro y la rampa son ajustes de desarrollo y no se guardan.
