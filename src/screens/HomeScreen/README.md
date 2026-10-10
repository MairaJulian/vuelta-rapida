# HomeScreen

Inicio (pantalla 01 del handoff) del jugador activo: el logo "VUELTA RÁPIDA", el botón **Correr**, el **Garage** y su récord, con el panel azul de su auto y su número a la derecha. Es a donde vuelven "Salir al menú" de la Pausa y "Salir" de los Resultados.

## Props

Ninguna. El auto, el número y el récord salen del perfil activo (`useProfiles`). Sin perfil activo (se borró, o se llegó directo), redirige a "¿Quién juega?".

## Ejemplo

```tsx
// src/app/inicio.tsx
import { HomeScreen } from '@/screens/HomeScreen';

export default HomeScreen;
```

## Diseño (handoff, pantalla 01)

- **Panel azul** a la derecha: margen 14, 370 de ancho, radio 24.
  - Adentro, el número del jugador gigante (900, 360 dp, `blue-num`) cortado por el panel.
  - El auto del jugador centrado (100 dp de ancho, girado −20°), con su color y su número. Si el auto es azul, en el panel se dibuja blanco.
  - Abajo a la izquierda, la píldora del piloto (`DriverBadge`) con "Cambiar": vuelve a "¿Quién juega?".
- **Columna izquierda** en x = 44, y = 30:
  - Chip blanco con una bandera a cuadros chiquita: "Contrarreloj · 3 vueltas".
  - Logo "VUELTA / RÁPIDA" a 84 dp, con "RÁPIDA" en `blue`.
  - Correr (tinta, 64 de alto, con el círculo lima y el ícono de play) y **Garage** (`IconButton` de Ø 56 con la llave): edita el perfil activo.
- **Abajo** (a 18 dp): "Tu récord en Autódromo del Lago 1:12.480", o "Todavía sin récord", del jugador activo.

## Componentes chicos

### IconButton (`src/components/IconButton`)

Botón ícono del handoff: círculo blanco con sombra sm y un ícono tinta (22 dp en Ø 48, 24 dp en Ø 56). Presionado, `soft`. Props: `icon`, `label` (para el lector de pantalla), `onPress`, `size` (48 o 56), `style` y `testID`. También lo usa el lápiz de `ProfileCard`.

La píldora `DriverBadge` está documentada en `ProfileEditorScreen`.

## Decisiones de diseño

- **Garage edita el perfil activo** (`/piloto?id=…`): es la misma personalización que se abre desde el lápiz de "¿Quién juega?".
- **"Cambiar" vuelve con `dismissTo('/jugadores')`:** "¿Quién juega?" está debajo en la pila, así que se vuelve a ella en lugar de apilar otra.
- **Ajustes no está todavía:** llega con su pantalla.
- **"Contrarreloj · 3 vueltas"** en lugar de "vs. tu fantasma": el fantasma todavía no existe.
- **El auto es el mismo `CarShape` de la carrera**, a través de `CarPreview`.
- **El número y el auto son decorativos:** el lector de pantalla los saltea. El logo se anuncia como título, y la píldora como "MALE, número 27. Cambiar piloto".
- **Fuente del sistema** en 900 hasta que se incorpore Archivo.
