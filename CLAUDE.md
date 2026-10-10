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

- Versión 3D con react-native-filament y cámara detrás del auto. Ahí se reevalúa el control por inclinación (hoy desactivado, ver Controles).
- Más adelante: rivales con IA y multijugador local.
- El online está fuera del alcance por ahora.

## Arquitectura (regla principal)

- La lógica del juego (modelo de manejo, reglas de carrera, vueltas, tiempos, fantasma) vive en **TypeScript puro**: sin importar nada de React, React Native ni Skia. Una regla `no-restricted-imports` en `eslint.config.js` lo hace cumplir en `src/core/`.
- La simulación corre en el hilo de UI (worklets de Reanimated). Las funciones de `core` que se llaman desde el loop llevan la directiva `'worklet'`, que es un texto y no un import.
- En un worklet, nunca usar una variable (una constante del módulo) como valor por defecto de un parámetro: el plugin no la lleva al hilo de UI y la app se cae ("Property 'X' doesn't exist"). Jest no lo detecta; una regla de ESLint (`no-restricted-syntax` en `eslint.config.js`) sí. El valor por defecto va en el cuerpo: `const config = settings ?? DEFAULT_CONFIG`.
- El modelo de manejo trabaja en un plano (coordenadas x/z) para poder reutilizarse en 3D.
- El renderizado solo lee el estado; nunca contiene lógica.
- El estado de la carrera es serializable (posición, velocidad, ángulo por cuadro), pensado para el auto fantasma y un eventual online.
- La escenografía es un dato del circuito (`Circuit.scenery`): la genera `core/Scenery` con la semilla de la definición. Se genera al abrir la carrera (`withCircuitScenery`), no al iniciar la app: tarda unos cientos de milisegundos en el celular.

## Perfiles y datos guardados

El celular lo comparten varios chicos: al abrir el juego se elige quién juega (`/jugadores`), y cada perfil tiene su nombre, su auto (color y número) y sus récords.

- **Dos documentos** en `expo-sqlite/kv-store`, cada uno con su campo `version`:
  - `player-profiles`: perfiles, perfil activo y récords (`core/Profiles`).
  - `player-preferences`: lo del celular, compartido por todos los perfiles: control, calibración, sonido y vibración (`core/PlayerPreferences`).
- **Versionado y migraciones** en `core/SaveData` (puro). Para cambiar el formato de lo guardado:
  1. Subir `SAVE_VERSION`.
  2. Sumar un paso `{ from, to, migrate }` a `SAVE_MIGRATIONS`, con un test que parta de datos reales de la versión anterior.
  - Nunca cambiar el formato sin migración.
  - v1 = hasta el hito 5b (sin versión, con los récords en las preferencias). v2 = perfiles.
- **`src/storage/SaveStore`** es el único que toca el disco: migra antes del primer acceso y escribe en el orden de `SAVE_DOCUMENTS`. Los hooks (`usePlayerPreferences`, `useProfiles`) guardan a través de él. `core` no lo importa (regla de ESLint).
- **Récords por perfil y circuito,** unidos por `profileId` (no por nombre), con la fecha para desempatar. Están pensados para el ranking por pista del hito 6b.
- **El color del auto se guarda como id de la paleta** (`core/CarPalette`), nunca como hex.
- **Un solo asset del auto** (`CarShape`): la "pintura" toma el color del perfil y el número va en el disco.

## Controles

Capa de entrada abstraída con dos implementaciones intercambiables. Aceleración automática en ambos.

**Los botones son el único control visible.** En dos pruebas con usuarios los testers prefirieron los botones; la segunda se hizo con la inclinación ya corregida (zona muerta y sensibilidad independientes, hito 3).

