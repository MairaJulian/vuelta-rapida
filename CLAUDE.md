# Vuelta Rápida — contexto del proyecto

Referencia para todas las sesiones de Claude Code en este repositorio. Ver también [AGENTS.md](AGENTS.md) (reglas generales de Expo).

**Precedencia:** AGENTS.md son reglas genéricas de Expo; este archivo recoge las decisiones de este proyecto. Si se contradicen, manda CLAUDE.md. Diferencias conocidas:

- AGENTS.md pide priorizar compatibilidad multiplataforma; aquí el alcance es **solo Android**.
- AGENTS.md pide lint y tipos antes de dar una tarea por hecha; este proyecto añade además los tests: `npm run lint`, `npm run typecheck` y `npm test`.
- AGENTS.md prefiere módulos oficiales de Expo; aquí Skia (2D) y react-native-filament (3D futuro) son decisiones deliberadas.

## Objetivo

Juego de carreras de monoplazas con vista cenital para Android. Dos fines:

- Juego para mi hijo (10-12 años, fan de la F1).
- Pieza de portfolio. A futuro, público fan de la F1 de todas las edades.

## Stack

- Expo con dev builds (`expo prebuild`), TypeScript estricto.
- React Native Skia para el renderizado 2D.
- Reanimated para el loop de juego.
- Sensor de gravedad de Reanimated (`useAnimatedSensor`) para la inclinación: escribe en el hilo de UI. expo-sensors (acelerómetro) solo como respaldo en celulares sin sensor de gravedad.
- Solo Android. Orientación horizontal bloqueada, en las dos orientaciones horizontales (`sensorLandscape`, con expo-screen-orientation).

## Futuro

- Versión 3D con react-native-filament y cámara detrás del auto.
- Más adelante: rivales con IA y multijugador local.
- El online está fuera del alcance por ahora.

## Arquitectura (regla principal)

- La lógica del juego (modelo de manejo, reglas de carrera, vueltas, tiempos, fantasma) vive en **TypeScript puro**: sin importar nada de React, React Native ni Skia. Una regla `no-restricted-imports` en `eslint.config.js` lo hace cumplir en `src/core/`.
- La simulación corre en el hilo de UI (worklets de Reanimated). Las funciones de `core` que se llaman desde el loop llevan la directiva `'worklet'`, que es un texto y no un import.
- El modelo de manejo trabaja en un plano (coordenadas x/z) para poder reutilizarse en 3D.
- El renderizado solo lee el estado; nunca contiene lógica.
- El estado de la carrera es serializable (posición, velocidad, ángulo por cuadro), pensado para el auto fantasma y un eventual online.

## Controles

Capa de entrada abstraída con dos implementaciones intercambiables. El jugador elige el modo en la pantalla de elección de control, **sin modo por defecto**: las dos opciones se muestran siempre. Aceleración automática en ambos.

- **Pendiente:** si se oculta la inclinación (y queda solo botones) se decide después de una **segunda prueba con usuarios**, hecha con la corrección de zona muerta y sensibilidad del hito 3. Hasta entonces la inclinación no se oculta ni se desactiva.
- **Inclinación**: control por posición. El ángulo del celular respecto de la gravedad es el ángulo de dirección. Incluye calibración, zona muerta, suavizado, sensibilidad ajustable y corrección según la orientación horizontal.
  - La zona muerta es un valor fijo en grados (el jugador elige de 1° a 9°) e independiente de la sensibilidad. La sensibilidad define el rango útil a partir del borde de la zona muerta. Subirla siempre reduce el ángulo necesario y la dirección crece desde 0, sin saltos.
  - Los indicadores (medidor de calibración y HUD) usan una escala fija en grados. Nunca escalarlos con la sensibilidad: la zona muerta parecería crecer.
  - La corrección por orientación se hace una sola vez, en `core/TiltSteering`: el sensor se registra con `adjustToInterfaceOrientation: false`.
  - En el menú de pausa del juego final, "Recalibrar" tiene que abrir la pantalla de calibración completa. El botón "Recalibrar" del panel de desarrollo solo toma la posición del momento.
- **Botones en pantalla**.

## Marcas

No usar "F1", "Formula 1", logos, equipos, pilotos ni decoraciones reales. Monoplazas genéricos y nombres inventados.

## Rendimiento

El piso es un celular Android de gama media. Objetivo: 60 fps.

