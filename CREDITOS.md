# Créditos

Fuente y licencia de cada asset del juego.

## Sonidos (`assets/sounds/`)

| Archivo | Qué es | Fuente | Autor | Licencia |
|---|---|---|---|---|
| `engine.wav` | Loop del motor | `motorseamless11.wav` del pack [Some sounds](https://opengameart.org/content/some-sounds-0) (OpenGameArt) | Ziph | CC0 |
| `light.wav` | Pitido de cada luz del semáforo | Sintetizado con `scripts/generate-sounds.mjs` | Vuelta Rápida | CC0 |
| `go.wav` | Pitido de la largada | Sintetizado con `scripts/generate-sounds.mjs` | Vuelta Rápida | CC0 |
| `kerb.wav` | Piano ("brrr") | Sintetizado con `scripts/generate-sounds.mjs` | Vuelta Rápida | CC0 |
| `border.wav` | Golpe contra el borde | Sintetizado con `scripts/generate-sounds.mjs` | Vuelta Rápida | CC0 |
| `lap.wav` | Vuelta completa | Sintetizado con `scripts/generate-sounds.mjs` | Vuelta Rápida | CC0 |
| `finish.wav` | Jingle de llegada (provisorio) | Sintetizado con `scripts/generate-sounds.mjs` | Vuelta Rápida | CC0 |
| `personal-best.wav` | Campanita del récord personal | Sintetizado con `scripts/generate-sounds.mjs` | Vuelta Rápida | CC0 |
| `overtake.wav` | Arpegio al superar a otro jugador | Sintetizado con `scripts/generate-sounds.mjs` | Vuelta Rápida | CC0 |
| `track-record.wav` | Fanfarria del récord de la pista | Sintetizado con `scripts/generate-sounds.mjs` | Vuelta Rápida | CC0 |

### Cómo se generan

```
node scripts/generate-sounds.mjs --engine <ruta>/motorseamless11.wav
```

- Los efectos se sintetizan con una semilla fija: el script siempre da los mismos archivos.
- El motor se descarga del pack de Ziph (`all-in-one_0.zip`) y el script solo lo pasa de estéreo a mono, sin recortarlo, para no romper la costura del loop.
- Todo queda en WAV mono de 16 bits a 44,1 kHz: el decodificador de la app (sin FFmpeg) no lee OGG.

## Ícono de la app (`assets/icono/`)

| Qué es | Fuente | Autor | Licencia |
|---|---|---|---|
| Ícono "Dorsal · Itálica" (opción 3g): monoplaza blanco con el número 7 sobre azul, y "VR" de fondo | Handoff de diseño (`docs/design/.../IconoApp.dc.html` e `icono/`) | Vuelta Rápida | Obra propia |
| Letras "VR" del fondo, dibujadas en la imagen | Fuente [Archivo](https://fonts.google.com/specimen/Archivo) 900 itálica | Omnibus-Type | SIL Open Font License 1.1 |

## Escenografía (`src/render/SceneryAtlas/`, `SceneryBoard/`, `Grandstand/`, `SceneryLayer/`)

| Qué es | Fuente | Autor | Licencia |
|---|---|---|---|
| Árboles, arbustos, sombras y partículas (la textura del atlas) | Dibujados en código con la paleta del handoff (`SceneryAtlas`) y rasterizados al abrir la carrera | Vuelta Rápida | CC0 |
| Carteles de distancia, carteles publicitarios, tribuna y barreras de neumáticos | Dibujados en código como vectores, siguiendo la escena del handoff (`EscenaPista.dc.html`) | Vuelta Rápida | CC0 |
| Marcas de los carteles: RAYO MATE, GOMAS ÑANDÚ, ALFAJORES COMETA, LUBRI TERO y RADIO VELOZ | Inventadas para el juego | Vuelta Rápida | CC0 |

- No se usa ningún pack externo. Se evaluó el [Racing Pack](https://kenney.nl/assets/racing-pack) de Kenney (CC0, vista cenital), pero su sombreado y sus colores saturados no combinan con el estilo plano del handoff.
- Los textos de los carteles usan la fuente del sistema (sans-serif, itálica negrita), como el cartel META.

## Íconos de la interfaz (`src/components/Icon/`)

| Qué es | Fuente | Autor | Licencia |
|---|---|---|---|
| Trazados de los íconos, peso fill | [`@phosphor-icons/core`](https://github.com/phosphor-icons/core) 2.1.1, copiados al código | Phosphor Icons (Helena Zhang y Tobias Fried) | MIT |

## Monoplaza (`src/render/CarShape/`)

| Qué es | Fuente | Autor | Licencia |
|---|---|---|---|
| Silueta del monoplaza en vista cenital, recoloreada con el color de cada jugador | Handoff de diseño (`docs/design/.../Monoplaza.dc.html`), dibujada como vectores en Skia | Vuelta Rápida | Obra propia |
| Número del auto | Fuente del sistema (sans-serif, itálica negrita) | — | — |
