/**
 * What styled a feature on the map: for a layer the map reports under the cursor, which group of the
 * Layers section draws it, which topic of the Labels section sets its text, and which color key of the
 * palette each of its paint colors comes from.
 *
 * The first two are exact reverse lookups of the maps `@versatiles/style` publishes (`layerGroups`,
 * `textGroups`), whose leaves are the style layer IDs of a group.
 *
 * The colors are found by *probing*: the same style is built again with one color key changed at a
 * time, and the paint properties that change with it say which key reaches which. See `colorIndex`.
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

/** What every key is set to in the base build: a gray, which no key's probe color can pass for. */
const BASE_COLOR = '#808080';
/** What the one key under test is set to. */
const PROBE_COLOR = '#ff00ff';

/** Layer ID → each of its color paint properties and the color key that feeds it. */
export type ColorIndex = Map<string, Record<string, string>>;

/**
 * Finds which color key feeds which paint property by building the style once per key.
 *
 * `build` makes the style the map shows with its palette replaced by `colors`. It is called once with
 * every key set to the same gray, then once per key with only that key changed; a property whose value
 * moves is fed by that key. Comparing builds rather than reading the colors back holds whatever the
 * builder does to a key on the way — darkening, fading, mixing two keys, clipping — and a property
 * that never moves (the hardcoded black of the one-way markings) is fed by no key, which is the truth.
 *
 * Build from the options the map is showing: the layers a style has depend on its features (extruded
 * buildings, landcover), and an index built from other options would miss them. A property fed by
 * several keys, like a blend of wood and sand, is claimed by the first of them in palette order.
 *
 * Returns `undefined` when `build` does, which is while a source the style needs is still loading.
 */
export function colorIndex(
	build: (colors: Record<string, string>) => StyleSpecification | undefined,
	keys: readonly string[]
): ColorIndex | undefined {
	const base = Object.fromEntries(keys.map((key) => [key, BASE_COLOR]));
	const baseStyle = build(base);
	if (!baseStyle) return undefined;
	const before = paintColors(baseStyle);
	const index: ColorIndex = new Map();
	for (const key of keys) {
		const style = build({ ...base, [key]: PROBE_COLOR });
		if (!style) return undefined;
		for (const [id, colors] of paintColors(style)) {
			for (const [property, value] of Object.entries(colors)) {
				if (value === before.get(id)?.[property]) continue;
				const found = index.get(id) ?? {};
				if (found[property] === undefined) found[property] = key;
				index.set(id, found);
			}
		}
	}
	return index;
}

/** Layer ID → its color paint properties, serialized so that two builds compare by value. */
function paintColors(style: StyleSpecification): Map<string, Record<string, string>> {
	const result = new Map<string, Record<string, string>>();
	for (const layer of style.layers) {
		const paint = (layer as { paint?: Record<string, unknown> }).paint ?? {};
		const colors: Record<string, string> = {};
		for (const [property, value] of Object.entries(paint)) {
			if (property.includes('color')) colors[property] = JSON.stringify(value);
		}
		result.set(layer.id, colors);
	}
	return result;
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
