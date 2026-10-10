# usePlayerPreferences

Guarda y lee las preferencias del celular entre partidas: modo de control, calibración de la inclinación, sensibilidad, zona muerta, sonido y vibración. Las comparten todos los perfiles. Las reglas y la validación están en `core/PlayerPreferences`; el disco, en `storage/SaveStore` (documento `preferences`, clave `player-preferences`).

## Devuelve

| Valor | Descripción |
|---|---|
| `preferences` | `PlayerPreferences` actuales. Todas las pantallas montadas ven el mismo valor. |
| `updatePreferences(changes)` | Cambia algunos campos y los guarda en el momento. |

También exporta:
- `readPlayerPreferences()`: lectura síncrona fuera de React.
- `updatePlayerPreferences(changes)`: el mismo guardado, fuera de React.
- `reloadPlayerPreferences()`: vuelve a leer del disco (y migra, si hace falta).
- `PREFERENCES_KEY`.

## Ejemplo

```tsx
const { preferences, updatePreferences } = usePlayerPreferences();

updatePreferences({ controlMode: 'tilt' });
```

## Decisiones de diseño

- **`expo-sqlite/kv-store` en lugar de AsyncStorage o MMKV:**
  - Es oficial de Expo y tiene la versión fijada por el SDK 57.
  - Tiene lectura síncrona (`getItemSync`): la primera pantalla decide si hay que elegir el control o calibrar sin un estado de carga ni un parpadeo.
  - AsyncStorage solo es asíncrono, y MMKV suma una dependencia de terceros (y Nitro Modules) para cuatro valores.
  - Tiene código nativo, así que obliga a recompilar el dev build.
- **Un solo valor JSON** bajo `player-preferences`, con número de versión: se lee y se valida de una vez con `parsePlayerPreferences`.
- **A través de `storage/SaveStore`** (hito 6a): la primera lectura migra los datos guardados. Hasta la versión 1, este documento tenía los récords; ahora están en los perfiles (`useProfiles`).
- **`useSyncExternalStore` con una copia en memoria:** el disco se lee una sola vez. Cada cambio se guarda en el momento y avisa a todas las pantallas montadas, sin un proveedor de contexto.
- **Nunca rompe el juego:** si el almacenamiento falla al leer, se juega con los valores por defecto; si falla al guardar, el cambio vale igual para la sesión.
- **Escrituras pocas y síncronas:** solo al elegir, calibrar o mover la sensibilidad o la zona muerta. Nunca por cuadro.
- **Tests:** `test/setup/kv-store.ts` reemplaza el módulo nativo por un mapa en memoria.
