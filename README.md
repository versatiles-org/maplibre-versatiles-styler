[![NPM version](https://img.shields.io/npm/v/maplibre-versatiles-styler)](https://www.npmjs.com/package/maplibre-versatiles-styler)
[![NPM downloads](https://img.shields.io/npm/dt/maplibre-versatiles-styler?label=npm%20downloads)](https://www.npmjs.com/package/maplibre-versatiles-styler)
[![GitHub downloads](https://img.shields.io/github/downloads/versatiles-org/maplibre-versatiles-styler/total?label=github%20downloads)](https://github.com/versatiles-org/maplibre-versatiles-styler/releases/latest)
[![Code coverage](https://codecov.io/gh/versatiles-org/maplibre-versatiles-styler/branch/main/graph/badge.svg?token=UnrhAAITs8)](https://codecov.io/gh/versatiles-org/maplibre-versatiles-styler)
[![CI status](https://img.shields.io/github/actions/workflow/status/versatiles-org/maplibre-versatiles-styler/ci.yml)](https://github.com/versatiles-org/maplibre-versatiles-styler/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

# MapLibre VersaTiles Styler

A lightweight MapLibre GL JS control that allows users to explore and modify **VersaTiles map styles** directly inside the map.
It provides a sidebar with editable color palettes, recoloring tools, style options such as font and language selection, and an export function.
Perfect for data journalism, demos, prototyping, or interactive style exploration.

---

## Features

- Interactive styling UI directly inside MapLibre
- Switch between vector style presets (colorful, eclipse, graybeard, shadow, neutrino) and satellite
- Edit individual colors and apply global recoloring (hue, saturation, brightness, contrast)
- Change fonts and map language
- Adjust satellite imagery options (opacity, hue, brightness, saturation, contrast)
- Export styles as `style.json` download or copy `@versatiles/style` code to clipboard
- Works as a standard MapLibre control (`map.addControl`)
- CSS is injected automatically — no separate stylesheet needed
- Written in TypeScript, bundled with Vite

---

## Usage

### ES module (recommended)

```bash
npm install maplibre-versatiles-styler
```

```js
import maplibregl from 'maplibre-gl';
import VersaTilesStylerControl from 'maplibre-versatiles-styler';

const map = new maplibregl.Map({
  container: 'map',
});

map.addControl(new VersaTilesStylerControl({ open: true }));
```

### UMD / script tag

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>MapLibre VersaTiles Styler Demo</title>

  <!-- MapLibre -->
  <link href="https://unpkg.com/maplibre-gl/dist/maplibre-gl.css" rel="stylesheet" />
  <script src="https://unpkg.com/maplibre-gl/dist/maplibre-gl.js" defer></script>

  <!-- VersaTiles Styler -->
  <script src="https://unpkg.com/maplibre-versatiles-styler" defer></script>

  <style>
    body, html { margin: 0; padding: 0; height: 100%; }
    #map { width: 100%; height: 100%; }
  </style>
</head>

<body>
  <div id="map"></div>
  <script defer>
    window.addEventListener("DOMContentLoaded", () => {
      const map = new maplibregl.Map({
        container: "map",
      });

      map.addControl(
        new VersaTilesStylerControl({ open: true }),
        "top-left"
      );
    });
  </script>
</body>
</html>
```

When using the UMD build, the control is available as the global `VersaTilesStylerControl`.

---

## Options

The `VersaTilesStylerControl` constructor accepts an optional config object:

| Option   | Type      | Default                  | Description                                        |
| -------- | --------- | ------------------------ | -------------------------------------------------- |
| `origin` | `string`  | `window.location.origin` | Base URL of the VersaTiles tile server              |
| `open`   | `boolean` | `false`                  | Whether the sidebar is open initially               |
| `hash`   | `boolean` | `true`                   | Persist the selected style in the URL hash fragment |
