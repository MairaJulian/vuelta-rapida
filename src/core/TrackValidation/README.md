# TrackValidation

Revisa que un trazado sirva como circuito. Devuelve la lista de problemas, vacía si está bien. TypeScript puro.

## API

| Exporta | Qué hace |
|---|---|
| `validateTrack(track, options?)` | Revisa un `TrackData`. |
| `validateCircuit(circuit, options?)` | Lo mismo, y además que los puntos de control intermedios estén en orden dentro de la vuelta. |
| `DEFAULT_VALIDATION_OPTIONS` | `{ minSeparationWidths: 2, distinctSectionWidths: 4, radiusWindow: 4 }`. |
| `TrackIssue` (tipo) | Cada problema, con `kind` y los datos para ubicarlo. |

## Reglas

| `kind` | Qué detecta |
|---|---|
| `too-few-points` | Menos de 3 puntos: no hay vuelta. |
| `not-finite` | Coordenadas o ancho no finitos, o ancho no positivo. |
| `repeated-point` | Dos puntos seguidos iguales. |
| `not-closed` | El tramo que vuelve al punto 0 es más largo que cualquier otro: los datos describen un camino abierto, que se cerraría con un salto. |
| `self-crossing` | Dos segmentos no vecinos se cortan. |
| `sections-too-close` | Dos tramos distintos (a más de 4 anchos de distancia por el trazado) quedan a menos de 2 anchos de pista, de centro a centro. |
| `curve-too-tight` | Una curva de radio menor o igual a medio ancho: el borde interior se plegaría. El radio se mide entre puntos a unos 4 m, para no confundir ruido con curvas. |
| `checkpoints-out-of-order` | Puntos de control fuera de la vuelta o desordenados (solo `validateCircuit`). |

## Ejemplo

```ts
import { buildCircuit, AUTODROMO_DEL_LAGO } from '@/core/Circuits';

expect(validateCircuit(buildCircuit(AUTODROMO_DEL_LAGO))).toEqual([]);
```

## Decisiones de diseño

- **Para tests y herramientas, no para cada cuadro:** recorre todos los pares de segmentos (más de un millón en un circuito de 1200 puntos). Los tests de `core/Circuits` validan cada circuito del juego, así un circuito mal armado no llega a la app.
- **La separación protege la física, no solo el dibujo:** los límites de pista y el progreso usan el punto del trazado más cercano. Con los tramos distintos a 2 anchos o más, el auto (que nunca se aleja más de medio ancho) siempre está más cerca de su propio tramo. Además queda pasto entre los dos asfaltos.
- **"Tramos distintos" por la distancia sobre el trazado:** en una horquilla, las dos ramas están cerca en línea recta pero también cerca por el trazado; no son un problema. Dos puntos cuentan como tramos distintos si por el trazado están a más de 4 anchos.
- **Devuelve todos los problemas** en lugar de cortar en el primero, así se corrige un circuito de una vez.
