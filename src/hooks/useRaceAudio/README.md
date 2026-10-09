# useRaceAudio

Conecta el sonido de la carrera (`audio/RaceAudio`) con la pantalla: lo crea al montar y lo cierra al salir, hace sonar el efecto de cada evento del bus, congela el audio en la pausa y en segundo plano, y respeta la preferencia de sonido del jugador.

## Parámetros

| Parámetro | Tipo | Descripción |
|---|---|---|
| `bus` | `EventBus<RaceEvent>` | Bus de la carrera. |
| `enabled` | `boolean` | Preferencia del jugador (`soundEnabled`). Sin sonido, todo queda en silencio. |
| `mix` | `RaceAudioMix` | Volúmenes y tono del motor; en caliente. |
| `createAudio` | `() => RaceAudio` (opcional) | Crea el sonido. Por defecto, con los WAV empaquetados. |

## Devuelve

| Valor | Descripción |
|---|---|
| `onEngine` | `(speedRatio) => void`, estable: va a `onEngine` de `useRaceLoop`. |

## Ejemplo

```tsx
const { onEngine } = useRaceAudio({ bus, enabled: preferences.soundEnabled, mix });
const loop = useRaceLoop({ ...params, onEvents: bus.emitAll, onEngine });
```

## Decisiones de diseño

- **Un sonido por pantalla:** se crea al montar y se cierra al desmontar (salir a Inicio libera el audio).
- **Pausa con `suspend`:** el aviso `phase` hacia `paused` congela el contexto entero (motor y efectos que estén sonando); al salir de la pausa, `resume`. Reiniciar desde la pausa también sale de ella.
- **Segundo plano aparte:** tras la llegada la carrera no se pausa, pero al pasar a segundo plano el audio igual se congela. Al volver se reanuda, salvo que la carrera haya quedado en pausa.
- **Silenciar no detiene:** sin sonido, el motor sigue corriendo en silencio; prenderlo de nuevo en la pausa no necesita volver a cargar nada.
- **El motor recibe la velocidad del loop** (`onEngine`, unas 20 veces por segundo), sin leer valores compartidos desde el hilo de JS.
- **Orden de los efectos:** primero se crea el sonido y después se aplican la preferencia y la mezcla, en efectos separados que también corren cuando cambian.
