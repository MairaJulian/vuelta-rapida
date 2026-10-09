# useSceneryAtlas

Dibuja la textura de la escenografía (`render/SceneryAtlas`) fuera de pantalla con `drawAsImage` de Skia y la entrega como `SkImage`. Se dibuja una vez por sesión: las carreras siguientes reutilizan la misma.

## Devuelve

`SkImage | null`: `null` hasta que la textura está lista (o si no se pudo dibujar).

## Ejemplo

```tsx
const atlas = useSceneryAtlas();

<DriveCanvas atlas={atlas} /* ... */ />
```

## Decisiones de diseño

- **Una textura generada y no un PNG:** el arte vive en el código con la paleta del handoff y no hay archivos que mantener. Dibujarla tarda unos milisegundos, una vez.
- **Cacheada en el módulo:** volver a correr (Otra vez) o salir y entrar a la carrera no la redibuja. Si falla, se borra la caché y la próxima carrera lo vuelve a intentar.
- **Asíncrona:** mientras no está lista, la escena se dibuja sin árboles ni partículas; aparecen apenas termina, normalmente durante el semáforo.
- **`drawAsImage` devuelve una imagen en memoria, no en la GPU:** Skia la puede usar desde el hilo de UI, que es donde se dibuja la escena.
