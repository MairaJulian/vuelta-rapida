# Ícono de la app — opción 3g "Dorsal · Itálica"

Monoplaza blanco (número 7) rotado −24° sobre azul `#2F6BDD`, con "VR" en Archivo 900 itálica ultra condensada (`#4880EA`) apoyada sobre el borde inferior.

| Archivo | Uso |
|---|---|
| `icon-1024.png` | `expo.icon` (iOS / genérico) |
| `play-store-512.png` | Ícono de la ficha en Google Play |
| `adaptive-background.png` | Capa de fondo del ícono adaptativo: azul + VR |
| `adaptive-foreground.png` | Capa frontal: solo el auto, fondo transparente, dentro de la zona segura (66/108) |
| `adaptive-monochrome.png` | Ícono temático de Android 13+: silueta blanca sobre transparente |
| `_preview.png` | Vista de control (formas, tamaños chicos, capas). No se usa en la app. |

## app.json (Expo)
```json
{
  "expo": {
    "icon": "./assets/icono/icon-1024.png",
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/icono/adaptive-foreground.png",
        "backgroundImage": "./assets/icono/adaptive-background.png",
        "monochromeImage": "./assets/icono/adaptive-monochrome.png",
        "backgroundColor": "#2F6BDD"
      }
    }
  }
}
```
Fuente del diseño: variante `italica` de `IconoApp.dc.html`.
