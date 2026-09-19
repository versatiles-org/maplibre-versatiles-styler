import { describe, it, expect } from 'vitest';
import { osm } from '@versatiles/style';
import { colorGroups } from './colors';

describe('colorGroups', () => {
	it('groups keys by their first word, single-word keys under "Base"', () => {
		expect(
			colorGroups(['background', 'land', 'natureWood', 'natureGrass', 'label', 'labelPoi'])
		).toEqual([
			{
				title: 'Base',
				colors: [
					{ key: 'background', label: 'Background' },
					{ key: 'land', label: 'Land' },
				],
			},
			{
				title: 'Nature',
				colors: [
					{ key: 'natureWood', label: 'Wood' },
					{ key: 'natureGrass', label: 'Grass' },
				],
			},
			{
				title: 'Label',
				colors: [
					{ key: 'label', label: 'Default' },
					{ key: 'labelPoi', label: 'POI' },
				],
			},
		]);
	});

	it('spells out abbreviations', () => {
		const [group] = colorGroups(['roadStreet', 'roadStreetBg']);
		expect(group.colors.map((c) => c.label)).toEqual(['Street', 'Street background']);
	});

	it('leaves out an empty "Base" group', () => {
		expect(colorGroups(['roadStreet', 'roadTrunk']).map((g) => g.title)).toEqual(['Road']);
	});

	it('covers every colour key of osm exactly once', () => {
		const keys = colorGroups(osm.colorKeys).flatMap((group) => group.colors.map((c) => c.key));
		expect(keys.sort()).toEqual([...osm.colorKeys].sort());
	});
});
