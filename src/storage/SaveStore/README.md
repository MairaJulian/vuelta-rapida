# SaveStore

Acceso al disco de los datos guardados: lee y escribe cada documento en el almacenamiento clave-valor de expo-sqlite (`expo-sqlite/kv-store`) y migra los datos a la versión actual antes del primer acceso. Las reglas de la migración están en `core/SaveData`. Los hooks `usePlayerPreferences` y `useProfiles` guardan a través de este módulo.

## API

| Exporta | Qué hace |
|---|---|
| `readSaveDocument(name)` | Texto de un documento ya migrado; `null` si no existe o si el disco falla. |
| `writeSaveDocument(name, json)` | Guarda un documento. Devuelve si se pudo. |
| `ensureSaveMigrated()` | Migra una sola vez por sesión. Lo llaman la lectura y la escritura. |
| `reloadSaveStore()` | Olvida lo hecho en la sesión: la próxima lectura vuelve al disco y migra de nuevo. |
| `SAVE_KEYS` | `{ preferences: 'player-preferences', profiles: 'player-profiles' }`. |

## Ejemplo

```ts
const preferences = parsePlayerPreferences(readSaveDocument('preferences'));
writeSaveDocument('preferences', serializePlayerPreferences(next));
```

## Decisiones de diseño

- **Carpeta `src/storage/` (acordado en el plan del hito 6a):** la migración toca dos documentos, así que no encaja en el hook de uno solo. `core` no puede importar esta capa (regla de ESLint).
- **Migra en el primer acceso, lectura o escritura:** nada escribe en el disco antes de migrar. Así las preferencias nunca se guardan sin los récords antes de que estos pasen a los perfiles.
- **Síncrono**, como la lectura de las preferencias: la primera pantalla decide sin estado de carga.
- **Misma clave de siempre para las preferencias** (`player-preferences`): los datos de antes de los perfiles se encuentran y se migran.
- **Si el disco falla al migrar:**
  - Lo que no se pudo escribir queda en memoria y se lee de ahí durante la sesión.
  - Las escrituras respetan el orden de `SAVE_DOCUMENTS`: no se guardan las preferencias mientras los perfiles sigan pendientes, porque se perderían los récords.
  - La próxima vez se vuelve a migrar desde el disco.
- **Si el disco falla al leer,** no se toca nada y se juega con los valores por defecto.
- **Tests:** `test/setup/kv-store.ts` reemplaza el módulo nativo por un mapa en memoria.
