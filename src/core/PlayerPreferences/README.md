# PlayerPreferences

Preferencias que se guardan entre partidas: modo de control, calibración de la inclinación, sensibilidad, zona muerta, sonido y vibración. Son del celular y las comparten todos los perfiles; los récords están en los perfiles (`core/Profiles`). Aquí solo están los tipos, la validación y las reglas; el guardado lo hace el hook `usePlayerPreferences`. TypeScript puro.

## Tipos

- `ControlMode`: `'tilt' | 'buttons'`.
- `PlayerPreferences`: `{ controlMode, tiltNeutralAngle, tiltSensitivity, tiltDeadZone, soundEnabled, vibrationEnabled }`.
  - `controlMode`: `null` hasta que el jugador elige.
  - `tiltNeutralAngle`: en radianes; `null` sin calibrar.
  - `tiltSensitivity`: de 1 a 10.
  - `tiltDeadZone`: en radianes, de 1° a 9°. Inicial, 5°.
  - `soundEnabled` y `vibrationEnabled`: si suenan el motor y los efectos, y si vibra el celular (también con el freno). Inicial, los dos prendidos. Se cambian desde la pausa.
- `StartStep`: `'choose-control' | 'calibrate' | 'drive'`.

## API

| Exporta | Qué hace |
|---|---|
| `parsePlayerPreferences(raw)` | Lee el texto guardado (ya migrado). Cada campo inválido vuelve a su valor por defecto. |
| `serializePlayerPreferences(preferences)` | Texto para guardar, con el número de versión y solo los campos conocidos. |
| `getStartStep(preferences, tiltEnabled = true)` | Primer paso al abrir el juego. Con la inclinación desactivada, siempre `'drive'`. |
| `isControlModeAvailable(mode, tiltEnabled)` | Si un modo guardado se puede usar al abrir el juego: con la inclinación desactivada, `'tilt'` no. |
| `withTiltPreferences(config, preferences)` | Aplica la calibración, la sensibilidad y la zona muerta guardadas a un `TiltConfig`. |
| `deadZoneFromLevel(level)`, `deadZoneToLevel(deadZone)` | Escala del jugador para la zona muerta: niveles 1 a 5 ↔ 1°, 3°, 5°, 7° y 9°. |
| `DEAD_ZONE_LEVELS` | Cantidad de niveles de la zona muerta (5). |
| `DEFAULT_PLAYER_PREFERENCES` | Sin elegir ni calibrar, sensibilidad 5, zona muerta de 5° (nivel 3). |
| `CONTROL_MODES` | Los modos válidos. |

## Ejemplo

```ts
const preferences = parsePlayerPreferences(readSaveDocument('preferences'));
if (getStartStep(preferences) === 'calibrate') {
  // abrir la calibración
}
```

## Decisiones de diseño

- **Validación tolerante:** un JSON roto, un campo con un tipo inesperado o un valor fuera de rango no impiden arrancar. Ese campo vuelve a su valor por defecto y el resto se conserva. Sirve también si una versión futura cambia el formato.
- **`null` para "todavía no":** distingue "nunca eligió" o "nunca calibró" de un valor real. Así el flujo sabe cuándo mostrar la elección de control o la calibración.
- **El flujo de inicio es una regla pura** (`getStartStep`), testeable sin navegación.
- **El interruptor de la inclinación llega como parámetro** (`tiltEnabled`), no se importa aquí: lo lee `StartScreen` de `FEATURE_FLAGS.tiltControl`. `getStartStep` lo tiene activado por defecto, que es la regla completa con los dos modos.
- **Solo lo que elige el jugador:** el filtro y la rampa son ajustes de desarrollo y no se guardan.
- **Versionado** (hito 6a): el texto guardado lleva `version` (`core/SaveData`). Los récords (`bestLapsMs`) estaban aquí hasta la versión 1; la migración a la 2 los pasa a los perfiles. Al leer, el número de versión y los campos viejos se ignoran.
- **Del celular, no del jugador:** la calibración depende de cómo se sostiene este celular, y el sonido y la vibración son del aparato. Los perfiles solo tienen lo que identifica a cada chico.
- **Zona muerta en grados, escala en niveles** (cambio tras la primera prueba con usuarios): se guarda el ángulo, porque es lo que usa el cálculo y lo que ajusta el panel de desarrollo con más detalle. El jugador la ve como 5 niveles parejos, de "Chica" a "Grande". Las preferencias guardadas antes de este cambio arrancan con la zona muerta inicial.
