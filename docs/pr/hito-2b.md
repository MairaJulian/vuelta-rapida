# Título

Hito 2b: ajuste de manejo (giro según la velocidad, marcha atrás, límites de pista y cámara con anticipación)

# Descripción

## Resumen

Ajuste del manejo tras la primera prueba de juego: costaba controlar el auto. La referencia de sensación es Pixel Wheels. Solo se tomaron ideas, sin usar su código (licencia GPL):
- giro que depende de la velocidad,
- dirección progresiva,
- bordes que frenan sin rebotar,
- cámara que mira hacia delante.

## Qué cambió en la sensación de manejo y por qué

- **Doblar se siente más predecible.**
  - Antes el giro era una velocidad angular fija con una "autoridad". A 6 m/s el auto giraba en un radio de 3,6 m: con un toque daba vueltas casi sobre sí mismo.
  - Ahora es un modelo de bicicleta. El ángulo de las ruedas baja con la velocidad según una curva configurable, así que el radio de giro crece de forma pareja (con la dirección a fondo):

  | Velocidad | Antes: giro / radio | Ahora: giro / radio |
  |---|---|---|
  | 6 m/s | 1,65 rad/s / 3,6 m | 0,95 rad/s / 6,3 m |
  | 20 m/s | 1,92 rad/s / 10,4 m | 1,81 rad/s / 11,1 m |
  | Velocidad máxima | 1,21 rad/s / 41 m (a 50 m/s) | 1,15 rad/s / 37 m (a 42 m/s) |

- **Los toques cortos corrigen poco.**
  - Antes la dirección llegaba a fondo en 0,125 s.
  - Ahora tarda 0,25 s en llegar a fondo y 0,15 s en volver al centro. Con los botones, un toque corto es una corrección chica y soltar endereza rápido.
- **Hay más tiempo para reaccionar.** La velocidad máxima baja de 180 a 151 km/h (−16 %).
- **No hay forma de perderse.**
  - La pista pasa de 8 a 14 m de ancho y tiene límites: el auto ya no sale al césped.
  - Al tocar el borde se desliza a lo largo de él y pierde velocidad, sin rebotes, que en un juego para chicos se sienten injustos.
  - Los pianos y el borde blanco marcan dónde está el límite.
- **Siempre se puede salir.**
  - El botón de freno, mantenido, frena hasta detenerse y, después de 0,4 s, da marcha atrás despacio (22 km/h).
  - En reversa la dirección se invierte como en un auto real: con la flecha derecha, la cola va hacia la derecha.
  - Al soltar el freno vuelve la aceleración automática.
- **Se ve venir la curva.** La cámara se adelanta en la dirección del movimiento, proporcional a la velocidad y con una transición suavizada. Antes copiaba la velocidad al instante y saltaba al frenar o al chocar.

## Cambios

### Paso 2: modelo de manejo (`core/DrivingModel`)
- **Giro:** modelo de bicicleta, `ω = velocidad × tan(ángulo) / distanciaEntreEjes`, con este ángulo máximo:

  `maxSteerAngle × (1 − (1 − highSpeedSteerFactor) × (|v| / maxSpeed)^steerFalloff)`

- **Dirección:** rampa lineal con `steerInTime` y `steerReturnTime`. Reemplaza a `steerRate`.
- **Freno y marcha atrás en el mismo botón:**
  - `reverseTimer` va en `CarState`, así que el estado sigue serializable y determinista.
  - Nuevos parámetros `reverseDelay` y `maxReverseSpeed`.
- **Velocidad máxima:** de 50 a 42 m/s.
- **Botón de freno:** la etiqueta accesible pasa a ser "Frenar o retroceder".

### Paso 3: pista como datos y límites (`core/Track`, `core/TrackBounds`)
- **`TrackData`:** `{ centerline, width }`, un trazado central cerrado y un ancho. El punto 0 es la meta y el orden de los puntos es el sentido de la carrera.
  - El óvalo se genera con `createOvalTrack`, con 32 segmentos por curva y 14 m de ancho.
  - Funciones nuevas: `getStartPose`, `getFinishLine` (ahora con el ángulo) y `getNearestOnCenterline`.
- **`TrackBounds.constrainToTrack`:** se aplica después de cada paso fijo en `DrivingSim`. Si el auto pasó el borde:
  1. Lo devuelve sobre el borde.
  2. Anula la velocidad hacia afuera, así que no rebota.
  3. Aplica roce mientras lo toca (`wallFriction`).
  - El auto es un círculo de 1 m (`collisionRadius`).
- **`TrackLayer`:** dibuja el borde y el asfalto como trazos del trazado con juntas redondeadas. Cubren exactamente la zona que usa el límite: lo que se ve es lo que choca.

### Paso 4: render y cámara
- **Pianos:** van en los tramos curvos que detecta `getCurveSections`, por curvatura (radio menor que 150 m). Cualquier trazado nuevo los tiene sin marcarlos a mano.
- **Cámara:** `CameraState` y `stepCamera`.
  - El adelanto se acerca al objetivo (velocidad × `lookAheadSeconds`, con tope) con un filtro exponencial de constante `lookAheadSmoothing`.
  - El resultado no depende de los fps.
  - En marcha atrás mira hacia atrás.
  - Es presentación: avanza con el tiempo de cada cuadro, fuera de la simulación determinista.

