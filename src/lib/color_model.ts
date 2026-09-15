import { Color } from '@versatiles/style';

/** A color while it is edited: hue 0–360, saturation and value 0–100, alpha 0–1, unrounded. */
export interface Hsva {
	h: number;
	s: number;
	v: number;
	a: number;
}

/** Red, green and blue 0–255, alpha 0–1. */
export interface Rgba {
	r: number;
	g: number;
	b: number;
	a: number;
}

/** Hue 0–360, saturation and lightness 0–100, alpha 0–1. */
export interface Hsla {
	h: number;
	s: number;
	l: number;
	a: number;
}

/**
 * The color of a CSS color text — `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()`, `hsl()` or
 * `hsla()` — or `undefined` when it is none of them.
 */
export function parseColor(text: string): Hsva | undefined {
	try {
		const [h, s, v, a] = Color.parse(text.trim()).asHSV().asArray();
		return { h, s, v, a };
	} catch {
		return undefined;
	}
}

export function hsvaToRgba({ h, s, v, a }: Hsva): Rgba {
	const [r, g, b] = new Color.HSV(h, s, v, a).asRGB().asArray();
	return { r, g, b, a };
}

/**
 * The HSVA of an RGBA color. Gray, black and white have no hue of their own: they keep `hue`, so that
 * dragging a color to gray and back does not jump to red.
 */
export function rgbaToHsva({ r, g, b, a }: Rgba, hue = 0): Hsva {
	const [h, s, v] = new Color.RGB(r, g, b, a).asHSV().asArray();
	return { h: s === 0 || v === 0 ? hue : h, s, v, a };
}

/** The HSLA of a color; a color without saturation keeps its hue. */
export function hsvaToHsla(color: Hsva): Hsla {
	const [h, s, l] = new Color.HSV(color.h, color.s, color.v, color.a).asHSL().asArray();
	return { h: color.s === 0 || color.v === 0 ? color.h : h, s, l, a: color.a };
}

/** The HSVA of an HSLA color; a color without saturation keeps its hue. */
export function hslaToHsva(color: Hsla): Hsva {
	const [h, s, v] = new Color.HSL(color.h, color.s, color.l, color.a).asHSV().asArray();
	return { h: s === 0 || v === 0 ? color.h : h, s, v, a: color.a };
}

const hexByte = (value: number) =>
	Math.round(Math.min(255, Math.max(0, value)))
		.toString(16)
		.padStart(2, '0')
		.toUpperCase();

/** `#RRGGBB`, or `#RRGGBBAA` when the color is not opaque. `alpha: false` drops the alpha channel. */
export function formatHex(color: Hsva, alpha = true): string {
	const { r, g, b, a } = hsvaToRgba(color);
	const aa = alpha ? hexByte(a * 255) : 'FF';
	return `#${hexByte(r)}${hexByte(g)}${hexByte(b)}${aa === 'FF' ? '' : aa}`;
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