- La inclinación queda **desactivada** con el interruptor `FEATURE_FLAGS.tiltControl` (`src/core/FeatureFlags`). El juego arranca directo con botones, sin elección de control ni calibración. Si había inclinación guardada, la entrada la pasa a botones.
- Sigue accesible **solo desde el panel de desarrollo**. Su código, sus pantallas y sus tests quedan en el proyecto: no borrarlos.
- Se reevalúa en la **fase 3D**, con la cámara detrás del auto. Para activarla, `tiltControl: true`: vuelven la elección de control (sin modo por defecto) y la calibración.
- **Rampa de los botones, sin cambios:** en la segunda prueba se subió "Rampa de dirección (inclinación)" a 0,33 s y la conducción pareció mejorar. Pero ese parámetro solo se aplica en modo inclinación. Los botones usan "Tiempo de giro" (`steerInTime`, 0,25 s) y "Tiempo de vuelta al centro" (`steerReturnTime`, 0,15 s), del modelo de manejo. Probar los 0,33 s en botones queda pendiente.

- **Inclinación** (desactivada): control por posición. El ángulo del celular respecto de la gravedad es el ángulo de dirección. Incluye calibración, zona muerta, suavizado, sensibilidad ajustable y corrección según la orientación horizontal.
  - La zona muerta es un valor fijo en grados (el jugador elige de 1° a 9°) e independiente de la sensibilidad. La sensibilidad define el rango útil a partir del borde de la zona muerta. Subirla siempre reduce el ángulo necesario y la dirección crece desde 0, sin saltos.
  - Los indicadores (medidor de calibración y HUD) usan una escala fija en grados. Nunca escalarlos con la sensibilidad: la zona muerta parecería crecer.
  - La corrección por orientación se hace una sola vez, en `core/TiltSteering`: el sensor se registra con `adjustToInterfaceOrientation: false`.
  - En el menú de pausa del juego final, "Recalibrar" tiene que abrir la pantalla de calibración completa. El botón "Recalibrar" del panel de desarrollo solo toma la posición del momento.
- **Botones en pantalla** (el control por defecto y el único visible).

## Marcas

No usar "F1", "Formula 1", logos, equipos, pilotos ni decoraciones reales. Monoplazas genéricos y nombres inventados.

## Rendimiento

El piso es un celular Android de gama media. Objetivo: 60 fps.

- Lo que se repite cientos de veces (árboles, sombras, neumáticos, partículas) se dibuja con `Atlas` de Skia, y solo lo de las celdas que ve la cámara (`useSceneryView`).
- El paralaje es una transformación por capa de altura, no un cálculo por objeto.
- Lo estático va en pocos trazos (todos los parches del asfalto en un `Path`). Evitar `Points` con miles de puntos redondos: en la GPU, Skia dibuja cada uno como un óvalo aparte.

## Diseño

El handoff está en [docs/design](docs/design). Es la referencia visual para todas las pantallas.

## Assets

Packs CC0 de estilo plano/low-poly. Registrar la fuente y licencia de cada asset en [CREDITOS.md](CREDITOS.md).

- **Sonidos en WAV mono** (`assets/sounds/`): sin FFmpeg ni las bibliotecas externas de react-native-audio-api (`app.json`), el decodificador solo lee WAV, MP3 y FLAC. OGG no sirve.
- Los efectos se sintetizan con `node scripts/generate-sounds.mjs`; el motor se pasa a mono con `--engine <ruta>` (ver CREDITOS.md).
- **Escenografía dibujada en código** con la paleta del handoff, sin pack externo (ver CREDITOS.md). La textura de árboles y partículas se rasteriza una vez por sesión (`useSceneryAtlas`).
- **Ícono de la app** en `assets/icono/`, tal cual lo entrega el handoff (`docs/design/.../icono/`). Si cambia, hay que regenerar `android/` (`npx expo prebuild --platform android`) y recompilar.

## Estructura de carpetas

Alias `@/` apunta a `src/` (en `tsconfig.json` y en `jest.config.js`).

