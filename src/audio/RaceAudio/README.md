# RaceAudio

El sonido de la carrera sobre react-native-audio-api: el motor en loop, con cambios de marcha (el tono según la marcha y las revoluciones) y el volumen según la velocidad, y los efectos sueltos (semáforo, largada, piano, borde, vuelta y llegada). También decide qué suena con cada evento de la carrera.

## API

| Exportación | Descripción |
|---|---|
| `createRaceAudio({ sources, mix, gearbox?, createContext? })` | Arma el sonido. Devuelve un `RaceAudio`. `gearbox` fija las marchas (lo usan los tests); sin eso, salen del ritmo de la mezcla (`mix.gearPace`, ver `audio/EngineGears`). |
| `RACE_SOUND_SOURCES` | Los WAV empaquetados de `assets/sounds`. |
| `DEFAULT_RACE_AUDIO_MIX` | Motor 0,25, efectos 0,9, tono del motor de 0,8 (detenido) a 2,2 (corte), con cambios de marcha a sexta a los 3,5 s (`gearPace: 'slow'`). |
| `getSoundCue(event)` | Qué efecto suena con un evento y a qué volumen; `null` si ninguno. |
| `getEnginePitch(ratio, mix)` | Tono del motor para las revoluciones (con cambios) o la velocidad (sin cambios), de 0 a 1. |
| `getEngineGain(ratio, mix)` | Volumen del motor para una velocidad de 0 a 1. |
| `SHIFT_SMOOTHING`, `SHIFT_CUT_SECONDS`, `SHIFT_CUT_GAIN` | El cambio: el tono salta con 15 ms y, al subir, el volumen baja al 35 % durante 80 ms. |

`RaceAudio`:

| Método | Descripción |
|---|---|
| `load()` | Decodifica los diez sonidos y arranca el motor en ralentí. |
| `setEngineSpeed(ratio)` | Velocidad de 0 a 1. Con cambios, pasa por la caja: el tono sigue a las revoluciones con una constante de 60 ms y salta en cada cambio. |
| `play({ sound, volume })` | Suena un efecto, con su volumen de 0 a 1. |
| `setMix(mix)` | Volúmenes, tono y cambios de marcha, en caliente. |
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
| `celebration` (`personalBest`) | `personalBest`: campanita corta | 1 |
| `celebration` (`overtake`) | `overtake`: arpegio de 8 bits que sube | 1 |
| `celebration` (`trackRecord`) | `trackRecord`: fanfarria de 2,4 s | 1 |

`celebration` (hito 6b) no sale de la simulación: lo emite la pantalla cuando aparecen los resultados, 1,5 s después de la llegada. Así la celebración suena con la tarjeta, después del jingle de llegada.

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
- **Cambios de marcha** (ajuste tras jugar: en las rectas el motor cansaba):
  - Antes, el tono subía con la velocidad hasta ×2,4 y en las rectas quedaba clavado en el tope.
  - Ahora sube en cada marcha y cae al pasar a la siguiente (`audio/EngineGears`).
  - A velocidad máxima, la sexta queda al 85 % de las revoluciones y el tono queda en ×2,0, unos tres semitonos más grave.
  - El corte bajó de ×2,4 a ×2,2.
  - **El cambio:** al subir, el tono cae casi de golpe y el volumen baja un instante (80 ms, como un corte de encendido). Al bajar, el tono sube rápido, sin corte.
  - No suma archivos de sonido: todo sale del mismo loop.
  - El volumen sigue a la velocidad, no a las revoluciones, así que el motor no se apaga y prende con cada marcha.
  - Durante el corte, las muestras de velocidad siguientes no pisan el volumen: lo programan para cuando termina.
  - Se apagan con el interruptor del panel de desarrollo (`gearShifts`), para comparar.
  - **El ritmo es parte de la mezcla** (`gearPace`): en el panel se elige a sexta en 2,5, 3 o 3,5 s y cambia en caliente, sin volver a armar el sonido. Por defecto, 3,5 s, elegido probando en el celular: con 2,5 s los primeros cambios se escuchaban demasiado seguidos.
- **Motor al 25 %:** empezó en 50 %, pero en la primera prueba en el celular cansaba. Los efectos quedan en 90 %.
- **Tres ganancias:** general (para silenciar), motor y efectos. Cada efecto suelto lleva la suya, para su volumen.
- **El audio nunca rompe el juego:** antes de cargar o después de cerrar, las órdenes no hacen nada, y los errores de las promesas del contexto quedan en silencio.
- **Lógica sin audio:** `getSoundCue`, `getEnginePitch` y `getEngineGain` son puras y se prueban sin contexto.
- **Mock:** en Jest se usa el mock oficial de la biblioteca (`test/setup/audio-api.ts`). Los tests pasan su propio contexto con `createContext` para revisar qué se creó.
