# Resumen del handoff de diseño

Extracto de `design_handoff_vuelta_rapida_paddock/README.md` para consultar en vez del handoff completo. Solo ir al handoff ante una duda puntual (capturas en `screenshots/`, prototipos `.dc.html`). Medidas en dp sobre un lienzo de **800 × 360**; anclar cada elemento a su borde. Márgenes laterales mínimos: 28 en el HUD, 36 en los menús.

## Diferencias del proyecto respecto del handoff

- Control por inclinación desactivado (`FEATURE_FLAGS.tiltControl`): las pantallas 02, 03 y 07a solo existen detrás del panel de desarrollo.
- Fantasma relleno y translúcido (el handoff lo dibuja con contorno punteado), con el color y el nombre de su dueño.
- Hay cuatro pistas, no tres, y la selección de pista incluye la elección de fantasma.
- Perfiles de jugador (`/jugadores`) y ranking: no están en el handoff.

## Colores

| Token | Hex | Uso |
|---|---|---|
| bg | `#F6F7F9` | Fondo de menús y paneles de Pausa |
| card | `#FFFFFF` | Tarjetas, píldoras del HUD, botones secundarios |
| ink | `#14171F` | Texto, botón Correr, semáforo, gomas y alerones |
| ink-2 / muted / faint | `#3A404C` / `#5D6472` / `#9AA1AD` | Párrafo / secundario y rótulos / "/3" |
| soft / line | `#ECEEF2` / `#CFD3DA` | Botones − y +, chips neutros / trazado del minimapa |
| blue | `#2F6BDD` | Todo lo tocable y la selección (presionado `#1F55BC`) |
| blue-soft / blue-tint / blue-zone / blue-num | `#E9EFFC` / `#EEF2FB` / `#B5C8F2` / `#4880EA` | Mejor vuelta / ilustración sin elegir / zona muerta / número gigante de Inicio |
| coral | `#E04A3A` | Freno y pianos (presionado `#C0352A`; texto `#B83126`) |
| lime | `#C6EB4C` | Solo récords y el círculo de Correr |
| delta-faster / delta-slower | `#2E9A55` / `#D83B3B` | Delta a favor / en contra |
| light-on / light-off | `#EC3B30` / `#353A45` | Lámpara del semáforo (interior de columna `#22262F`) |
| backdrop | `rgba(20,23,31,0.55)` | Velo de la Pausa (única capa translúcida) |

Colores de auto: Azul, Coral, Lima, Tinta, Turquesa, Violeta, Naranja, Blanco. Número en blanco sobre Azul, Coral, Tinta y Violeta; en tinta sobre el resto. Las paletas reales viven en `core/CarPalette`; el handoff da los valores en `oklch()` (RN no lo acepta).

## Tipografía, forma y sombras

- **Archivo**, única familia. En RN: Archivo ExtraCondensed (≈66 %) para display y Archivo Narrow (≈80 %) para UI.
- Display: 900, MAYÚSCULAS, interlineado 0,84–0,95 (logo 84, títulos de pantalla 36). UI y cronómetro: 800, cifras tabulares. Rótulos: 600, 11–13. Texto: 400–500, 13–19.
- Radios: botones, chips y píldoras del HUD 999; tarjetas 20–22; ilustraciones 14–16; paneles grandes 24.
- Sombras con `#14171F`: sm (tarjetas), md (píldoras del HUD), lg (controles de manejo). En Android, `elevation` 1, 2 y 4.
- Íconos: Phosphor, peso `fill`.
- Tiempos `m:ss.mmm`, deltas con signo siempre (− U+2212 / +), formato `−0.412`.

## Componentes

- **Correr:** alto 64, fondo ink, texto blanco 26, círculo lime Ø 46 con play; presionado `#2A2F3A`.
- **Primario:** alto 52 (56 en Listo y Continuar), fondo blue, texto blanco 19–22. **Secundario:** alto 50–52, fondo card + sombra sm; presionado soft. **Peligro:** alto 50, sin fondo, texto coral. **Ícono:** Ø 48 (56 en Inicio).
- **Tarjeta de opción:** radio 20–22, borde 2,5 transparente → blue al elegirla.
- **Muestra de color:** Ø 48, anillo ink 2,5 en la elegida. **Campo de texto:** alto 56, píldora, MAYÚSCULAS.
- **Chip de delta:** padding 3/12, verde o rojo, texto blanco 19, ícono fantasma 16.
- **Dirección (botones):** Ø 76, blanco, chevron 34; presionado blue-soft. **Freno:** Ø 96, coral, "Freno" 20.
- **Semáforo:** 5 columnas, carcasa ink radio 24, padding 12, separación 10; cada columna con 2 lámparas Ø 34 (se enciende la de abajo).
- Táctil: todo lo tocable ≥ 48; controles de manejo ≥ 76; vibración corta en el freno. Animaciones de UI 150–200 ms ease-out.

