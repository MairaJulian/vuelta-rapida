# AsphaltDetails

Detalles sobre el asfalto, en coordenadas del mundo: parches un poco más claros o más oscuros y marcas de frenada antes de las curvas cerradas. Va encima de la pista (`TrackLayer`) y debajo de los autos. Los datos salen de la escenografía (`core/Scenery`).

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `scenery` | `Scenery` | Usa `patches` y `skidMarks`. |

## Ejemplo

```tsx
<Group transform={cameraTransform}>
  <TrackLayer track={track} />
  {track.scenery ? <AsphaltDetails scenery={track.scenery} /> : null}
</Group>
```

## Decisiones de diseño

- **Tres trazos para todo:** todos los parches claros en un path, los oscuros en otro y todas las marcas de frenada en un tercero. Son tres operaciones de dibujo por cuadro, haya 10 parches o 100.
- **Colores sólidos y no transparencias:** el gris de la pista del handoff con la luminosidad un poco más alta o más baja. Así se ven igual sobre cualquier parte del asfalto y no se apilan capas translúcidas.
- **Marcas de frenada fijas,** generadas como datos antes de cada curva cerrada: muestran dónde frena todo el mundo. Las del propio auto, que aparecen al frenar, quedan para más adelante.
- **Dan referencia de movimiento justo debajo del auto,** donde no llegan los árboles: en una recta, el asfalto liso parecía quieto.
