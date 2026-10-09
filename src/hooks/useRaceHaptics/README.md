# useRaceHaptics

Conecta las vibraciones de la carrera (`haptics/RaceHaptics`) con la pantalla: cada evento del bus vibra con la intensidad de su momento, si el jugador tiene la vibración prendida. Al salir cancela lo pendiente.

## Parámetros

| Parámetro | Tipo | Descripción |
|---|---|---|
| `bus` | `EventBus<RaceEvent>` | Bus de la carrera. |
| `enabled` | `boolean` | Preferencia del jugador (`vibrationEnabled`). |
| `config` | `RaceHapticsConfig` | Intensidad de cada momento; en caliente. |
| `createHaptics` | `() => RaceHaptics` (opcional) | Crea las vibraciones. Por defecto, con `expo-haptics`. |

No devuelve nada.

## Ejemplo

```tsx
useRaceHaptics({ bus, enabled: preferences.vibrationEnabled, config: DEFAULT_RACE_HAPTICS });
```

## Decisiones de diseño

- **Sin vibración, sin suscripción:** con la preferencia apagada el hook no escucha el bus. Prenderla en la pausa vuelve a suscribirlo.
- **El freno va aparte:** la vibración del freno está en los controles (`brakeVibration`), porque sale del gesto en el hilo de UI y no de un evento de la carrera. La pantalla les pasa la misma preferencia.
- **En la pausa no vibra nada** porque la carrera no produce eventos mientras está congelada.
