/**
 * What styled a feature on the map: for a layer the map reports under the cursor, which group of the
 * Layers section draws it, which topic of the Labels section sets its text, and which color key of the
 * palette each of its paint colors comes from.
 *
 * The first two are exact reverse lookups of the maps `@versatiles/style` publishes (`layerGroups`,
 * `textGroups`), whose leaves are the style layer IDs of a group.
 *
 * The colors are found by *probing*: the same style is built once more with every color key set to a
 * color of its own, and the layers of that build say which key reaches which paint property. See
 * `probeColors` for why that beats comparing the rendered colors against the palette.
 */

import type { LayerGroupMap, StyleSpecification, TextGroupMap } from '@versatiles/style';

/** A group map as the library publishes it: nested groups, with the layer IDs at the leaves. */
type GroupTree = { [key: string]: string[] | GroupTree };

/** Layer ID → the path of the group it belongs to, e.g. `land-glacier` → `['land', 'glacier']`. */
export type GroupIndex = Map<string, string[]>;

/**
 * Root groups that repeat layers of other groups. `icons` is a fallback for `pois`, `markings` and
 * `transit.stops`, so its layers belong to those; the Layers section leaves it out for the same reason.
 */
const ALIAS_ROOTS = new Set(['icons']);

/**
 * The reverse of a group map. A layer that appears in several groups keeps the first one that is not an
 * alias, which is the group the section shows it under.
 */
export function groupIndex(groups: LayerGroupMap | TextGroupMap): GroupIndex {
	const index: GroupIndex = new Map();
	const walk = (tree: GroupTree, path: string[]) => {
		for (const [key, node] of Object.entries(tree)) {
			if (path.length === 0 && ALIAS_ROOTS.has(key)) continue;
			if (Array.isArray(node)) {
				for (const id of node) if (!index.has(id)) index.set(id, [...path, key]);
			} else {
				walk(node, [...path, key]);
			}
		}
	};
	walk(groups as GroupTree, []);
	return index;
}

// ── Color attribution ────────────────────────────────────────────────────────

/**
 * One color per key, each with a hue of its own at full saturation.
 *
 * Hue, rather than an exact color, because a layer rarely paints a palette color unchanged: outlines and
 * casings are darkened, `land-park` is faded. Those change lightness and alpha and leave the hue alone,
 * so a hue survives to the built style where an exact value does not — it attributes every derived color
 * to the key it was derived from. Achromatic paint (the hardcoded black of the one-way markings, a white
 * halo) carries no hue and is reported as belonging to no key, which is the truth.
 */
export function probeColors<K extends string>(keys: readonly K[]): Record<K, string> {
	const step = 360 / keys.length;
	return Object.fromEntries(
		keys.map((key, index) => [key, `hsl(${(index * step).toFixed(3)},100%,50%)`])
	) as Record<K, string>;
}

