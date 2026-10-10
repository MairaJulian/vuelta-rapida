# StartScreen

Entrada del juego. No dibuja nada: decide a dónde ir con las preferencias guardadas y el interruptor de la inclinación, y redirige.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `tiltEnabled` | `boolean` (opcional) | Si el jugador puede usar la inclinación. Por defecto, `FEATURE_FLAGS.tiltControl` (hoy `false`). La ruta no lo pasa; los tests sí. |

## Ejemplo

```tsx
// src/app/index.tsx
import { StartScreen } from '@/screens/StartScreen';

export default StartScreen;
```

## Flujo

Con la inclinación **desactivada** (el valor actual de `FEATURE_FLAGS.tiltControl`):

| Preferencias | Va a |
|---|---|
| Cualquiera | `/jugadores` ("¿Quién juega?"), con botones. Si había inclinación guardada, primero la cambia a botones; la calibración, la sensibilidad y la zona muerta se conservan. |

Con la inclinación **activada**:

| Preferencias | Va a |
|---|---|
| Sin modo elegido | `/control` |
| Inclinación sin calibrar | `/calibracion` |
| Botones, o inclinación calibrada | `/jugadores` |

La regla está en `getStartStep` e `isControlModeAvailable` (`core/PlayerPreferences`); aquí solo se traduce a rutas (`START_HREFS`).

## Decisiones de diseño

- **Sin pantalla de carga:** las preferencias se leen de forma síncrona (`expo-sqlite/kv-store`), así que la redirección ocurre en el primer render. La única excepción es pasar una inclinación guardada a botones: se espera ese cambio (un render vacío) para que la pista no arranque un cuadro con inclinación.
- **Inclinación desactivada, pero disponible desde el panel:** el selector del panel de desarrollo puede elegir inclinación durante la sesión, y la calibración completa sigue funcionando. Al volver a abrir el juego, esta pantalla lo devuelve a botones. Así una inclinación guardada (de una prueba anterior o del panel) nunca llega al jugador.
- **El interruptor se lee aquí y no en el almacén de preferencias:** las preferencias guardan lo que hay en el disco tal cual, y la regla de inicio decide.
- **`Redirect` reemplaza la entrada:** desde "¿Quién juega?", el botón Atrás de Android no vuelve a una pantalla vacía.
- **Primero, quién juega** (hito 6a): el celular lo comparten varios chicos, así que cada vez que se abre el juego se elige el perfil. La elección de control y la calibración (solo con la inclinación activada) siguen antes: son del celular, no del jugador.
- **Las rutas en `StartScreen.styles.ts`:** la pantalla no tiene estilos, y la convención pide el archivo; guarda su única constante de presentación.
