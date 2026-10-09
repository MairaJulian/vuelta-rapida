# RaceAudio

El sonido de la carrera sobre react-native-audio-api: el motor en loop, con el tono y el volumen según la velocidad, y los efectos sueltos (semáforo, largada, piano, borde, vuelta y llegada). También decide qué suena con cada evento de la carrera.

## API

| Exportación | Descripción |
|---|---|
| `createRaceAudio({ sources, mix, createContext? })` | Arma el sonido. Devuelve un `RaceAudio`. |
| `RACE_SOUND_SOURCES` | Los WAV empaquetados de `assets/sounds`. |
| `DEFAULT_RACE_AUDIO_MIX` | Motor 0,25, efectos 0,9, tono del motor de 0,8 a 2,4. |
| `getSoundCue(event)` | Qué efecto suena con un evento y a qué volumen; `null` si ninguno. |
| `getEnginePitch(ratio, mix)` / `getEngineGain(ratio, mix)` | Tono y volumen del motor para una velocidad de 0 a 1. |

`RaceAudio`:

| Método | Descripción |
|---|---|
| `load()` | Decodifica los siete sonidos y arranca el motor en ralentí. |
| `setEngineSpeed(ratio)` | Velocidad de 0 a 1: el motor la sigue con una constante de 60 ms. |
| `play({ sound, volume })` | Suena un efecto, con su volumen de 0 a 1. |
| `setMix(mix)` | Volúmenes y tono, en caliente. |
| `setMuted(muted)` | Silencia todo sin detener nada. |
| `suspend()` / `resume()` | Congela y reanuda el audio (pausa, segundo plano). |
| `close()` | Libera el audio. Después no suena nada más. |

## Qué suena con cada evento

| Evento | Sonido | Volumen |
|---|---|---|
| `lightOn` | `light`: pitido grave | 1 |
| `lightsOut` | `go`: pitido agudo y largo | 1 |
| `kerbEnter` | `kerb`: "brrr" | De 0,4 a 1, según la velocidad (pleno desde 30 m/s). |
| `borderHit` | `border`: golpe sordo | De 0,3 a 1, según el impacto (pleno desde 15 m/s). |
| `lapCompleted` | `lap`: dos notas que suben | 1. La última vuelta no suena: suena la llegada. |
| `finish` | `finish`: jingle de 8 bits | 1 |

## Ejemplo

```ts
const audio = createRaceAudio({ sources: RACE_SOUND_SOURCES, mix: DEFAULT_RACE_AUDIO_MIX });
await audio.load();
audio.setEngineSpeed(0.5);
bus.onAny((event) => {
  const cue = getSoundCue(event);
  if (cue) audio.play(cue);
});
```

En la app lo usa `useRaceAudio`, que además lo pausa, lo silencia y lo cierra.

## Decisiones de diseño

- **WAV mono:** sin FFmpeg ni las bibliotecas externas (`disableFFmpeg` y `disableStaticExternalLibs` en `app.json`, para un APK más chico), el decodificador solo lee WAV, MP3 y FLAC.
- **Efectos sintetizados:** los genera `scripts/generate-sounds.mjs`, siempre iguales. Los packs de Kenney que se habían elegido vienen solo en OGG, que este decodificador no lee, y convertirlos pedía una dependencia nueva. El motor es un loop CC0 de OpenGameArt (ver `CREDITOS.md`).
- **Motor con tono, no con varios loops:** un solo loop grave (`motorseamless11`, el de costura más limpia entre los graves) cambia de velocidad de reproducción. En ralentí suena al 60 % del volumen.
- **Motor al 25 %:** empezó en 50 %, pero en la primera prueba en el celular cansaba. Los efectos quedan en 90 %.
- **Tres ganancias:** general (para silenciar), motor y efectos. Cada efecto suelto lleva la suya, para su volumen.
- **El audio nunca rompe el juego:** antes de cargar o después de cerrar, las órdenes no hacen nada, y los errores de las promesas del contexto quedan en silencio.
- **Lógica sin audio:** `getSoundCue`, `getEnginePitch` y `getEngineGain` son puras y se prueban sin contexto.
- **Mock:** en Jest se usa el mock oficial de la biblioteca (`test/setup/audio-api.ts`). Los tests pasan su propio contexto con `createContext` para revisar qué se creó.