/** The r/g/b of a color the style builder wrote, which is `rgb()`, `rgba()`, `hsl()` or a hex literal. */
function channelsOf(value: string): [number, number, number] | undefined {
	const rgb = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
	if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];

	// An `hsl()` the builder passed through unevaluated: its hue is what we want, so it needs no conversion.
	const hsl = value.match(/hsla?\(\s*([\d.]+)/i);
	if (hsl) return hueChannels(Number(hsl[1]));

	const hex = value.trim().match(/^#([0-9a-f]{3,8})$/i)?.[1];
	if (hex === undefined) return undefined;
	const digits = hex.length < 6 ? [...hex].map((digit) => digit + digit).join('') : hex;
	const number = Number.parseInt(digits.slice(0, 6), 16);
	if (Number.isNaN(number)) return undefined;
	return [(number >> 16) & 0xff, (number >> 8) & 0xff, number & 0xff];
}

/** Any color of that hue: only the hue is read back, so saturation and lightness can be anything. */
function hueChannels(hue: number): [number, number, number] {
	const sector = (((hue % 360) + 360) % 360) / 60;
	const middle = Math.round(255 * (1 - Math.abs((sector % 2) - 1)));
	const table: [number, number, number][] = [
		[255, middle, 0],
		[middle, 255, 0],
		[0, 255, middle],
		[0, middle, 255],
		[middle, 0, 255],
		[255, 0, middle],
	];
	return table[Math.floor(sector) % 6];
}

/** The hue of a color in degrees, or `undefined` for grays, which have none. */
function hueOf(value: string): number | undefined {
	const channels = channelsOf(value);
	if (!channels) return undefined;
	const [red, green, blue] = channels;
	const max = Math.max(red, green, blue);
	const span = max - Math.min(red, green, blue);
	if (span === 0) return undefined;
	const hue =
		max === red
			? (green - blue) / span
			: max === green
				? (blue - red) / span + 2
				: (red - green) / span + 4;
	return (((hue * 60) % 360) + 360) % 360;
}

/** Every color key a paint property's value carries, found anywhere inside an expression. */
function keyOf(value: unknown, keys: readonly string[]): string | undefined {
	if (typeof value === 'string') {
		const hue = hueOf(value);
		if (hue === undefined) return undefined;
		const step = 360 / keys.length;
		const index = Math.round(hue / step) % keys.length;
		const distance = Math.abs(hue - index * step);
		// Half a step of tolerance: rounding in the builder's color math moves a hue by a fraction of a
		// degree, never into the next key's half of the circle.
		return Math.min(distance, 360 - distance) <= step / 2 ? keys[index] : undefined;
	}
	if (Array.isArray(value)) {
		for (const item of value) {
			const key = keyOf(item, keys);
			if (key !== undefined) return key;
		}
		return undefined;
	}
	if (value !== null && typeof value === 'object') {
		for (const item of Object.values(value)) {
			const key = keyOf(item, keys);
			if (key !== undefined) return key;
		}
	}
	return undefined;
}

/** Layer ID → each of its color paint properties and the color key that feeds it. */
export type ColorIndex = Map<string, Record<string, string>>;

/**
 * Reads a style built with {@link probeColors} back into the mapping from paint property to color key.
 *
 * Build the probe style from the options the map is showing — the layers a style has depend on its
 * features (extruded buildings, landcover), and an index built from other options would miss them.
 * Recolor can stay on or off: it moves every color the same way, so a hue still identifies its key. The
 * key it names is the palette entry *before* recolor, which is what the color controls edit.
 */
export function colorIndex(style: StyleSpecification, keys: readonly string[]): ColorIndex {
	const index: ColorIndex = new Map();
	for (const layer of style.layers) {
		const paint = (layer as { paint?: Record<string, unknown> }).paint;
		if (!paint) continue;
		const found: Record<string, string> = {};
		for (const [property, value] of Object.entries(paint)) {
			if (!property.includes('color')) continue;
			const key = keyOf(value, keys);
			if (key !== undefined) found[property] = key;
		}
		if (Object.keys(found).length > 0) index.set(layer.id, found);
	}
	return index;
}

// ── Hits ─────────────────────────────────────────────────────────────────────

/** A color a layer paints with, and the palette key it comes from. */
export interface InspectedColor {
	/** The paint property, e.g. `fill-color` or `text-halo-color`. */
	property: string;
	/** The color key of the palette, absent when the layer paints a color of its own. */
	key?: string;
}

/** One style layer the map draws a clicked feature with. */
export interface InspectedLayer {
	/** The style layer's ID, e.g. `land-glacier`. */
	id: string;
	/** `fill`, `line`, `symbol`, … */
	type: string;
	/** The layer of the tileset the feature comes from, e.g. `water_polygons`. */
	sourceLayer?: string;
	/** The path in the Layers section that shows and hides it. */
	group?: string[];
	/** The topic in the Labels section that styles its text, for symbol layers. */
	topic?: string[];
	/** Its color properties, in the order the style writes them. */
	colors: InspectedColor[];
	/** The feature's own properties, as the tile carries them. */
	properties: Record<string, unknown>;
}

/** What a click on the map found, and where. */
export interface InspectResult {
	/** Topmost first, in the order MapLibre reports them. */
	layers: InspectedLayer[];
	point: { x: number; y: number };
	lngLat: { lng: number; lat: number };
}

/** The feature shape this reads, which is what `map.queryRenderedFeatures()` returns. */
export interface RenderedFeature {
	layer: { id: string; type: string; paint?: Record<string, unknown> };
	sourceLayer?: string;
	properties?: Record<string, unknown> | null;
}

export interface InspectIndexes {
	groups: GroupIndex;
	topics: GroupIndex;
	colors: ColorIndex;
}

/**
 * Describes the features under a click.
 *
 * MapLibre reports one entry per feature *and* layer, so a road drawn as a casing under a fill comes back
 * twice; the same layer is kept once, with the first feature's properties, since the second entry says
 * nothing new about how it is styled.
 */
export function describeFeatures(
	features: readonly RenderedFeature[],
	indexes: InspectIndexes
): InspectedLayer[] {
	const described: InspectedLayer[] = [];
	const seen = new Set<string>();
	for (const feature of features) {
		const { id, type, paint } = feature.layer;
		if (seen.has(id)) continue;
		seen.add(id);
		const keys = indexes.colors.get(id) ?? {};
		const properties = Object.keys(paint ?? {}).filter((property) => property.includes('color'));
		described.push({
			id,
			type,
			sourceLayer: feature.sourceLayer,
			group: indexes.groups.get(id),
			topic: indexes.topics.get(id),
			// A property with no key still belongs in the list: it says the color is the layer's own.
			colors: properties.map((property) => ({ property, key: keys[property] })),
			properties: feature.properties ?? {},
		});
	}
	return described;
}

/** A group path as the sections label it, e.g. `['land','glacier']` → `land › glacier`. */
export function pathLabel(path: readonly string[]): string {
	return path.join(' › ');
}
