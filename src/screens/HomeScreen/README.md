# HomeScreen

Inicio (pantalla 01 del handoff), en versión mínima: el logo "VUELTA RÁPIDA", el botón **Correr** y el récord del circuito, con el panel azul del auto a la derecha. Es a donde vuelven "Salir al menú" de la Pausa y "Salir" de los Resultados.

## Props

Ninguna. El récord sale de las preferencias del jugador (`usePlayerPreferences`).

## Ejemplo

```tsx
// src/app/inicio.tsx
import { HomeScreen } from '@/screens/HomeScreen';

export default HomeScreen;
```

## Diseño (handoff, pantalla 01)

- **Panel azul** a la derecha: margen 14, 370 de ancho, radio 24. Adentro, el número del auto gigante (900, 360 dp, `blue-num`) cortado por el panel, y el auto centrado (100 dp de ancho, girado −20°). Como el auto es azul, en el panel se dibuja blanco.
- **Columna izquierda** en x = 44, y = 30:
  - Chip blanco con una bandera a cuadros chiquita: "Contrarreloj · 3 vueltas".
  - Logo "VUELTA / RÁPIDA" a 84 dp, con "RÁPIDA" en `blue`.
  - Correr: tinta, 64 de alto, con el círculo lima y el ícono de play (`MenuButton`, variante `run`).
- **Abajo** (a 18 dp): "Tu récord en Autódromo del Lago 1:12.480", o "Todavía sin récord".

## Decisiones de diseño

- **Versión mínima, como se acordó para el hito 5:** hacía falta un lugar a donde salir. Garage y Ajustes no están todavía; llegan con sus pantallas.
- **"Contrarreloj · 3 vueltas"** en lugar de "vs. tu fantasma": el fantasma todavía no existe.
- **Número 7, auto azul:** el auto todavía no se personaliza; es el de la escudería inventada Cóndor del handoff.
- **El auto es el mismo `CarShape` de la carrera**, con una transformación fija.
- **El panel es decorativo:** el lector de pantalla lo saltea; el logo se anuncia como título.
- **Fuente del sistema** en 900 hasta que se incorpore Archivo.