## Diseño

El handoff está en [docs/design](docs/design). Es la referencia visual para todas las pantallas.

## Assets

Packs CC0 de estilo plano/low-poly. Registrar la fuente y licencia de cada asset en un archivo de créditos.

## Estructura de carpetas

Alias `@/` apunta a `src/` (en `tsconfig.json` y en `jest.config.js`).

```
src/
  app/        rutas de Expo Router; archivos finos que solo renderizan screens/
  core/       TS puro (sin React/RN/Skia): manejo, carrera, vueltas, fantasma
  input/      capa de entrada abstraída (inclinación, botones)
  render/     componentes Skia; solo leen estado
  components/ UI genérica (HUD, botones)
  hooks/      conectan core con Reanimated/React
  screens/    pantallas completas
test/setup/   mocks y setup global de Jest (Skia, Reanimated)
```

Las carpetas se crean cuando hacen falta, no antes.

## Tests

- `npm test` corre Jest (preset `jest-expo`, React Native Testing Library 14, que es asíncrona: usar `await render(...)` y `await renderHook(...)`).
- Skia se sustituye por un mock propio (`test/setup/skia.ts`); Reanimated usa su mock oficial ampliado con `useFrameCallback` (`test/setup/reanimated.ts`).
- `npm run typecheck` corre `tsc --noEmit`.
- `npm run lint` corre `expo lint` (ESLint 9 con `eslint-config-expo` y `eslint-plugin-prettier`, config en `eslint.config.js`; ignora `docs/`, `android/`, `.expo/` y `dist/`). Las diferencias de formato cuentan como errores de lint. `npm run lint:fix` corrige lo automático.
- `npm run format` aplica Prettier (`.prettierrc`); `npm run format:check` solo verifica.
- VS Code: `.vscode/settings.json` del proyecto formatea al guardar con Prettier y aplica las correcciones de ESLint. Extensiones recomendadas en `.vscode/extensions.json`.

## Estructura por componente

Cada componente, pantalla, hook o módulo vive en su propia carpeta con:

- `NombreComponente.tsx` (o `.ts`)
- `NombreComponente.styles.ts`
- `NombreComponente.types.ts`
- `NombreComponente.test.tsx` (o `.ts`)
- `README.md` con la documentación: propósito, props o parámetros, ejemplo de uso y decisiones de diseño
- `index.ts` que exporta el componente y sus tipos

Reglas:

- **Excepción:** las rutas de `src/app/` no siguen esta convención de seis archivos, porque no contienen lógica (solo reexportan o renderizan una pantalla de `screens/`). Si una ruta necesita lógica, esa lógica va a una pantalla, hook o módulo que sí cumpla la convención.
- Los hooks y los módulos de `core` no llevan archivo de estilos.
- En componentes de Skia, el archivo de estilos contiene las constantes visuales (colores, tamaños, grosores).
- Nunca crear un componente sin sus tests y su README.

## Flujo de git

- Cada hito se trabaja en una rama propia (`hito-N-descripcion`), nunca directamente en `main`. La rama base de los PR es `main`.
- Commits chicos y descriptivos, en español, uno por paso del hito.
- Los commits requieren mi confirmación: el hook global (`~/.claude/custom-hooks`, `autoCommit: false`) los bloquea hasta que yo los apruebo o los ejecuto. No modificar ese hook ni ese ajuste.
- Al cerrar cada hito, **antes del push**: correr `npm run lint`, `npm test` y `npm run typecheck`, y que los tres terminen **sin errores**. Si alguno falla, se corrige antes de dar el comando de push.
- Claude **no hace push ni abre el PR**. Hace lo siguiente:
  1. Escribe el título y la descripción del PR en `docs/pr/hito-N.md` (resumen de lo hecho y cómo probarlo).
  2. Me da el comando exacto de push, por ejemplo `git push -u origin hito-N-descripcion`.
  3. Yo hago el push, creo el PR desde la web de GitHub (cuenta `MairaJulian`) usando ese archivo, y lo reviso.
- GitHub CLI (`gh`) no se usa en este proyecto.
- Nunca fusionar el PR: lo fusiono yo.

## Configuración

Todo lo que se configure vive dentro del proyecto. Nunca modificar configuración global (git, Claude Code, GitHub CLI, VS Code). Hay una cuenta laboral en esta computadora que no puede verse afectada.
