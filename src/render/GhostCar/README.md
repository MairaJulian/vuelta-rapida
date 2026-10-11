# GhostCar

El auto fantasma: el monoplaza del jugador (`CarShape`) translúcido, con el color de su dueño y sin número, y el nombre del dueño en chico encima. Va dentro del grupo de la cámara de `DriveCanvas`. Solo dibuja: no choca con el auto del jugador.

## Props

| Prop             | Tipo                        | Descripción                                                                       |
| ---------------- | --------------------------- | --------------------------------------------------------------------------------- |
| `transform`      | `SharedValue<Transforms3d>` | Posición y rumbo del fantasma (`useRaceGhost`).                                   |
| `labelTransform` | `SharedValue<Transforms3d>` | Posición del nombre, sobre el fantasma y derecho en la pantalla (`useRaceGhost`). |
| `opacity`        | `SharedValue<number>`       | Opacidad del conjunto: 0,55 en carrera, 0 tras la llegada.                        |
| `color`          | `string`                    | Color de la carrocería, el del dueño (`getCarColor`).                             |
| `name`           | `string`                    | Nombre del dueño, en mayúsculas.                                                  |

## Ejemplo

```tsx
const { ghost } = useRaceGhost({ bus, circuit: track, race: loop.race, cameraView: loop.cameraView });

<DriveCanvas ... ghost={ghost} />
// DriveCanvas dibuja: <GhostCar transform={ghost.transform} labelTransform={ghost.labelTransform} opacity={ghost.opacity} color={ghost.color} name={ghost.name} />
```

## Decisiones de diseño

- **Translúcido:** el handoff dibuja el fantasma como la silueta sin relleno, con contorno blanco punteado al 60 %. Acá se eligió un auto relleno con el color de su dueño (lo pidió el hito) al 55 %, que se distingue del jugador por la transparencia y el nombre. Es la decisión que se aparta del handoff.
- **Sin superposición de piezas:** la opacidad es de un grupo que compone el auto entero, así las ruedas y el alerón no se ven a través de la carrocería.
- **Nombre derecho:** el texto no va dentro de la transformación del auto, que lo giraría; tiene la suya (`labelTransform`), que deshace el giro de la cámara.
- **Nombre chico sobre un fondo claro:** 1,25 m de alto de letra y una píldora blanca al 85 % para que se lea sobre asfalto y pasto.
- **Sin lógica:** posición, color y nombre vienen de `useRaceGhost`.
