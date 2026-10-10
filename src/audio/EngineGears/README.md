# EngineGears

Caja de cambios del sonido del motor: a partir de la velocidad del auto decide la marcha y las revoluciones, para que el motor suba de tono en cada marcha y caiga al pasar a la siguiente. Es solo sonido: la física del auto no tiene marchas. TypeScript puro, sin audio.

## Tipos

- `GearboxConfig`: `{ gearTopSpeeds, downshiftRpm }`.
  - `gearTopSpeeds`: velocidad (de 0 a 1, relativa a la máxima) a la que cada marcha llega al corte. La última puede pasar de 1.
  - `downshiftRpm`: se baja de marcha cuando la de abajo quedaría con estas revoluciones o menos.
- `GearboxStep`: `{ gear, rpm, shift }`. `gear` empieza en 0 (primera); `rpm` va de 0 (detenido) a 1 (corte); `shift` es `'up'`, `'down'` o `null`.
- `GearboxPace`: `'quick' | 'medium' | 'slow'`, el ritmo de los cambios (a sexta a los 2,5, 3 o 3,5 s).

## API

| Exporta | Qué hace |
|---|---|
| `stepGearbox(gear, speedRatio, config)` | Marcha para la velocidad, partiendo de la actual, con sus revoluciones y si cambió. |
| `getGearRpm(speedRatio, gear, config)` | Revoluciones de una marcha a una velocidad. |
| `GEARBOXES` | Una caja por ritmo (tabla de abajo). Todas bajan de marcha con 0,7 de revoluciones. |
| `GEARBOX_PACES` | Los ritmos, del más rápido al más lento. |
| `DEFAULT_GEARBOX_PACE`, `DEFAULT_GEARBOX` | `'slow'`: a sexta a los 3,5 s. |

## Ritmos

Cortes de cada marcha, como fracción de la velocidad máxima. Acelerando desde 0 con la física por defecto del auto (máxima a los 3,8 s):

| Ritmo | Cortes de 1.ª a 6.ª | Cambios a los |
|---|---|---|
| `quick` (2,5 s) | 0,2 · 0,34 · 0,48 · 0,62 · 0,78 · 1,18 | 0,45 · 0,8 · 1,2 · 1,7 · 2,4 s |
| `medium` (3 s) | 0,226 · 0,408 · 0,576 · 0,736 · 0,886 · 1,18 | 0,5 · 1,0 · 1,6 · 2,2 · 3,0 s |
| `slow` (3,5 s) | 0,258 · 0,462 · 0,641 · 0,811 · 0,962 · 1,18 | 0,6 · 1,2 · 1,8 · 2,6 · 3,5 s |

`medium` y `slow` reparten los cambios al 17, 34, 52, 74 y 100 % del tiempo hasta la sexta. Cada intervalo es un poco más largo que el anterior.

## Ejemplo

```ts
let gear = 0;
function onSpeed(speedRatio: number) {
  const step = stepGearbox(gear, speedRatio, DEFAULT_GEARBOX);
  gear = step.gear;
  setPitch(step.rpm, step.shift);
}
```

En la app lo usa `RaceAudio`, cada 50 ms (con cada muestra de velocidad del loop).

## Decisiones de diseño

- **Revoluciones proporcionales a la velocidad en cada marcha:** `rpm = velocidad / corte de la marcha`, como con una relación fija. Al subir, las revoluciones caen solas a `corte anterior / corte nuevo`, y el tono cae con ellas.
- **Marchas cortas al principio:** el auto llega a la velocidad máxima a los 3,8 s, así que los cinco cambios entran antes. Un test comprueba los tiempos de cada ritmo con la misma cuenta del modelo de manejo.
- **3,5 s por defecto,** elegido probando en el celular: con la primera versión (2,5 s), los primeros cambios se escuchaban demasiado seguidos. Los tres ritmos quedan en el panel de desarrollo para comparar en caliente.
- **Con 3,5 s el último cambio se nota menos:** pasa a sexta a los 3,5 s, apenas antes de la velocidad máxima, y el tono cae poco (de 1 a 0,82 de revoluciones).
- **Los tiempos dependen de la física:** los cortes son fracciones de la velocidad máxima. Si cambian la aceleración o el arrastre, los cambios llegan antes o después y los ritmos dejan de durar 2,5, 3 o 3,5 s.
- **Sexta larga:** a velocidad máxima el motor gira al 85 %, por debajo del corte. En las rectas, el tono queda más grave que antes de los cambios, cuando llegaba al tope (ver `RaceAudio`).
- **Histéresis:** sube en el corte y baja recién cuando la marcha de abajo quedaría con 0,7 de revoluciones. Así no va y viene cuando la velocidad oscila cerca de un cambio.
- **Saltos:** si la velocidad cae de golpe (un choque, un reinicio), baja varias marchas en un solo paso y avisa un solo cambio.
- **Aparte de `RaceAudio`:** la lógica se prueba sin contexto de audio. Está en `audio/` y no en `core/`, porque es presentación del sonido, no reglas del juego.
