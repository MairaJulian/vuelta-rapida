# ProfileEditorScreen

Personalización (pantalla 04 del handoff): nombre, color y número del auto, con la vista previa en tiempo real. Crea un perfil o edita uno existente, que además se puede borrar.

## Props

Ninguna. La ruta decide el modo:
- **`/piloto`:** crea un perfil. Arranca con `suggestProfileDraft`: sin nombre, el primer color que nadie usa y un número libre. Al guardar, el perfil queda activo y va a Inicio (`replace`, con "¿Quién juega?" debajo).
- **`/piloto?id=…`:** edita ese perfil. Al guardar, vuelve a la pantalla anterior (Inicio o "¿Quién juega?").
- **Un id que no existe** redirige a "¿Quién juega?".

## Ejemplo

```tsx
// src/app/piloto.tsx
import { ProfileEditorScreen } from '@/screens/ProfileEditorScreen';

export default ProfileEditorScreen;

// Editar:
router.push({ pathname: '/piloto', params: { id: profile.id } });
```

También exporta `PROFILE_ERROR_TEXTS`: el texto de cada error de validación.

## Diseño (handoff, pantalla 04)

- **Encabezado:**
  - Título "NUEVO PILOTO" al crear y "TU MONOPLAZA" al editar.
  - Botón Guardar a la derecha. Al editar, antes va "Borrar" (botón de peligro, con ícono de tacho).
- **Vista previa** (tarjeta blanca de 250 de ancho):
  - El auto de costado, de 74 dp de ancho (`CarPreview`), con su color y su número.
  - La franja de piano coral y blanca abajo.
  - La píldora tinta del piloto (`DriverBadge`) con el número y el NOMBRE.
  - Cambia con cada toque y cada letra.
- **Color · Nombre:** las 8 muestras de la paleta (`ColorSwatches`).
- **Número:** de 1 a 99, dando la vuelta en los extremos (`NumberStepper`).
- **Nombre del piloto:** campo de 56 de alto, hasta 12 caracteres, con teclado en mayúsculas.
- **Debajo:** la ayuda "Hasta 12 letras. Aparece en tus récords.", o el error en `coral-text`.
- **Borrar:** pide confirmación (`ConfirmDialog`): "¿Borrar a MALE?" / "También se borran sus récords. No se puede deshacer.". Al confirmar, borra y vuelve a "¿Quién juega?".

## Componentes chicos

### ColorSwatches (`src/components/ColorSwatches`)

Las 8 muestras de `CAR_COLORS`, de Ø 48 con padding 4 y un anillo tinta de 2,5 en la elegida. Es un grupo de radios accesible: cada muestra se anuncia con el nombre del color. Props: `selected` y `onSelect(id)`. Si no entran a lo ancho, pasan a dos filas.

### NumberStepper (`src/components/NumberStepper`)

Píldora blanca con los botones − y + (Ø 48, `soft`, íconos de Phosphor) y el número en 900 de 32 dp. La regla de dar la vuelta está en `stepCarNumber` (`core/Profiles`). Props: `value` y `onChange(value)`.

### DriverBadge (`src/components/DriverBadge`)

Píldora tinta con el número en un círculo del color del auto y el NOMBRE en blanco. El número va en blanco sobre los colores oscuros y en tinta sobre los claros. Props: `name`, `number`, `colorId`, `trailing` (algo después del nombre) y `style`. La usan esta pantalla e Inicio.

## Decisiones de diseño

- **Las validaciones están en `core/Profiles`:**
  - El nombre es obligatorio, va sin espacios sobrantes y tiene hasta 12 caracteres.
  - No puede repetirse entre perfiles, sin distinguir mayúsculas ni acentos.
  - El número va de 1 a 99.
  - La pantalla solo traduce los errores a texto.
- **El error aparece al tocar Guardar** y se va con el siguiente cambio: no se reta al chico mientras escribe.
- **12 caracteres en lugar de los 10 del handoff,** como pidió el hito 6a. El campo corta en 12 y la validación cuenta caracteres reales (un emoji es uno).
- **El nombre se guarda como se escribió** (normalizado) y se muestra en mayúsculas. El teclado arranca en mayúsculas.
- **Teclado en horizontal:** Android abre el campo en pantalla completa con el teclado, así que no hace falta reacomodar nada. La vista previa se ve al cerrarlo.
- **"Aparece en tus récords"** en lugar de "en el auto y en tus récords": el auto lleva el número, no el nombre.
- **Sin "Paso 3 de 3":** la personalización ya no es un paso de un asistente; se llega desde "¿Quién juega?" o desde el Garage de Inicio.
- **El modo se fija al abrir:** después de borrar, la pantalla sigue montada un instante sin el perfil. No cambia de modo ni redirige por su cuenta; vuelve con `dismissTo('/jugadores')`.
- **Borrar está en el encabezado y no abajo:** en 360 dp de alto no entra otra fila debajo de las opciones.
