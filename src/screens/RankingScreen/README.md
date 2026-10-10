# RankingScreen

Ranking por pista (hito 6b): una torre de tiempos con los jugadores del celular. Se abre desde Inicio con el botón del trofeo.

## Props

Ninguna. La ruta `/ranking` abre la primera pista; `/ranking?circuito=…`, la pista pedida (si no existe, la primera).

## Ejemplo

```tsx
// src/app/ranking.tsx
import { RankingScreen } from '@/screens/RankingScreen';

export default RankingScreen;
```

También exporta `toTable(opción)` y `getTableOptions(vueltas)`, el selector de tabla.

## Diseño

El handoff no tiene esta pantalla; está armada con sus tokens y componentes (encabezado de los menús, píldoras azules para lo tocable, filas blancas como las vueltas de Resultados).

- **Encabezado:** "RANKING", con "Autódromo del Lago · Mejor vuelta" de subtítulo y botón Volver.
- **Columna izquierda** (250 dp): selector de **pista** y de **tabla** (`OptionChips`).
  - Tablas: "Mejor vuelta" y una "Carrera · N vueltas" por cada cantidad con tiempos. La de las vueltas por defecto (3) está siempre, aunque esté vacía.
- **Torre de tiempos** a la derecha (`TimingRow`), con scroll:
  - Puesto, barra del color del perfil, NOMBRE, `#NN` y tiempo.
  - El líder muestra su tiempo completo ("1:10.000") y el puesto en un círculo lima (el lima es solo de récords).
  - El resto muestra la diferencia con el líder ("+0.345").
  - El jugador activo lleva la fila resaltada (`blue-soft` y borde azul).
- **Tabla vacía:** "Todavía no hay tiempos en esta tabla."

## Componentes chicos

- **`OptionChips`:** elegir una opción entre varias. Píldoras de 48 dp, la elegida en azul; grupo de radios accesible.
- **`TimingRow`:** una fila de la torre. Props: `row` (`RankingRow`) y `active`. Para el lector de pantalla se anuncia entera: "1.º TOMI, número 7, 1:10.000".

## Decisiones de diseño

- **Torre de tiempos:** como las de las transmisiones. La diferencia con el líder (y no con el de arriba) es lo que se ve; la diferencia con el puesto de arriba se usa en Resultados ("Te faltan 0.42 s…").
- **Se calcula al abrir:** `getRanking` (`core/Ranking`) sobre los perfiles guardados. Si se edita un perfil, se ve el cambio; si se borra, sale de la torre.
- **Una tabla de carrera por cantidad de vueltas:** carreras de distinta cantidad no se comparan entre sí.
- **Tiempos con punto,** como en el resto de la app ("+0.345").
