# Título

Hito 4: la pista de verdad (Autódromo del Lago, progreso, vueltas, tiempos y récord)

# Descripción

## Resumen

El juego deja el óvalo de prueba y corre en el **Autódromo del Lago**, el circuito del handoff.

- **Trazado:** sale de puntos de control suavizados con una curva Catmull-Rom. Se valida que sea cerrado, que no se cruce y que sus tramos no se toquen.
- **Progreso:** el auto mide cuánto avanzó sobre el trazado.
- **Vueltas:** se cuentan con la meta y dos puntos de control que hay que pasar en orden.
- **Tiempos:** se miden en pasos de simulación, así son exactos y deterministas.
- **Récord:** la mejor vuelta de cada circuito se guarda en las preferencias.
- **Render:** la pista muestra la meta a la medida del handoff y el cartel "META", y hay un HUD provisorio con la vuelta, el tiempo y la mejor vuelta.

No hay cambios nativos: **no hace falta recompilar el dev build**.

## El circuito: Autódromo del Lago

El handoff ya trae el Autódromo del Lago (pantallas 05, 07 y 08) y su minimapa: "Rápido · 5,8 km · 11 curvas", los números de un circuito rápido de rectas largas.

- **Silueta:** la del trazado del handoff (viewBox 100 × 60) a 11 m por unidad. Mide unos 2,4 km y se corre en sentido antihorario, en el orden del trazado del handoff. La recta principal coincide con la escena de carrera (06/07).
- **Dos curvas cerradas agregadas:** con el modelo de manejo actual, el trazado del handoff tal cual se tomaba entero a fondo. Se agregó una chicana al final de la recta y se cerró la horquilla del centro, sin cambiar la silueta del minimapa.
- **Vuelta ideal estimada:** alrededor de 1:09. El récord del handoff es 1:12,480.

| # | Curva | Cómo se toma |
|---|---|---|
| 1 | Chicana derecha-izquierda al final de la recta (12 m de radio) | Frenada fuerte, ~71 km/h |
| 2 | Curva rápida a la izquierda | A fondo |
| 3 | Curva de arriba a la derecha | A fondo |
| 4 | Horquilla del centro, a la derecha (14 m de radio) | Frenada, ~79 km/h |
| 5 | Curva de arriba a la izquierda | A fondo |
| 6 | Curva larga que desemboca en la recta principal | A fondo |

## Cambios

### Paso 2: trazado (core)
- **`core/CatmullRom`:**
  - Curva Catmull-Rom centrípeta y cerrada que pasa por todos los puntos de control, sin rulos aunque estén espaciados de forma despareja.
  - Remuestreo a distancia constante.
- **`core/Circuits`:**
  - Los circuitos como datos: `id`, nombre inventado, puntos de control en metros (el primero es la meta), ancho y puntos de control intermedios.
  - `buildCircuit` suaviza y remuestrea cada 2 m: unos 1200 puntos.
- **`core/TrackValidation`:** `validateTrack` y `validateCircuit` devuelven la lista de problemas. Los tests validan cada circuito del juego, así uno mal armado no llega a la app.
  - Vuelta cerrada.
  - Sin cruces del trazado consigo mismo.
  - Tramos distintos a 2 anchos de pista o más.
  - Radio mínimo mayor que medio ancho, para que el borde interior no se pliegue.
  - Puntos de control en orden.
- **`core/Track`:**
  - `Circuit`: el trazado más la distancia desde la meta hasta cada punto, el largo de la vuelta y los puntos de control.
  - `getTrackProgress` y `getProgressAt`: progreso como distancia sobre el trazado. No cambia al moverse a lo ancho de la pista.
  - `getProgressDelta`: avance por el camino corto, también al cruzar la meta.
  - **Búsqueda local del punto más cercano** (ver "Rendimiento").
  - El óvalo pasa a llamarse `OVAL_TRACK` y queda para los tests.
- **`core/TrackBounds`:** `constrainToHit` recibe el punto más cercano ya buscado. Los límites funcionan igual en el circuito nuevo: los tests corren entradas aleatorias con la chicana y la horquilla y el auto nunca sale.

### Paso 3: vueltas y tiempos (core)
- **`core/LapTimer`:**
  - **Puertas en orden:** la meta y los puntos de control (en 1/3 y 2/3 de la vuelta) forman una secuencia. Solo cuenta cruzar hacia adelante la que sigue; cruzar hacia atrás la última la deshace.
  - **Ida y vuelta sobre la meta:** no suma vueltas. Si se vuelve sobre la meta después de completar una vuelta, se deshace, y al cruzar otra vez se completa con su tiempo real.
  - **Atajos:** un avance de más de 10 m en un paso no cruza puertas. Si con eso se saltea un punto de control, la vuelta no se completa.
  - **Tiempos:** en pasos de simulación (60 por segundo): vuelta actual, cada vuelta y la mejor. Se muestran como `m:ss.mmm`, el formato del handoff.
