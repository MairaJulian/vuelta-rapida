# Profiles

Perfiles de los jugadores que comparten el celular: nombre, color y número del auto, quién está jugando y la mejor vuelta de cada uno en cada circuito. Aquí están los tipos, las validaciones y las reglas; el guardado lo hace el hook `useProfiles`. TypeScript puro.

## Tipos

- `Profile`: `{ id, name, colorId, number, createdAt }`.
- `ProfileDraft`: `{ name, colorId, number }`, lo que elige el jugador.
- `LapRecord`: `{ profileId, circuitId, lapMs, setAt }`. Uno por perfil y circuito: la mejor vuelta.
- `ProfilesState`: `{ profiles, activeProfileId, records, unassignedRecords }`. Es el documento `profiles` de los datos guardados.
- `ProfileError`: `'name-empty' | 'name-too-long' | 'name-taken' | 'number-out-of-range' | 'color-unknown' | 'profile-missing'`.
- `ProfileResult`: `{ ok: true, state, profile }` o `{ ok: false, errors }`.

## API

| Exporta | Qué hace |
|---|---|
| `validateProfile(draft, profiles, editingId?)` | Errores de un perfil; vacío si está bien. |
| `createProfile(state, draft, { id, now })` | Crea el perfil y lo deja activo. Le pasa los récords sin dueño. |
| `updateProfile(state, id, draft)` | Cambia nombre, color y número. |
| `deleteProfile(state, id)` | Borra el perfil y sus récords. |
| `selectProfile(state, id)`, `getActiveProfile(state)`, `getProfile(state, id)` | Quién juega. |
| `getBestLap(state, profileId, circuitId)` | Mejor vuelta en ms, o `null`. Con `profileId` `null`, la sin dueño. |
| `withLapRecord(state, profileId, circuitId, lapMs, now)` | Estado con la vuelta si mejora el récord; si no, `null`. |
| `suggestProfileDraft(profiles)` | Valores iniciales de un perfil nuevo. |
| `stepCarNumber(number, delta)` | Número siguiente o anterior, de 1 a 99, dando la vuelta. |
| `createProfileId(now, random, takenIds)` | Id nuevo, distinto de los existentes. |
| `normalizeName(raw)`, `nameLength(name)`, `nameKey(name)` | Reglas del nombre. |
| `parseProfilesState(raw)`, `serializeProfilesState(state)` | Leer y guardar el documento. |
| `EMPTY_PROFILES_STATE`, `MAX_NAME_LENGTH` (12), `MIN_CAR_NUMBER` (1), `MAX_CAR_NUMBER` (99) | Constantes. |

## Ejemplo

```ts
const result = createProfile(state, { name: ' Male ', colorId: 'blue', number: 27 }, { id, now });
if (result.ok) {
  save(result.state); // Male queda activo
} else {
  show(result.errors); // ['name-taken']
}
```

## Decisiones de diseño

- **Récords aparte, unidos por `profileId`:** el ranking por pista (hito 6b) filtra `records` por circuito, ordena por `lapMs` (y por `setAt` si empatan) y cruza con `profiles`. Si un jugador cambia de nombre o de color, el ranking lo muestra sin tocar los récords.
- **Un récord por perfil y circuito:** alcanza para un ranking con una fila por jugador. El fantasma, cuando exista, irá en su propia clave: es demasiado grande para este documento.
- **El nombre se guarda normalizado** (`normalizeName`): sin espacios al principio ni al final y de a uno en el medio. Se muestra en mayúsculas.
- **Nombres únicos sin distinguir mayúsculas ni acentos** (`nameKey`): "Jose" y "JOSÉ" se verían casi igual. La tilde de la ñ se conserva: "Peña" y "Pena" son distintos.
- **Largo en caracteres, no en unidades de UTF-16:** un emoji cuenta como uno.
- **12 caracteres** (pedido del hito 6a; el handoff decía 10).
- **Color y número pueden repetirse:** dos chicos pueden querer el 7.
- **Crear deja activo el perfil nuevo:** quien lo crea es quien va a jugar.
- **Récords sin dueño** (`unassignedRecords`): los de antes de los perfiles (los trae la migración de `core/SaveData`) pasan al primer perfil que se cree. También guardan una vuelta hecha sin perfil activo (una ruta directa de desarrollo).
- **Borrar un perfil borra sus récords:** el ranking no muestra jugadores que ya no existen. La pantalla lo avisa antes de borrar.
- **Id y fecha llegan como parámetros:** el hook los genera (fecha y azar); aquí las funciones siguen siendo puras y los tests deterministas.
- **Lectura tolerante:** un perfil sin id válido (o con id repetido) se descarta. Los otros campos inválidos se corrigen: el nombre se recorta, y el color y el número vuelven a sus valores por defecto. Los récords de perfiles que no existen se descartan.
