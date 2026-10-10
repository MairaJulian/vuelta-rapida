# Título

Hito 6a: perfiles de jugador y personalización del auto

# Descripción

## Resumen

Varios chicos comparten el celular. Desde este hito, cada uno tiene su perfil y sus tiempos quedan asociados a su nombre. Es la base del ranking por pista del hito 6b.

- **"¿Quién juega?"** al abrir el juego: una tarjeta por perfil y "Nuevo piloto". Aparece aunque haya un solo perfil, para que sumar a otro jugador sea evidente.
- **Personalización** (pantalla 04 del handoff):
  - Nombre, color de una paleta pensada para la pista y número del 1 al 99.
  - Vista previa del auto en tiempo real.
  - Editar y borrar, con confirmación antes de borrar.
- **En la pista,** el auto lleva el color y el número del perfil activo. El récord se guarda en ese perfil, y los resultados dicen "NOMBRE · #NN".
- **Datos guardados con número de versión y migraciones.** Los récords que ya existían pasan al primer perfil que se cree.

**No hace falta recompilar el dev build:** no hay dependencias nuevas ni cambios nativos. Alcanza con recargar el JS desde Metro.

## Arquitectura

```
expo-sqlite/kv-store
  player-preferences { version, control, calibración, sonido, vibración }   ← del celular
  player-profiles    { version, profiles, activeProfileId, records, unassignedRecords }
        ▲
        │ storage/SaveStore: único acceso al disco; migra antes del primer acceso
        │        └─ core/SaveData: versiones y migraciones (puro)
        │
hooks: usePlayerPreferences · useProfiles · useBestLapRecord
        │
core/Profiles (validar, crear, editar, borrar, elegir, récords) · core/CarPalette (colores)
```

- **`core` sigue siendo TypeScript puro.** La regla de ESLint ahora también le prohíbe importar `@/storage`.
- **Carpeta nueva `src/storage/`** (decisión confirmada en el plan). La migración toca dos documentos, así que no encaja en el hook de uno solo.

### Modelo de datos

```ts
Profile   { id, name, colorId, number, createdAt }
LapRecord { profileId, circuitId, lapMs, setAt }   // uno por perfil y circuito
ProfilesState { profiles, activeProfileId, records, unassignedRecords }
```

- **Los récords van aparte y se unen por `profileId`**, no por nombre.
  - El ranking del 6b filtra por circuito, ordena por `lapMs` (y por `setAt` si empatan) y cruza con los perfiles.
  - Cambiar el nombre o el color no toca los récords.
- **Un récord por jugador y circuito** (confirmado): un ranking con una fila por jugador.
- **El color se guarda como id de la paleta,** no como hex: se puede retocar un color sin migrar.
- **Preferencias del celular aparte:** control, calibración, sonido y vibración no son de cada chico. Los comparten todos los perfiles.

### Versionado y migración

| Versión | Hasta | Formato |
|---|---|---|
| 1 | hito 5b | Sin número de versión. Récords en `player-preferences.bestLapsMs`. |
| 2 | 6a | Cada documento con `version: 2`. Récords en `player-profiles`. |

- **v1 → v2:** `bestLapsMs` pasa a `unassignedRecords` en el documento nuevo de perfiles y sale de las preferencias. Las demás preferencias se conservan, también las que esta versión no conoce.
- **Primero se escriben los perfiles y después las preferencias.** Si la app se cierra en el medio, la próxima vez se completa sin duplicar ni perder: cada paso tolera documentos que ya están en la versión nueva.
- **Al crear el primer perfil,** los récords sin dueño pasan a ese perfil.
- **No toca lo que no entiende:**
  - Si los datos son de una versión más nueva, no se migran.
  - Si un documento tiene el JSON roto, no se reescribe.
  - Si falta un paso, no se migra.
- **Si el disco falla al migrar,** lo migrado queda en memoria durante la sesión. Tampoco se escriben las preferencias mientras los perfiles sigan pendientes, para no perder los récords.
- **Para la próxima versión:** subir `SAVE_VERSION` y sumar un paso a `SAVE_MIGRATIONS`. Un test falla si queda un hueco en la cadena. Está explicado en `core/SaveData/README.md` y en `CLAUDE.md`.

### Recolorear el auto

- **El asset base es la silueta vectorial del handoff** (`CarShape`), separada en dos capas:
  - **Pintura:** carrocería, trompa y alerón delantero. Toma el color del perfil.
  - **Fija:** gomas, alerones, cockpit y halo en tinta, casco amarillo y disco blanco.
- **El número** es un `Text` de Skia sobre el disco, en el color de las gomas, con la fuente del sistema (`matchFont`). Va centrado y se achica si no entra.
- **El mismo componente** dibuja el auto en la pista, en las tarjetas, en la personalización y en Inicio (`CarPreview`).
- **Descarté PNG + filtro de color:** pedía dos imágenes, se vería borroso en los menús y cuesta más en la GPU. El vector pasa tal cual al 3D.

## Cambios

