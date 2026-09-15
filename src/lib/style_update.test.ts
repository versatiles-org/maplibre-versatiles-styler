import { describe, it, expect } from 'vitest';
import { osm } from '@versatiles/style';
import type { StyleSpecification } from 'maplibre-gl';
import {
	canDiff,
	FULL_RELOAD_PATHS,
	setStyleOptions,
	styleForEditing,
	type RenderedStyle,
} from './style_update';
import { satelliteDefaults, vectorDefaults, type VectorState } from './style_config';

const ORIGIN = 'https://tiles.example.org';

function vector(edit?: (state: VectorState) => void): RenderedStyle {
	const options = vectorDefaults('colorful');
	edit?.(options);
	return { styleKey: 'colorful', origin: ORIGIN, options };
}

const hillshadeOn = osm.resolveOptions({ features: { hillshade: true } }).features.hillshade;

const withTerrain = (exaggeration: number) => (s: VectorState) => {
	s.features.terrain = { exaggeration };
};

describe('canDiff', () => {
	it('loads the first style in full', () => {
		expect(canDiff(undefined, vector())).toBe(false);
	});

	it('diffs option changes', () => {
		const edits: [string, (s: VectorState) => void][] = [
			['a color', (s) => void (s.colors.water = '#ff0000')],
			['a layer group', (s) => void (s.layers.labels.places.cities = false)],
			['a font', (s) => void (s.text.water.rivers.font = 'fira_sans_bold')],
			['a label style', (s) => void (s.text.streets.names.letterSpacing = 0.1)],
			['the sky', (s) => void (s.sky = false)],
			['hillshade', (s) => void (s.features.hillshade = hillshadeOn)],
		];
		for (const [name, edit] of edits) expect(canDiff(vector(), vector(edit)), name).toBe(true);
	});

	it('diffs a change of theme and a switch to satellite', () => {
		expect(canDiff(vector(), { ...vector(), styleKey: 'toner-dark' })).toBe(true);
		const satellite: RenderedStyle = {
			styleKey: 'satellite',
			origin: ORIGIN,
			options: satelliteDefaults(),
		};
		expect(canDiff(vector(), satellite)).toBe(true);
	});

	it('reloads in full when the origin changes', () => {
		expect(canDiff(vector(), { ...vector(), origin: 'https://other.example.org' })).toBe(false);
	});

	it('reloads in full when terrain changes, in any detail', () => {
		expect(FULL_RELOAD_PATHS).toContain('features.terrain');
		expect(canDiff(vector(), vector(withTerrain(1)))).toBe(false);
		expect(canDiff(vector(withTerrain(1)), vector(withTerrain(2)))).toBe(false);

		const otherEdit = vector((s) => {
			withTerrain(1)(s);
			s.colors.water = '#ff0000';
		});
		expect(canDiff(vector(withTerrain(1)), otherEdit)).toBe(true);
	});
});

describe('styleForEditing', () => {
	it('turns off paint transitions, without changing the style it is given', () => {
		const style = { version: 8, sources: {}, layers: [] } as StyleSpecification;
		expect(styleForEditing(style)).toEqual({ ...style, transition: { duration: 0, delay: 0 } });
		expect(style).not.toHaveProperty('transition');
	});
});

describe('setStyleOptions', () => {
	it('skips validation and diffs where possible', () => {
		expect(setStyleOptions(undefined, vector())).toEqual({ diff: false, validate: false });
		expect(setStyleOptions(vector(), vector())).toEqual({ diff: true, validate: false });
	});
});
