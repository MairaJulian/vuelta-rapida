# Vuelta Rápida — contexto del proyecto

Ver también [AGENTS.md](AGENTS.md) (reglas genéricas de Expo). Si se contradicen, manda este archivo: el alcance es solo Android, Skia y react-native-filament son decisiones deliberadas, y antes de dar algo por hecho corren `npm run lint`, `npm run typecheck` y `npm test`.

## Objetivo y stack

- Carreras de monoplazas con vista cenital para Android: juego para mi hijo (10-12 años, fan de la F1) y pieza de portfolio. Futuro: versión 3D (react-native-filament), rivales con IA, multijugador local. Sin online.
- Expo con dev builds, TypeScript estricto, Skia (2D), Reanimated (loop de juego), solo Android, horizontal bloqueada (`sensorLandscape`).
- Control: botones en pantalla. La inclinación está desactivada (`FEATURE_FLAGS.tiltControl`), solo accesible desde el panel de desarrollo; su código, pantallas y tests se conservan.
- Rendimiento: piso de gama media Android, 60 fps. Lo repetido (árboles, sombras, partículas) va con `Atlas` y solo lo que ve la cámara; lo estático, en pocos `Path`.

## Arquitectura

- `src/core/` es TypeScript puro: sin React, React Native ni Skia, y sin importar `audio/`, `haptics/` ni `storage/` (lo hace cumplir ESLint).
- La simulación corre en el hilo de UI. Las funciones de `core` llamadas desde el loop llevan `'worklet'`. En un worklet, nunca usar una constante del módulo como valor por defecto de un parámetro (la app se cae; ESLint lo detecta, Jest no): el valor va en el cuerpo.
- El modelo de manejo trabaja en un plano x/z. El render solo lee estado, sin lógica. El estado de la carrera es serializable.
- Datos guardados: `src/storage/SaveStore` es lo único que toca el disco. Cambiar un formato exige subir `SAVE_VERSION`, sumar un paso a `SAVE_MIGRATIONS` y un test con datos de la versión anterior. Nunca cambiar el formato sin migración.
- Pistas: son datos en `CIRCUIT_DEFINITIONS` (`core/Circuits`); el test parametrizado las valida.
- El color del auto se guarda como id de la paleta, nunca como hex.

## Estructura y convención de archivos

Alias `@/` = `src/`. Carpetas: `app/` (rutas finas), `core/`, `input/`, `audio/`, `haptics/`, `render/`, `components/`, `hooks/`, `screens/`, `storage/`. Se crean cuando hacen falta.

- Cada componente, pantalla, hook o módulo vive en su carpeta.
- Completa (módulos de `core`, pantallas, componentes reutilizables): `Nombre.tsx|ts`, `.styles.ts`, `.types.ts`, `.test.tsx|ts`, `README.md` (propósito, props, ejemplo, decisiones) e `index.ts`.
- Componentes chicos de UI: solo `.tsx`, `.styles.ts`, `.types.ts` e `index.ts`; sin test ni README propio.
- Hooks y módulos sin interfaz: completa, sin estilos. Las rutas de `src/app/` quedan exentas.
- Nunca crear un módulo de `core`, un hook ni un componente principal sin su README.
- Assets: packs CC0, registrar fuente y licencia en [CREDITOS.md](CREDITOS.md). Sonidos en WAV mono, nunca OGG.

## Tests

- Solo lógica de `core` con riesgo real: simulación, vueltas, ranking, migraciones y validación de pistas. No se testean pantallas, componentes ni render. Los tests existentes se mantienen.
- `npm test` (jest-expo, RNTL 14 asíncrona: `await render(...)`). Mocks propios en `test/setup/`.
- `npm run lint` (Prettier cuenta como error; `lint:fix` corrige), `npm run typecheck`, `npm run format`.

## Git

- Una rama por hito (`hito-N-descripcion`), nunca en `main`; los PR salen contra `main`. Un commit por paso, descriptivo y en español.
- Los commits requieren mi confirmación (hook global, `autoCommit: false`): no modificar ese hook ni ese ajuste. Nunca push, merge ni `gh`: los hago yo.
- Trabajar el hito completo sin frenar. Frenar solo ante pausas pedidas, decisiones de arquitectura o dependencias nuevas.
- Al cerrar: lint, tests y typecheck sin errores; entregar un bloque de commit por paso (PowerShell, rutas explícitas) y el comando `git push -u origin <rama>`. Sin archivos de descripción de PR.
- Sin permiso previo (informando al cerrar): cambiar config nativa (avisar de recompilar), borrar o renombrar archivos, ajustar valores de manejo (indicando antes y después), reorganizar carpetas. Con confirmación: `npm install` (aclarar si es nativo).
- Nunca modificar configuración global (git, Claude Code, VS Code): hay una cuenta laboral en esta computadora.

## Marca y diseño

- No usar "F1", "Formula 1", logos, equipos, pilotos ni decoraciones reales: monoplazas genéricos, nombres inventados.
- Diseño: consultar [docs/design/RESUMEN.md](docs/design/RESUMEN.md) (tokens y pantallas); el handoff completo en `docs/design/` solo ante una duda puntual.
