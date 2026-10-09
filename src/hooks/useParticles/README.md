# useParticles

Mueve las partículas de polvo y humo (`core/Particles`) en el hilo de UI, un cuadro a la vez, con la carrera, el auto y el freno. No dibuja nada: lo hace `ParticleLayer`.

## Parámetros

| Parámetro | Tipo | Descripción |
|---|---|---|
| `race` | `SharedValue<RaceState>` | Fase de la carrera y contacto con el borde (`useRaceLoop`). |
| `car` | `SharedValue<CarState>` | El auto a dibujar en el cuadro (`useRaceLoop`). |
| `input` | `SharedValue<DrivingInput>` | El freno. |
| `enabled` | `boolean` | Si hay partículas. Apagarlas borra las que había. |
| `config` | `ParticleConfig` (opcional) | Por defecto, `DEFAULT_PARTICLE_CONFIG`. |
| `seed` | `number` (opcional) | Semilla del azar. Por defecto, 1. |

## Devuelve

`SharedValue<ParticleState>`: las partículas vivas.

## Ejemplo

```tsx
const particles = useParticles({ race: loop.race, car: loop.car, input, enabled: true });

<ParticleLayer particles={particles} image={atlas} />
```

## Decisiones de diseño

- **En pausa se congelan:** no avanzan ni nacen; al seguir, continúan donde estaban.
- **Paso máximo de 50 ms:** tras un tirón de la pantalla, las partículas no saltan.
- **No toca el valor si no cambió nada:** sin partículas y sin emitir (una recta limpia), el valor compartido queda igual y la capa que las dibuja no recalcula.
- **Un `useFrameCallback` propio,** separado del de la carrera: las partículas son presentación y no forman parte de la simulación ni de su determinismo.
