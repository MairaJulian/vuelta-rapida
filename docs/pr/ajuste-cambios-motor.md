# Título

Motor con cambios de marcha: el tono sube en cada marcha y cae al cambiar

# Descripción

## Resumen

Probando el hito 6a en el celular, el sonido del motor cansaba en las rectas. El tono seguía a la velocidad y, con el auto a fondo, quedaba clavado en el tope (×2,4).

Ahora el motor "mete los cambios":
- **En cada marcha,** el tono sube con la velocidad.
- **Al subir de marcha,** el tono cae casi de golpe y el volumen hace un corte breve (80 ms), como un corte de encendido.
- **Al frenar,** baja de marcha y el tono sube rápido.
- **A velocidad máxima,** la sexta queda por debajo del corte, así que en las rectas el tono es unos tres semitonos más grave que antes (×2,0 en lugar de ×2,4).

No hay archivos de sonido nuevos ni dependencias: todo sale del mismo loop del motor. **No hace falta recompilar el dev build.**

**Base:** la rama sale de `hito-6a-perfiles`. Conviene abrir este PR después de fusionar el del hito 6a, así contra `main` muestra solo estos cambios.

## Cambios

- **`audio/EngineGears`** (nuevo, puro):
  - La caja de cambios del sonido: a partir de la velocidad, da la marcha, las revoluciones y si cambió.
  - Seis marchas, más cortas al principio, con histéresis para no ir y venir.
  - La física del auto no cambia: las marchas son solo sonido.
- **`audio/RaceAudio`:**
  - El tono sigue a las revoluciones de la marcha.
  - En cada cambio, el tono salta con una constante de 15 ms; al subir, además, el volumen baja al 35 % durante 80 ms.
  - El volumen sigue a la velocidad, no a las revoluciones, así que el motor no se apaga y prende con cada marcha.
  - Mezcla nueva: `gearShifts` (prendido por defecto).
- **Panel de desarrollo, sección Sonido:**
  - Interruptor "Cambios de marcha", para comparar con el sonido anterior.
  - "A sexta en": el ritmo de los cambios, 2,5, 3 o 3,5 s. Cambia en caliente.
  - El slider "Tono del motor a fondo" ahora se llama "en el corte".

### Valores que cambiaron

| Valor | Antes | Después |
|---|---|---|
| Tono del motor en el tope | ×2,4 (a velocidad máxima) | ×2,2 (en el corte de cada marcha) |
| Tono a velocidad máxima | ×2,4 | ×2,0 (sexta al 85 %) |
| Tono detenido | ×0,8 | ×0,8 (igual) |
| Volumen del motor | 25 % | 25 % (igual) |

### Las marchas

Seis marchas, con tres ritmos para elegir en el panel. **Por defecto, a sexta a los 3,5 s**, elegido probando en el celular. La primera versión llegaba a los 2,5 s y los primeros cambios se escuchaban demasiado seguidos.

| Ritmo | Cortes de 1.ª a 6.ª (velocidad máxima = 1) | Cambios a los (acelerando desde 0) |
|---|---|---|
| 2,5 s | 0,2 · 0,34 · 0,48 · 0,62 · 0,78 · 1,18 | 0,45 · 0,8 · 1,2 · 1,7 · 2,4 s |
| 3 s | 0,226 · 0,408 · 0,576 · 0,736 · 0,886 · 1,18 | 0,5 · 1,0 · 1,6 · 2,2 · 3,0 s |
| **3,5 s** | 0,258 · 0,462 · 0,641 · 0,811 · 0,962 · 1,18 | 0,6 · 1,2 · 1,8 · 2,6 · 3,5 s |

- **Límite:** el auto llega a la velocidad máxima a los 3,8 s, así que los cinco cambios tienen que entrar antes. Con 3,5 s, el último queda pegado a la máxima y se nota menos, porque el tono cae poco.
- **La sexta no llega al corte** en ningún ritmo: a velocidad máxima gira al 85 %.
- **Bajada:** se baja cuando la marcha de abajo quedaría con 70 % de revoluciones o menos.
- **Salida de curva:** el auto vuelve a subir de marcha, y ahí se escuchan los cambios.

## Cómo probarlo

### Tests y calidad

```bash
npm test            # 916 tests en 76 suites
npm run typecheck
npm run lint
```

### En el celular

Con Metro corriendo por el cable, recargar la app y entrar a la pista (el audio se arma al abrir la carrera).

1. **Largada:** se escuchan cinco cambios en unos 3,5 s y después la sexta, más grave que antes. En el panel, "A sexta en" permite comparar 2,5, 3 y 3,5 s; el ritmo se aplica a partir del siguiente cambio.
2. **Rectas:** el tono a fondo no es tan agudo.
3. **Curvas:** al frenar baja de marcha (el tono sube), y al acelerar vuelve a meter los cambios.
4. **Comparar:** en el panel de desarrollo, Sonido → "Cambios de marcha" prende y apaga los cambios en caliente.
5. **Sin chasquidos:** en cada cambio no tendría que oírse un clic. Si se oye, se ajusta la constante del corte.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
