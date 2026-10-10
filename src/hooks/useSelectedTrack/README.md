# useSelectedTrack

La pista elegida en la sesión, compartida entre la selección de pista, la carrera y el ranking.

## API

| Exporta               | Qué hace                                                                             |
| --------------------- | ------------------------------------------------------------------------------------ |
| `useSelectedTrack()`  | `{ circuitId, select }`: la pista elegida y cómo cambiarla. Re-renderiza al cambiar. |
| `readSelectedTrack()` | Lectura síncrona, para el valor inicial de un estado.                                |
| `selectTrack(id)`     | Elige la pista sin pasar por un hook; un id que no existe elige la primera.          |

## Ejemplo

```tsx
const { circuitId, select } = useSelectedTrack();
// Selección de pista: <TrackCard selected={circuit.id === circuitId} onPress={() => select(circuit.id)} />
// Carrera: useEffect(() => selectTrack(track.id), [track.id]);
// Ranking: useState(() => readSelectedTrack());
```

## Decisiones de diseño

- **Solo en memoria:** la pista elegida es una comodidad de la sesión (el ranking abre en la última pista que se corrió), no un dato del jugador. Guardarla pediría tocar el formato de los datos y una migración sin necesidad.
- **Valor compartido a nivel de módulo, como `useProfiles`:** cualquier pantalla lo lee sin pasar parámetros por la navegación. Los enlaces con `?circuito=` siguen mandando sobre este valor.
- **Siempre una pista válida:** pasa por `getCircuit`, así que un id viejo no deja el estado roto.
