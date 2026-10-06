# CalibrationScreen

Calibración de la inclinación (pantalla 03 del handoff): "Sostené el celular como vas a jugar y tocá **Listo**." Muestra el ángulo en tiempo real y un control de sensibilidad. Al tocar Listo, esa posición pasa a ser "derecho", se guarda y sigue a la pista.

## Props

Ninguna. Lee y guarda las preferencias con `usePlayerPreferences`, lee el sensor con `useTiltSteering` y navega con `useRouter`.

## Ejemplo

```tsx
// src/app/calibracion.tsx
import { CalibrationScreen } from '@/screens/CalibrationScreen';

export default CalibrationScreen;
```

## Composición

| Columna | Contenido |
|---|---|
| Izquierda (190 dp) | La consigna. |
| Centro | `CalibrationGauge` y "En la zona azul el auto va derecho". |
| Derecha (230 dp) | Tarjeta blanca con la sensibilidad de 1 a 10 (Suave / Rápida) y el botón Listo de 56 dp. |

## Cuándo se muestra

- La primera vez que el jugador elige inclinación (desde la elección de control).
- Al abrir el juego en modo inclinación sin calibrar.
- Para repetirla, desde el panel de desarrollo. En el juego final, "Recalibrar" del menú de pausa abrirá esta pantalla.

## Decisiones de diseño

- **Mientras calibra, el ángulo se mide desde el celular nivelado** (calibración previa ignorada): la silueta muestra cuánto se inclina de verdad, y Listo toma ese ángulo filtrado como el nuevo neutro.
- **La sensibilidad se ve en el medidor:** al mover el slider, cambian el recorrido del marcador y el ancho de la zona muerta, sin tener que manejar.
- **Se guarda todo junto al tocar Listo** (modo, neutro y sensibilidad): volver sin tocar Listo no cambia nada.
- **Volver** regresa a la pantalla anterior; si se llegó directo al abrir el juego, va a la elección de control.
- **Slider:** usa `DevSlider`, que ya tiene la pista, el relleno azul y el pulgar del handoff. El valor grande junto a "Sensibilidad" queda para cuando se incorpore Archivo.
- **"Paso 2 de 2" en lugar de "2 de 3":** la personalización del auto todavía no existe.
