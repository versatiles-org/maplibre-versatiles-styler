import { inflateSync } from 'node:zlib';
import type { Locator } from '@playwright/test';

/**
 * Reading the pixels of an element, to see whether it is really painted: CSS says what should be drawn,
 * but engines differ in what they draw from it — Firefox, for one, resolves no custom property in
 * `::-moz-range-track`, which once left a gradient unpainted while every style rule looked right.
 */

export interface Bitmap {
	width: number;
	height: number;
	channels: number;
	data: Buffer;
}

/** An 8-bit PNG as Playwright writes it: RGB or RGBA, not interlaced. */
export function readPng(png: Buffer): Bitmap {
	let pos = 8;
	let width = 0;
	let height = 0;
	let channels = 4;
	const parts: Buffer[] = [];
	while (pos < png.length) {
		const length = png.readUInt32BE(pos);
		const type = png.toString('ascii', pos + 4, pos + 8);
		const data = png.subarray(pos + 8, pos + 8 + length);
		if (type === 'IHDR') {
			width = data.readUInt32BE(0);
			height = data.readUInt32BE(4);
			if (data[8] !== 8) throw new Error(`unexpected bit depth ${data[8]}`);
			channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[data[9] as 0 | 2 | 4 | 6] ?? 4;
		} else if (type === 'IDAT') parts.push(data);
		else if (type === 'IEND') break;
		pos += 12 + length;
	}
	const raw = inflateSync(Buffer.concat(parts));
	const stride = width * channels;
	const out = Buffer.alloc(height * stride);
	let read = 0;
	for (let y = 0; y < height; y++) {
		const filter = raw[read++];
		const line = raw.subarray(read, read + stride);
		read += stride;
		const previous = y > 0 ? out.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
		const current = out.subarray(y * stride, (y + 1) * stride);
		for (let x = 0; x < stride; x++) {
			const left = x >= channels ? current[x - channels] : 0;
			const above = previous[x];
			const aboveLeft = x >= channels ? previous[x - channels] : 0;
			let value = line[x];
			if (filter === 1) value += left;
			else if (filter === 2) value += above;
			else if (filter === 3) value += (left + above) >> 1;
			else if (filter === 4) {
				const guess = left + above - aboveLeft;
				const dl = Math.abs(guess - left);
				const da = Math.abs(guess - above);
				const dal = Math.abs(guess - aboveLeft);
				value += dl <= da && dl <= dal ? left : da <= dal ? above : aboveLeft;
			}
			current[x] = value & 0xff;
		}
	}
	return { width, height, channels, data: out };
}

export async function shoot(locator: Locator): Promise<Bitmap> {
	return readPng(await locator.screenshot());
}

export interface Rgb {
	r: number;
	g: number;
	b: number;
}

/** The color at a relative position, e.g. `(0.5, 0.5)` for the middle. Works at any device pixel ratio. */
export function colorAt(image: Bitmap, xRatio: number, yRatio: number): Rgb {
	const x = Math.min(image.width - 1, Math.max(0, Math.round(xRatio * (image.width - 1))));
	const y = Math.min(image.height - 1, Math.max(0, Math.round(yRatio * (image.height - 1))));
	const index = (y * image.width + x) * image.channels;
	return { r: image.data[index], g: image.data[index + 1], b: image.data[index + 2] };
}

/** `count` colors across the width of the image, at `yRatio` of its height. */
export function colorsAcross(image: Bitmap, count = 7, yRatio = 0.5): Rgb[] {
	return Array.from({ length: count }, (_, index) => colorAt(image, (index + 0.5) / count, yRatio));
}

export const hex = ({ r, g, b }: Rgb): string =>
	'#' + [r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('');

/** How far apart two colors are, as the largest difference of a channel (0–255). */
export const distance = (a: Rgb, b: Rgb): number =>
	Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b));

/** How colorful a color is: the spread of its channels, 0 for gray, white and black. */
export const saturation = ({ r, g, b }: Rgb): number => Math.max(r, g, b) - Math.min(r, g, b);

/** How many of the colors differ from each other by more than `threshold`. */
export function distinctColors(colors: Rgb[], threshold = 24): number {
	const kept: Rgb[] = [];
	for (const color of colors) {
		if (!kept.some((other) => distance(color, other) <= threshold)) kept.push(color);
	}
	return kept.length;
}