```
src/
  app/        rutas de Expo Router; archivos finos que solo renderizan screens/
  core/       TS puro (sin React/RN/Skia): manejo, carrera, vueltas, fantasma
  input/      capa de entrada abstraída (inclinación, botones)
  audio/      sonido sobre react-native-audio-api (motor y efectos)
  haptics/    vibraciones sobre expo-haptics
  render/     componentes Skia; solo leen estado
  components/ UI genérica (HUD, botones)
  hooks/      conectan core con Reanimated/React
  screens/    pantallas completas
  storage/    acceso al disco (expo-sqlite/kv-store) y migración de los datos guardados
assets/icono/  ícono de la app (capas del ícono adaptativo de Android)
assets/sounds/ sonidos WAV (ver CREDITOS.md)
scripts/      herramientas de Node sin dependencias (generar sonidos)
test/setup/   mocks y setup global de Jest (Skia, Reanimated, audio, almacenamiento)
```

- La carrera avisa lo que pasa por un bus de eventos (`core/EventBus`): el semáforo, la pausa, los resultados, el sonido y la vibración lo escuchan. `core` no importa `audio/`, `haptics/` ni `storage/` (regla de ESLint).

Las carpetas se crean cuando hacen falta, no antes.

## Tests

- `npm test` corre Jest (preset `jest-expo`, React Native Testing Library 14, que es asíncrona: usar `await render(...)` y `await renderHook(...)`).
- Skia se sustituye por un mock propio (`test/setup/skia.ts`; incluye `Atlas`, `Points`, los buffers, `drawAsImage` y `mixColors`); Reanimated usa su mock oficial ampliado con `useFrameCallback`, `modify` y valores compartidos que duran toda la vida del componente (`test/setup/reanimated.ts`); react-native-audio-api usa su mock oficial (`test/setup/audio-api.ts`).
- El almacenamiento es un mapa en memoria (`test/setup/kv-store.ts`). Los tests que guardan datos lo vacían (`__reset()`) y llaman a `reloadPlayerPreferences()` y `reloadProfiles()`: olvidan la copia en memoria y vuelven a migrar.
- `npm run typecheck` corre `tsc --noEmit`.
- `npm run lint` corre `expo lint` (ESLint 9 con `eslint-config-expo` y `eslint-plugin-prettier`, config en `eslint.config.js`; ignora `docs/`, `android/`, `.expo/` y `dist/`). Las diferencias de formato cuentan como errores de lint. `npm run lint:fix` corrige lo automático.
- `npm run format` aplica Prettier (`.prettierrc`); `npm run format:check` solo verifica.
- VS Code: `.vscode/settings.json` del proyecto formatea al guardar con Prettier y aplica las correcciones de ESLint. Extensiones recomendadas en `.vscode/extensions.json`.

## Estructura por componente

Cada componente, pantalla, hook o módulo vive en su propia carpeta. Hay dos niveles.

**Convención completa (seis archivos):** módulos de `core` y componentes principales, es decir, pantallas y componentes reutilizables.

- `NombreComponente.tsx` (o `.ts`)
- `NombreComponente.styles.ts`
- `NombreComponente.types.ts`
- `NombreComponente.test.tsx` (o `.ts`)
- `README.md` con la documentación: propósito, props o parámetros, ejemplo de uso y decisiones de diseño
- `index.ts` que exporta el componente y sus tipos

**Componentes chicos de interfaz:** solo `NombreComponente.tsx`, `NombreComponente.styles.ts`, `NombreComponente.types.ts` e `index.ts`.

- Llevan test únicamente si tienen lógica.
- No llevan README propio: se documentan en el README de la pantalla o del módulo que los usa.

Reglas:

