# RaceResults

Resultados de la carrera (pantalla 09 del handoff). A la izquierda, la tarjeta con la mejor vuelta, el total y la comparación con el récord. A la derecha, cada vuelta con su tiempo y los botones "Otra vez" y "Salir".

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `results` | `RaceResults` (de `core/RaceFlow`) | Total, vueltas, mejor vuelta y récord, en pasos. |
| `stepHz` | `number` | Pasos por segundo, para pasarlos a tiempo. |
| `circuitName` | `string` | Nombre del circuito. |
| `driver` | `{ name, number } \| null` (opcional) | Quién corrió: encabeza la columna de vueltas ("MALE · #27"). Sin piloto, "Tus vueltas". |
| `onRetry` | `() => void` | "Otra vez": carrera nueva. |
| `onExit` | `() => void` | "Salir": vuelve a Inicio. |

También exporta `getRaceResultsTexts(results, stepHz, circuitName)`, que arma todos los textos.

## Ejemplo

```tsx
const results = getRaceResults(loop.race.get());
{results ? (
  <RaceResults results={results} stepHz={60} circuitName={track.name} onRetry={restart} onExit={exit} />
) : null}
```

## Diseño (handoff, pantalla 09)

- **Tarjeta** a la izquierda: margen 14, 390 de ancho, radio 24, padding 26/28.
  - Con récord nuevo: fondo `lime`, trofeo, "¡Nuevo récord!" y un recorte a cuadros tinta y lima en la esquina superior derecha.
  - Sin récord: fondo blanco y "Tu tiempo".
  - El tiempo grande es la **mejor vuelta**. Debajo, el **total de la carrera**.
  - Píldora abajo: el delta contra el récord. Con récord nuevo, tinta con el delta en lima ("−0.578 vs. récord anterior"); sin récord, `delta-slower-soft` con el delta en rojo ("+0.236 vs. tu récord").
- **Columna derecha** (x = 428): una fila blanca por vuelta (radio 16) con "Vuelta N", el tiempo en 800/22 y un chip. La mejor tiene fondo `blue-soft` y chip `blue` "Mejor"; las demás, un chip con lo que perdieron ("+1.312").
- **Botones:** "Otra vez" (primario, con ícono de reiniciar) y "Salir" (secundario), de 52 de alto.

## Decisiones de diseño

- **El número grande es la mejor vuelta:** el récord se guarda por vuelta, y eso es lo que se celebra. El total de la carrera va debajo, más chico. Lo pidió el hito 5 y el handoff no lo tenía.
- **Delta contra el récord anterior, no contra el fantasma:** el fantasma todavía no existe. La primera carrera en un circuito dice "Primer récord".
- **"Salir" en lugar de "Elegir pista":** todavía hay un solo circuito. Sale a Inicio.
- **Celebración:** con récord nuevo, además de la tarjeta lima, caen papelitos (`Confetti`) y suena el jingle de llegada.
- **"NOMBRE · #NN" del perfil activo** encabeza la columna de vueltas (hito 6a), en mayúsculas como el resto de los rótulos. Sin perfil (una ruta directa de desarrollo), dice "Tus vueltas".
- **Tiempo grande en 76 con la fuente del sistema** (el handoff usa 96 con Archivo angosta), con `adjustsFontSizeToFit` por si no entra.
- **Las vueltas en un `ScrollView`:** con más de 3 vueltas (se pueden elegir en el panel de desarrollo) no entran en 360 dp de alto.
- Se dibuja sobre la carrera, que sigue montada abajo: "Otra vez" larga al instante, sin volver a cargar la pista.
