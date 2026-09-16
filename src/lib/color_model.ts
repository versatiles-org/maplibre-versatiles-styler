import { Color } from '@versatiles/style';
import type { Space } from '@versatiles/style';

export type { Space };

/** One channel of a color space, as the picker offers it. */
export interface ChannelSpec {
	/** The channel's name in its space: `r`, `h`, `l`, … */
	key: string;
	/** What the picker writes in front of the slider. */
	label: string;
	/** The full name, for assistive technology. */
	name: string;
	min: number;
	max: number;
	step: number;
	unit: string;
}

export interface SpaceSpec {
	/** What the space is called in the picker. */
	label: string;
	channels: ChannelSpec[];
}

const degrees = (key = 'h', label = 'H'): ChannelSpec => ({
	key,
	label,
	name: 'Hue',
	min: 0,
	max: 360,
	step: 1,
	unit: '°',
});

const percent = (key: string, label: string, name: string): ChannelSpec => ({
	key,
	label,
	name,
	min: 0,
	max: 100,
	step: 1,
	unit: '%',
});

/**
 * The spaces the picker edits in, with their channels and ranges. The library knows these too, but
 * exports them as types only, so the ranges are spelled out here.
 */
export const SPACES: Readonly<Record<Space, SpaceSpec>> = {
	srgb: {
		label: 'RGB',
		channels: [
			{ key: 'r', label: 'R', name: 'Red', min: 0, max: 255, step: 1, unit: '' },
			{ key: 'g', label: 'G', name: 'Green', min: 0, max: 255, step: 1, unit: '' },
			{ key: 'b', label: 'B', name: 'Blue', min: 0, max: 255, step: 1, unit: '' },
		],
	},
	hsl: {
		label: 'HSL',
		channels: [degrees(), percent('s', 'S', 'Saturation'), percent('l', 'L', 'Lightness')],
	},
	hwb: {
		label: 'HWB',
		channels: [degrees(), percent('w', 'W', 'Whiteness'), percent('b', 'B', 'Blackness')],
	},
	hsv: {
		label: 'HSV',
		channels: [degrees(), percent('s', 'S', 'Saturation'), percent('v', 'V', 'Value')],
	},
	oklab: {
		label: 'OKLab',
		channels: [
			{ key: 'l', label: 'L', name: 'Lightness', min: 0, max: 1, step: 0.001, unit: '' },
			{ key: 'a', label: 'a', name: 'Green to red', min: -0.4, max: 0.4, step: 0.001, unit: '' },
			{ key: 'b', label: 'b', name: 'Blue to yellow', min: -0.4, max: 0.4, step: 0.001, unit: '' },
		],
	},
	oklch: {
		label: 'OKLCh',
		channels: [
			{ key: 'l', label: 'L', name: 'Lightness', min: 0, max: 1, step: 0.001, unit: '' },
			{ key: 'c', label: 'C', name: 'Chroma', min: 0, max: 0.4, step: 0.001, unit: '' },
			degrees('h', 'H'),
		],
	},
};

export const SPACE_KEYS = Object.keys(SPACES) as Space[];

export function isSpace(value: string): value is Space {
	return Object.prototype.hasOwnProperty.call(SPACES, value);
}

/** A color from any text the library reads — hex, `rgb()`, `hsl()`, `hwb()`, `hsv()`, `oklab()`, `oklch()`. */
export function parseColor(text: string): Color | undefined {
	try {
		return Color.parse(text.trim());
	} catch {
		return undefined;
	}
}

/** Why a text is no color, as the library puts it; `undefined` when it is one. */
export function colorError(text: string): string | undefined {
	try {
		Color.parse(text.trim());
		return undefined;
	} catch (error) {
		return error instanceof Error ? error.message : 'Not a color.';
	}
}

/** `#RRGGBB`, or `#RRGGBBAA` when the color is not opaque. `alpha: false` drops the alpha channel. */
export function formatHex(color: Color, alpha = true): string {
	return (alpha ? color : color.opaque()).asHex();
}

/** A color text in the output format (see `formatHex`), or `undefined` when it is no color. */
export function normalizeColor(text: string, alpha = true): string | undefined {
	const color = parseColor(text);
	return color && formatHex(color, alpha);
}

/** Whether two color texts are the same color, however they are spelled. */
export function sameColor(a: string, b: string): boolean {
	const na = normalizeColor(a);
	const nb = normalizeColor(b);
	return na !== undefined && nb !== undefined ? na === nb : a === b;
}

/** The channels of `color` in `space`, by their names. */
export function channelsOf(color: Color, space: Space): Record<string, number> {
	const coords = color.to(space).coords;
	return Object.fromEntries(
		SPACES[space].channels.map((channel, index) => [channel.key, coords[index]])
	);
}

/** `color` with one channel of `space` set, held in that space so its other channels stay put. */
export function withChannel(color: Color, space: Space, key: string, value: number): Color {
	return color.to(space).with({ [key]: value });
}

/**
 * The track of a channel slider: the color from the channel's lowest to its highest value, the other
 * channels as they are. Colors outside sRGB — an OKLCh chroma no screen shows — are mapped into it, so
 * the track shows what picking there gives.
 */
export function channelGradient(color: Color, space: Space, key: string, stops = 9): string {
	const channel = SPACES[space].channels.find((c) => c.key === key);
	if (!channel) return 'none';
	const base = color.to(space).opaque();
	const steps = Array.from({ length: stops }, (_, index) => {
		const value = channel.min + ((channel.max - channel.min) * index) / (stops - 1);
		return base
			.with({ [key]: value })
			.toGamut()
			.asHex();
	});
	return `linear-gradient(to right, ${steps.join(', ')})`;
}

/** How a channel value is written: whole numbers for wide ranges, decimals for OKLab and OKLCh. */
export function formatChannel(channel: ChannelSpec, value: number): string {
	const digits = channel.step >= 1 ? 0 : (String(channel.step).split('.')[1]?.length ?? 0);
	return `${value.toFixed(digits)}${channel.unit}`;
}

/** A typed channel value, clamped to the channel; `undefined` when the text is no number. */
export function parseChannel(channel: ChannelSpec, text: string): number | undefined {
	const typed = parseFloat(text.trim().replace(',', '.'));
	if (!Number.isFinite(typed)) return undefined;
	return Math.min(channel.max, Math.max(channel.min, typed));
}
