# Handoff: Vuelta Rápida — dirección "Paddock"

## Overview
Interfaz e identidad visual de un juego de monoplazas en vista cenital 2D para **Android, solo en horizontal** (landscape bloqueado). El dispositivo de referencia es un celular de gama media con pantalla 20:9. Modo inicial: contrarreloj contra un auto fantasma, que es la mejor vuelta del jugador. Más adelante se suman rivales con IA y una versión 3D con cámara detrás del auto.

Idioma: español rioplatense. Público: chicos de 10 a 12 años fanáticos del automovilismo y fans adultos; tiene que ser claro sin verse infantil.

Stack destino: **React Native + Expo + React Native Skia**.

**Restricción legal:** no usar marcas registradas ("F1", "Formula 1", equipos, pilotos, logos ni decoraciones reales). Todo es genérico ("monoplaza") con nombres inventados.

## About the Design Files
Los archivos `.dc.html` de este paquete son **referencias de diseño hechas en HTML**: prototipos que muestran el aspecto y el comportamiento buscados, no código de producción.

La tarea es **recrearlos en React Native/Expo**:
- Menús y HUD con `View`, `Text` y `Pressable`.
- Escena de juego (pista, autos y minimapa) con **Skia** (`Canvas`, `Path`, `Circle`, `RoundedRect`).

Para mirarlos, abrí `Vuelta Rapida Paddock.dc.html` en un navegador; necesita `support.js`, `_ds/` y los otros dos `.dc.html` en la misma carpeta. En `screenshots/` hay una captura de cada pantalla.

## Fidelity
**Alta fidelidad (hi-fi).** Colores, tipografía, tamaños y layout son finales.

- Medidas en **dp**, sobre un lienzo de diseño de **800 × 360 dp**.
- Escalar con `useWindowDimensions()` y mantener cada elemento anclado a su borde; no centrar todo en un lienzo fijo.
- Safe areas: margen lateral mínimo de 28 dp en el HUD y 36 dp en los menús.

---

## Design Tokens

### Colores
| Token | Valor (hex aprox.) | Uso |
|---|---|---|
| bg | `#F6F7F9` | Fondo de menús y de los paneles de Pausa |
| card | `#FFFFFF` | Tarjetas, píldoras del HUD, botones secundarios |
| ink | `#14171F` | Texto, botón Correr, semáforo, gomas y alerones del auto |
| ink-2 | `#3A404C` | Texto de párrafo |
| muted | `#5D6472` | Texto secundario y rótulos |
| faint | `#9AA1AD` | "/3" del contador de vueltas |
| soft | `#ECEEF2` | Botones de − y +, chips neutros, presionado de los secundarios |
| line | `#CFD3DA` | Trazado del minimapa |
| blue | `oklch(0.56 0.20 258)` ≈ `#2F6BDD` | **Todo lo tocable** y la selección |
| blue-pressed | `oklch(0.48 0.20 258)` ≈ `#1F55BC` | Presionado del primario |
| blue-soft | `oklch(0.95 0.03 258)` ≈ `#E9EFFC` | Fila de la mejor vuelta, presionado de los botones de dirección |
| blue-tint | `oklch(0.96 0.02 258)` ≈ `#EEF2FB` | Fondo de ilustración no seleccionada |
| blue-zone | `oklch(0.85 0.08 258)` ≈ `#B5C8F2` | Zona muerta de la calibración |
| blue-num | `oklch(0.62 0.19 258)` ≈ `#4880EA` | Número gigante sobre el panel azul de Inicio |
| coral | `oklch(0.60 0.21 28)` ≈ `#E04A3A` | **Freno** y pianos |
| coral-pressed | `oklch(0.52 0.20 28)` ≈ `#C0352A` | Freno presionado |
| coral-text | `oklch(0.50 0.20 28)` ≈ `#B83126` | Botón "Salir al menú" |
| lime | `oklch(0.90 0.19 120)` ≈ `#C6EB4C` | **Solo récords** y el círculo de Correr |
| delta-faster | `oklch(0.58 0.16 150)` ≈ `#2E9A55` | Delta a favor del jugador |
| delta-slower | `oklch(0.58 0.22 25)` ≈ `#D83B3B` | Delta en contra |
| delta-slower-soft | `oklch(0.95 0.04 25)` / texto `oklch(0.50 0.20 25)` | Chip "+x.xxx" en Resultados |
| light-on | `oklch(0.62 0.24 27)` ≈ `#EC3B30` | Lámpara encendida del semáforo |
| light-off | `#353A45` | Lámpara apagada; el interior de cada columna es `#22262F` |
| backdrop | `rgba(20,23,31,0.55)` | Velo de la Pausa (la única capa translúcida) |

