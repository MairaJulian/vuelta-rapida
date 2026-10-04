# Vuelta Rápida

Juego de carreras de monoplazas con vista cenital (top-down) para Android, hecho con Expo, TypeScript y React Native Skia. Hay una versión 3D planificada.

## Stack

- Expo (React Native) + TypeScript
- React Native Skia (renderizado 2D)
- Dev builds con `expo prebuild` (Android)

## Estado

En desarrollo inicial. El diseño de referencia está en [`docs/design/`](docs/design/design_handoff_vuelta_rapida_paddock/README.md).

## Desarrollo

```bash
npm install
npx expo prebuild --platform android
npx expo run:android
```

## Hoja de ruta

- [x] Diseño de pantallas (handoff)
- [ ] Prototipo 2D cenital con Skia
- [ ] Versión 3D
