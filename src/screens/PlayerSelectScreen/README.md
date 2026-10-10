# PlayerSelectScreen

"¿Quién juega?": la primera pantalla al abrir el juego. El celular lo comparten varios chicos, y cada uno elige su perfil para que sus tiempos queden a su nombre.

## Props

Ninguna. Los perfiles, el último jugador y los récords salen de `useProfiles`.

## Ejemplo

```tsx
// src/app/jugadores.tsx
import { PlayerSelectScreen } from '@/screens/PlayerSelectScreen';

export default PlayerSelectScreen;
```

## Diseño

El handoff no tiene esta pantalla; está armada con sus tokens y sus componentes (encabezado de los menús y tarjeta de opción).

- **Encabezado:** "¿QUIÉN JUEGA?", sin botón Volver (es la primera pantalla).
  - Con perfiles, el subtítulo es "Tocá tu piloto para correr".
  - Sin perfiles, es "Creá tu piloto para guardar tus tiempos".
- **Una fila de tarjetas** que se desplaza de costado si no entran: una por perfil, en el orden en que se crearon, y al final "Nuevo piloto".
- **Tocar una tarjeta** elige al jugador y va a Inicio. "¿Quién juega?" queda debajo en la pila, así que Atrás vuelve aquí.
- **El lápiz** abre la personalización de ese perfil (`/piloto?id=…`), donde también se borra.
- **"Nuevo piloto"** abre la personalización vacía (`/piloto`).

## Componentes chicos

### ProfileCard (`src/components/ProfileCard`)

Tarjeta de un perfil, de 188 dp de ancho, con radio 22 y padding 8:
- **Ilustración** `blue-tint` con el auto de costado (`CarPreview`, 36 dp de ancho) en su color y con su número en el disco. Arriba a la izquierda, el número en un círculo del color del auto.
- **Nombre** en mayúsculas (800, 22 dp), que se achica para entrar en una línea.
- **Chip de récord** en el Autódromo del Lago: lima "Récord 1:12.480", o `soft` "Sin récord todavía".
- **Borde azul** de 2,5 en la tarjeta del último que jugó (`activeProfileId`).
- **Lápiz** (`IconButton`, Ø 48) arriba a la derecha.

| Prop | Tipo | Descripción |
|---|---|---|
| `profile` | `Profile` | El perfil. |
| `recordMs` | `number \| null` | Récord en el circuito. |
| `highlighted` | `boolean` | Último en jugar. |
| `onPress` | `() => void` | Jugar con este perfil. |
| `onEdit` | `() => void` | Editarlo. |

### NewProfileCard (`src/components/NewProfileCard`)

Mismo tamaño que `ProfileCard`: un círculo azul con el ícono de sumar usuario, "Nuevo piloto" y "Elegí nombre, color y número". Prop: `onPress`.

## Decisiones de diseño

- **Se muestra siempre, aunque haya un solo perfil:** así sumar un segundo jugador es evidente (pedido del hito 6a).
- **Sin perfiles no se salta a la creación:** la pantalla muestra solo "Nuevo piloto" y explica para qué sirve.
- **Lápiz aparte de la tarjeta:** el botón de editar es un hermano de la tarjeta, no un hijo. El lector de pantalla los anuncia por separado ("MALE, número 27. Récord 1:12.480" y "Editar a MALE").
- **El récord es el del circuito por defecto:** hay uno solo. Cuando exista la selección de pista, la tarjeta mostrará el de la pista elegida o el ranking (hito 6b).
- **Nombres en mayúsculas al mostrarlos:** se guardan como se escribieron.
