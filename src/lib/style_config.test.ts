import { describe, it, expect } from 'vitest';
import {
	vectorStyles,
	defaultSatelliteOptions,
	getStyle,
	getMinimalOptions,
	type EnforcedStyleBuilderOptions,
} from './style_config';

describe('vectorStyles', () => {
	it('contains all expected style keys', () => {
		expect(Object.keys(vectorStyles).sort()).toEqual(
			['colorful', 'eclipse', 'graybeard', 'neutrino', 'shadow'].sort()
		);
	});

	it('each style is a function with getOptions', () => {
		for (const style of Object.values(vectorStyles)) {
			expect(typeof style).toBe('function');
			expect(typeof style.getOptions).toBe('function');
		}
	});
});

describe('defaultSatelliteOptions', () => {
	it('has expected default values', () => {
		expect(defaultSatelliteOptions).toEqual({
			overlay: true,
			rasterOpacity: 1,
			rasterHueRotate: 0,
			rasterBrightnessMin: 0,
			rasterBrightnessMax: 1,
			rasterSaturation: 0,
			rasterContrast: 0,
		});
	});
});

describe('getStyle', () => {
	const baseOptions: EnforcedStyleBuilderOptions = {
		colors: {},
		recolor: {},
		fonts: {},
	};

	it('returns a valid style for each vector style key', () => {
		for (const key of Object.keys(vectorStyles) as (keyof typeof vectorStyles)[]) {
			const style = getStyle(key, baseOptions, {}, 'https://example.org');
			expect(style).toBeDefined();
			expect(typeof style).toBe('object');
		}
	});

	it('always returns a promise', () => {
		const result = getStyle('colorful', baseOptions, {}, 'https://example.org');
		expect(result).toBeInstanceOf(Promise);
	});

	it('applies baseUrl from origin parameter', async () => {
		const style = await getStyle('colorful', baseOptions, {}, 'https://custom.example.org');
		const json = JSON.stringify(style);
		expect(json).toContain('custom.example.org');
	});
});

describe('getMinimalOptions', () => {
	it('returns undefined-equivalent for default vector options', () => {
		const defaults = vectorStyles.colorful.getOptions();
		const options: EnforcedStyleBuilderOptions = {
			colors: { ...defaults.colors },
			recolor: {},
			fonts: {},
		};
		const result = getMinimalOptions('colorful', options, {});
		// When options match defaults, removeRecursively returns undefined
		expect(result).toBeUndefined();
	});

	it('returns changed properties for modified vector options', () => {
		const defaults = vectorStyles.colorful.getOptions();
		const options: EnforcedStyleBuilderOptions = {
			colors: { ...defaults.colors, water: '#ff0000' },
			recolor: {},
			fonts: {},
		};
		const result = getMinimalOptions('colorful', options, {});
		expect(result).toBeDefined();
		expect((result as { colors: { water: string } }).colors.water).toBe('#ff0000');
	});

	it('returns undefined-equivalent for default satellite options', () => {
		const result = getMinimalOptions('satellite', {} as EnforcedStyleBuilderOptions, {
			overlay: true,
			rasterOpacity: 1,
			rasterHueRotate: 0,
			rasterBrightnessMin: 0,
			rasterBrightnessMax: 1,
			rasterSaturation: 0,
			rasterContrast: 0,
		});
		expect(result).toBeUndefined();
	});

	it('returns changed properties for modified satellite options', () => {
		const result = getMinimalOptions('satellite', {} as EnforcedStyleBuilderOptions, {
			rasterOpacity: 0.5,
		});
		expect(result).toEqual({ rasterOpacity: 0.5 });
	});
});
