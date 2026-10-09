# RaceHaptics

Las vibraciones de la carrera sobre `expo-haptics`: qué momento vibra (piano, borde, largada, llegada) y con qué intensidad.

## API

| Exportación | Descripción |
|---|---|
| `createRaceHaptics({ impact? })` | Arma las vibraciones. `impact` reemplaza a `expo-haptics` en los tests. |
| `getHapticLevel(event, config)` | Intensidad con la que vibra un evento; `null` si no vibra o está apagado. |
| `DEFAULT_RACE_HAPTICS` | Piano Leve, borde Fuerte, largada Media, llegada Doble. |
| `HAPTIC_LEVELS` | Las cinco intensidades en orden, con su nombre para el panel. |
| `DOUBLE_GAP_MS` | 140 ms entre los dos golpes de Doble. |

`RaceHaptics`:

| Método | Descripción |
|---|---|
| `pulse(level)` | Vibra: `light`, `medium` o `heavy` son un golpe; `double`, dos golpes fuertes; `off`, nada. |
| `close()` | Cancela el segundo golpe pendiente. Después no vibra nada más. |

## Qué vibra

| Evento | Momento | Intensidad inicial |
|---|---|---|
| `kerbEnter` | `kerb` | Leve |
| `borderHit` | `border` | Fuerte |
| `lightsOut` | `start` | Media |
| `finish` | `finish` | Doble |

Las luces del semáforo, las vueltas y los cambios de estado no vibran. El freno vibra aparte, en los controles (`vibrateOnBrake` de `input/InputControls`).

## Ejemplo

```ts
const haptics = createRaceHaptics();
bus.onAny((event) => {
  const level = getHapticLevel(event, DEFAULT_RACE_HAPTICS);
  if (level) haptics.pulse(level);
});
```

En la app lo usa `useRaceHaptics`, que además respeta la preferencia de vibración.

## Decisiones de diseño

- **Intensidad por momento, no por fuerza del golpe:** cada momento tiene una intensidad fija, que se elige en el panel de desarrollo. Un piano no tiene que sacudir el celular como un choque.
- **Doble con un temporizador:** `expo-haptics` no tiene un "doble golpe". Son dos `impactAsync` fuertes a 140 ms; `close()` cancela el segundo si se sale de la pantalla.
- **Sin errores:** algunos equipos no tienen motor de vibración; la promesa de `expo-haptics` queda en silencio.
- **Lógica sin vibración:** `getHapticLevel` es pura y se prueba sin el módulo nativo.
