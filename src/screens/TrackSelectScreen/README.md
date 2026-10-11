# TrackSelectScreen

Selección de pista (pantalla 05 del handoff): una tarjeta por circuito con su trazado, su largo, sus curvas y su dificultad, y el récord de la pista con el nombre y el color de quien lo tiene. "Largar" abre la carrera.

## Props

Ninguna. Los circuitos salen de `core/Circuits`, los récords y los fantasmas, de los perfiles guardados, y la elección de fantasma, de las preferencias.

## Ejemplo

```tsx
// src/app/pistas.tsx
import { TrackSelectScreen } from '@/screens/TrackSelectScreen';

export default TrackSelectScreen;
```

## Diseño (handoff, pantalla 05)

- **Encabezado:** "ELEGÍ LA PISTA", "Contrarreloj · 3 vueltas" y el botón primario "Largar" con la bandera a cuadros.
- **Tarjetas** (`TrackCard`, 240 dp): radio 22, padding 8, borde de 2,5 (azul en la elegida).
  - **Ilustración** de 88 dp: el trazado en `blue` con trazo de 4,5 y la marca de la meta en coral. En la elegida, fondo `blue` y trazado blanco.
  - **Nombre** (800, 22 dp), y "3,1 km · 7 curvas" con la **dificultad** a la derecha: tres puntos (llenos en `blue`) y su nombre (Fácil, Media o Difícil). El handoff no la trae; se sumó en el hito 7.
  - **Chip de récord:** lima "Récord 1:10.000 · ● TOMI" (con un punto del color del perfil), o `soft` "Sin récord todavía".
- **Fantasma (hito 8, no está en el handoff):** debajo de las tarjetas, el rótulo "Fantasma" y tres opciones (`OptionChips`): "Mi mejor vuelta" (por defecto), "Récord de la pista" y "Sin fantasma". Una opción cuya grabación todavía no existe en la pista elegida se muestra desactivada, y si es la elegida, una línea explica cómo se graba.

## Decisiones de diseño

- **Cuatro pistas, de la más fácil a la más difícil:** la lista sale de `CIRCUITS`; sumar una pista es sumar su definición a `core/Circuits`. Con las tarjetas de 240 dp la lista se desplaza en horizontal.
- **La pista elegida se comparte** (`useSelectedTrack`, en memoria): la selección la fija, la carrera también (si se abrió con un enlace) y el ranking abre en ella. Al volver a esta pantalla queda marcada la última que se corrió.
- **El fantasma es una preferencia del celular** (`PlayerPreferences.ghostSource`), no de la pista: la elección vale para todas. Las opciones se activan o desactivan según la pista elegida y el perfil activo (`getGhostAvailability`). Si la elegida no existe en esa pista, se corre sin fantasma, sin cambiar la preferencia: cuando el jugador la grabe, aparece sola.
- **Todo en un desplazamiento vertical:** las tarjetas y el fantasma entran justos en un celular de 360 dp de alto; con un desplazamiento, en uno bajo se desliza en vez de cortarse.
- **El trazado es el del circuito real,** calculado con `getTrackOutline` (`core/Track`), no un dibujo aparte como en el handoff. Con unos 160 puntos alcanza para una tarjeta.
- **Largo y curvas calculados:** el largo sale de la vuelta y las curvas, de los tramos de pianos. El handoff trae números inventados que no coinciden con la pista real.
- **El récord es el de la mejor vuelta** (`getTrackRecord`): lo que muestra la tarjeta es la cabeza de la torre de tiempos, así que cambia solo si alguien edita su nombre o su color, o si se borra el perfil.
- **Largar pasa la pista por la ruta** (`/pista?circuito=…`): `DriveScreen` la busca con `getCircuit`; con un id que no existe, usa la primera.
- **Flujo:** Inicio → Correr → esta pantalla → Largar. Volver regresa a Inicio.
