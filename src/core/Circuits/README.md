# Circuits

Los circuitos del juego como datos: puntos de control por donde pasa la pista, suavizados con una curva Catmull-Rom. TypeScript puro.

## Tipos

- `CircuitDefinition`: `{ id, name, controlPoints, width, checkpointFractions }`.
  - `id`: identificador estable, es la clave del récord guardado. No cambiarlo.
  - `name`: nombre inventado (nada de circuitos, marcas ni nombres reales).
  - `controlPoints`: en metros y en el sentido de la carrera; el primero es la meta.
  - `checkpointFractions`: puntos de control intermedios como fracción de la vuelta.

## API

| Exporta | Qué hace |
|---|---|
| `buildCircuit(definition)` | Suaviza los puntos (Catmull-Rom centrípeta cerrada), remuestrea cada `TRACK_SPACING` metros y arma el `Circuit`. |
| `AUTODROMO_DEL_LAGO` | El primer circuito (ver abajo). |
| `CIRCUIT_DEFINITIONS` | Todos los circuitos, en el orden de la selección de pista. |
| `DEFAULT_CIRCUIT` | El circuito con el que arranca el juego, ya armado. |
| `TRACK_SPACING` | Distancia entre puntos del trazado: 2 m. |

## Ejemplo

```ts
const circuit = buildCircuit({
  id: 'mi-circuito',
  name: 'Mi circuito',
  width: 14,
  checkpointFractions: [1 / 3, 2 / 3],
  controlPoints: [{ x: 0, z: 0 }, { x: 200, z: 0 }, { x: 260, z: 80 } /* ... */],
});
```

## Autódromo del Lago

Es el circuito del handoff (pantallas 05, 07 y 08) y su minimapa. Datos: unos 2,4 km, antihorario y 14 m de ancho.

- **Puntos de control:** salen del trazado del handoff (viewBox 100 × 60) a 11 m por unidad, centrados en el origen. La meta está donde la marca el handoff, sobre la recta principal, mirando hacia +x.
- **Carácter de circuito rápido**, como su ficha del handoff ("Rápido · 5,8 km · 11 curvas"):
  1. Chicana derecha-izquierda al final de la recta principal: frenada fuerte, radio de unos 12 m.
  2. Curva rápida a la izquierda.
  3. Curva de arriba a la derecha, rápida.
  4. Horquilla del centro, a la derecha: la más cerrada (unos 14 m de radio).
  5. Curva de arriba a la izquierda.
  6. Curva larga que desemboca en la recta principal.
- **Vuelta ideal estimada en alrededor de 1:09** con el modelo de manejo actual. El récord del handoff es 1:12,480.
- **Puntos de control intermedios** en los tercios de la vuelta.

## Decisiones de diseño

- **Puntos de control y no la polilínea entera:** un circuito se describe con unas decenas de puntos por donde pasa la pista. La Catmull-Rom pasa por todos ellos, y la variante centrípeta no hace rulos aunque los puntos estén despares (muchos juntos en la horquilla, pocos en las rectas).
- **Trazado remuestreado cada 2 m:** puntos parejos para la curvatura de los pianos y para el progreso. El punto 0 es exactamente el primer punto de control: la meta.
- **Se arma al cargar el módulo** (unos pocos milisegundos) y no se valida en tiempo de ejecución: la validación completa es cara y la corren los tests para cada circuito de `CIRCUIT_DEFINITIONS`.
- **Silueta del handoff, curvas más cerradas:** con el modelo de manejo actual el auto dobla muy cerrado aun a velocidad, y el trazado del handoff tal cual se tomaba entero a fondo. Se agregó la chicana y se cerró la horquilla para que haya dos frenadas, sin cambiar la silueta del minimapa.
- **Escala elegida por el tiempo de vuelta,** no por el largo de la ficha (5,8 km): con 11 m por unidad, la vuelta ideal ronda la del récord del handoff.
