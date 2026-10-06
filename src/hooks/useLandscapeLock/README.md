# useLandscapeLock

Habilita las **dos** orientaciones horizontales y ninguna vertical. Se usa una vez, en el layout raíz.

## Parámetros y resultado

No recibe parámetros ni devuelve nada.

## Ejemplo

```tsx
export default function RootLayout() {
  useLandscapeLock();
  return <Stack />;
}
```

## Decisiones de diseño

- **Por qué hace falta:** en Android, `"orientation": "landscape"` de `app.json` se traduce en `android:screenOrientation="landscape"`, que fija una sola orientación horizontal. Si el jugador da vuelta el celular, la pantalla queda cabeza abajo.
- **`OrientationLock.LANDSCAPE`** de expo-screen-orientation equivale a `SCREEN_ORIENTATION_SENSOR_LANDSCAPE`: la pantalla sigue al celular entre las dos orientaciones horizontales, aunque el usuario tenga bloqueada la rotación automática.
- **Inclinar como volante no da vuelta la pantalla:** Android solo propone pasar a la otra orientación horizontal cuando el celular gira cerca de 180°. Al llegar a unos 45° propone vertical, y `sensorLandscape` lo ignora. Un giro de volante, incluso a fondo, no llega a eso.
- **Sin recompilar:** expo-screen-orientation ya está en el dev build desde el hito 1. Se hace en tiempo de ejecución, sin plugin ni prebuild.
- **El cambio de orientación durante la carrera** lo resuelve `core/TiltSteering`: cada lectura del sensor trae la rotación de la pantalla.