- **`core/DrivingSim`:** en cada paso fijo busca una vez el punto más cercano y lo usa para el límite de pista y para el progreso. Las vueltas se actualizan con el número de paso.
- **`core/PlayerPreferences`:**
  - Nuevo campo `bestLapsMs`: récord por `id` de circuito, en milisegundos. Al cargar, los tiempos inválidos se descartan.
  - `withBestLap` decide si una vuelta lo mejora.
- **`hooks/useBestLapRecord`:** lee el récord y guarda las vueltas que lo mejoran.
- **`hooks/useDrivingLoop`:**
  - Recibe el `Circuit` y expone `laps`.
  - Cuando mejora la mejor vuelta de la sesión, avisa al hilo de JS con `scheduleOnRN`.
  - `reset` también reinicia las vueltas.

### Paso 4: render y HUD provisorio
- **`render/TrackLayer`:**
  - **Bandera a cuadros:** 1,8 m de grosor con cuadros de unos 0,9 m (14 y 7 dp del handoff).
  - **Cartel "META":** píldora blanca con texto itálico, afuera del circuito y justo después de la línea, girado para leerse derecho. Usa la fuente del sistema (`matchFont` de Skia).
- **Pianos de una pieza por curva:** con puntos cada 2 m, la curvatura tenía ruido y el circuito daba 24 pianos partidos. Ahora:
  - la curvatura se mide sobre 8 m;
  - se unen los tramos separados por hasta 24 m (por ejemplo, las dos mitades de la chicana);
  - se descartan los de menos de 20 m.
  
  Quedan 6, uno por curva.
- **`components/LapHud`:** HUD provisorio según la pantalla 07, con píldoras blancas: "Vuelta N" a la izquierda, el tiempo de la vuelta al centro y "Mejor" a la derecha. Se actualiza unas 20 veces por segundo y no recibe toques. El HUD completo (minimapa, delta, "2/3", pausa) llega con el hito de pantallas.
- **`DriveScreen`:** corre en el Autódromo del Lago, muestra el HUD y guarda el récord.
- **Panel de desarrollo:**
  - El ancho de pista va de 8 a 20 m (antes 30). Con más, las dos ramas de la horquilla dejarían de estar separadas por pasto.
  - "Restablecer" vuelve al ancho del circuito.
  - El botón "Ajustes" bajó a 80 dp del borde para no tapar la píldora "Vuelta".

### Proceso (`CLAUDE.md`)
- **Autorizaciones permanentes:** Claude puede, sin pedir permiso, agregar dependencias, cambiar configuración nativa, borrar o renombrar archivos, ajustar valores del manejo y reorganizar carpetas. Cada uso se informa al cerrar el trabajo y en el PR. Commits, push, merge, la configuración global y el hook siguen siendo solo míos.
- **Trabajo sin pausas:** Claude hace el hito completo y al final entrega un bloque de commit por paso, el comando de push y esta descripción.

## Rendimiento

La simulación corre en el hilo de UI, con Hermes y sin JIT, y el circuito tiene unos 1200 segmentos.

- **Antes:** buscar el punto más cercano en todos ellos, dos veces por paso (límite y progreso), podía costar varios milisegundos por cuadro en un celular de gama media.
- **Ahora:** se busca una sola vez, en los 51 segmentos alrededor del paso anterior. Si el resultado no tiene sentido, se repite la búsqueda completa. Los tests verifican que da lo mismo que la completa en toda la vuelta.

## Cómo probarlo

### Tests y calidad

```bash
npm test            # 426 tests en 38 suites
npm run typecheck
npm run lint
```

Tests destacados:
- **Circuito:**
  - Pasa todas las validaciones.
  - Pasa por todos los puntos de control.
  - Tiene puntos parejos cada 2 m.
  - Mide unos 2,4 km y es antihorario.
  - Tiene 6 pianos.
  - Es determinista y serializable.
- **Validación:** detecta cruces (un ocho), tramos demasiado cerca, curvas imposibles, vueltas abiertas, datos inválidos y puntos de control desordenados.
- **Progreso:**
  - Aumenta de forma continua al recorrer toda la vuelta, también por los bordes.
  - Con un piloto automático simple en el Autódromo del Lago, avanza sin saltos y la vuelta se cuenta.
