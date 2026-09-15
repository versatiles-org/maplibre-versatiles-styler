import { describe, it, expect, vi } from 'vitest';
import { labelTexts, type LabelMap } from './map_labels';

const LAYERS: Record<string, { type: string; textField?: unknown }> = {
	'water-ocean': { type: 'fill' },
	'label-place-city': { type: 'symbol', textField: ['get', 'name'] },
	'label-street-residential': { type: 'symbol', textField: ['get', 'name'] },
	'symbol-oneway': { type: 'symbol' },
};

function fakeMap(features: { layer: string; text: unknown }[]): LabelMap {
	return {
		getLayersOrder: () => Object.keys(LAYERS),
		getLayer: (id: string) => (LAYERS[id] ? { type: LAYERS[id].type } : undefined),
		getLayoutProperty: (id: string) => LAYERS[id]?.textField,
		queryRenderedFeatures: vi.fn(({ layers }: { layers: string[] }) =>
			features
				.filter((f) => layers.includes(f.layer))
				.map((f) => ({ layer: { id: f.layer, layout: { 'text-field': f.text } } }))
		),
	} as unknown as LabelMap;
}

describe('labelTexts', () => {
	const map = fakeMap([
		{ layer: 'label-place-city', text: { sections: [{ text: 'Αθήνα' }] } },
		{ layer: 'label-place-city', text: 'Sofia' },
		{ layer: 'label-place-city', text: 'Sofia' },
		{
			layer: 'label-street-residential',
			text: { sections: [{ text: 'Ул. ' }, { text: 'Витоша' }] },
		},
	]);

	it('reads the evaluated text of every text layer, once each', () => {
		expect(labelTexts(map)).toEqual(['Αθήνα', 'Sofia', 'Ул. Витоша']);
		expect(map.queryRenderedFeatures).toHaveBeenCalledWith({
			layers: ['label-place-city', 'label-street-residential'],
		});
	});

	it('reads only the given layers, and skips those the style does not have', () => {
		expect(labelTexts(map, ['label-street-residential', 'label-missing'])).toEqual(['Ул. Витоша']);
		expect(labelTexts(map, ['label-missing', 'water-ocean'])).toEqual([]);
	});

	it('is empty while the map has no style', () => {
		const empty = {
			...fakeMap([]),
			getLayersOrder: () => {
				throw new Error('no style');
			},
		} as LabelMap;
		expect(labelTexts(empty)).toEqual([]);
	});
});
