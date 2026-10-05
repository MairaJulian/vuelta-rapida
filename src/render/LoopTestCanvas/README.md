# LoopTestCanvas

Lienzo de Skia de la pantalla de prueba del loop: un rectángulo que se mueve y un contador de fps.

## Props

| Prop      | Tipo                  | Descripción                                         |
| --------- | --------------------- | --------------------------------------------------- |
| `x`       | `SharedValue<number>` | Posición horizontal del rectángulo, en px.          |
| `fpsText` | `SharedValue<string>` | Texto del contador, por ejemplo `"60 FPS"`.         |
| `height`  | `number`              | Alto del lienzo; se usa para centrar el rectángulo. |

## Ejemplo

```tsx
const { x, fpsText } = useBoxLoop({ areaWidth: width, boxWidth: LOOP_TEST_BOX.width, speed: 300 });

<LoopTestCanvas x={x} fpsText={fpsText} height={height} />;
```

## Decisiones de diseño

- **Solo lee estado.** Recibe `SharedValue` y se los pasa a Skia, que los observa directamente en el hilo de UI. No hay `useState`, ni `useEffect`, ni cálculos.
- `LoopTestCanvas.styles.ts` concentra las constantes visuales (colores del handoff, tamaño del rectángulo, posición y fuente del contador).
- Fuente `sans-serif` del sistema vía `matchFont`: evita cargar un archivo de fuente para una pantalla de diagnóstico.
- En Jest, Skia se sustituye por un mock en `test/setup/skia.ts`; los tests verifican qué se dibuja, no el pixel resultante.
