/**
 * Mock en memoria de expo-sqlite/kv-store (el módulo nativo de SQLite no existe en
 * Jest). Mismos métodos síncronos que usa el proyecto; `__reset()` lo vacía.
 */
jest.mock('expo-sqlite/kv-store', () => {
  const data = new Map<string, string>();
  const storage = {
    getItemSync: jest.fn((key: string) => data.get(key) ?? null),
    setItemSync: jest.fn((key: string, value: string) => {
      data.set(key, value);
    }),
    removeItemSync: jest.fn((key: string) => data.delete(key)),
    __reset: () => data.clear(),
  };
  return { __esModule: true, default: storage };
});