### Paso 1: plan
Plan confirmado antes de empezar. Sin archivos.

### Paso 2: perfiles (core) y datos guardados
- **`core/CarPalette`** (nuevo): los 8 colores, `getCarColor` y la distancia entre colores (OKLab).
- **`core/Profiles`** (nuevo):
  - Validaciones: nombre obligatorio, sin espacios sobrantes, de hasta 12 caracteres y único entre perfiles (sin distinguir mayúsculas ni acentos); número de 1 a 99.
  - Crear, editar, borrar y elegir perfiles.
  - Mejor vuelta por perfil y circuito.
  - Valores sugeridos para un perfil nuevo.
  - Lectura tolerante y serialización.
- **`core/SaveData`** (nuevo): versión, pasos de migración y `migrateSave`.
- **`storage/SaveStore`** (nuevo): lectura y escritura en el disco, migración al primer acceso y orden de escritura.
- **`hooks/useProfiles`** (nuevo): almacén síncrono de los perfiles, con el mismo esquema que las preferencias.
- **`core/PlayerPreferences` y `usePlayerPreferences`:** sin `bestLapsMs` ni `withBestLap`. Guardan con versión, a través de `SaveStore`.
- **`useBestLapRecord`:** guarda en el perfil activo. Sin perfil activo, la vuelta queda sin dueño.
- **`eslint.config.js`:** `core` no puede importar `@/storage`.
- **Tests:**
  - validaciones, y creación, edición y borrado de perfiles;
  - migración de la versión actual (1) a la nueva (2), incluidos el corte a mitad de camino, la idempotencia, los datos más nuevos y el JSON roto;
  - fallas del disco al migrar y al guardar.

### Paso 3: pantallas
- **`PlayerSelectScreen`** (`/jugadores`, nueva), con `ProfileCard` y `NewProfileCard`.
- **`ProfileEditorScreen`** (`/piloto` y `/piloto?id=…`, nueva), con `ColorSwatches`, `NumberStepper`, `DriverBadge` y `ConfirmDialog`.
- **`ConfirmDialog`** (nuevo, reutilizable): velo y panel como la Pausa. Cancelan el botón, el velo y el botón Atrás de Android.
- **`IconButton`** (nuevo, chico): el botón ícono del handoff (lápiz y Garage).
- **`CarShape`:** número sobre el disco. Lo pasé a este paso porque la vista previa de la personalización ya lo necesitaba.
- **`CarPreview`** (nuevo, chico): el auto en un lienzo propio para los menús.
- **`HomeScreen`:**
  - Auto, número y récord del perfil activo.
  - Píldora del piloto con "Cambiar", que vuelve a "¿Quién juega?".
  - Botón Garage (del handoff), que edita el perfil activo.
  - Sin perfil activo, redirige a "¿Quién juega?".
- **`StartScreen`:** el juego arranca en `/jugadores`.
- **`Icon`:** `minus`, `plus`, `pencil`, `trash` y `userPlus`, de Phosphor 2.1.1 como el resto.

### Paso 4: en la pista
- **`DriveCanvas`:** props `carColor` y `carNumber`.
- **`DriveScreen`:** lee el perfil activo. Sin perfil, el auto es azul y sin número.
- **`RaceResults`:** "NOMBRE · #NN" encabeza la columna de vueltas (handoff, pantalla 09). Sin piloto, "Tus vueltas".

### Cierre
- **`CLAUDE.md`:** sección "Perfiles y datos guardados" (documentos, versionado, cómo sumar una migración y `SaveStore`), la carpeta `storage/` y el reinicio del almacenamiento en los tests.
- **`CREDITOS.md`:** el monoplaza (silueta del handoff, recoloreada) y el número.
- Esta descripción.

### Ajuste tras la primera prueba en el celular
- **Síntomas:** en la carrera no sonaba nada. Además, la app tardaba en abrir: a veces quedaba en 99 % y otras en una pantalla en blanco.
- **Lo que mostró el celular:**
  - El JS se cargaba por Wi-Fi (`Loading from 192.168.1.38:8081`), no por el cable.
  - En el dev build, react-native-audio-api también descarga cada WAV desde Metro. El audio arranca recién cuando termina de decodificarlos, y en el log el stream se abrió al entrar a la carrera pero recién arrancó 90 s después.
  - Las preferencias guardadas tienen el sonido prendido y el volumen multimedia no estaba en cero.
- **Arreglo en el código:** `useRaceAudio` ya no se traga el error de carga. En desarrollo avisa con `console.warn`, así una conexión mala con Metro no vuelve a pasar por "no suena nada". En la app final los WAV vienen dentro del APK.
- **Arreglo en el entorno:** levantar Metro por el cable (`adb reverse tcp:8081 tcp:8081` y `npx expo start --localhost`).
- **La migración en el celular funcionó:** el récord de 58,5 s quedó en el primer perfil creado.
- **Número de dos cifras en Inicio:**
  - Con el 15 se veía solo el 1. A 360 dp y con la fuente del sistema (más ancha que la Archivo angosta del handoff), dos cifras no entran en el panel: el texto se partía en dos líneas y la segunda quedaba afuera.
  - Ahora va en una sola línea, y con dos cifras a 290 dp. Verificado con una captura del celular.
  - Las cifras tienen todas el mismo ancho, así que cualquier número de dos cifras entra igual. Los de una cifra no cambian.

