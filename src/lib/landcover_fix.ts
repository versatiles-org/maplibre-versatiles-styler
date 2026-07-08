import type { StyleSpecification } from 'maplibre-gl';

/**
 * Kinds injected into the `land` and `water_polygons` source layers by the
 * Shortbread low-zoom landcover extension, which tiles.versatiles.org now bakes
 * into /tiles/osm from z0 upward.
 * https://docs.versatiles.org/compendium/specification_shortbread_landcover.html
 */
export const LANDCOVER_KINDS = [
	'forest',
	'grassland',
	'farmland',
	'residential',
	'heath',
	'scrub',
	'bare_rock',
	'marsh',
	'swamp',
	'sand',
	'beach',
	'glacier',
	'water',
] as const;

/**
 * Quickfix for landcover not rendering at low zoom.
 *
 * The stock `@versatiles/style` fades the `land` / `water_polygons` fills in with
 * zoom-based `fill-opacity` ramps built for the pre-extension tiles, where those
 * layers held no data below ~z10. Now that the tiles carry landcover from z0,
 * those ramps paint the landcover at opacity 0 until the ramp kicks in. For every
 * affected fill we flatten the ramp to its peak opacity so the landcover shows at
 * every zoom.
 *
 * This belongs upstream in `@versatiles/style`; it lives here as a post-processor
 * until it can be fixed there. Keep it in sync with `LANDCOVER_FIX_SNIPPET`.
 *
 * Mutates and returns `style`.
 */
export function applyLandcoverFix(style: StyleSpecification): StyleSpecification {
	for (const layer of style.layers) {
		if (layer.type !== 'fill') continue;
		const sourceLayer = (layer as { 'source-layer'?: string })['source-layer'];
		if (sourceLayer !== 'land' && sourceLayer !== 'water_polygons') continue;

		const paint = (layer as { paint?: Record<string, unknown> }).paint;
		const opacity = paint?.['fill-opacity'];
		if (!isZoomStops(opacity)) continue;

		const filter = JSON.stringify((layer as { filter?: unknown }).filter ?? []);
		if (!LANDCOVER_KINDS.some((kind) => filter.includes(`"${kind}"`))) continue;

		const peak = Math.max(...opacity.stops.map((stop) => stop[1]));
		if (peak >= 1) delete paint!['fill-opacity'];
		else paint!['fill-opacity'] = peak;
	}
	return style;
}

/**
 * Standalone JS form of {@link applyLandcoverFix}, appended to the "Copy style
 * code" export so pasted snippets get the same fix (the snippet calls
 * `@versatiles/style` directly, so the runtime post-processor can't reach it).
 * Runs against a `style` variable already in scope. Keep in sync with the
 * function above.
 */
export const LANDCOVER_FIX_SNIPPET = `// Quickfix: tiles.versatiles.org now serves the low-zoom landcover extension in
// /tiles/osm, but this style fades those \`land\` / \`water_polygons\` fills in with
// zoom ramps that hide them. Flatten each affected ramp to its peak opacity.
const landcoverKinds = ${JSON.stringify(LANDCOVER_KINDS)};
for (const layer of style.layers) {
  if (layer.type !== 'fill') continue;
  const sourceLayer = layer['source-layer'];
  if (sourceLayer !== 'land' && sourceLayer !== 'water_polygons') continue;
  const opacity = layer.paint && layer.paint['fill-opacity'];
  if (!opacity || typeof opacity !== 'object' || !Array.isArray(opacity.stops)) continue;
  const filter = JSON.stringify(layer.filter || []);
  if (!landcoverKinds.some((kind) => filter.includes('"' + kind + '"'))) continue;
  const peak = Math.max(...opacity.stops.map((stop) => stop[1]));
  if (peak >= 1) delete layer.paint['fill-opacity'];
  else layer.paint['fill-opacity'] = peak;
}`;

interface ZoomStops {
	stops: [number, number][];
}

function isZoomStops(value: unknown): value is ZoomStops {
	return (
		typeof value === 'object' &&
		value !== null &&
		Array.isArray((value as ZoomStops).stops) &&
		(value as ZoomStops).stops.every((stop) => Array.isArray(stop) && typeof stop[1] === 'number')
	);
}
