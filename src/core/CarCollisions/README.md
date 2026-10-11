# CarCollisions

Choques entre autos: cada auto es un círculo; al solaparse, se separan, se empujan leve y pierden un poco de velocidad. Nadie gira ni hace trompo, y no hay daño. TypeScript puro.

## API

| Exporta                                  | Qué hace                                                                                                                                                                                                                                |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `resolveCarCollisions(cars, config, dt)` | Resuelve los choques de un paso entre todos los autos. Devuelve `{ cars, impactSpeeds, touching }`: los autos corregidos (los mismos objetos si no chocaron), por auto la velocidad con que se acercaba al chocar y si estaba solapado. |
| `DEFAULT_COLLISION_CONFIG`               | Valores iniciales.                                                                                                                                                                                                                      |
| `NO_COLLISIONS`                          | Los mismos valores con `enabled: false`: los autos se atraviesan.                                                                                                                                                                       |
| `CollisionConfig`                        | `{ enabled, radius, pushSpeed, rearLossRate, frontLossRate }`.                                                                                                                                                                          |

| Parámetro       | Inicial | Qué es                                                                                          |
| --------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `enabled`       | `true`  | Si los autos chocan. Se elige en la selección de pista (`PlayerPreferences.collisionsEnabled`). |
| `radius`        | 1,5 m   | Radio del círculo de cada auto. Dos autos chocan a menos del doble.                             |
| `pushSpeed`     | 1,5 m/s | Velocidad con que se alejan tras el choque.                                                     |
| `rearLossRate`  | 1,2 /s  | Pérdida de velocidad del que choca por detrás (`exp(−tasa·dt)`, mientras dura el contacto).     |
| `frontLossRate` | 0,3 /s  | Pérdida del que recibe el choque.                                                               |

## Ejemplo

```ts
// Tras mover a todos los autos de un paso (así lo hace RaceFlow):
const { cars, touching, impactSpeeds } = resolveCarCollisions(allCars, collisionConfig, dt);
// Después, cada auto movido vuelve a la pista (resolveTrackContact).
```

## Cómo funciona

Por cada par solapado, en orden fijo:

1. **Separa** a partes iguales sobre la línea que une los centros.
2. **Empuja:** la velocidad con que se alejan sube hasta `pushSpeed` (nunca más que eso por paso). No cambia el rumbo.
3. **Frena:** cada auto pierde velocidad con `exp(−tasa·dt)`. La tasa va de `frontLossRate` a `rearLossRate` según cuánto el otro auto está delante: el que choca por detrás paga más; de costado, el promedio.

## Decisiones de diseño

- **Sin giro:** solo se tocan posición y velocidad, nunca el rumbo ni la dirección. Un choque no genera trompos; el agarre lateral del modelo de manejo absorbe el empujón.
- **No conoce la pista:** `RaceFlow` devuelve cada auto movido al asfalto (`resolveTrackContact`) y repite hasta 3 pasadas por paso. Un empujón nunca saca a un auto de la pista, y los choques con el borde siguen como siempre.
- **Masas iguales y sin rebote:** la separación se reparte a partes iguales y el empujón es un tope de velocidad, no un rebote. Es leve y estable aunque varios autos se apilen.
- **Radio propio:** `radius` no es `DrivingConfig.collisionRadius` (1 m, el que usa el borde de la pista). El auto mide 2 × 4,5 m: con un solo círculo, 1,5 m deja los autos lado a lado sin tocarse y en fila superpuestos un poco.
- **Tasa, no multa:** la pérdida es continua (como `wallFriction`): un roce corto casi no cuesta; apretarse contra otro auto, sí.
- Los avisos (`carHit`, con tiempo mínimo entre uno y otro) los da `RaceFlow`, solo cuando el jugador está involucrado.
