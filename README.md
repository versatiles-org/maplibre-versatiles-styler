# MapLibre VersaTiles Styler  
[![codecov](https://codecov.io/gh/versatiles-org/maplibre-versatiles-styler/branch/main/graph/badge.svg?token=UnrhAAITs8)](https://codecov.io/gh/versatiles-org/maplibre-versatiles-styler)

A lightweight MapLibre GL JS control that allows users to explore and modify **VersaTiles map styles** directly inside the map.  
It provides a sidebar with editable color palettes, recoloring tools, and style options such as language selection.  
Perfect for data journalism, demos, prototyping, or interactive style exploration.

---

## Features

- 🔧 **Interactive styling UI** directly inside MapLibre  
- 🎨 Edit colors, recoloring rules, and style options  
- 🔄 Switch between all available `@versatiles/style` style presets  
- 🧩 Works as a standard MapLibre control (`map.addControl`)  
- 📦 Zero dependencies outside MapLibre & VersaTiles Style  
- 🧪 Fully tested (Vitest + jsdom)  
- 🛠 Written in TypeScript, bundled with Rollup  

---

## Usage

Include MapLibre GL JS, the VersaTiles Styler bundle, and the CSS in your HTML page.

### 1. Load scripts and CSS in HTML

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>MapLibre VersaTiles Styler Demo</title>

  <!-- MapLibre -->
  <link href="https://tiles.versatiles.org/assets/lib/maplibre-gl/maplibre-gl.css" rel="stylesheet" />
  <script defer src="https://tiles.versatiles.org/assets/lib/maplibre-gl/maplibre-gl.js"></script>

  <!-- VersaTiles Styler -->
  <script defer src="./maplibre-versatiles-styler.js"></script>

  <style>
    body, html {
      margin: 0;
      padding: 0;
      height: 100%;
    }
    #map {
      width: 100%;
      height: 100%;
    }
  </style>
</head>

<body>
  <div id="map"></div>

  <script defer>
    window.addEventListener("DOMContentLoaded", () => {
      const map = new maplibregl.Map({
        container: "map",
        center: [13.4, 52.5],
        zoom: 10,
      });

      map.addControl(
        new VersaTilesStylerControl({ open: true }),
        "top-right"
      );
    });
  </script>
</body>
</html>
```

### Notes

- When using the UMD build in `<script>` tags, the control is available as the global variable `VersaTilesStylerControl`.
