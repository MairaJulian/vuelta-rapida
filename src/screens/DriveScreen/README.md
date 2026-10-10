# DriveScreen

Pantalla de carrera: el auto espera en la grilla con el semáforo, larga al apagarse las luces, acelera solo por el Autódromo del Lago y se maneja con botones (o, desde el panel de desarrollo, inclinando el celular). Cuenta las vueltas y los tiempos, guarda el récord del circuito, suena y vibra, se pausa y, después de la llegada, muestra los resultados.

## Props

Ninguna.
- El modo de control, la calibración, la sensibilidad y los interruptores de sonido y vibración salen de las preferencias del celular (`usePlayerPreferences`). Sin modo elegido, usa botones.
- El color y el número del auto, el récord y el nombre de los resultados son del perfil activo (`useProfiles`). Sin perfil activo (una ruta directa de desarrollo), el auto es azul y sin número.

Corre en `DEFAULT_CIRCUIT` (`core/Circuits`), con `DEFAULT_RACE_CONFIG`, `DEFAULT_DRIVING_CONFIG`, `DEFAULT_CAMERA_CONFIG`, `DEFAULT_TILT_CONFIG` y `DEFAULT_SCENERY_DISPLAY`, y toma el tamaño de `useWindowDimensions`. La escenografía del circuito se genera al montar la pantalla (`withCircuitScenery`).

## Ejemplo

```tsx
// src/app/pista.tsx
import { DriveScreen } from '@/screens/DriveScreen';

export default DriveScreen;
```

## Composición

| Pieza | Rol |
|---|---|
| `useDrivingInput` | Crea la entrada compartida. |
| `ButtonControls` o `TiltControls` | Escriben la entrada: botones multitáctiles, o inclinación con frenos laterales. |
| `useTiltOutput` | Crea el resultado de la inclinación, para que lo lean el modo de control y el panel. |
| `useProfiles` | El perfil activo: color y número del auto, y "NOMBRE · #NN" en los resultados. |
| `useBestLapRecord` | Lee el récord del perfil activo en el circuito y guarda las vueltas que lo mejoran (evento `newRecord`). |
| `createEventBus` | El bus de la carrera: el loop publica los eventos y las demás piezas los escuchan. |
| `useRaceLoop` | Avanza la carrera (`core/RaceFlow`) en el hilo de UI, produce las transformaciones y recibe las órdenes (semáforo, pausa, reinicio). |
| `useRaceAudio` | Motor y efectos (`audio/RaceAudio`): sigue los eventos y la velocidad (`onEngine`), se congela en la pausa y obedece la preferencia de sonido. |
| `useRaceHaptics` | Vibraciones de piano, borde, largada y llegada (`haptics/RaceHaptics`), con la preferencia de vibración. |
| `useRaceStatus` | Sigue los eventos: estado de la carrera, vuelta al pausar y resultados 1,5 s después de la llegada. |
| `useSceneryAtlas` | Dibuja una vez la textura de árboles, sombras y partículas. |
| `useSceneryView` | Elige los árboles que ve la cámara (por celdas) y da la transformación de cada capa con paralaje. |
| `useParticles` | Mueve el polvo (al rozar el borde) y el humo (al derrapar o frenar fuerte) en el hilo de UI. |
| `DriveCanvas` | Dibuja con Skia el pasto, la pista, la escenografía, las partículas y el auto del jugador. |
| `LapHud` | Vuelta, tiempo de la vuelta, mejor vuelta y botón de pausa. |
| `StartLights` | Semáforo de largada; sigue los eventos del bus. |
| `PauseMenu` | Pausa: Continuar, Reiniciar, Salir al menú, y los interruptores de sonido y vibración. |
| `RaceResults` | Resultados, con papelitos si hubo récord: "Otra vez" y "Salir". |
| `DevPanel` | Solo en desarrollo: ajusta configuración en caliente y muestra lecturas. |

## Flujo de la carrera

