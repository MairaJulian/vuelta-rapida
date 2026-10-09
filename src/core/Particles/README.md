# Particles

Partículas leves de polvo y humo: cuándo nacen, cómo se mueven y cómo se ven. TypeScript puro y worklets; las mueve `useParticles` en el hilo de UI y las dibuja `ParticleLayer`.

## Tipos

- `Particle`: `{ kind, x, z, vx, vz, age, life, size, growth }`.
- `ParticleKind`: `dust` (polvo) o `smoke` (humo).
- `ParticleState`: `{ particles, random, dustDebt, smokeDebt, nextWheel }`. Serializable.
- `ParticleEmitter`: `{ car, touching, brake, active }`, lo que pasa con el auto en el cuadro.
- `ParticleConfig`: máximo, cantidad por segundo, umbrales, vida, tamaño y frenado.
- `ParticleLook`: `{ size, alpha }`.

## API

| Exporta | Qué hace |
|---|---|
| `createParticleState(seed)` | Estado sin partículas. Worklet. |
| `stepParticles(state, emitter, dt, config?)` | Mueve, envejece y descarta las partículas, y suma las nuevas. Si no hay nada que hacer, devuelve el mismo estado. Worklet. |
| `getEmission(emitter, config)` | Cuánto polvo y cuánto humo, de 0 a 1. Worklet. |
| `getParticleLook(particle)` | Tamaño y opacidad según la edad. Worklet. |
| `DEFAULT_PARTICLE_CONFIG` | 48 partículas como máximo; 40 de polvo y 30 de humo por segundo a pleno. |

## Ejemplo

```ts
let state = createParticleState(1);
// En cada cuadro:
state = stepParticles(state, { car, touching: contact.touching, brake: input.brake, active: true }, dt);
for (const particle of state.particles) {
  const { size, alpha } = getParticleLook(particle);
}
```

## Cuándo nacen

- **Polvo al rozar el borde:** el auto no puede salir del asfalto (el límite está en el borde, o en el piano en las curvas), así que nunca pisa el pasto. Cuando toca el borde, las ruedas de ese lado están sobre la línea blanca: ahí se levanta polvo, más cuanto más rápido va.
- **Humo al derrapar:** desde 2,5 m/s de velocidad lateral, y a pleno con 7 m/s.
- **Humo al frenar fuerte:** con el freno a más del 60 % y a más de 15 m/s.
- Solo con la carrera en marcha o terminada: nada en la grilla ni con el semáforo.

## Decisiones de diseño

- **Un máximo fijo de 48:** la capa reserva ese lugar y nunca crece. Lo que no entra se descarta, sin acumular deuda para después.
- **Salen de las ruedas traseras, por turno:** una de cada lado, con un poco de la velocidad del auto y un empujón al azar. El polvo sale despedido hacia el costado; el humo casi no se mueve y queda atrás, marcando la trayectoria.
- **Crecen y se desvanecen:** la opacidad baja con el cuadrado del tiempo de vida, así se van suave.
- **Determinista:** el azar va en el estado (`SeededRandom`). No hace falta para el juego, pero hace que los tests sean exactos.
- **Mismo estado si no pasa nada:** `useParticles` no toca el valor compartido y la capa no trabaja en las rectas sin derrape.