Colores de auto elegibles:
- Azul (blue)
- Coral `oklch(0.64 0.21 28)`
- Lima (lime)
- Tinta `#14171F`
- Turquesa `oklch(0.72 0.13 190)`
- Violeta `oklch(0.55 0.20 295)`
- Naranja `oklch(0.76 0.16 60)`
- Blanco `#FFFFFF`

Los colores oscuros (Azul, Coral, Tinta y Violeta) llevan el número en blanco; los demás, en tinta.

> RN no acepta `oklch()`. Convertí cada valor a hex con un conversor OKLCH y guardalos en `theme.ts`.

### Tipografía
Una sola familia: **Archivo** (Google Fonts, variable, con eje de ancho `wdth` 62–125).

- **Display**: peso 900, ancho 66–68 %, MAYÚSCULAS, interlineado 0.84–0.95. Logo y títulos de pantalla (36 dp).
- **UI y cronómetro**: peso 800, ancho 76–80 %, con **cifras tabulares** (`fontVariant: ['tabular-nums']`).
- **Rótulos**: 600, 11–13 dp, ancho normal.
- **Texto**: 400–500, 13–19 dp.

En RN el eje de ancho no se controla con estilos. Hay dos caminos:
- Exportar instancias estáticas de Archivo con esos anchos.
- Usar **Archivo Narrow** (ancho cercano al 80 %) y **Archivo ExtraCondensed** (cercano al 66 %), ambas en Google Fonts. Es la opción recomendada.

Escala usada (dp): 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 30, 36, 40, 42, 84 (logo), 96 (tiempo de récord).

### Forma, espaciado y sombras
- **Radios:** botones, chips y píldoras del HUD completamente redondeados (999); tarjetas 20–22; ilustraciones dentro de tarjetas 14–16; paneles grandes 24; marco del teléfono 20 (solo de presentación).
- **Espaciado:** 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 36, 44.
- **Sombras**, todas con color `#14171F`:
  - sm: `0 1 3`, 10–12 %. Tarjetas y botones de menú.
  - md: `0 2 6`, 14 %. Píldoras del HUD.
  - lg: `0 3 8`, 18 %. Controles de manejo.
  - En Android usar `elevation` 1, 2 y 4. No usar desenfoques grandes.

### Motivos
- **Bandera a cuadros:** tablero `ink`/blanco (o `ink`/lima en Resultados) en casillas de 8–16 dp.
- **Franja de piano:** franjas de 16 dp que alternan coral y blanco, de 10 dp de alto. Va debajo del auto en Personalización.

---

## Componentes
| Componente | Medidas | Estilo |
|---|---|---|
| Botón **Correr** (principal) | alto 64, padding 0 10 0 32 | fondo `ink`; texto blanco 800/80 % de 26; a la derecha, círculo `lime` Ø 46 con ícono de play en `ink`; presionado `#2A2F3A` |
| Botón primario | alto 52 (Listo y Continuar: 56), padding horizontal 28 | fondo `blue`, texto blanco 800/80 % de 19–22; presionado `blue-pressed` |
| Botón secundario | alto 50–52 | fondo `card` + sombra sm, texto `ink`; presionado `soft` |
| Botón de peligro | alto 50 | sin fondo, texto `coral-text`; presionado `oklch(0.95 0.03 28)` |
| Botón ícono | Ø 48 (56 en Inicio) | fondo `card` circular con sombra, ícono de 22–24 |
| Tarjeta de opción | radio 20–22, padding 8 | fondo `card`; borde de 2.5 `transparent` → `blue` al seleccionarla; área de ilustración `blue-tint` → `blue` con trazos blancos |
| Muestra de color | Ø 48 | círculo interior + anillo de 2.5 `ink` en la elegida |
| Paso numérico | píldora blanca con dos botones Ø 48 `soft` | valor 900/72 % de 32 |
| Campo de texto | alto 56, píldora blanca | texto 800/80 % de 22, MAYÚSCULAS; cursor `blue` |
| Píldora del HUD | radio 16 (tiempo: 999) | fondo blanco opaco + sombra md |
| Chip de delta | píldora, padding 3/12 | fondo verde o rojo, texto blanco 800/80 % de 19, ícono fantasma de 16. **Siempre con signo** (− / +) para daltónicos |
| Dirección (modo botones) | Ø 76 | blanco + sombra lg, chevron de 34; presionado `blue-soft` |
| Freno (modo botones) | Ø 96 | `coral`, texto blanco "Freno" 800/80 % de 20; presionado `coral-pressed` |
| Freno lateral (modo inclinación) | 76 × 128, radio 38 | `coral`, uno en cada costado |
| Semáforo | 5 columnas | carcasa `ink` con radio 24 y padding 12, separación 10; cada columna es una píldora `#22262F` con 2 lámparas de Ø 34 (se enciende la de abajo) |

