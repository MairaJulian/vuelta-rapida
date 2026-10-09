# Scenery

La escenografía de un circuito como datos: árboles, arbustos, carteles de distancia, carteles publicitarios, tribuna, barreras de neumáticos y detalles del asfalto. La genera una función pura y determinista a partir del trazado; el render solo la dibuja. TypeScript puro.

Responde al pedido de un tester: en las rectas parecía que el auto estaba quieto y se movía el pasto. Los objetos que pasan al costado le indican al cerebro que el que se mueve es el auto.

## Tipos

- `Scenery`: `{ spec, objects, tyres, skidMarks, patches, grassStripeAngle }`. Serializable.
- `SceneryObject`: `{ kind, x, z, rotation, length, depth, variant }`. Ocupa un rectángulo de `length` × `depth` girado `rotation`; árboles y arbustos, un círculo de diámetro `length`.
  - `variant`: tono del follaje (0 a 2), metros del cartel de distancia (300, 200, 100) o índice de la marca (`BILLBOARD_BRANDS`).
  - En la tribuna, el eje y local apunta hacia afuera de la pista: el frente, con el público, mira a la pista.
- `SceneryObjectKind`: `treeLarge`, `treeSmall`, `bush`, `distanceBoard`, `billboard`, `grandstand`.
- `AsphaltPatch`: `{ tone: 'light' | 'dark', points }`, un polígono sobre el asfalto.
- `ScenerySpec`: `{ seed, treeDensity }`. Lo que identifica una escenografía; va en la definición de cada circuito.
- `SceneryConfig`: ajustes del generador (escapatorias, distancias de los carteles, cantidad de árboles, separaciones).

## API

| Exporta | Qué hace |
|---|---|
| `generateScenery(circuit, spec?, config?)` | Genera la escenografía. Pura: la misma `spec` da la misma escenografía. |
| `withScenery(circuit, spec?)` | El circuito con la escenografía generada de nuevo (con `spec` o con la que tenía). Para el panel: ancho y densidad. |
| `getGrassStripeAngle(circuit)` | Rumbo de las franjas del pasto: el que más se aparta de las rectas largas. |
| `getObjectOutline(object, step?)` | Puntos del borde de un objeto y su centro, para revisar que nada pise la pista. |
| `getSceneryClearance(circuit, config?)` | La zona libre que usa el generador (de `core/TrackFeatures`). |
| `isRoundObject(kind)` | Si ocupa un círculo (árboles y arbustos). |
| `SCENERY_HEIGHTS`, `GRANDSTAND_ROOF_HEIGHT` | Altura de cada tipo, en metros. La usa el paralaje. |
| `BILLBOARD_BRANDS` | Marcas inventadas: RAYO MATE, GOMAS ÑANDÚ, ALFAJORES COMETA, LUBRI TERO y RADIO VELOZ. |
| `VEGETATION_SIZES`, `DISTANCE_BOARD_SIZE`, `BILLBOARD_SIZE`, `GRANDSTAND_SIZE`, `TYRE_DIAMETER`, `TYRE_ROWS`, `SKID_MARK_WIDTH` | Medidas en metros. |
| `DEFAULT_SCENERY_SPEC`, `DEFAULT_SCENERY_CONFIG` | Valores por defecto. |

## Ejemplo

```ts
const circuit = withScenery(DEFAULT_CIRCUIT, { seed: 7, treeDensity: 1 });
const trees = circuit.scenery!.objects.filter((object) => object.kind === 'treeLarge');

// Desde el panel: el doble de árboles, misma semilla.
const denser = withScenery(circuit, { ...circuit.scenery!.spec, treeDensity: 2 });
```

## Qué genera

1. **Carteles de distancia** (300, 200, 100 m) antes de cada curva cerrada (`getTightCorners`, radio menor que 45 m), del lado de afuera de la curva. Se saltea un cartel si entre él y la curva hay otra curva cerrada.
2. **Tribuna** de 56 × 12 m en el exterior de la recta principal, centrada 32 m antes de la meta: se ve desde la largada.
3. **Carteles publicitarios** de 10 × 2,4 m en el interior de la recta principal (cada 30 m) y en las otras rectas de 150 m o más (cada 70 m, alternando lados).
4. **Barreras de neumáticos** en el exterior de cada curva con pianos: dos filas de neumáticos de 1,2 m, al final de la escapatoria, y unos metros más allá de cada punta. En una chicana, cada mitad lleva la suya del lado que corresponde.
5. **Árboles y arbustos** en una franja de 45 m (14 m los arbustos) más allá de la escapatoria, más tupidos cerca de la pista. Un ruido suave decide dónde hay bosquecitos y dónde claros.
6. **Marcas de frenada:** de 4 a 6 pares de líneas (las dos ruedas traseras) en los 70 m antes de cada curva cerrada.
7. **Parches del asfalto:** manchas alargadas un poco más claras o más oscuras, cada unos 18 m, sin tocar los bordes ni la meta.

## Reglas que cumple (y prueban los tests)

- Ningún objeto ni neumático entra en la zona libre (pista más escapatoria) de ningún tramo, ni pisa la pista o los pianos.
- Los objetos no se pisan entre sí. Las copas de los árboles se pueden tapar hasta un 25 %: así se forman los bosquecitos.
- Los carteles de distancia están a 300, 200 y 100 m de la entrada de cada curva cerrada.
- La misma semilla da la misma escenografía; otra semilla cambia la vegetación, no los carteles.

## Decisiones de diseño

- **Datos, no dibujo:** cada objeto es un punto con medidas, giro y altura. El render 2D lo dibuja con su paleta; la versión 3D podrá ponerle un modelo a cada uno.
- **Se genera al abrir la carrera** (`withCircuitScenery` en `core/Circuits`): son unos cientos de milisegundos en el celular. Por eso cada consulta a la zona libre usa una grilla y corta en el primer tramo invadido.
- **Orden de ubicación por prioridad:** carteles de distancia, tribuna, publicidad, barreras y vegetación. Un objeto que no entra se corre hacia afuera (los carteles) o se descarta (el resto). Así los carteles importantes nunca quedan tapados por un árbol.
- **Lugar reservado para el cartel META:** ningún objeto lo pisa.
- **Altura por tipo:** árbol grande 9 m, chico 6 m, arbusto 1,5 m, carteles y gradas 3 m, techo de la tribuna 9 m. El paralaje usa pocas alturas distintas: cada una es una capa con una sola transformación.
- **Franjas del pasto según el circuito:** paralelas a una recta no darían referencia de movimiento. `getGrassStripeAngle` prueba ángulos cada 5° y se queda con el que mejor cruza todas las rectas largas.
- **Datos redondeados a milímetros:** la escenografía se serializa prolija y sin `-0`.
