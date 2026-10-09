# Título

Hito 5b: escenografía y sensación de movimiento

# Descripción

## Resumen

Un tester dijo que en las rectas parecía que el auto estaba quieto y se movía el pasto, y que eso mareaba un poco. Este hito suma cosas al costado de la pista que le indican al cerebro que el que se mueve es el auto.

- **Escenografía como datos del circuito,** generada con semilla a partir del trazado:
  - carteles de distancia 300, 200 y 100 antes de las dos curvas cerradas (chicana y horquilla);
  - barreras de neumáticos en el exterior de las curvas;
  - tribuna en la recta principal y carteles publicitarios con marcas inventadas;
  - árboles y arbustos en bosquecitos, sin invadir la pista ni las escapatorias.
- **Pasto con franjas de corte** en dos verdes. El ángulo se elige por circuito, para que no corran paralelas a ninguna recta larga.
- **Detalles en el asfalto:** marcas de frenada antes de las curvas cerradas y parches un poco más claros o más oscuros.
- **Paralaje:** las copas de los árboles, los carteles y el techo de la tribuna se corren más que su base según se mueve la cámara. Cada objeto tiene su sombra en el suelo.
- **Partículas:** polvo al rozar el borde y humo al derrapar o frenar fuerte.
- **Panel de ajuste:** densidad de árboles, intensidad del paralaje, contraste de las franjas, partículas sí o no, y un interruptor para no dibujar la escenografía (para comparar los fps).

**No hace falta recompilar el dev build:** no hay dependencias nuevas ni cambios nativos. Alcanza con recargar el JS desde Metro.

## Arquitectura

```
CircuitDefinition.scenery { seed, treeDensity }
        │  withCircuitScenery (al abrir la carrera)
        ▼
Circuit.scenery ── core/Scenery (generateScenery, puro y determinista)
        │
        ├─ useSceneryView (hilo de UI): celdas visibles → listas del Atlas; paralaje por capa
        ├─ useSceneryAtlas: textura de árboles, sombras, neumáticos y partículas, una vez
        └─ useParticles (hilo de UI): polvo y humo
                │
                ▼
DriveCanvas: GrassLayer · TrackLayer · AsphaltDetails · SceneryLayer (suelo) · ParticleLayer · auto · SceneryLayer (con altura)
```

- **`core` sigue siendo TypeScript puro.** La escenografía, la geometría que la ubica, el culling, el paralaje y las partículas son funciones puras; las que corren en cada cuadro son worklets.
- **La escenografía es un dato del circuito** (`Circuit.scenery`), como pediste. La semilla y la densidad están en la definición, así que siempre es la misma.
- **Se genera al abrir la carrera, no al iniciar la app.** Medí la generación sin JIT (`node --jitless`, parecido a Hermes): unos 230 ms en la PC. En un celular de gama media serían varios cientos de milisegundos. El módulo de circuitos se carga al iniciar la app (lo importa Inicio), así que la pantalla de carrera la genera recién montada, durante la transición.

## Cambios

### Paso 1: plan
Plan con las decisiones de abajo, confirmadas antes de empezar. Sin archivos.

### Paso 2: escenografía como datos (core)
- **`core/TrackFeatures`** (nuevo): lo que se lee del trazado.
  - Curvas cerradas (radio menor que 45 m) y su sentido, rectas y recta principal.
  - Puntos al costado de la pista, y giro de los carteles con el texto derecho.
  - **Zona libre:** medio ancho de la pista (hasta el piano donde hay) más la escapatoria, con una grilla para consultarla rápido.
- **`core/Scenery`** (nuevo): `generateScenery(circuit, { seed, treeDensity })`.
  - Carteles de distancia, tribuna, publicidad, barreras, árboles, arbustos, marcas de frenada, parches y el ángulo de las franjas.
  - `withScenery` la vuelve a generar al cambiar el ancho o la densidad.
- **`core/Circuits`:**
  - La definición trae `scenery: { seed, treeDensity }`. El Autódromo del Lago usa la semilla 7.
  - `withCircuitScenery(circuit)` suma la escenografía según la definición.
- **`core/Track`:** `Circuit.scenery` opcional (el óvalo de prueba no tiene).
- **Tests:**
  - ningún objeto ni neumático pisa la pista ni entra en la zona libre de ningún tramo;
  - los carteles están a 300, 200 y 100 m de la entrada de cada curva cerrada, del lado de afuera;
  - la misma semilla da la misma escenografía;
  - más: la densidad, la tribuna, la publicidad, las barreras, los detalles del asfalto y las franjas.

