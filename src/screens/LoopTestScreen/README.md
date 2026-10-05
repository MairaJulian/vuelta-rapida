# LoopTestScreen

Pantalla de diagnóstico del hito 1. Muestra un rectángulo que rebota de lado a lado y un contador de fps, para comprobar que el loop (Reanimated + Skia) corre fluido en un celular real. No es jugabilidad y se reemplazará cuando exista el juego.

## Props

Ninguna. Toma su tamaño de `useWindowDimensions`.

## Ejemplo

```tsx
// src/app/index.tsx
import { LoopTestScreen } from '@/screens/LoopTestScreen';

export default LoopTestScreen;
```

## Cómo interpretarla

- El contador debería estar en torno a **60 FPS** en un celular de gama media.
- El rectángulo debe moverse sin tirones.
- Si el contador baja de forma sostenida, hay un problema de rendimiento en el loop base antes de añadir nada más.

## Decisiones de diseño

- Compone `useBoxLoop` (loop) y `LoopTestCanvas` (render). La pantalla no calcula nada.
- `useKeepAwake` evita que el celular apague la pantalla durante la medición.
- La orientación horizontal se bloquea desde `app.json`, no desde esta pantalla.
- La velocidad está en `LoopTestScreen.styles.ts` como constante.