## Pantallas

**Encabezado de menús (02–05):** padding 22/36; Volver Ø 48 a la izquierda; título 36 con subtítulo muted 13 al centro; botón primario a la derecha.

- **01 Inicio:** panel blue a la derecha (inset 14, ancho 370, radio 24) con el número del auto gigante (360, blue-num) y el auto a −20°. Columna izquierda (x=44, y=30): chip "Contrarreloj vs. tu fantasma", logo VUELTA / RÁPIDA (RÁPIDA en blue), fila Correr + Garage + Ajustes. Abajo: "Tu récord en…" con el tiempo.
- **02 Elección de control** (desactivada): "¿Cómo querés manejar?", dos tarjetas (Inclinación / Botones), nota "el auto acelera solo".
- **03 Calibración** (desactivada): arco de 260, zona muerta blue-zone, marcador blue Ø 18, silueta de teléfono 132 × 68 con grados; tarjeta con sensibilidad 1–10 y botón Listo de 56.
- **04 Personalización:** "Tu monoplaza". Vista previa en tarjeta de 250 con el auto a 90° y franja de piano. Opciones: color (8 muestras), número 1–99 (da la vuelta), nombre máx. 10 letras.
- **05 Selección de pista:** "Elegí la pista", botón Largar con bandera a cuadros. Tarjetas con ilustración de 88 de alto (trazado blue de 4,5, meta coral; seleccionada: fondo blue y trazo blanco), nombre 22, tipo muted 12 y chip de récord (lima, o soft "Sin récord todavía").
- **06 Largada:** escena de fondo, semáforo arriba al centro (y=22), píldora con "Preparate…" / "Esperá…" / "¡Largada!" (30). Columnas cada ~700 ms; con las 5 encendidas, espera al azar de 0,5–1,5 s y se apagan juntas; ahí arranca el cronómetro.
- **07 HUD:** escena a pantalla completa; píldoras arriba (y=14). Izquierda (x=28): minimapa 80 × 48 y "Vuelta 2/3" (jugador: círculo de su color con borde ink; fantasma: blanco con borde punteado). Centro: tiempo de vuelta (36) y chip de delta debajo. Derecha: "Mejor …" y Pausa Ø 48.
  - **07b Botones:** ◀ ▶ Ø 76 abajo a la izquierda (separados 14, a 28 del borde y 18 de abajo); Freno Ø 96 abajo a la derecha (a 28 y 14).
  - **07a Inclinación** (desactivada): frenos laterales 76 × 128 y píldora de volante 168 × 24 abajo al centro.
- **08 Pausa:** velo backdrop; panel bg a la izquierda (inset 14, ancho 340, radio 24). "PAUSA" 42, "Vuelta 2 de 3 · pista", Continuar (primario 56 con play), Recalibrar (solo inclinación) y Cambiar control (secundarios), Salir al menú (peligro). A la derecha, en blanco: "Vuelta actual" y el tiempo (40).
- **09 Resultados:** tarjeta lime a la izquierda (inset 14, ancho 390, radio 24, recorte a cuadros ink/lima arriba a la derecha): trofeo + "¡Nuevo récord!" (24), pista y modo, tiempo (96), píldora ink con el delta en lima. Columna derecha (x=428): "NOMBRE · #NN", una fila blanca por vuelta (radio 16; mejor vuelta con fondo blue-soft y chip blue "Mejor", las demás chip rojo suave "+x.xxx"), botones Otra vez y Elegir pista (52). Sin récord: tarjeta blanca, "Tu tiempo", delta en rojo.

## Arte (Skia)

- Pasto `oklch(0.90 0.05 150)` con puntos `oklch(0.84 0.07 150)` (radio 1,3, cada 8 dp), por shader de patrón.
- Pista, de abajo hacia arriba: pianos (trazo 138, blanco con raya coral, dash 12/12, solo en curvas), borde blanco (120), asfalto `oklch(0.46 0.015 260)` (110).
- Meta: 14 dp a cuadros de 7 dp, con cartel blanco "META".
- Monoplaza (viewBox 40 × 90, mirando arriba): carrocería, trompa y alerón delantero del color del jugador; gomas, alerón trasero, cockpit y halo en ink; casco amarillo `#EDBB00`; disco blanco con el número. En carrera, ~30 dp de ancho (la pista, 110).
- Escuderías inventadas de ejemplo: Cóndor, Pampa Racing, Andes GP, Tormenta.
