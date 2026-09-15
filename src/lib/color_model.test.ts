import { describe, it, expect } from 'vitest';
import {
	channelGradient,
	formatHex,
	hslaToHsva,
	hsvaToHsla,
	hsvaToRgba,
	normalizeColor,
	parseColor,
	rgbaToHsva,
	sameColor,
	withRgb,
} from './color_model';

describe('parseColor', () => {
	it('reads every spelling Color.parse accepts', () => {
		expect(parseColor('#3388ff')).toEqual({ h: 215, s: 80, v: 100, a: 1 });
		expect(parseColor(' #f00 ')).toEqual({ h: 0, s: 100, v: 100, a: 1 });
		expect(parseColor('#ff000080')?.a).toBeCloseTo(0.502, 3);
		expect(parseColor('#f008')?.a).toBeCloseTo(0.533, 3);
		expect(formatHex(parseColor('rgb(51, 136, 255)')!)).toBe('#3388FF');
		expect(formatHex(parseColor('rgba(51, 136, 255, 0.5)')!)).toBe('#3388FF80');
		expect(formatHex(parseColor('hsl(120, 50%, 50%)')!)).toBe('#40BF40');
		expect(formatHex(parseColor('hsla(120, 50%, 50%, 0.25)')!)).toBe('#40BF4040');
	});

	it('rejects anything else', () => {
		for (const text of ['', 'red', '#12', '#12345', 'rgb(1,2)', 'not a color']) {
			expect(parseColor(text), text).toBeUndefined();
		}
	});
});

describe('formatHex and normalizeColor', () => {
	it('writes #RRGGBB for opaque colors, #RRGGBBAA otherwise', () => {
		expect(normalizeColor('#bfd9f2')).toBe('#BFD9F2');
		expect(normalizeColor('#BFD9F2FF')).toBe('#BFD9F2');
		expect(normalizeColor('#ffffffcc')).toBe('#FFFFFFCC');
		expect(normalizeColor('#00000000')).toBe('#00000000');
		expect(normalizeColor('junk')).toBeUndefined();
	});

	it('drops alpha when asked', () => {
		expect(normalizeColor('#ff000080', false)).toBe('#FF0000');
	});

	it('rounds each channel to a byte', () => {
		expect(formatHex({ h: 0, s: 0, v: 50, a: 0.999 })).toBe('#808080');
	});
});

describe('conversions', () => {
	const colors = ['#3388FF', '#FF000080', '#40BF40', '#FFFFFF', '#000000', '#808080', '#0F0B074D'];

	it('round-trips through RGBA and HSLA', () => {
		for (const hex of colors) {
			const hsva = parseColor(hex)!;
			expect(formatHex(rgbaToHsva(hsvaToRgba(hsva))), hex).toBe(hex);
			expect(formatHex(hslaToHsva(hsvaToHsla(hsva))), hex).toBe(hex);
		}
	});

	it('keeps the hue of gray, black and white', () => {
		expect(rgbaToHsva({ r: 0, g: 0, b: 0, a: 1 }, 215).h).toBe(215);
		expect(rgbaToHsva({ r: 128, g: 128, b: 128, a: 1 }, 215).h).toBe(215);
		expect(hsvaToHsla({ h: 215, s: 0, v: 50, a: 1 }).h).toBe(215);
		expect(hslaToHsva({ h: 215, s: 0, l: 100, a: 1 }).h).toBe(215);
		expect(hslaToHsva({ h: 215, s: 50, l: 0, a: 1 }).h).toBe(215);
		expect(hsvaToHsla({ h: 360, s: 50, v: 50, a: 1 }).h).toBe(360);
	});

	it('keeps fractional values', () => {
		const hsva = { h: 200.5, s: 33.3, v: 66.6, a: 0.5 };
		const back = rgbaToHsva(hsvaToRgba(hsva));
		expect(back.h).toBeCloseTo(200.5, 6);
		expect(back.s).toBeCloseTo(33.3, 6);
		expect(back.v).toBeCloseTo(66.6, 6);
	});
});

describe('sameColor', () => {
	it('compares colors however they are spelled', () => {
		expect(sameColor('#bfd9f2', '#BFD9F2FF')).toBe(true);
		expect(sameColor('rgb(255,0,0)', '#f00')).toBe(true);
		expect(sameColor('#f00', '#f01')).toBe(false);
		expect(sameColor('junk', 'junk')).toBe(true);
		expect(sameColor('junk', '#fff')).toBe(false);
	});
});

describe('channel editing', () => {
	const blue = parseColor('#3388FF80')!;

	it('changes RGB and HSL channels, keeping alpha', () => {
		expect(formatHex(withRgb(blue, { r: 255 }))).toBe('#FF88FF80');
		expect(formatHex(withRgb(blue, { g: 0, b: 0 }))).toBe('#33000080');
		expect(formatHex(hslaToHsva({ ...hsvaToHsla(blue), l: 100 }))).toBe('#FFFFFF80');
		expect(formatHex(hslaToHsva({ ...hsvaToHsla(blue), h: 0 }))).toBe('#FF333380');
	});

	it('keeps the hue when RGB channels make a gray', () => {
		expect(withRgb(blue, { r: 0, g: 0, b: 0 }).h).toBeCloseTo(215, 6);
	});

	it('paints the tracks from the lowest to the highest value of a channel', () => {
		expect(channelGradient(blue, 'r')).toBe(
			'linear-gradient(to right, rgb(0 136 255), rgb(255 136 255))'
		);
		expect(channelGradient(blue, 'hsl-s')).toBe(
			'linear-gradient(to right, hsl(215 0% 60%), hsl(215 100% 60%))'
		);
		expect(channelGradient(blue, 'hsl-l')).toBe(
			'linear-gradient(to right, hsl(215 100% 0%), hsl(215 100% 50%), hsl(215 100% 100%))'
		);
		expect(channelGradient(blue, 'hsl-h')).toMatch(
			/^linear-gradient\(to right, hsl\(0 100% 60%\),/
		);
	});
});
