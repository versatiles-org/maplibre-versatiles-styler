import { describe, it, expect } from 'vitest';
import { Color } from '@versatiles/style';
import {
	SPACES,
	SPACE_KEYS,
	channelGradient,
	channelsOf,
	colorError,
	formatChannel,
	formatHex,
	isSpace,
	normalizeColor,
	parseChannel,
	parseColor,
	sameColor,
	withChannel,
} from './color_model';

describe('parseColor', () => {
	it('reads every spelling the library takes', () => {
		expect(formatHex(parseColor('#3388ff')!)).toBe('#3388FF');
		expect(formatHex(parseColor(' #f00 ')!)).toBe('#FF0000');
		expect(parseColor('#ff000080')!.alpha).toBeCloseTo(0.502, 3);
		expect(formatHex(parseColor('rgb(51 136 255)')!)).toBe('#3388FF');
		expect(formatHex(parseColor('rgb(51, 136, 255)')!)).toBe('#3388FF');
		expect(formatHex(parseColor('hsl(120 50% 50%)')!)).toBe('#40BF40');
		expect(formatHex(parseColor('hwb(120 20% 20%)')!)).toBe('#33CC33');
		expect(formatHex(parseColor('oklch(0.7 0.15 250)')!)).toMatch(/^#[0-9A-F]{6}$/);
		expect(formatHex(parseColor('transparent')!)).toBe('#00000000');
	});

	it('rejects anything else, and says what is wrong', () => {
		for (const text of ['', 'not a color', '#12345', 'rgb(1,2)', 'color-mix(in srgb, red, blue)']) {
			expect(parseColor(text), text).toBeUndefined();
			expect(colorError(text), text).toBeTruthy();
		}
		// named colors are gone in v6: the message says so
		expect(colorError('red')).toMatch(/red/);
		expect(colorError('#3388ff')).toBeUndefined();
	});
});

describe('formatHex, normalizeColor and sameColor', () => {
	it('writes #RRGGBB for opaque colors, #RRGGBBAA otherwise', () => {
		expect(normalizeColor('#bfd9f2')).toBe('#BFD9F2');
		expect(normalizeColor('#BFD9F2FF')).toBe('#BFD9F2');
		expect(normalizeColor('#ffffffcc')).toBe('#FFFFFFCC');
		expect(normalizeColor('#00000000')).toBe('#00000000');
		expect(normalizeColor('junk')).toBeUndefined();
	});

	it('drops alpha when asked', () => {
		expect(normalizeColor('#ff000080', false)).toBe('#FF0000');
		expect(formatHex(parseColor('#ff000080')!, false)).toBe('#FF0000');
	});

	it('compares colors however they are spelled', () => {
		expect(sameColor('#bfd9f2', '#BFD9F2FF')).toBe(true);
		expect(sameColor('rgb(255 0 0)', '#f00')).toBe(true);
		expect(sameColor('#f00', '#f01')).toBe(false);
		expect(sameColor('junk', 'junk')).toBe(true);
		expect(sameColor('junk', '#fff')).toBe(false);
	});
});

describe('spaces', () => {
	it('offers the six spaces of the library, each with three channels', () => {
		expect(SPACE_KEYS).toEqual(['srgb', 'hsl', 'hwb', 'hsv', 'oklab', 'oklch']);
		for (const space of SPACE_KEYS) {
			expect(SPACES[space].channels, space).toHaveLength(3);
			for (const channel of SPACES[space].channels) {
				expect(channel.max, `${space}.${channel.key}`).toBeGreaterThan(channel.min);
			}
		}
		expect(isSpace('oklch')).toBe(true);
		expect(isSpace('cmyk')).toBe(false);
	});

	it('reads the channels of a color in every space', () => {
		const blue = parseColor('#3388FF')!;
		expect(channelsOf(blue, 'srgb')).toEqual({ r: 51, g: 136, b: 255 });
		expect(channelsOf(blue, 'hsl').h).toBeCloseTo(215, 0);
		expect(channelsOf(blue, 'hsv').v).toBeCloseTo(100, 0);
		expect(channelsOf(blue, 'oklch').l).toBeCloseTo(0.639, 2);
		expect(channelsOf(blue, 'oklch').h).toBeCloseTo(257.9, 0);
	});

	it('sets one channel and leaves the others, in the space it was set', () => {
		const blue = parseColor('#3388FF80')!;
		expect(formatHex(withChannel(blue, 'srgb', 'r', 255))).toBe('#FF88FF80');
		expect(formatHex(withChannel(blue, 'hsl', 'l', 100))).toBe('#FFFFFF80');
		expect(formatHex(withChannel(blue, 'oklch', 'c', 0))).toMatch(/^#[0-9A-F]{6}80$/);

		// white in HSL keeps hue and saturation, so lightness back down restores the color
		const white = withChannel(blue, 'hsl', 'l', 100);
		expect(formatHex(withChannel(white, 'hsl', 'l', 60))).toBe(formatHex(blue));
	});

	it('keeps alpha through a channel change', () => {
		const half = parseColor('#3388FF80')!;
		expect(withChannel(half, 'oklab', 'l', 0.5).alpha).toBeCloseTo(0.502, 3);
	});
});

describe('channelGradient', () => {
	const blue = parseColor('#3388FF')!;

	it('paints a channel from its lowest to its highest value', () => {
		expect(channelGradient(blue, 'srgb', 'r', 3)).toBe(
			'linear-gradient(to right, #0088FF, #8088FF, #FF88FF)'
		);
	});

	it('maps colors outside sRGB into it, so the track shows what picking gives', () => {
		const chroma = channelGradient(blue, 'oklch', 'c', 5);
		expect(chroma).toMatch(/^linear-gradient\(to right, (#[0-9A-F]{6}, ){4}#[0-9A-F]{6}\)$/);
		for (const stop of chroma.match(/#[0-9A-F]{6}/g) ?? []) {
			expect(Color.parse(stop).inGamut(), stop).toBe(true);
		}
	});

	it('gives nothing for a channel a space does not have', () => {
		expect(channelGradient(blue, 'srgb', 'h')).toBe('none');
	});
});

describe('channel values', () => {
	const [red] = SPACES.srgb.channels;
	const [lightness] = SPACES.oklch.channels;

	it('writes whole numbers for wide ranges and decimals for OKLCh', () => {
		expect(formatChannel(red, 136.4)).toBe('136');
		expect(formatChannel(SPACES.hsl.channels[0], 215.3)).toBe('215°');
		expect(formatChannel(SPACES.hsl.channels[1], 80)).toBe('80%');
		expect(formatChannel(lightness, 0.6392)).toBe('0.639');
	});

	it('reads typed values, with a decimal comma, clamped to the channel', () => {
		expect(parseChannel(red, '200')).toBe(200);
		expect(parseChannel(red, '999')).toBe(255);
		expect(parseChannel(red, '-5')).toBe(0);
		expect(parseChannel(lightness, '0,8')).toBeCloseTo(0.8, 6);
		expect(parseChannel(red, 'abc')).toBeUndefined();
	});
});