**Íconos:** Phosphor, peso **fill** (`phosphor-react-native`, `weight="fill"`). Se usan: Play, Wrench, GearSix, ArrowLeft, Pause, Crosshair, GameController, SignOut, Trophy, CaretLeft, CaretRight, Minus, Plus, Ghost y FlagCheckered.

---

## Pantallas (800 × 360 dp)
**Encabezado de los menús (02–05):** padding 22/36.
- Izquierda: botón Volver Ø 48.
- Centro: título 36 dp (900/68 %, MAYÚSCULAS) con un subtítulo `muted` de 13 debajo.
- Derecha: el botón primario de la pantalla.

### 01 Inicio
- Panel `blue` a la derecha (inset 14, ancho 370, radio 24). Adentro, el número del auto gigante (360 dp, 900/62 %, en `blue-num`) y el auto centrado (100 dp de ancho, rotado −20°). Si el auto elegido es azul, en este panel se muestra blanco.
- Columna izquierda en x=44, y=30:
  - Chip blanco "Contrarreloj vs. tu fantasma", con un cuadrito a cuadros.
  - Logo "VUELTA / RÁPIDA" a 84 dp; "RÁPIDA" en `blue`.
  - Fila con Correr + Garage + Ajustes (Ø 56).
- Abajo (bottom 18): "Tu récord en Autódromo del Lago **1:12.480**".

### 02 Elección de control
- Título "¿Cómo querés manejar?", subtítulo "Paso 1 de 3", botón Seguir.
- Dos tarjetas lado a lado. Cada una tiene la ilustración (130 de ancho) a la izquierda y a la derecha título 30 dp, descripción y chip.
  - **Inclinación:** "Girá el celular como un volante. Frená con cualquier pulgar." Chip "Más real".
  - **Botones:** "Izquierda y derecha con el pulgar izquierdo, freno con el derecho." Chip "Más preciso".
- Al pie: "En los dos modos el auto acelera solo. Podés cambiarlo después desde la pausa."

### 03 Calibración
- Título "Calibrá el volante", subtítulo "Paso 2 de 3". Grilla de tres columnas: 190 | flexible | 230.
- **Texto:** "Sostené el celular como vas a jugar y tocá **Listo**." (500 de 19).
- **Medidor:**
  - Arco de 260 dp con trazo `#E3E6EB` de 14 y extremos redondeados.
  - Zona muerta central en `blue-zone`.
  - Marcador: un punto `blue` Ø 18 con anillo blanco que gira con el ángulo.
  - Silueta del teléfono: tarjeta blanca de 132 × 68 que gira con el ángulo y muestra los grados con signo ("−12°").
  - Debajo: "En la zona azul el auto va derecho".
- **Tarjeta blanca de la derecha:**
  - "Sensibilidad" con el valor de 1 a 10.
  - Slider de 48 de alto entre "Suave" y "Rápida".
  - Botón Listo de 56 dp.

### 04 Personalización
- Título "Tu monoplaza", subtítulo "Paso 3 de 3", botón Guardar.
- **Vista previa:** tarjeta blanca de 250 de ancho con el auto rotado 90° (74 de ancho) y la franja de piano abajo. Encima, una píldora `ink` con el número en un círculo del color del auto y el NOMBRE.
- **Opciones:**
  - Color: 8 muestras Ø 48.
  - Número: de 1 a 99; da la vuelta en los extremos.
  - Nombre: máximo 10 caracteres, se muestra en mayúsculas.
  - Ayuda: "Hasta 10 letras. Aparece en el auto y en tus récords."

