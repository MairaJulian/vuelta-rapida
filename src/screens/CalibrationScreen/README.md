# CalibrationScreen

Calibración de la inclinación (pantalla 03 del handoff): "Sostené el celular como vas a jugar y tocá **Listo**." Muestra el ángulo en tiempo real y dos controles separados: sensibilidad y zona muerta. Al tocar Listo, esa posición pasa a ser "derecho", se guarda y sigue a la pista.

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
| Centro | `CalibrationGauge` y "En la zona azul el auto va derecho. En las marcas, dobla a fondo." |
| Derecha (230 dp) | Tarjeta blanca con la sensibilidad de 1 a 10 (Suave / Rápida), la zona muerta de 1 a 5 (Chica / Grande) y el botón Listo de 56 dp. |

## Cuándo se muestra

- La primera vez que el jugador elige inclinación (desde la elección de control).
- Al abrir el juego en modo inclinación sin calibrar.
- Para repetirla, desde el panel de desarrollo. En el juego final, "Recalibrar" del menú de pausa abrirá esta pantalla.

## Decisiones de diseño

- **Mientras calibra, el ángulo se mide desde el celular nivelado** (calibración previa ignorada): la silueta muestra cuánto se inclina de verdad, y Listo toma ese ángulo filtrado como el nuevo neutro.
- **Los dos ajustes se ven en el medidor, cada uno en lo suyo:** la sensibilidad mueve las marcas de giro completo y la zona muerta cambia el ancho de la zona azul. Antes, subir la sensibilidad agrandaba la zona azul; un tester lo leyó como "tengo que girar más el celular" (ver el README de `CalibrationGauge`).
- **Zona muerta en 5 niveles** (1°, 3°, 5°, 7° y 9°), de "Chica" a "Grande": una escala simple para el jugador. Arranca en el nivel 3 (5°, el valor anterior). Se guarda en grados.
- **Tarjeta compacta:** con los dos sliders, el padding baja a 14 y los márgenes bajo las escalas a 6, para que la tarjeta entre en un celular de 360 dp de alto.
- **Se guarda todo junto al tocar Listo** (modo, neutro, sensibilidad y zona muerta): volver sin tocar Listo no cambia nada.
- **Volver** regresa a la pantalla anterior; si se llegó directo al abrir el juego, va a la elección de control.
- **Sliders:** usan `DevSlider`, que ya tiene la pista, el relleno azul y el pulgar del handoff. El valor grande junto a "Sensibilidad" queda para cuando se incorpore Archivo. La zona muerta no está en el handoff; sigue el mismo formato que la sensibilidad.
- **"Paso 2 de 2" en lugar de "2 de 3":** la personalización del auto todavía no existe.