- **Vueltas:**
  - Ida y vuelta sobre la meta no suma vueltas.
  - Un punto de control salteado impide completar la vuelta.
  - Un salto grande no cruza la meta.
  - Los tiempos son exactamente los pasos entre cruces. Con el piloto automático en el óvalo, coinciden con los cruces detectados aparte.
- **Récord:** solo una vuelta más rápida lo reemplaza. Cada circuito tiene el suyo y queda guardado en el disco.

### En el celular

Con el dev build instalado, `npx expo start` y abrir la app.

1. **Largada:** el auto arranca detenido en la recta principal, poco antes de la bandera a cuadros, con el cartel "META" del lado de afuera. El HUD dice "Vuelta 1", "0:00.000" y "Mejor" sin tiempo.
2. **Primera vuelta:** al cruzar la meta empieza a correr el tiempo.
   - Al final de la recta viene la chicana: hay que frenar.
   - La horquilla del centro también pide freno; el resto se toma a fondo.
   - Los pianos aparecen en las 6 curvas, de una sola pieza.
3. **Vuelta completa:** al cruzar la meta otra vez, el HUD pasa a "Vuelta 2", el tiempo vuelve a cero y "Mejor" muestra el tiempo de la vuelta.
4. **Récord:** una vuelta más lenta no cambia "Mejor"; una más rápida, sí. Cerrá y volvé a abrir la app: "Mejor" sigue mostrando el récord.
5. **Ida y vuelta:** cruzá la meta, frená, retrocedé hasta pasarla y volvé a cruzarla. La vuelta no avanza de más.
6. **Panel "Ajustes":**
   - El botón está debajo de la píldora "Vuelta".
   - "Reiniciar auto" vuelve a la largada con las vueltas en cero.
   - El ancho de pista va de 8 a 20 m.
7. **Fluidez:** el contador de fps del panel debería seguir cerca de 60.

## Decisiones y cambios respecto del plan

Todas las decisiones del plan se confirmaron antes de empezar.

- **Circuito:** el Autódromo del Lago con la silueta del handoff, más la chicana y la horquilla cerradas.
- **Tiempos:** se miden en pasos enteros (resolución de 16,7 ms). Interpolar el cruce dentro del paso queda para más adelante.
- **Cartel "META":** usa la fuente del sistema. Archivo llega con el hito de pantallas.
- **Pasto:** sigue con franjas, no con los puntos del handoff (decisión del hito 2b).
- **Calle de boxes:** queda fuera de este hito.
- **Búsqueda local del punto más cercano:** no estaba en el plan. La sumé al ver que el test de límites tardaba 8,7 s en el circuito nuevo, señal de que en el celular costaría caro.
- **Pianos:** unir y descartar tramos no estaba en el plan. Hizo falta para no tener 24 pianos partidos.
- **Orden de las funciones worklet:** el plugin de worklets las convierte en constantes, así que una función tiene que estar declarada antes de usarse. Un test lo detectó (habría fallado también en el celular) y quedó anotado en los README.

### Autorizaciones permanentes usadas
- **Renombrado:** `DEFAULT_TRACK` → `OVAL_TRACK`. El óvalo dejó de ser la pista del juego y quedó para los tests; no se borró.
- **Módulos nuevos:**
  - `core/CatmullRom`, `core/Circuits`, `core/TrackValidation` y `core/LapTimer`;
  - `hooks/useBestLapRecord`;
  - `components/LapHud`.
  
  Todos con su estructura de seis archivos (cinco en `core` y `hooks`).
- **Sin dependencias nuevas, sin cambios nativos y sin cambios en los valores del manejo.**
- **Mock de Skia para Jest** (`test/setup/skia.ts`): la fuente simulada mide texto, para centrar el cartel.

## Notas

- **Pendiente de verificar en el celular:**
  - Los fps con el circuito nuevo.
  - Que el cartel "META" se lea bien con la fuente del sistema.
  - Que la chicana y la horquilla se sientan desafiantes pero posibles con botones.
- **Valores para afinar jugando:** la escala del circuito y lo cerradas que son las dos curvas. Se cambian en los puntos de control de `AUTODROMO_DEL_LAGO`; los tests vuelven a validar el circuito.
- **Para más adelante:**
  - El HUD completo y la selección de pista con los otros dos circuitos del handoff (Puerto Viejo y Las Sierras).
  - El semáforo de largada y la calle de boxes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