### 05 Selección de pista
- Título "Elegí la pista", subtítulo "Contrarreloj · 3 vueltas", botón Largar con ícono de bandera a cuadros.
- Tres tarjetas. Cada una tiene:
  - Ilustración de 88 de alto: el trazado en `blue` con trazo de 4.5 y marca de meta coral. En la tarjeta seleccionada, fondo `blue` y trazado blanco.
  - Nombre (800/72 % de 22) y tipo (`muted` de 12).
  - Chip de récord: lima "Récord 1:12.480", o `soft` "Sin récord todavía".
- Pistas (los paths están en `PISTAS`, en un viewBox de 100 × 60):
  - Autódromo del Lago: Rápido · 5,8 km · 11 curvas · 1:12.480
  - Puerto Viejo: Callejero · 3,3 km · 19 curvas · 1:18.905
  - Las Sierras: Técnico · 7,0 km · 20 curvas · sin récord

### 06 Largada
- La escena de pista de fondo, con el semáforo arriba al centro (y=22).
- Debajo, una píldora blanca con texto 900/68 % de 30: "Preparate…" mientras se encienden, "Esperá…" con las 5 encendidas y "¡Largada!" al apagarse.

### 07 HUD
La escena ocupa toda la pantalla. Arriba (y=14) van las píldoras:
- **Izquierda (x=28):** minimapa (80 × 48) y contador "Vuelta 2/3".
  - El jugador es un círculo de su color con borde `ink`.
  - El fantasma es un círculo blanco con borde punteado.
- **Centro:** tiempo de vuelta en píldora (800/76 % de 36) y debajo el chip de delta.
- **Derecha:** "Mejor 1:12.480" y Pausa (Ø 48).

Hay dos variantes de controles:
- **07a Inclinación:**
  - Un freno lateral de 76 × 128 en cada costado, a 20 dp del borde y 22 dp de abajo.
  - Indicador de volante abajo al centro: píldora de 168 × 24 con la zona muerta en `blue-zone` y un punto `blue` que sigue la inclinación.
- **07b Botones:**
  - ◀ y ▶ Ø 76 abajo a la izquierda (separados 14, a 28 del borde y 18 de abajo).
  - Freno Ø 96 abajo a la derecha (a 28 del borde y 14 de abajo).

### 08 Pausa
- Velo `backdrop` sobre la escena.
- Panel `bg` a la izquierda: inset 14, 340 de ancho, radio 24, padding 22/24.
  - Título "PAUSA" (42) y "Vuelta 2 de 3 · Autódromo del Lago".
  - Continuar: primario de 56, con un círculo blanco y el ícono de play a la derecha.
  - Recalibrar (solo en modo inclinación) y Cambiar control: secundarios con ícono `blue`.
  - Salir al menú: botón de peligro.
- A la derecha, en blanco sobre el velo: "Vuelta actual" y "1:04.318" (40).

### 09 Resultados
- **Tarjeta `lime`** a la izquierda (inset 14, 390 de ancho, radio 24, padding 26/28), con un recorte a cuadros `ink`/lima en la esquina superior derecha. Contiene:
  - Trofeo + "¡Nuevo récord!" (800/76 % de 24).
  - Pista y modo.
  - El tiempo en 900/66 % de 96.
  - Una píldora `ink` con "−0.578" en lima y "vs. tu fantasma".
- **Columna derecha** (x=428):
  - "NOMBRE · #NN".
  - Una fila blanca por vuelta (radio 16): "Vuelta N", el tiempo (800/80 % de 22) y un chip. La mejor vuelta tiene fondo `blue-soft` y chip `blue` "Mejor"; las demás, chip `delta-slower-soft` con "+x.xxx".
  - Botones Otra vez (primario) y Elegir pista (secundario), de 52 de alto.
- **Si no hubo récord**, la tarjeta pasa a ser blanca, el título dice "Tu tiempo" y la píldora muestra el delta en rojo.

---

## Arte del juego (Skia)
Archivos de referencia: `EscenaPista.dc.html` (tema `claro`) y `Monoplaza.dc.html`.

- **Fuera de pista:** pasto `oklch(0.90 0.05 150)` con trama de puntos `oklch(0.84 0.07 150)` (radio 1.3, cada 8 dp). En Skia usar un shader de patrón.
- **Calle de boxes:** trazo `oklch(0.83 0.02 260)` de 46, con extremos redondeados.
- **Pista:** un mismo path dibujado varias veces, de abajo hacia arriba:
  1. Pianos: trazo de 138 solo sobre el tramo curvo, blanco con raya coral (dash 12/12).
  2. Borde: trazo blanco de 120.
  3. Asfalto: `oklch(0.46 0.015 260)`, trazo de 110.
