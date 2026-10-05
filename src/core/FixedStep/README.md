# FixedStep

Acumulador de tiempo para una simulación de paso fijo. Separa la física (siempre a `stepHz`) de los fps de la pantalla (60, 90 o 120 Hz, o irregulares).

## API

| Función | Qué hace |
|---|---|
| `consumeFrameTime(accumulatorMs, frameMs, config)` | Suma el cuadro al acumulador y devuelve `{ steps, accumulatorMs }`. |
| `getStepAlpha(accumulatorMs, config)` | Fracción del próximo paso ya transcurrida, en [0, 1). Sirve para interpolar el render. |
| `getStepMs(config)` | Duración de un paso en ms. |
| `DEFAULT_FIXED_STEP_CONFIG` | `{ stepHz: 60, maxFrameMs: 100 }`. |

## Ejemplo

```ts
const { steps, accumulatorMs } = consumeFrameTime(previousAccumulator, frameMs, config);
for (let i = 0; i < steps; i += 1) {
  car = stepCar(car, input, drivingConfig, 1 / config.stepHz);
}
```

## Decisiones de diseño

- **Independiente de los fps:** el mismo tiempo total da el mismo número de pasos, venga en cuadros de 60, 90 o 120 Hz. Por eso la física es idéntica en cualquier celular.
- **Tolerancia de redondeo (`1e-6` ms):** sin ella, 60 cuadros de `1000/60` pueden dar 59 pasos por error de coma flotante.
- **`maxFrameMs` (100 ms):** tras una pausa larga (app en segundo plano, tirón del sistema) no se intenta "recuperar" todo el tiempo perdido de golpe, que congelaría el juego. Como mucho se simulan 6 pasos por cuadro.
- El plan inicial preveía también un `maxStepsPerFrame`; con `maxFrameMs` ya queda acotado y se eliminó para no tener dos parámetros que hacen lo mismo.
