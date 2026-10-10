# Circuits

Los circuitos del juego como datos: puntos de control por donde pasa la pista, suavizados con una curva Catmull-Rom. TypeScript puro.

## Tipos

- `CircuitDefinition`: `{ id, name, difficulty, controlPoints, width, checkpointFractions, scenery }`.
  - `id`: identificador estable, es la clave del récord guardado. No cambiarlo.
  - `name`: nombre inventado (nada de circuitos, marcas ni nombres reales).
  - `difficulty`: `'facil' | 'media' | 'dificil'` (`CircuitDifficulty`); la muestra la selección de pista.
  - `controlPoints`: en metros y en el sentido de la carrera; el primero es la meta.
  - `checkpointFractions`: puntos de control intermedios como fracción de la vuelta.
  - `scenery`: semilla y densidad de árboles de la escenografía (`ScenerySpec`, de `core/Scenery`).

## API

| Exporta                                                            | Qué hace                                                                                                                           |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `buildCircuit(definition)`                                         | Suaviza los puntos (Catmull-Rom centrípeta cerrada), remuestrea cada `TRACK_SPACING` metros y arma el `Circuit`, sin escenografía. |
| `withCircuitScenery(circuit)`                                      | El circuito con su escenografía, generada con la `scenery` de su definición (buscada por `id`; sin definición, la de por defecto). |
| `AUTODROMO_DEL_LAGO`, `GRAN_MESETA`, `LAS_SIERRAS`, `PUERTO_VIEJO` | Las definiciones (ver abajo). Las tres últimas viven en `Circuits.definitions.ts`.                                                 |
| `CIRCUIT_DEFINITIONS`                                              | Todos los circuitos, en el orden de la selección de pista.                                                                         |
| `DEFAULT_CIRCUIT`                                                  | El primer circuito, ya armado: el que se usa si no se eligió otro.                                                                 |
| `CIRCUITS`                                                         | Todos los circuitos ya armados, en el orden de la selección de pista.                                                              |
| `getCircuit(id)`                                                   | El circuito con ese id (el de la ruta `/pista?circuito=…`); si no existe, el primero.                                              |
| `getCircuitDifficulty(circuit)`                                    | La dificultad de la definición con ese `id` (sin definición, `'media'`).                                                           |
| `getCircuitSummary(circuit)`                                       | "3,1 km · 7 curvas", para la tarjeta de la selección de pista.                                                                     |
| `TRACK_SPACING`                                                    | Distancia entre puntos del trazado: 2 m.                                                                                           |

## Ejemplo

```ts
const circuit = buildCircuit({
  id: 'mi-circuito',
  name: 'Mi circuito',
  width: 14,
  checkpointFractions: [1 / 3, 2 / 3],
  scenery: { seed: 3, treeDensity: 1 },
  controlPoints: [
    { x: 0, z: 0 },
    { x: 200, z: 0 },
    { x: 260, z: 80 } /* ... */,
  ],
});

// En la pantalla de carrera, con árboles, carteles y tribuna:
const raceCircuit = withCircuitScenery(DEFAULT_CIRCUIT);
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

## Las pistas

| Pista              | Estilo                                                                    | Largo  | Ancho | Dificultad |
| ------------------ | ------------------------------------------------------------------------- | ------ | ----- | ---------- |
| Autódromo del Lago | Rápida (ver arriba)                                                       | 2,4 km | 14 m  | Fácil      |
| Gran Meseta        | Rápida: rectas largas, barridos amplios y una horquilla de frenada fuerte | 2,8 km | 14 m  | Media      |
| Las Sierras        | Técnica: once curvas cerradas y cambios de dirección                      | 1,9 km | 11 m  | Difícil    |
| Puerto Viejo       | Urbana: trece curvas encadenadas, la más angosta                          | 1,4 km | 9 m   | Difícil    |

- **Orden de la selección:** de la más fácil a la más difícil, el de `CIRCUIT_DEFINITIONS`.
- **Nombres del handoff:** Las Sierras y Puerto Viejo salen de las fichas de la pantalla 05 (con su carácter técnico y callejero). Puerto Viejo usa además la silueta en escalera del handoff.
- **Cómo se diseñaron:** con esquinas redondeadas (vértice y radio), guardadas como los puntos que resultan. No hay herramienta en el repositorio: el test de `Circuits.test.ts` es la red de seguridad al cambiar un trazado.
- **Sumar una pista:** agregar su definición a `CIRCUIT_DEFINITIONS`. El test parametrizado la valida sola (cerrada, sin cruces, tramos separados, curvas posibles, pianos, largada sobre el asfalto y escenografía fuera de la pista). Una pista más angosta usa curvas más cerradas: `validateCircuit` calcula el radio mínimo según su ancho.

## Decisiones de diseño

- **Puntos de control y no la polilínea entera:** un circuito se describe con unas decenas de puntos por donde pasa la pista. La Catmull-Rom pasa por todos ellos, y la variante centrípeta no hace rulos aunque los puntos estén despares (muchos juntos en la horquilla, pocos en las rectas).
- **Trazado remuestreado cada 2 m:** puntos parejos para la curvatura de los pianos y para el progreso. El punto 0 es exactamente el primer punto de control: la meta.
- **Se arma al cargar el módulo** (unos pocos milisegundos) y no se valida en tiempo de ejecución: la validación completa es cara y la corren los tests para cada circuito de `CIRCUIT_DEFINITIONS`.
- **La escenografía se genera al abrir la carrera, no al cargar el módulo:** son unos cientos de milisegundos en un celular de gama media (sin JIT), y el módulo se carga al iniciar la app (lo importa Inicio para el nombre y el récord). La pantalla de carrera llama a `withCircuitScenery` apenas se monta, durante la transición. La semilla vive en la definición, así que la escenografía sigue siendo un dato del circuito: siempre la misma.
- **Silueta del handoff, curvas más cerradas:** con el modelo de manejo actual el auto dobla muy cerrado aun a velocidad, y el trazado del handoff tal cual se tomaba entero a fondo. Se agregó la chicana y se cerró la horquilla para que haya dos frenadas, sin cambiar la silueta del minimapa.
- **Escala elegida por el tiempo de vuelta,** no por el largo de la ficha (5,8 km): con 11 m por unidad, la vuelta ideal ronda la del récord del handoff.