- **Línea de meta:** rectángulo de 14 dp a cuadros de 7 dp, con un cartel blanco "META" de radio 11.
- **Monoplaza** (viewBox 40 × 90, mirando hacia arriba):
  - Carrocería, trompa y alerón delantero del color del jugador.
  - Gomas, alerón trasero, cockpit y halo en `ink`.
  - Casco amarillo `#EDBB00`.
  - Disco blanco con el número.
  - En carrera mide unos 30 dp de ancho; la pista, 110.
- **Fantasma:** la misma silueta sin relleno, con contorno blanco de 1.2 punteado (2.5/2), al 60 % de opacidad y sin número.
- **Escuderías inventadas:** Cóndor (azul, #7), Pampa Racing (coral, #14), Andes GP (lima, #3) y Tormenta (tinta, #21).
- **Pasaje a 3D:** usar los mismos colores como materiales planos sin textura, el número en disco blanco y los pianos como franjas geométricas.

---

## Interactions & Behavior
- **Flujo:**
  - La primera vez: Inicio → 02 → 03 (solo con inclinación) → 04 → 05 → 06 → HUD → 09.
  - Las siguientes: Inicio → 05.
  - Desde la Pausa: Recalibrar va a la 03, Cambiar control a la 02 y Salir a Inicio.
- **Largada:**
  - Las columnas se encienden de a una cada ~700 ms.
  - Con las 5 encendidas, se espera un tiempo al azar de 0,5 a 1,5 s y se apagan todas juntas.
  - En ese momento arrancan el cronómetro y la aceleración automática.
- **Inclinación:**
  - Leer la rotación del celular en horizontal con `DeviceMotion` de expo-sensors.
  - Restarle el ángulo guardado al tocar Listo y multiplicar por la sensibilidad (1–10).
  - Zona muerta de ±5°.
  - El medidor de la 03 y el indicador de volante de la 07a se actualizan en vivo.
- **Delta:**
  - Es el tiempo actual menos el tiempo del fantasma en el mismo punto de la vuelta.
  - Negativo es verde (más rápido) y positivo es rojo (más lento).
  - Formato `−0.412` / `+0.236`, con el signo menos tipográfico (U+2212).
- **Tiempos:** formato `m:ss.mmm`, siempre con cifras tabulares.
- **Táctil:**
  - Todo lo tocable mide 48 dp o más; los controles de manejo, 76 o más.
  - Al presionar, usar el color de "presionado" de cada componente.
  - En el freno, una vibración háptica corta (expo-haptics).
- **Animaciones de UI:** 150–200 ms con ease-out. Sin desenfoques ni capas translúcidas apiladas.

## State Management
- `controlMode: 'inclinacion' | 'botones'`, `tiltOffset`, `sensitivity` (1–10).
- `car: { colorId, number (1–99), driverName (≤10) }`.
- `selectedTrackId` y `records: { [trackId]: { bestLapMs, ghostSamples[] } }`. Guardar en AsyncStorage o MMKV.
- En carrera: `phase: 'lights' | 'racing' | 'paused' | 'finished'`, `lap`, `lapTimes[]`, `currentLapMs`, `deltaMs`.

## Assets
- Fuente: Archivo, Archivo Narrow y Archivo ExtraCondensed (Google Fonts, licencia OFL).
- Íconos: Phosphor, peso fill (licencia MIT).
- Autos y pistas: dibujados como vectores en los prototipos. Se pueden reemplazar por un pack gratuito de estilo plano o low-poly, aplicándole esta paleta.

## Files
- `Vuelta Rapida Paddock.dc.html`: hoja completa con el sistema (paleta, tipografía y componentes), las 9 pantallas y el arte. Los datos (pistas, colores y vueltas) están en la clase al final del archivo.
- `EscenaPista.dc.html`: el tramo de pista; usar el tema `claro`.
- `Monoplaza.dc.html`: el auto en vista cenital, con props `color`, `numero`, `fantasma`, `tinta` y `ancho`.
- `screenshots/`: una captura de cada pantalla, del sistema y del arte.
- `support.js` y `_ds/`: hacen falta solo para abrir los archivos en el navegador.
