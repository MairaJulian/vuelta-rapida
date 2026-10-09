# EventBus

Bus de eventos tipado y genérico. TypeScript puro: el resto de la app (sonido, vibración, pantallas) escucha lo que pasa en la carrera sin que la carrera sepa quién escucha.

## API

`createEventBus<E>()`, donde `E` es una unión discriminada por `type`. Devuelve:

| Método | Qué hace |
|---|---|
| `on(type, listener)` | Escucha un tipo. El evento llega con su tipo exacto. Devuelve la función para dejar de escuchar. |
| `onAny(listener)` | Escucha todos los eventos. |
| `emit(event)` / `emitAll(events)` | Avisa uno o varios eventos, en orden. |
| `listenerCount()` | Suscripciones activas. |

## Ejemplo

```ts
const bus = createEventBus<RaceEvent>();
const off = bus.on('lapCompleted', (event) => console.log(event.lap, event.lapTicks));
bus.emitAll(events); // los eventos de la carrera de este cuadro
off();
```

## Decisiones de diseño

- **Sin dependencias ni estado global:** cada pantalla de carrera crea su bus. Al salir, los escuchas se desuscriben y no queda nada vivo.
- **Corre en el hilo de JS.** La simulación (hilo de UI) junta los eventos en su estado y el loop los manda al bus con `scheduleOnRN`, solo en los cuadros que tienen alguno.
- **Orden de suscripción:** los escuchas se llaman en el orden en que se suscribieron, siempre igual.
- **Un fallo no corta a los demás:** si el sonido tira un error, la vibración y las pantallas igual reciben el evento. El primer error se relanza al final, para que no quede escondido.
- **Suscribirse durante un aviso** vale desde el evento siguiente: se recorre una copia de la lista.
