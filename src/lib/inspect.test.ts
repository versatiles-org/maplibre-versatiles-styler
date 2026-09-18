// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { osm } from '@versatiles/style';
import type { LayerGroupMap } from '@versatiles/style';
import {
	colorIndex,
	describeFeatures,
	groupIndex,
	pathLabel,
	probeColors,
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

describe('probeColors', () => {
	it('gives every key a hue of its own', () => {
		const colors = probeColors(['a', 'b', 'c']);
		expect(colors).toEqual({
			a: 'hsl(0.000,100%,50%)',
			b: 'hsl(120.000,100%,50%)',
			c: 'hsl(240.000,100%,50%)',
		});
	});

	it('covers every color key of the palette', () => {
		expect(Object.keys(probeColors(osm.colorKeys))).toEqual([...osm.colorKeys]);
	});
});

describe('colorIndex', () => {
	const keys = osm.colorKeys;
	const style = osm({ theme: 'colorful', colors: probeColors(keys) });
	const index = colorIndex(style, keys);

	it('attributes a color the style paints unchanged', () => {
		expect(index.get('water-area')).toEqual({ 'fill-color': 'water' });
		expect(index.get('background')).toEqual({ 'background-color': 'background' });
	});

	it('attributes colors the style derives from a key', () => {
		// `land-park` is `naturePark` faded, the river lines are `water` darkened: both keep the hue.
		expect(index.get('land-park')?.['fill-color']).toBe('naturePark');
		expect(index.get('water-river')?.['line-color']).toBe('water');
	});

	it('attributes each color property of a layer on its own', () => {
		expect(index.get('label-street-primary')).toMatchObject({
			'text-color': 'label',
			'text-halo-color': 'labelHalo',
		});
	});

	it('attributes the colors of nearly every layer', () => {
		const painted = style.layers.filter((layer) =>
			Object.keys((layer as { paint?: object }).paint ?? {}).some((p) => p.includes('color'))
		);
		expect(index.size / painted.length).toBeGreaterThan(0.95);
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
		colors: colorIndex(osm({ colors: probeColors(osm.colorKeys) }), osm.colorKeys),
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
