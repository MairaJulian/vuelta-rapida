# useProfiles

Guarda y lee los perfiles de los jugadores, el perfil activo y sus récords. Las reglas y la validación están en `core/Profiles`; el disco, en `storage/SaveStore` (documento `profiles`, clave `player-profiles`).

## Devuelve

| Valor | Descripción |
|---|---|
| `state` | `ProfilesState` actual. Todas las pantallas montadas ven el mismo valor. |
| `profiles` | Los perfiles, en el orden en que se crearon. |
| `activeProfile` | Quién está jugando, o `null`. |
| `createProfile(draft)` | Crea un perfil con id y fecha nuevos, lo deja activo y lo guarda. Devuelve `ProfileResult`. |
| `updateProfile(id, draft)` | Cambia nombre, color y número. Devuelve `ProfileResult`. |
| `deleteProfile(id)` | Borra el perfil y sus récords. |
| `selectProfile(id)` | Elige quién juega. |

También exporta, para usar fuera de React:
- `readProfiles()`: lectura síncrona.
- `updateProfiles(change)`: aplica un cambio puro y lo guarda.
- `createPlayerProfile`, `updatePlayerProfile`, `deletePlayerProfile` y `selectPlayerProfile`.
- `reloadProfiles()`: vuelve a leer del disco.
- `PROFILES_KEY`.

## Ejemplo

```tsx
const { profiles, activeProfile, createProfile } = useProfiles();

const result = createProfile({ name: 'Male', colorId: 'pink', number: 27 });
if (!result.ok) {
  setErrors(result.errors);
}
```

## Decisiones de diseño

- **Mismo esquema que `usePlayerPreferences`:** `useSyncExternalStore` con una copia en memoria. El disco se lee una sola vez y cada cambio se guarda en el momento y avisa a todas las pantallas, sin proveedor de contexto.
- **Id y fecha se generan aquí** (`Date.now()` y `Math.random()`, sin dependencias): `core` los recibe como parámetros y sigue siendo puro.
- **`updateProfiles(change)` recibe una función:** el cambio se calcula sobre el estado del momento, no sobre el del último render. Si devuelve el mismo estado, no escribe.
- **Nunca rompe el juego:** si el disco falla al leer, no hay perfiles; si falla al guardar, el cambio vale para la sesión.
- **Escrituras pocas:** al crear, editar, borrar o elegir un perfil, y con cada récord nuevo. Nunca por cuadro.
