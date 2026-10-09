# SceneryAtlas

Los dibujos de la escenografía que se repiten cientos de veces, todos en una sola textura (atlas): copas de árboles grandes y chicos en tres tonos, arbustos en tres tonos, sus sombras, el neumático de las barreras y la partícula de polvo y humo. No se muestra en pantalla: `useSceneryAtlas` lo rasteriza una vez y `SceneryLayer` y `ParticleLayer` lo dibujan con `Atlas` de Skia.

## Props

Ninguna: el dibujo es siempre el mismo.

## Exporta

| Exporta | Qué es |
|---|---|
| `SceneryAtlas` | El componente con todos los dibujos en su lugar. |
| `SPRITE_LAYOUT` | Dónde está cada dibujo (`SpriteLayout` de `core/SceneryView`): recortes cuadrados en píxeles, con 4 px de margen. |
| `PARTICLE_FRAME` | El recorte de la partícula. |
| `ATLAS_SIZE` | 1024 × 544 px. |

## Ejemplo

```ts
const image = await drawAsImage(createElement(SceneryAtlas), ATLAS_SIZE);
const layers = buildSpriteLayers(scenery, SPRITE_LAYOUT);
```

## Decisiones de diseño

- **Arte propio con la paleta del handoff, no un pack externo:** el handoff dibuja la pista y los autos como vectores planos, y la barrera de neumáticos como círculos `ink`. Los packs CC0 de vista cenital (por ejemplo, el Racing Pack de Kenney) traen sombreado y colores saturados que chocan con el pasto pastel. Ver CREDITOS.md.
- **Todo es un círculo dentro de su recorte:** el núcleo (`buildSpriteLayers`) escala el recorte para que ese círculo mida el diámetro del objeto. Agregar un dibujo es sumar un recorte y su arte.
- **Copas planas con una luz:** el círculo base, una luz arriba a la izquierda (el mismo sol que corre las sombras hacia abajo a la derecha) y un brillo. Tres tonos por tipo para que un bosquecito no parezca un sello repetido.
- **Sombras sólidas, sin transparencia:** un verde más oscuro que el pasto. El handoff pide no apilar capas translúcidas.
- **Partícula blanca:** su color y su opacidad los pone cada partícula al dibujarse (`ParticleLayer`).
- **Recortes de 256, 192 y 96 px:** con unos 35 px por metro, los árboles se ven nítidos con el zoom más cercano de la cámara (14 dp por metro en una pantalla de unos 2,75 px por dp).
- **Copa, arbusto y disco son funciones internas** del archivo: dibujos privados del atlas, no componentes para reutilizar.
