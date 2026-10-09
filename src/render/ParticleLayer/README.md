# ParticleLayer

Dibuja el polvo y el humo en coordenadas del mundo con un solo `Atlas` de Skia. Cada partícula es el círculo blanco de la textura de la escenografía, escalado a su tamaño y teñido con su color y su opacidad. Va debajo de los autos.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `particles` | `SharedValue<ParticleState>` | Partículas vivas (`useParticles`). |
| `image` | `SkImage \| null` | Textura de la escenografía (`useSceneryAtlas`). Sin ella no dibuja nada. |
| `maxParticles` | `number` (opcional) | Lugares reservados. Por defecto, los de `DEFAULT_PARTICLE_CONFIG` (48). |

## Ejemplo

```tsx
<Group transform={cameraTransform}>
  <TrackLayer track={track} />
  <ParticleLayer particles={particles} image={atlas} />
  <CarShape transform={carTransform} />
</Group>
```

## Decisiones de diseño

- **Un solo dibujo para todas:** `Atlas` con buffers de Skia (`useRSXformBuffer` y `useColorBuffer`), que se actualizan en el hilo de UI cuando cambian las partículas. Los lugares vacíos tienen tamaño 0.
- **Teñido con `modulate`:** el círculo blanco de la textura multiplicado por el color de la partícula. Así una sola imagen sirve para el polvo (tierra clara) y el humo (el blanco grisáceo del fondo de los menús del handoff).
- **Transparencia solo acá:** las partículas se desvanecen. El handoff pide no apilar capas translúcidas en la interfaz; aquí son pocas, chicas y duran menos de un segundo y medio.
- **Debajo del auto:** el humo queda detrás de las ruedas sin taparlo.
