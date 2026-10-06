# StartScreen

Entrada del juego. No dibuja nada: decide a dónde ir con las preferencias guardadas y redirige.

## Props

Ninguna.

## Ejemplo

```tsx
// src/app/index.tsx
import { StartScreen } from '@/screens/StartScreen';

export default StartScreen;
```

## Flujo

| Preferencias | Va a |
|---|---|
| Sin modo elegido | `/control` |
| Inclinación sin calibrar | `/calibracion` |
| Botones, o inclinación calibrada | `/pista` |

La regla está en `getStartStep` (`core/PlayerPreferences`); aquí solo se traduce a rutas (`START_HREFS`).

## Decisiones de diseño

- **Sin pantalla de carga:** las preferencias se leen de forma síncrona (`expo-sqlite/kv-store`), así que la redirección ocurre en el primer render.
- **`Redirect` reemplaza la entrada:** desde la pista, el botón Atrás de Android no vuelve a una pantalla vacía.
- **Las rutas en `StartScreen.styles.ts`:** la pantalla no tiene estilos, y la convención pide el archivo; guarda su única constante de presentación.
- Cuando exista la pantalla de Inicio del handoff (01), esta decisión se moverá al botón Correr.
