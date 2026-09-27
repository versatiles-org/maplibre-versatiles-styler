// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { osm } from '@versatiles/style';
import type { LayerGroupMap } from '@versatiles/style';
import {
	colorIndex,
	describeFeatures,
	groupIndex,
	pathLabel,
	type RenderedFeature,
} from './inspect';

describe('groupIndex', () => {
	it('maps every layer ID to its group path', () => {
		const index = groupIndex({
			land: { glacier: ['land-glacier'], park: ['land-park', 'land-garden'] },
			buildings: ['building', 'building-3d'],
		} as unknown as LayerGroupMap);
		expect(index.get('land-glacier')).toEqual(['land', 'glacier']);
		expect(index.get('land-garden')).toEqual(['land', 'park']);
		expect(index.get('building-3d')).toEqual(['buildings']);
		expect(index.get('nothing')).toBeUndefined();
	});

	it('leaves the `icons` alias to the groups that own the layers', () => {
		const index = groupIndex({
			icons: ['poi-shop'],
			pois: { shop: ['poi-shop'] },
		} as unknown as LayerGroupMap);
		expect(index.get('poi-shop')).toEqual(['pois', 'shop']);
	});

	it('indexes the real layer and text groups', () => {
		const layers = groupIndex(osm.layerGroups);
		const topics = groupIndex(osm.textGroups);
		expect(layers.get('land-glacier')).toEqual(['land', 'glacier']);
		expect(layers.size).toBeGreaterThan(100);
		expect(topics.get('label-street-primary')?.[0]).toBe('streets');
	});
});

/**
 * The reference `colorIndex` is checked against: which keys each color property changes with.
 *
 * Works like `colorIndex`, but from the real palette rather than an all-gray one, and records every key
 * a property moves with rather than the first: a gray base that hid a key's effect would show here. Two
 * replacement colors, so a key whose default happens to equal one of them still shows.
 */
function keysByChange(keys: readonly string[]): Map<string, Record<string, string[]>> {
	const paints = (colors: Record<string, string>) =>
		new Map(
			osm({ theme: 'colorful', colors }).layers.map((layer) => [
				layer.id,
				(layer as { paint?: Record<string, unknown> }).paint ?? {},
			])
		);
	const base = paints({});
	const reference = new Map<string, Record<string, string[]>>();
	for (const key of keys) {
		for (const color of ['#ff00ff', '#00ff80']) {
			for (const [id, paint] of paints({ [key]: color })) {
				for (const [property, value] of Object.entries(paint)) {
					if (!property.includes('color')) continue;
					if (JSON.stringify(value) === JSON.stringify(base.get(id)?.[property])) continue;
					const found = reference.get(id) ?? {};
					found[property] = [...new Set([...(found[property] ?? []), key])];
					reference.set(id, found);
				}
			}
		}
	}
	return reference;
}

describe('colorIndex', () => {
	const keys = osm.colorKeys;
	const build = (colors: Record<string, string>) => osm({ theme: 'colorful', colors });
	const index = colorIndex(build, keys)!;

	it('attributes a color the style paints unchanged', () => {
		expect(index.get('water-area')).toEqual({ 'fill-color': 'water' });
		expect(index.get('background')).toEqual({ 'background-color': 'background' });
	});

	it('attributes colors the style derives from a key', () => {
		// `land-park` is `naturePark` faded, the river lines are `water` darkened.
		expect(index.get('land-park')?.['fill-color']).toBe('naturePark');
		expect(index.get('water-river')?.['line-color']).toBe('water');
	});

	it('attributes each color property of a layer on its own', () => {
		expect(index.get('label-street-primary')).toMatchObject({
			'text-color': 'label',
			'text-halo-color': 'labelHalo',
		});
	});

	it('attributes every color to the key that feeds it', () => {
		const reference = keysByChange(keys);
		const mismatches: string[] = [];
		for (const [id, properties] of reference) {
			for (const [property, fed] of Object.entries(properties)) {
				const claimed = index.get(id)?.[property];
				// A property fed by several keys (a zoom interpolation between two) is one key's to claim.
				if (claimed === undefined || !fed.includes(claimed)) {
					mismatches.push(
						`${id} ${property}: ${claimed ?? 'nothing'}, expected ${fed.join(' or ')}`
					);
				}
			}
		}
		for (const [id, properties] of index) {
			for (const [property, claimed] of Object.entries(properties)) {
				if (!reference.get(id)?.[property]) {
					mismatches.push(`${id} ${property}: ${claimed}, expected nothing`);
				}
			}
		}
		expect(mismatches).toEqual([]);
	});

	it('gives a color mixed from several keys to the first of them', () => {
		// Vegetation is a blend of wood and sand; its hue lands on neither.
		expect(keys.indexOf('natureWood')).toBeLessThan(keys.indexOf('natureSand'));
		expect(index.get('land-vegetation')?.['fill-color']).toBe('natureWood');
	});

	it('has no index while the style cannot be built', () => {
		expect(colorIndex(() => undefined, keys)).toBeUndefined();
	});

	it('claims no key for a color the layer paints itself', () => {
		// The one-way markings are black whatever the palette says, so no key made them.
		expect(index.get('marking-oneway')?.['text-color']).toBeUndefined();
	});
});

describe('describeFeatures', () => {
	const indexes = {
		groups: groupIndex(osm.layerGroups),
		topics: groupIndex(osm.textGroups),
		colors: colorIndex((colors) => osm({ colors }), osm.colorKeys)!,
	};
	const feature = (id: string, overrides: Partial<RenderedFeature> = {}): RenderedFeature => ({
		layer: { id, type: 'fill', paint: { 'fill-color': '#fff', 'fill-opacity': 1 } },
		sourceLayer: 'water_polygons',
		properties: { kind: 'lake' },
		...overrides,
	});

	it('describes a layer with its group, source layer and color keys', () => {
		const [described] = describeFeatures([feature('water-area')], indexes);
		expect(described).toMatchObject({
			id: 'water-area',
			type: 'fill',
			sourceLayer: 'water_polygons',
			group: ['water', 'lakes'],
			properties: { kind: 'lake' },
		});
		// Only the color properties are listed, and `fill-opacity` is not one.
		expect(described.colors).toEqual([{ property: 'fill-color', key: 'water' }]);
	});

	it('names the label topic of a text layer', () => {
		const [described] = describeFeatures(
			[feature('label-street-primary', { layer: { id: 'label-street-primary', type: 'symbol' } })],
			indexes
		);
		expect(described.topic?.[0]).toBe('streets');
		expect(described.colors).toEqual([]);
	});

	it('keeps a layer once when several of its features are hit', () => {
		const hits = [feature('water-area'), feature('water-area'), feature('land-park')];
		expect(describeFeatures(hits, indexes).map((d) => d.id)).toEqual(['water-area', 'land-park']);
	});

	it('leaves the key out for a color that belongs to no palette entry', () => {
		const [described] = describeFeatures([feature('unknown-layer', { properties: null })], indexes);
		expect(described.colors).toEqual([{ property: 'fill-color', key: undefined }]);
		expect(described.group).toBeUndefined();
		expect(described.properties).toEqual({});
	});
});

describe('pathLabel', () => {
	it('joins a group path', () => {
		expect(pathLabel(['land', 'glacier'])).toBe('land › glacier');
	});
});