### Paso 3: render
- **`core/SceneryView`** (nuevo): celdas visibles, escala de paralaje por altura, transformaciones de los dibujos del atlas y la configuración del panel.
- **`core/Particles`** (nuevo): emisión, movimiento y aspecto del polvo y el humo, con un máximo de 48.
- **Hooks nuevos:**
  - `useSceneryAtlas`: dibuja la textura una vez por sesión.
  - `useSceneryView`: entrega al atlas solo lo de las celdas visibles y da el paralaje.
  - `useParticles`: mueve las partículas en el hilo de UI.
- **Render nuevo:** `GrassLayer`, `AsphaltDetails`, `SceneryAtlas` (el arte), `SceneryLayer`, `SceneryBoard`, `Grandstand` y `ParticleLayer`.
- **`DriveCanvas`:** compone las capas. El pasto reemplaza al fondo, que antes se pintaba dos veces a pantalla completa.
- **`TrackLayer`:** ya no pinta el pasto.
- **`useRaceLoop`:** expone `cameraView`.
- **Mock de Skia:** suma `Atlas`, `Points`, el objeto `Skia`, `drawAsImage`, `mixColors` y los buffers.
- **CREDITOS.md:** la escenografía es arte propio (CC0) y las marcas son inventadas.

### Paso 4: panel de ajuste
- **`DevPanel`:** sección "Escenografía".
  - Interruptores "Partículas de polvo y humo" y "Dibujar la escenografía".
  - Sliders de densidad de árboles (×0 a ×2), intensidad del paralaje (×0 a ×2) y contraste de las franjas (0 a 100 %).
  - "Restablecer" también los vuelve a sus valores.
- **`DriveScreen`:**
  - genera la escenografía al montarse;
  - conecta la textura, la vista y las partículas;
  - vuelve a generar la escenografía al cambiar el ancho o la densidad (misma semilla).
  - Todos los ajustes valen solo para la sesión. (Este archivo cambió en los pasos 3 y 4; va en el commit del paso 4.)

### Cierre
- **`CLAUDE.md`:**
  - la escenografía como dato del circuito;
  - las reglas de rendimiento nuevas (atlas, culling, paralaje por capa, evitar `Points` con miles de puntos);
  - el arte en código y el mock de Skia;
  - la trampa de los worklets (abajo).
- **`eslint.config.js`:** regla nueva contra variables como valor por defecto en los worklets (abajo).
- Esta descripción.

### Corrección tras la primera prueba en el celular
Al abrir la carrera, la app se caía con `Property 'PARALLAX_CAMERA_HEIGHT' doesn't exist`.

- **Causa:** `getParallaxScale` usaba una constante del módulo como valor por defecto de un parámetro. El plugin de worklets solo lleva al hilo de UI las variables usadas en el cuerpo, no las de los valores por defecto. Jest no lo detecta, porque ahí los worklets corren como JavaScript común.
- **Arreglo:** el valor por defecto se resuelve en el cuerpo (`cameraHeight ?? PARALLAX_CAMERA_HEIGHT`). Lo mismo en `getVisibleCellRange`, que iba a fallar después, y en `stepParticles`, que no fallaba porque el hook le pasa la configuración.
- **Para que no vuelva a pasar:** una regla de ESLint (`no-restricted-syntax`) marca cualquier función cuya primera sentencia sea `'worklet'` y que tenga una variable como valor por defecto. No marca los hooks que solo contienen un worklet. La probé con un archivo con casos buenos y malos; en el resto del proyecto no encontró otros.

## Cómo probarlo

### Tests y calidad

```bash
npm test            # 742 tests en 67 suites
npm run typecheck
npm run lint
```

### En el celular

Con Metro corriendo, recargar la app (no hace falta `npm run android`).

1. **Largada:** abajo de la pantalla asoma el frente de la tribuna con público. Se ve entera al tomar velocidad, cuando la cámara se aleja. Los árboles y carteles aparecen en el primer segundo, durante el semáforo.
2. **Recta principal:** carteles publicitarios arriba de la pista y, antes de la chicana, los carteles 300, 200 y 100 del mismo lado. Las franjas del pasto cruzan en diagonal.
3. **Chicana y horquilla:** barreras de neumáticos del lado de afuera; marcas de frenada en el asfalto antes de cada una.
4. **Paralaje:** con el auto en movimiento, las copas se "despegan" un poco de su sombra hacia afuera de la pantalla. Con el panel en ×0 no se mueven; en ×2, el doble.
5. **Partículas:** rozar el borde a velocidad levanta polvo. Derrapar en una curva o frenar fuerte a fondo deja humo detrás de las ruedas traseras.
6. **Panel:** cada ajuste se ve al instante. La densidad tarda un momento (vuelve a generar todo).
7. **Pregunta para el tester:** ¿sigue el mareo en las rectas?

