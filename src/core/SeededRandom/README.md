# SeededRandom

Números al azar reproducibles: con la misma semilla, la misma secuencia. TypeScript puro y worklets.

## API

| Función | Qué hace |
|---|---|
| `createRandomState(seed)` | Estado inicial. Se queda con los 32 bits bajos de la semilla; una semilla inválida cuenta como 0. |
| `nextRandom(state)` | `{ value, state }`: un número en [0, 1) y el estado para el siguiente. |
| `nextRandomBetween(state, min, max)` | Igual, en [min, max). |

## Ejemplo

```ts
const first = nextRandomBetween(createRandomState(seed), 0.5, 1.5);
const delaySeconds = first.value;
const second = nextRandom(first.state); // el siguiente de la misma secuencia
```

## Decisiones de diseño

- **mulberry32:** corto, rápido y con buena distribución para un juego. No sirve para criptografía, ni hace falta.
- **Estado explícito, sin clase ni variable global:** el estado es un número que va dentro del estado de la carrera. Así la carrera sigue siendo serializable y una semilla la reproduce entera (la espera del semáforo, y más adelante lo que haga falta).
- `Math.imul` y los desplazamientos sin signo (`>>>`) dan los mismos resultados en Hermes, en el hilo de UI y en Node (Jest).
