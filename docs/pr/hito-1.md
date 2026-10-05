# Título

Hito 1: base técnica (Expo Router, Skia, Reanimated, Jest y pantalla de prueba del loop)

# Descripción

## Resumen

Deja el proyecto listo para empezar a desarrollar el juego. No incluye jugabilidad.

- **Permisos de Claude Code** del proyecto en `.claude/settings.json` y `CLAUDE.md` con las decisiones, la arquitectura, la convención por componente y el flujo de git. `.claude/settings.local.json` queda fuera del repo.
- **Dependencias** (versiones resueltas por `expo install` para SDK 57): React Native Skia, Reanimated 4 + Worklets, `expo-dev-client`, `expo-sensors`, `expo-screen-orientation`, `expo-haptics`, `expo-keep-awake`.
- **Android horizontal**: `orientation: "landscape"`, `platforms: ["android"]` y `android.package` en `app.json`.
- **Navegación**: Expo Router con rutas finas en `src/app/` que solo renderizan pantallas de `src/screens/`. Se eliminan `App.tsx` e `index.ts`.
- **Alias `@/`** hacia `src/`, en `tsconfig.json` y en Jest.
- **Jest** con preset `jest-expo` y React Native Testing Library 14. Skia se sustituye por un mock propio y Reanimated usa su mock oficial ampliado con `useFrameCallback` (`test/setup/`).
- **ESLint** con `expo lint` (ESLint 9 y `eslint-config-expo`, config plana en `eslint.config.js`). Resuelve el alias `@/` y falla ante imports rotos.
- **Prettier** integrado según la guía de Expo (`eslint-plugin-prettier/recommended` + `eslint-config-prettier`): no choca con ESLint y el formato se valida dentro del lint.
- **VS Code del proyecto** (`.vscode/settings.json`): formatea al guardar y aplica las correcciones de ESLint. Extensiones recomendadas: ESLint, Prettier y Expo Tools.
- **Scripts**: `npm test`, `npm run test:watch`, `npm run typecheck`, `npm run lint`, `npm run lint:fix`, `npm run format`, `npm run format:check`.
- **Pantalla de prueba del loop** (`LoopTestScreen`): un rectángulo que rebota y un contador de fps, para validar el loop en un celular real.
  - `core/BoxMotion` y `core/FpsMeter`: lógica en TypeScript puro, sin React ni Skia.
  - `hooks/useBoxLoop`: une `useFrameCallback` con `core`.
  - `render/LoopTestCanvas`: dibuja con Skia y solo lee estado.
  - Todos con tests y README, según la convención del proyecto.
- **CMake 3.31.6 fijada** con `expo-build-properties`, para que el build nativo funcione en Windows (ver Notas).
- **Fix de dependencias**: `react-dom` se fija en `19.2.3` (igual que `react`). Expo Router lo arrastraba como peer en `19.3.0` y rompía la instalación.

## Cómo probarlo

```bash
npm install
npm test            # 22 tests
npm run typecheck
npm run lint
```

En un celular Android (modo desarrollador y depuración USB activados):

```bash
npx expo run:android
```

La app abre en horizontal con un rectángulo azul rebotando y un contador de FPS arriba a la izquierda. En un gama media debería marcar cerca de 60.

## Notas

- `android/` se genera con `expo prebuild` y está en `.gitignore`.
- **Build nativo en Windows**: la compilación fallaba con `ninja: error: ... Filename longer than 260 characters` (codegen de `react-native-gesture-handler`). La CMake 3.22.1 que AGP usa por defecto trae ninja 1.10.2, que no soporta rutas largas.
  - El proyecto fija CMake 3.31.6 (trae ninja 1.12.1) con el plugin oficial `expo-build-properties` en `app.json` (`android.cmakeVersion`). Se aplica en cada `expo prebuild`, también con `--clean`.
  - En la máquina hace falta, una sola vez: activar rutas largas en Windows (`LongPathsEnabled = 1` en `HKLM\SYSTEM\CurrentControlSet\Control\FileSystem`) y reiniciar, e instalar CMake 3.31.6 desde el SDK Manager de Android Studio.
- Probado en un Samsung Galaxy A15 (pantalla de 90 Hz): el contador marca 90 FPS y el movimiento es fluido.
- `.claude/settings.json` conserva el plugin de Expo y los permisos; se retiraron las reglas de `gh` porque no se usa GitHub CLI en este proyecto.
