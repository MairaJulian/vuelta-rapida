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

### Cómo se generan

```
node scripts/generate-sounds.mjs --engine <ruta>/motorseamless11.wav
```

- Los efectos se sintetizan con una semilla fija: el script siempre da los mismos archivos.
- El motor se descarga del pack de Ziph (`all-in-one_0.zip`) y el script solo lo pasa de estéreo a mono, sin recortarlo, para no romper la costura del loop.
- Todo queda en WAV mono de 16 bits a 44,1 kHz: el decodificador de la app (sin FFmpeg) no lee OGG.

## Íconos (`src/components/Icon/`)

| Qué es | Fuente | Autor | Licencia |
|---|---|---|---|
| Trazados de los íconos, peso fill | [`@phosphor-icons/core`](https://github.com/phosphor-icons/core) 2.1.1, copiados al código | Phosphor Icons (Helena Zhang y Tobias Fried) | MIT |
