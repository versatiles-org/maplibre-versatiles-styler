[![NPM version](https://img.shields.io/npm/v/maplibre-versatiles-styler)](https://www.npmjs.com/package/maplibre-versatiles-styler)
[![NPM downloads](https://img.shields.io/npm/dt/maplibre-versatiles-styler?label=npm%20downloads)](https://www.npmjs.com/package/maplibre-versatiles-styler)
[![GitHub downloads](https://img.shields.io/github/downloads/versatiles-org/maplibre-versatiles-styler/total?label=github%20downloads)](https://github.com/versatiles-org/maplibre-versatiles-styler/releases/latest)
[![Code coverage](https://codecov.io/gh/versatiles-org/maplibre-versatiles-styler/branch/main/graph/badge.svg?token=UnrhAAITs8)](https://codecov.io/gh/versatiles-org/maplibre-versatiles-styler)
[![CI status](https://img.shields.io/github/actions/workflow/status/versatiles-org/maplibre-versatiles-styler/ci.yml)](https://github.com/versatiles-org/maplibre-versatiles-styler/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

# MapLibre VersaTiles Styler

A lightweight MapLibre GL JS control that allows users to explore and modify **VersaTiles map styles** directly inside the map.
It provides a sidebar that edits every option of [`@versatiles/style`](https://github.com/versatiles-org/versatiles-style) v6 — themes, colors, fonts, layers, terrain, sky and more — and exports the result as a `style.json` or as code.
Perfect for data journalism, demos, prototyping, or interactive style exploration.

---

## Features

- Interactive styling UI directly inside MapLibre
- Ten vector themes — `colorful`, `natural`, `muted`, `gray`, `toner`, each with a `-dark` variant — and satellite imagery
- Colors: global adjustments (hue, saturation, brightness, contrast, gamma, tint, blend) and every individual color, grouped by feature
- Labels in any language of the tileset, or in the browser's language; tilt of line labels
- Label style for all labels, a group or a topic (places, streets, water, …): font, size, spacing, capitalization, letter spacing, line height, wrap width and halo — with a warning when a font lacks the letters of the label language
- Icon size and spacing
- Show, hide or fade every layer group; 3D buildings
- Terrain and hillshade, projection (globe, Mercator), sky and sun
- Satellite: imagery adjustments and a fully configurable vector overlay (theme, colors, labels, icons, layers)
- The whole configuration is kept in the URL hash, so a styled map can be shared as a link
- Export styles as `style.json` download or copy `@versatiles/style` code to clipboard
- Works as a standard MapLibre control (`map.addControl`)
- CSS is injected automatically — no separate stylesheet needed
- Written in TypeScript, bundled with Vite

Requires MapLibre GL JS 5 or later.

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

| Option   | Type      | Default                  | Description                                                                  |
| -------- | --------- | ------------------------ | ---------------------------------------------------------------------------- |
| `origin` | `string`  | `window.location.origin` | Base URL of the VersaTiles server. Can also be changed in the sidebar.       |
| `open`   | `boolean` | `false`                  | Whether the sidebar is open initially                                        |
| `hash`   | `boolean` | `true`                   | Keep the map view, the style and its options in the URL hash fragment        |

---

## Server requirements

The styler reads everything from the `origin`. Each of these is optional — what is missing is left out of the sidebar:

| Path                                        | Used for                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------ |
| `/tiles/osm/tiles.json`                     | The vector themes and the satellite overlay; languages; landcover        |
| `/tiles/satellite/tiles.json`               | The satellite style                                                      |
| `/tiles/elevation/tiles.json`               | Terrain and hillshade                                                    |
| `/assets/glyphs/{fontstack}/{range}.pbf`    | Label fonts                                                              |
| `/assets/glyphs/font_families.json`         | The font lists; without it, fonts are entered as glyph names             |
| `/assets/sprites/base`                      | Icons                                                                    |

The three TileJSON files are loaded in parallel when the control is added, and the style is set once they are in.

---

## URL hash

With `hash: true` the styler keeps its state in the URL:

```
#map=<zoom>/<lat>/<lng>[/<bearing>/<pitch>]&style=<theme or satellite>&config=<options>
```

`config` is the base64url-encoded JSON of the options that differ from the theme's defaults — the same
options `@versatiles/style` takes, e.g. `{"layers":{"labels":false}}`.

---

## Upgrading from 1.x

Version 2 is built on `@versatiles/style` v6:

- The v5 styles `eclipse`, `graybeard`, `neutrino` and `shadow` are replaced by themes. Links that use them
  open the closest theme (`colorful-dark`, `gray`, `muted`, `gray-dark`).
- Options stored in older links use v5 option names; they are ignored and the theme's defaults are shown.
- The copied code uses the v6 API: `await inlineSources(osm({ theme, … }))`.
- `/tiles/index.json` is no longer read; sources are detected from their TileJSON files (see above).
