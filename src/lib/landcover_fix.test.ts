import { describe, it, expect } from 'vitest';
import { colorful } from '@versatiles/style';
import type { StyleSpecification } from 'maplibre-gl';
import { applyLandcoverFix, LANDCOVER_FIX_SNIPPET } from './landcover_fix';

type FillLayer = { id: string; type: string; paint?: Record<string, unknown> };

function layerById(style: StyleSpecification, id: string): FillLayer {
	const layer = style.layers.find((l) => l.id === id);
	if (!layer) throw new Error(`layer ${id} not found`);
	return layer as unknown as FillLayer;
}

function opacity(style: StyleSpecification, id: string): unknown {
	return layerById(style, id).paint?.['fill-opacity'];
}

describe('applyLandcoverFix', () => {
	it('flattens ramped landcover fills to their peak opacity', () => {
		const style = applyLandcoverFix(colorful() as unknown as StyleSpecification);

		// forest peaks at 0.1 -> constant 0.1
		expect(opacity(style, 'land-forest')).toBe(0.1);
		// these peak at 1 -> ramp removed (defaults to 1)
		expect(opacity(style, 'land-grass')).toBeUndefined();
		expect(opacity(style, 'land-agriculture')).toBeUndefined();
		expect(opacity(style, 'land-residential')).toBeUndefined();
		expect(opacity(style, 'land-vegetation')).toBeUndefined();
		// water_polygons landcover: `water` fill un-hidden
		expect(opacity(style, 'water-area')).toBeUndefined();
	});

	it('leaves non-landcover land fills untouched', () => {
		const style = applyLandcoverFix(colorful() as unknown as StyleSpecification);
		// commercial/industrial/park/etc. are not landcover kinds -> ramps preserved
		expect(opacity(style, 'land-commercial')).toEqual({
			stops: [
				[10, 0],
				[11, 1],
			],
		});
		expect(opacity(style, 'land-park')).toEqual({
			stops: [
				[11, 0],
				[12, 1],
			],
		});
		// water-area-river / water-area-small have no landcover kinds -> untouched
		expect(opacity(style, 'water-area-river')).toEqual({
			stops: [
				[4, 0],
				[6, 1],
			],
		});
	});

	it('leaves already-visible landcover fills (no ramp) untouched', () => {
		const style = applyLandcoverFix(colorful() as unknown as StyleSpecification);
		expect(opacity(style, 'land-sand')).toBeUndefined();
		expect(opacity(style, 'land-wetland')).toBeUndefined();
		expect(opacity(style, 'land-glacier')).toBeUndefined();
	});

	it('is idempotent', () => {
		const once = applyLandcoverFix(colorful() as unknown as StyleSpecification);
		const twice = applyLandcoverFix(applyLandcoverFix(colorful() as unknown as StyleSpecification));
		expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
	});

	it('the inlined snippet produces the same result as the runtime function', () => {
		const viaFunction = applyLandcoverFix(colorful() as unknown as StyleSpecification);

		const style = colorful() as unknown as StyleSpecification;
		new Function('style', LANDCOVER_FIX_SNIPPET)(style);

		expect(JSON.stringify(style)).toBe(JSON.stringify(viaFunction));
	});
});
