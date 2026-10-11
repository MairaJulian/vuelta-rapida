# GhostChoice

Qué fantasma corre en una pista según la preferencia del jugador (`PlayerPreferences.ghostSource`) y los datos de los perfiles. TypeScript puro.

## API

| Exporta | Qué hace |
|---|---|
| `resolveGhost(state, source, activeProfileId, circuitId)` | El fantasma (`{ profile, recording }`) de la opción, o `null` si todavía no existe. |
| `getGhostAvailability(state, activeProfileId, circuitId)` | `{ mine, record, none }`: qué opciones tienen fantasma. La selección muestra desactivadas las que no. |

## Las tres opciones

- `mine` (por defecto): la mejor vuelta grabada del perfil activo en la pista.
- `record`: la mejor vuelta grabada de quien tiene el récord de la pista (`getTrackRecord`, tabla de mejor vuelta). Si el récord es de antes de los fantasmas y no tiene grabación, no existe hasta que alguien lo supere.
- `none`: sin fantasma. Siempre disponible.

## Decisiones de diseño

- **El dueño sale del ranking actual:** si alguien edita su nombre o su color, el fantasma lo refleja; si se borra el perfil, se borran sus fantasmas y el récord pasa a quien siga.
- **Una opción sin fantasma no cae a otra:** la elegida se guarda tal cual en las preferencias; si no existe, la carrera corre sin fantasma. Cuando el jugador la grabe, aparece sola.
