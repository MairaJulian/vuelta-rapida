# TiltSteering

Mapeo de la inclinación del celular a la dirección del auto: control por **posición**. El ángulo del celular respecto de la gravedad, girado como un volante, equivale al ángulo de dirección. TypeScript puro: no importa React, React Native, Reanimated ni Expo. El hook que lee el sensor solo le pasa las lecturas.

## API

| Exporta | Qué hace |
|---|---|
| `stepTiltSteering(state, reading, config, dt)` | Procesa una lectura y devuelve `{ state, steer, relativeAngle, confidence }`. Pura y determinista. |
| `createTiltState()` | Filtro vacío, a la espera de la primera lectura. |
| `calibrateTilt(state, config)` | Toma el ángulo filtrado actual como el nuevo "derecho". |
| `toScreenGravity(reading)` | Pasa el vector del sensor a coordenadas de pantalla según la rotación. |
| `getScreenTilt(reading)` | Ángulo de volante y parte de la gravedad sobre la pantalla. |
| `getFullTurnAngle(sensitivity)` | Ángulo para girar a fondo: 1 → 45°, 5 → 25°, 10 → 12°. |
| `angleToSteer(angle, deadZone, fullTurnAngle)` | Zona muerta y sensibilidad: ángulo calibrado a dirección de -1 a 1. |
| `getTiltConfidence(planar)` | 0 con el celular plano, 1 con la pantalla bien inclinada. |
| `withTiltSteering(drivingConfig, tiltConfig)` | Configuración del manejo para el modo inclinación (rampa corta). |
| `DEFAULT_TILT_CONFIG` | Valores iniciales (ver tabla). |

### Tipos

- `GravityReading`: `{ x, y, z, rotation }`. Vector gravedad en coordenadas del celular, apuntando hacia el suelo y **sin corregir por orientación**. `rotation` (0, 90, 180 o 270) es la de la pantalla al tomar la lectura.
- `TiltConfig`: parámetros (ver tabla).
- `TiltState`: `{ angle, rotation, hasReading }`, el ángulo filtrado. Serializable.

## Parámetros (`TiltConfig`)

| Parámetro | Inicial | Efecto |
|---|---|---|
| `neutralAngle` | 0 | Ángulo que cuenta como derecho. Lo fija la calibración. |
| `deadZone` | 5° | Zona muerta a cada lado del neutro, como pide el handoff. |
| `sensitivity` | 5 | De 1 (suave) a 10 (rápida). Con 5, girar 25° es girar a fondo. |
| `smoothing` | 0,06 s | Filtro contra el temblor: constante de tiempo del filtro exponencial. |
| `steerRampTime` | 0,08 s | Rampa de la dirección del modelo de manejo en modo inclinación. |

## Ejemplo

```ts
let state = createTiltState();

// En cada cuadro, con la última lectura del sensor:
const result = stepTiltSteering(state, reading, tiltConfig, frameMs / 1000);
state = result.state;
input.set({ ...input.get(), steer: result.steer });

// Al tocar Listo en la calibración:
tiltConfig = calibrateTilt(state, tiltConfig);
```

## Cada lectura

1. **Orientación:** el vector se pasa a coordenadas de pantalla según `rotation`. En las dos orientaciones horizontales los ejes del celular quedan invertidos; después de esta corrección, la misma inclinación da el mismo ángulo.
2. **Ángulo:** `atan2(gx, −gy)` sobre el plano de la pantalla. Es el giro alrededor del eje perpendicular a la pantalla, como un volante, y no depende de cuánto se eche el celular hacia atrás.
3. **Celular plano:** si menos del 25 % de la gravedad cae sobre la pantalla (unos 15° de la horizontal), el ángulo no es confiable. El filtro se congela y la dirección es 0. Entre el 25 % y el 40 % se atenúa de forma gradual.
4. **Filtro:** exponencial sobre el ángulo, por el camino corto al cruzar ±180°. Si cambió la orientación, se reinicia con el ángulo nuevo en lugar de recorrer la diferencia.
5. **Calibración:** se resta `neutralAngle`.
6. **Zona muerta y sensibilidad:** 0 dentro de la zona; fuera, crece en línea recta desde el borde de la zona hasta el ángulo de giro completo, y se limita a ±1.

## Decisiones de diseño

- **Posición, no velocidad angular:** se usa el vector gravedad, nunca el giroscopio integrado. Lo que el jugador ve (el celular girado X grados) es lo que el auto hace, sin deriva con el tiempo.
- **Una sola corrección por orientación, aquí:** el sensor se registra con el ajuste automático de Reanimated desactivado (`adjustToInterfaceOrientation: false`). Si se corrigiera dos veces, el ángulo quedaría girado 90°; un test lo cubre.
- **La calibración vive en el marco de la pantalla:** sigue valiendo si el jugador da vuelta el celular.
- **Sensibilidad en escala geométrica:** cada punto achica el ángulo de giro completo en la misma proporción, que se percibe más pareja que restar grados fijos.
- **Rampa propia para la inclinación:** la rampa de 0,25 s del modelo está pensada para botones digitales y con una señal continua se sentiría como retraso. `withTiltSteering` la baja a 0,08 s sin que el modelo sepa qué control se usa.
- Las funciones que corren por cuadro llevan `'worklet'` porque se llaman desde el hilo de UI. Es un texto, no un import.