### Paso 5: panel de ajuste
- **Manejo:**
  - Curva de giro: ángulo máximo en grados, giro a velocidad máxima y exponente.
  - Tiempos de giro y de vuelta al centro.
  - Pausa y velocidad de reversa.
  - Pérdida contra el borde.
- **Pista** (sección nueva): ancho, de 8 a 30 m.
- **Cámara:** intensidad, tope y suavizado de la anticipación.
- **Lecturas:** la velocidad tiene signo (negativa en reversa).
- **Restablecer:** también vuelve el ancho de la pista al valor por defecto.

### Parámetros

| Objeto | Parámetro | Por defecto | Slider |
|---|---|---|---|
| `DrivingConfig` | `maxSpeed` | 50 → 42 m/s | sí |
| | `maxTurnRate`, `fullTurnSpeed`, `highSpeedTurnFactor`, `steerRate` | eliminados | — |
| | `wheelbase` | 2,2 m (ejes del Monoplaza) | no |
| | `maxSteerAngle` | 0,5 rad (≈29°) | sí |
| | `highSpeedSteerFactor` | 0,12 | sí |
| | `steerFalloff` | 0,5 | sí |
| | `steerInTime` / `steerReturnTime` | 0,25 s / 0,15 s | sí |
| | `reverseDelay` / `maxReverseSpeed` | 0,4 s / 6 m/s | sí |
| | `wallFriction` | 1 /s | sí |
| | `collisionRadius` | 1 m | no |
| `CameraConfig` | `lookAheadSmoothing` | 0,5 s | sí |
| `TrackData` | `width` | 8 → 14 m | sí |

## Cómo probarlo

### Tests y calidad

```bash
npm test            # 178 tests en 17 suites
npm run typecheck
npm run lint
```

Tests destacados:
- **Giro:** a velocidad alta el ángulo es menor y el radio de giro mayor que a velocidad baja.
- **Freno y reversa:** con el freno mantenido el auto se detiene, espera la pausa y retrocede sin pasar de la velocidad de reversa. Al soltarlo vuelve a avanzar. Una frenada más corta que la pausa no da marcha atrás.
- **Límites:** con 6000 entradas pseudoaleatorias de semilla fija, también en una pista de 5 m, el auto nunca supera el límite en ningún paso. El contacto con el borde reduce la velocidad y no rebota.
- **Determinismo:** se mantiene, también con frenadas largas que llegan a la marcha atrás.
- **Cámara:** independiente de los fps.

### En el celular

No hay dependencias ni código nativo nuevos: **sirve el dev build del hito 2**, sin recompilar.

```bash
npm start
```

1. **Largada:** el auto larga en la recta superior. La pista es más ancha y tiene pianos rayados en las dos curvas.
2. **Giro según la velocidad:** a poca velocidad dobla cerrado; a fondo, la misma flecha abre la curva.
3. **Toques cortos:** con un toque corto de flecha la trompa apenas se corrige; al soltar, endereza rápido.
4. **Límites:** soltar todo al entrar en una curva. El auto se apoya en el borde exterior, se desliza a lo largo de él perdiendo velocidad y nunca sale.
5. **Freno y marcha atrás:** mantener "Freno". El auto frena y se detiene, y unos 0,4 s después retrocede despacio. Con la flecha derecha mantenida, la cola va hacia la derecha. Al soltar el freno vuelve a acelerar.
6. **Salir de un choque de frente:** apuntar de frente al borde, chocar y salir con marcha atrás.
7. **Cámara:** al acelerar se adelanta de a poco; en marcha atrás mira hacia atrás.
8. **Panel "Ajustes":**
   - En reversa, la lectura de velocidad es negativa.
   - Mover "Ancho de pista" y comprobar que el borde y el límite cambian juntos.
   - Probar "Suavizado de la anticipación" y la curva del giro.
   - "Restablecer" vuelve todo, también el ancho.

## Decisiones y cambios respecto del plan

- **Modelo de bicicleta** en lugar de mantener la velocidad de giro con una curva: detenido no gira y la reversa se invierte sola, sin casos especiales.
- **Reversa como en un auto real**, no "derecha siempre hacia la derecha de la pantalla".
- **Sliders junto con cada parámetro:** los del manejo entraron en los commits de los pasos 2 y 3, no todos en el 5. El test del hito 2 "un slider por cada parámetro del manejo" lo exige. El paso 5 sumó la pista, el suavizado de la cámara, la lectura con signo y el test equivalente para la cámara.
- **Pianos detectados por curvatura, no por giro:** con solo el giro, la recta inferior del óvalo quedaba marcada como curva, porque sus dos extremos giran.
- **`wheelbase` y `collisionRadius` sin slider:** salen de las medidas del auto.
- **Adaptación mínima de `TrackLayer` en el paso 3:** el cambio de tipo de la pista lo obligaba. Los pianos volvieron en el paso 4.

## Notas

- **Pendiente:** probarlo en el celular. Los valores por defecto se calibraron con números, no jugando; los sliders están para afinarlos con el jugador.
- **Pistas futuras:** `getNearestOnCenterline` recorre todos los segmentos. Si una pista pasa dos tramos muy cerca uno del otro, convendrá buscar solo cerca del segmento anterior.
- **Para más adelante:** una vibración corta al tocar el borde, como la del freno.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
