# SaveData

Versión de los datos guardados y migraciones entre versiones. TypeScript puro: recibe el texto de cada documento y devuelve lo que hay que escribir. Quien lee y escribe el disco es `storage/SaveStore`.

## Documentos

| Documento | Clave (`SaveStore`) | Contenido |
|---|---|---|
| `profiles` | `player-profiles` | Perfiles, perfil activo y récords (`core/Profiles`). |
| `preferences` | `player-preferences` | Ajustes del celular: control, calibración, sonido y vibración (`core/PlayerPreferences`). |

Cada documento lleva su número de versión en el campo `version`.

## Versiones

| Versión | Hito | Cambio |
|---|---|---|
| 1 | hasta 5b | Sin número de versión. Los récords están en las preferencias (`bestLapsMs`). |
| 2 | 6a | Perfiles. Los récords pasan al documento `profiles`, sin dueño (`unassignedRecords`), hasta que se crea el primer perfil. |
| 3 | 6b | Ranking. `records` pasa a llamarse `lapRecords` y se suma `raceRecords` (mejores carreras completas, vacío al migrar: antes no se guardaban). Las preferencias solo cambian el número. |
| 4 | 8 | Fantasma. Los perfiles suman `ghosts` (la grabación de la mejor vuelta de cada perfil en cada pista; vacía al migrar: antes no se grababa) y las preferencias suman `ghostSource` (`mine`, `record` o `none`; por defecto `mine`). Si el documento ya tiene el campo, no lo pisa. |

## API

| Exporta | Qué hace |
|---|---|
| `migrateSave(raw, migrations?, targetVersion?)` | Lleva los documentos a la versión actual. Devuelve `{ fromVersion, documents, writes }`. |
| `SAVE_VERSION` | Versión actual (4). |
| `SAVE_MIGRATIONS` | Un paso `{ from, to, migrate }` por versión. |
| `SAVE_DOCUMENTS` | Los documentos, en el orden en que se escriben: `profiles` y después `preferences`. |
| `serializeSaveDocument(fields, version?)` | Texto de un documento con la versión primero. Lo usan los serializadores de cada módulo. |
| `parseSaveDocument(raw)`, `getDocumentVersion(document)` | Leer un documento y su versión (sin número, es la 1). |
| `LEGACY_SAVE_VERSION` | 1. |

## Ejemplo

```ts
const { writes } = migrateSave({
  profiles: Storage.getItemSync('player-profiles'),
  preferences: Storage.getItemSync('player-preferences'),
});
writes.forEach(({ document, json }) => Storage.setItemSync(KEYS[document], json));
```

## Cómo sumar una versión

1. Subir `SAVE_VERSION`.
2. Agregar a `SAVE_MIGRATIONS` el paso `{ from: N, to: N + 1, migrate }`.
   - El paso recibe los documentos como objetos JSON de la versión `N` y devuelve los de `N + 1`.
   - Trabaja sobre el JSON de esa versión y no usa los tipos ni los parsers actuales, que pueden cambiar después.
3. Agregar un test que parta de datos reales de la versión `N`.

El test "hay un paso por versión, sin huecos" falla si falta el paso.

## Decisiones de diseño

- **Una versión para todos los documentos:** un paso puede mover datos de un documento a otro, como pasa en la v2 con los récords. La versión de partida es la del documento más viejo.
- **Orden de escritura fijo, primero el documento que recibe datos:** si la app se cierra entre las dos escrituras, el disco queda con los perfiles nuevos y las preferencias viejas. La próxima migración lo completa sin duplicar, porque cada paso tolera documentos que ya están en la versión nueva.
- **Idempotente:** migrar algo ya migrado no escribe nada.
- **No toca lo que no entiende:**
  - Si los datos son de una versión más nueva que la app, no los modifica.
  - Si falta un paso, tampoco.
  - Si un documento tiene el JSON roto, no lo reescribe.
- **Conserva los campos que no conoce:** un paso solo cambia lo suyo. Si se instala una versión anterior de la app, los datos de más siguen ahí.
- **Pura:** las escrituras las hace `storage/SaveStore`, en el orden que devuelve `writes`.