- **Al montar**, la carrera está en la grilla y el semáforo empieza enseguida.
- **Pausa:** el botón del HUD, el botón atrás de Android o pasar a segundo plano (llamada, notificación, botón de inicio). Vuelve sola solo con "Continuar" o con el botón atrás.
- **Reiniciar** (pausa) y **"Otra vez"** (resultados): carrera nueva en la grilla con un semáforo nuevo, sin salir de la pantalla.
- **Salir al menú** (pausa), **"Salir"** (resultados) y el **botón atrás tras la llegada** vuelven a Inicio.

## Decisiones de diseño

- La pantalla solo compone: la entrada, la simulación y el dibujo son piezas independientes que se comunican por valores compartidos y por el bus de eventos.
- **Las capas salen de los eventos:** la pausa y los resultados se muestran según `useRaceStatus`, que escucha el bus. La pausa aparece en el cuadro siguiente a la orden, cuando llega el aviso `phase`. Así el semáforo, la pausa, el sonido y la vibración ven siempre lo mismo.
- **Salir con `dismissTo('/inicio')`:** Inicio queda abajo en la pila, así que se vuelve a él en lugar de apilar otro. Si no estaba (por ejemplo, al abrir la pista directo), la reemplaza.
- **El botón atrás no sale de la carrera:** pausa, y en la pausa continúa. Solo tras la llegada sale. Se escucha con `useFocusEffect`, así no tapa el atrás de la calibración cuando se abre desde el panel.
- **El botón de pausa está siempre:** tras la llegada no hace nada, pero quitarlo correría la píldora "Mejor" durante el segundo y medio que tardan los resultados.
- **Rampa según el modo:** con inclinación, el loop recibe `withTiltSteering(drivingConfig, tiltConfig)`, con la rampa de dirección corta, porque la señal ya llega continua y filtrada. Con botones usa la rampa normal.
- **Dos orígenes para la inclinación:** la calibración, la sensibilidad y la zona muerta son del jugador y vienen de las preferencias guardadas; el filtro y la rampa son ajustes de desarrollo y viven en la pantalla. `withTiltPreferences` los junta.
- **El modo cambia en caliente:** si las preferencias cambian (por ejemplo, desde el panel), la pantalla monta el otro modo de control sin reiniciar la carrera.
- **Acciones del panel:**
  - El selector de modo guarda la preferencia.
  - Los sliders de sensibilidad y de zona muerta las guardan, porque son del jugador (las mismas que elige en la calibración). El filtro y la rampa quedan solo en la sesión.
  - "Recalibrar" toma el ángulo filtrado del momento (`calibrateTilt` sobre el resultado que publica `TiltControls`) y lo guarda.
  - "Calibración completa" navega a `/calibracion`.
  - "Reiniciar auto" reinicia la carrera, igual que Reiniciar en la pausa.
- **Una preferencia, dos lugares:** la vibración la obedecen `useRaceHaptics` (eventos) y los controles (`brakeVibration`, la vibración del freno).
- **Vueltas, mezcla de sonido e intensidades de vibración** son estado de la pantalla, solo para la sesión: arrancan en `DEFAULT_RACE_CONFIG`, `DEFAULT_RACE_AUDIO_MIX` y `DEFAULT_RACE_HAPTICS`, y las cambia el panel. Las vueltas valen desde el próximo reinicio.
- La configuración del manejo y de la cámara, y el circuito, son estado de la pantalla: arrancan en los valores por defecto y el panel de desarrollo las modifica (del circuito, solo el ancho). `useRaceLoop` las aplica en caliente.
- **Un solo circuito por ahora:** hasta que exista la selección de pista, siempre es `DEFAULT_CIRCUIT`. Su `id` es la clave del récord.
- **Escenografía al montar, en una microtarea:** generarla tarda unos cientos de milisegundos en el celular. Se hace apenas montada la pantalla y no durante el primer render, así la transición arranca enseguida; los árboles aparecen durante el semáforo. Cambiar el ancho de la pista o la densidad en el panel la vuelve a generar con la misma semilla.
- **Cómo se ve la escenografía** (si se dibuja, partículas, paralaje y contraste de las franjas) es estado de la pantalla, solo para la sesión, y lo cambia el panel.
- El panel se carga con `require` detrás de `__DEV__`, para que Metro lo elimine del bundle de producción (ver el README de `DevPanel`).
- `useKeepAwake` evita que el celular apague la pantalla mientras se maneja sin tocar (la aceleración es automática).