- **Excepción:** las rutas de `src/app/` no siguen esta convención, porque no contienen lógica (solo reexportan o renderizan una pantalla de `screens/`). Si una ruta necesita lógica, esa lógica va a una pantalla, hook o módulo que sí cumpla la convención.
- Los hooks y los módulos sin interfaz (`core`, `input`, etc.) siguen la convención completa, sin archivo de estilos.
- En componentes de Skia, el archivo de estilos contiene las constantes visuales (colores, tamaños, grosores).
- Nunca crear un módulo de `core`, un hook ni un componente principal sin sus tests y su README.
- Los componentes creados antes de esta regla (hito 5) quedan como están: no se adaptan a la convención nueva.

## Flujo de git

- Cada hito se trabaja en una rama propia (`hito-N-descripcion`), nunca directamente en `main`. La rama base de los PR es `main`.
- Un commit por paso del hito, no uno por cada cambio. Descriptivos y en español.
- Los commits requieren mi confirmación: el hook global (`~/.claude/custom-hooks`, `autoCommit: false`) los bloquea hasta que yo los apruebo o los ejecuto. No modificar ese hook ni ese ajuste.
- **Claude trabaja el hito completo sin frenarse** y yo reviso al final. No pide commits entre pasos ni espera a que commitee. Solo frena en estos casos:
  - Las pausas que yo pida en el enunciado (por ejemplo "Esperá mi confirmación").
  - Decisiones de arquitectura (estructura de capas, módulos nuevos que cambian cómo se conectan las partes, cambios a la regla de `core` puro, etc.).
  - Dependencias nuevas.

  Para el resto, avanza y explica las decisiones en la descripción del PR. Al terminar entrega:
  - Un bloque de commit por paso, para PowerShell, con rutas explícitas. Si un archivo cambió en más de un paso, va en el commit del último paso que lo tocó, y se aclara.
  - El comando de push y la descripción del PR (ver abajo).
- Al cerrar cada hito, **antes del push**: correr `npm run lint`, `npm test` y `npm run typecheck`, y que los tres terminen **sin errores**. Si alguno falla, se corrige antes de dar el comando de push.
- Claude **no hace push ni abre el PR**. Hace lo siguiente:
  1. Escribe el título y la descripción del PR en `docs/pr/hito-N.md` (resumen de lo hecho y cómo probarlo).
  2. Me da el comando exacto de push, por ejemplo `git push -u origin hito-N-descripcion`.
  3. Yo hago el push, creo el PR desde la web de GitHub (cuenta `MairaJulian`) usando ese archivo, y lo reviso.
- GitHub CLI (`gh`) no se usa en este proyecto.
- Nunca fusionar el PR: lo fusiono yo.

## Autorizaciones permanentes

Claude puede hacer lo siguiente sin pedirme permiso. Cada uso se informa al cerrar el trabajo y en la descripción del PR: qué cambió y por qué.

- **Cambiar la configuración nativa** (`app.json`, plugins, prebuild). Avisa que hay que recompilar el dev build (`npm run android`, con el celular conectado; lo hago yo).
- **Borrar o renombrar archivos o módulos.** Se sigue respetando lo que pedí conservar explícitamente, por ejemplo el código, las pantallas y los tests de la inclinación.
- **Cambiar valores del manejo** (rampa, velocidad, agarre, etc.). Solo lo indispensable para que algo se pueda jugar, con los valores de antes y de después.
- **Crear o reorganizar carpetas**, siguiendo la estructura por componente.

Esto requiere mi confirmación antes de hacerlo:

- **Agregar dependencias** (`npm install`). Al pedirla, aclarar si tiene código nativo (hay que recompilar el dev build).
- **Decisiones de arquitectura** (ver Flujo de git).

Esto no se habilita nunca, ni con permiso:

- Commits, push y merge: los hago yo, y el hook los bloquea.
- Modificar la configuración global o el hook (ver Configuración).

## Configuración

Todo lo que se configure vive dentro del proyecto. Nunca modificar configuración global (git, Claude Code, GitHub CLI, VS Code). Hay una cuenta laboral en esta computadora que no puede verse afectada.
