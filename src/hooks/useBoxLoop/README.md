# useBoxLoop

Hook que corre el loop por cuadro de la pantalla de prueba. Une `useFrameCallback` de Reanimated con la lógica pura de `core/BoxMotion` y `core/FpsMeter`.

## Parámetros

`useBoxLoop({ areaWidth, boxWidth, speed })`

| Parámetro   | Tipo     | Descripción                          |
| ----------- | -------- | ------------------------------------ |
| `areaWidth` | `number` | Ancho del área de movimiento, en px. |
| `boxWidth`  | `number` | Ancho del rectángulo, en px.         |
| `speed`     | `number` | Velocidad en px por segundo.         |

## Devuelve

| Campo     | Tipo                  | Descripción                                 |
| --------- | --------------------- | ------------------------------------------- |
| `x`       | `SharedValue<number>` | Posición horizontal del rectángulo.         |
| `fpsText` | `SharedValue<string>` | Texto del contador, por ejemplo `"60 FPS"`. |

## Ejemplo

```tsx
const { x, fpsText } = useBoxLoop({ areaWidth: width, boxWidth: 80, speed: 300 });
return <LoopTestCanvas x={x} fpsText={fpsText} height={height} />;
```

## Decisiones de diseño

- No contiene lógica de juego: delega todo en funciones puras de `core`. El hook solo conecta.
- Devuelve `SharedValue`, no estado de React: el valor cambia 60 veces por segundo sin re-renderizar el árbol.
- La configuración vive en un `SharedValue` actualizado desde un efecto, para que el worklet vea cambios de tamaño sin re-registrar el callback.
- El primer cuadro llega con `timeSincePreviousFrame = null`; se trata como `dt = 0` y no mueve nada.
