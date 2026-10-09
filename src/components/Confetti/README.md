# Confetti

Lluvia de papelitos para celebrar un récord nuevo en los Resultados.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `width`, `height` | `number` | Área donde caen, en dp. |
| `pieces` | `number` | Cantidad de papelitos. Por defecto, 32. |
| `durationMs` | `number` | Duración de la caída. Por defecto, 2600 ms. |

También exporta `createConfettiPieces(count, seed?)`, que arma los papelitos.

## Ejemplo

```tsx
{results.newRecord ? <Confetti width={width} height={height} /> : null}
```

## Decisiones de diseño

- **Colores de la paleta del handoff:** lima (el color de los récords), azul, coral, tinta y blanco.
- **Una sola animación para todos:** un valor compartido va de 0 a 1 con `withTiming` y cada papelito calcula su posición con su demora, su vaivén y sus vueltas. Corre en el hilo de UI y React no vuelve a dibujar.
- **Siempre la misma lluvia:** los papelitos salen de `core/SeededRandom` con una semilla fija. No hace falta que varíe, y los tests son estables.
- **Cae una vez** y no recibe toques: los botones de los Resultados siguen respondiendo mientras cae.
- **Liviano:** 32 vistas chicas durante menos de 3 s, con la carrera ya terminada.
