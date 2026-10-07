# Título

Solo botones: la inclinación queda desactivada con un interruptor tras dos pruebas con usuarios

# Descripción

## Resumen

Después de dos pruebas con usuarios, los botones pasan a ser el único control visible. La inclinación se desactiva con un interruptor de configuración (`FEATURE_FLAGS.tiltControl`): el juego arranca directo con botones, sin elección de control ni calibración. La inclinación sigue accesible solo desde el panel de desarrollo, que con botones oculta sus ajustes. No se borró código, pantallas ni tests de la inclinación: se reevalúa en la fase 3D, con la cámara detrás del auto.

## Resultados de las pruebas con usuarios

### Primera prueba (hito 3, antes de la corrección)

A los testers les costó mucho controlar el auto con inclinación. Uno reportó:

> "Cuando aumenté la sensibilidad para poder doblar más rápido, se aumentaba el punto muerto (lo azul del medio). Yo aumento la sensibilidad, pero eso se aumenta también, entonces tengo que girar más el teléfono. Yo pensé que al aumentar la sensibilidad iba a ser más sensible todo el tiempo."

Se corrigió en el hito 3 (paso 6, PR #4):
- La zona muerta y la sensibilidad pasaron a ser independientes.
- Los indicadores pasaron a usar una escala fija en grados.
- La zona muerta pasó a ser ajustable.
- La elección de control dejó de tener un modo por defecto.

### Segunda prueba (con la inclinación corregida)

Los dos testers siguieron prefiriendo los botones. Por eso este PR deja los botones como único control visible.

### Rampa de dirección: qué pasó en la segunda prueba

Durante la prueba con botones se subió en el panel "Rampa de dirección (inclinación)" a 0,33 s, y la conducción pareció mejorar mucho. Al verificarlo:

- **Ese parámetro no afecta a los botones.** Solo se aplica en modo inclinación: `withTiltSteering` reemplaza la rampa del modelo de manejo cuando el modo es inclinación.
- **Los botones usan dos parámetros propios del modelo de manejo, ya separados:**
  - "Tiempo de giro" (`steerInTime`, 0,25 s): cuánto tarda en llegar al giro máximo.
  - "Tiempo de vuelta al centro" (`steerReturnTime`, 0,15 s): cuánto tarda en volver al soltar.
- **Se comprobó con un test temporal sobre `DriveScreen`:**
  - En botones, mover la rampa de inclinación a 0,33 s deja la configuración del manejo en 0,25 / 0,15.
  - En inclinación, la lleva a 0,33 / 0,33.
- **No es un error de lógica ni de etiqueta.** La mejora que se notó no vino de ese parámetro.
- **Los valores de los botones no se cambian en este PR.** Queda pendiente probar 0,33 s en "Tiempo de giro" y "Tiempo de vuelta al centro" (anotado en `CLAUDE.md`).

## Cambios

### Interruptor de la inclinación (`core/FeatureFlags`)
- **`FEATURE_FLAGS.tiltControl = false`:** una constante congelada en el código. Activar la inclinación es una decisión de producto que pasa por un PR.
- **Se lee en un solo lugar,** `StartScreen`. Desde ahí llega como parámetro a las reglas puras, así los tests prueban los dos estados sin simular el módulo.

### Entrada del juego (`StartScreen` y `core/PlayerPreferences`)
- **`getStartStep(preferences, tiltEnabled = true)`:** con la inclinación desactivada, siempre va a la pista.
- **`isControlModeAvailable(mode, tiltEnabled)`:** con la inclinación desactivada, una inclinación guardada no sirve.
- **Inclinación guardada:** si el celular tenía inclinación guardada (de la prueba o del panel), `StartScreen` la pasa a botones antes de ir a la pista. Conserva la calibración, la sensibilidad y la zona muerta.
- **Prop `tiltEnabled`:** la nueva prop de `StartScreen` toma por defecto el valor del interruptor. Los tests existentes del flujo con inclinación siguen y la usan activada.

### Panel de desarrollo
- **Con botones, la sección Inclinación se oculta, sin borrarse:**
  - Se ocultan sus cuatro sliders (zona muerta, sensibilidad, filtro del temblor y rampa de dirección), "Recalibrar" y "Calibración completa".
  - Así el panel muestra solo lo que afecta a los botones y no se repite la confusión de la rampa.
  - Las lecturas de inclinación ya se ocultaban igual.
- **El selector Inclinación / Botones sigue visible:** es el único acceso a la inclinación. Al elegir Inclinación, la sección vuelve a aparecer. Dura hasta volver a abrir el juego.

### Documentación
- **`CLAUDE.md`:**
  - Resultado de las dos pruebas: botones como único control visible, inclinación desactivada y reevaluación en la fase 3D.
  - Lo que se encontró sobre la rampa.
- **README:** `FeatureFlags` (nuevo), `PlayerPreferences`, `StartScreen`, `ControlChoiceScreen`, `CalibrationScreen` y `DevPanel`.

## Cómo probarlo

### Tests y calidad

```bash
npm test            # 339 tests en 32 suites
npm run typecheck
npm run lint
```

Tests nuevos:
- **`FeatureFlags`:** la inclinación está desactivada por defecto y el interruptor no se puede cambiar en tiempo de ejecución.
- **`getStartStep` e `isControlModeAvailable`:** con la inclinación desactivada siempre va a la pista, y una inclinación guardada no sirve.
- **`StartScreen` con la inclinación desactivada:**
  - La primera vez va directo a la pista.
  - Una inclinación sin calibrar no lleva a la calibración.
  - Una inclinación guardada pasa a botones y conserva la calibración.
  - Con botones guardados no se toca nada.
- **`StartScreen` con la inclinación activada:** los tests anteriores siguen pasando.
- **Panel:**
  - Con botones oculta los sliders y las acciones de inclinación.
  - En modo inclinación los muestra.
  - En `DriveScreen`, la sección aparece al elegir Inclinación en el selector.

### En el celular

No hay cambios nativos: alcanza con el dev build instalado y `npx expo start`.

1. **Arranque:** abre la app. Va directo a la pista con las flechas y el freno, sin "¿Cómo querés manejar?" ni calibración.
2. **Celular con inclinación guardada** (por ejemplo, el de la prueba): también arranca con botones.
3. **Panel "Ajustes" con botones:** debajo del selector Inclinación / Botones va directo a "Manejo". No aparecen la sección "Inclinación" ni sus botones.
4. **Panel "Ajustes" → Control → Inclinación:**
   - Aparecen la sección "Inclinación" y los frenos laterales, y el auto dobla inclinando.
   - "Calibración completa" abre la pantalla 03.
5. **Volver a abrir el juego** (cerrar la app, o recargar con `r` en Metro): arranca otra vez con botones.

## Notas

- **Pendiente:** probar con usuarios 0,33 s en "Tiempo de giro" y "Tiempo de vuelta al centro" de los botones (sección "Manejo" del panel).
- **Para activar la inclinación:** `tiltControl: true` en `src/core/FeatureFlags/FeatureFlags.ts`. Vuelven la elección de control (sin modo por defecto) y la calibración.
- **Nombre de la rama:** `ajuste-control-botones` en lugar de `hito-N-descripcion`, a pedido.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