## Decisiones (confirmadas en el plan)

1. **Carpeta `src/storage/SaveStore`** para el disco y la migración.
2. **Rosa (`#F164AF`) en lugar de Tinta** en la paleta.
   - Una carrocería tinta se confunde con las gomas y los alerones (distancia OKLab 0,04) y el auto pierde la silueta en la pista.
   - Un test comprueba que cada color se distingue del asfalto (más de 0,18) y de las gomas (más de 0,3).
   - El mínimo contra el asfalto es el azul de siempre (0,19), que se ve bien.
3. **Nombre de hasta 12 caracteres** (pedido del hito; el handoff decía 10).
4. **Borrar un perfil borra sus récords.** El diálogo lo avisa.
5. **Un récord por jugador y circuito,** con fecha para desempatar.

## Otras decisiones

- **"¿Quién juega?" no está en el handoff:** la armé con sus tokens y componentes.
  - Tarjetas como las de la elección de control.
  - Borde azul en la del último que jugó.
  - Lápiz de Ø 48 en cada tarjeta.
- **Sin perfiles, la pantalla muestra solo "Nuevo piloto"** y explica para qué sirve. No salta directo a la creación.
- **Crear un perfil lo deja activo** y va a Inicio, con "¿Quién juega?" debajo en la pila: Atrás vuelve a elegir.
- **Nombres:**
  - Se guardan normalizados (sin espacios al principio ni al final, y de a uno en el medio) y se muestran en mayúsculas.
  - "Jose" y "JOSÉ" chocan; "Peña" y "Pena", no.
  - El largo se cuenta en caracteres (un emoji es uno).
- **Color y número pueden repetirse** entre perfiles: dos chicos pueden querer el 7.
- **Valores iniciales de un perfil nuevo:** el primer color que nadie usa y un número libre. Primero se prueban los de las escuderías del handoff (7, 14, 3, 21) y el 27.
- **Ayuda "Hasta 12 letras. Aparece en tus récords."** El handoff decía "en el auto y en tus récords", pero el auto lleva el número, no el nombre.
- **Borrar está en el encabezado** de la personalización, junto a Guardar: en 360 dp de alto no entra otra fila.
- **El error de validación aparece al tocar Guardar** y se va con el siguiente cambio.
- **Teclado en horizontal:** Android abre el campo en pantalla completa con el teclado. No hace falta reacomodar la pantalla.
- **Inclinación (solo desde el desarrollo):** con `tiltControl: true`, la elección de control y la calibración siguen yendo directo a la pista, sin pasar por "¿Quién juega?" (usan el último perfil activo). Lo dejé así porque esas pantallas solo se usan desde el panel; hay que revisarlo cuando se reactive en el 3D.

## Cómo probarlo

### Tests y calidad

```bash
npm test            # 891 tests en 75 suites
npm run typecheck
npm run lint
```

### En el celular

Con Metro corriendo, recargar la app (no hace falta `npm run android`).

1. **Migración** (en tu celular, que ya tiene récords del hito 5b):
   - Al abrir aparece "¿Quién juega?", solo con "Nuevo piloto".
   - Crear un perfil. En Inicio tiene que aparecer el récord que ya tenías en el Autódromo del Lago.
2. **Crear:**
   - Probar un nombre vacío, uno con espacios de más ("  Juan   Cruz ") y uno repetido con otras mayúsculas o acentos.
   - Los colores y el número cambian la vista previa en el momento.
   - El número da la vuelta de 99 a 1 y de 1 a 99.
3. **Varios jugadores:**
   - Crear un segundo perfil y correr con cada uno.
   - Cada uno ve su récord en Inicio y en el HUD.
   - En "¿Quién juega?", cada tarjeta muestra el suyo y la del último que jugó tiene el borde azul.
4. **En la pista:**
   - El auto tiene el color y el número del perfil. Revisar que el número se lea sobre el disco con la cámara de la carrera.
   - Revisar los 8 colores sobre el asfalto, en especial Azul y Violeta (los de menos contraste) y Blanco con los bordes blancos de la pista.
5. **Resultados:** "NOMBRE · #NN" arriba de las vueltas.
6. **Inicio:**
   - "Cambiar" vuelve a "¿Quién juega?".
   - Garage abre la personalización del jugador; al guardar, vuelve a Inicio con los cambios.
7. **Borrar:**
   - Desde el lápiz o el Garage, "Borrar" pide confirmación. Cancelar (botón, velo o Atrás) no borra.
   - Confirmar vuelve a "¿Quién juega?", y los récords de ese jugador desaparecen.
8. **Rendimiento:** los fps de la carrera no deberían cambiar. Hay un solo texto más por cuadro, el número.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