### Fluidez: qué revisar (60 fps)

Con el contador de fps del panel:
- **Recta principal a fondo,** con árboles a los dos lados: tiene que quedar en 60.
- **Comparar** con "Dibujar la escenografía" apagado y prendido. Si la diferencia es grande, avisame y lo miro.
- **Densidad ×2:** el culling tendría que mantener los fps (solo se dibujan las celdas visibles).
- **Humo y polvo seguidos,** derrapando en la horquilla.
- **Primer segundo de la carrera:** la escenografía se genera al abrir la pantalla. Fijate si se nota un tirón en la transición o al aparecer los árboles.
- **Cámara que gira con el auto** (panel): el culling usa el círculo de la pantalla, así que no debería faltar nada en las esquinas.

## Decisiones y cambios respecto del plan

Decisiones confirmadas en el plan:

1. **Assets:** arte propio dibujado en código con la paleta del handoff, rasterizado a una textura (opción A).
2. **Partículas:** polvo al rozar el borde (el auto no puede pisar el pasto) y humo al derrapar o frenar fuerte.
3. **Arquitectura:** escenografía como dato del circuito; módulos y hooks nuevos.
4. **Franjas de corte** con el ángulo elegido por circuito.
5. **Marcas inventadas:** RAYO MATE, GOMAS ÑANDÚ, ALFAJORES COMETA, LUBRI TERO y RADIO VELOZ.

Cambios respecto del plan, decididos durante el hito:

- **Escapatoria de 3 m en las rectas, desde el borde blanco** (el plan decía 6 m desde el piano). A fondo la cámara muestra unos 20 m a cada lado del centro de la pista, y menos detenida. Con 6 m más allá del piano, los árboles de las rectas quedaban en el borde de la pantalla, debajo del HUD: justo donde hacían falta. Del lado de afuera de las curvas quedó en 12 m, como en el plan.
- **La escenografía se genera al abrir la carrera** y no al armar el circuito (ver Arquitectura). Por eso es `withCircuitScenery` y no `buildCircuit`.
- **Neumáticos en el atlas y no en `Points`:** son unos 1800. En la GPU, Skia dibuja cada punto redondo de `Points` como un óvalo aparte, en cada cuadro y aunque esté fuera de pantalla. En el atlas son una sola llamada y solo los visibles.
- **Publicidad también en las otras rectas largas** (cada 70 m, alternando lados), no solo en la principal: el mareo era en las rectas.
- **Un interruptor más en el panel,** "Dibujar la escenografía", para medir los fps con y sin.
- **Marcas de frenada fijas:** están antes de cada curva cerrada como dato del circuito. Las del propio auto al frenar quedan para más adelante.
- **Curva cerrada a menos de 45 m de radio:** en el Autódromo deja exactamente la chicana y la horquilla. Lo verifiqué midiendo los radios de toda la vuelta.
- **Los tests de la pantalla de carrera reemplazan `useSceneryView` y `useParticles`:** se prueban en sus propios tests. Así el último `useFrameCallback` sigue siendo el de la carrera, que es el que mueven los tests de la pantalla.

### Autorizaciones permanentes usadas
- **Carpetas y módulos nuevos:**
  - `core/TrackFeatures`, `core/Scenery`, `core/SceneryView` y `core/Particles`;
  - `hooks/useSceneryAtlas`, `useSceneryView` y `useParticles`;
  - `render/GrassLayer`, `AsphaltDetails`, `SceneryAtlas`, `SceneryLayer` y `ParticleLayer`.

  Todos con la convención completa. `render/SceneryBoard` y `render/Grandstand` son componentes chicos, documentados en el README de `SceneryLayer`, con test porque tienen lógica.
- **Sin configuración nativa, sin dependencias nuevas y sin cambios en los valores del manejo.**

## Notas

- **Pendiente de verificar en el celular:** los fps (lista de arriba) y si se nota la generación al abrir la carrera. Si se nota, se puede generar por partes o guardar ya generada.
- **Valores para afinar jugando:** paralaje (×1), contraste de las franjas (60 %) y densidad (×1). Si algún valor del panel convence, se pasa a `DEFAULT_SCENERY_DISPLAY` o a la definición del circuito.
- **Para más adelante:** las marcas de frenada del propio auto, la calle de boxes del handoff y la fuente Archivo en los carteles.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
