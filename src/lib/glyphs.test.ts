import { describe, it, expect, vi, afterEach } from 'vitest';
import { decodeGlyphs, loadGlyphs, renderText, type Glyph } from './glyphs';

// ── A tiny protobuf encoder for glyph PBFs ────────────────────────────────────

function varint(n: number): number[] {
	const out: number[] = [];
	do {
		let byte = n % 128;
		n = Math.floor(n / 128);
		if (n > 0) byte |= 0x80;
		out.push(byte);
	} while (n > 0);
	return out;
}
const svarint = (n: number) => varint(n < 0 ? -2 * n - 1 : 2 * n);
const field = (tag: number, value: number[]) => [...varint(tag << 3), ...value];
const bytesField = (tag: number, bytes: number[] | Uint8Array) => [
	...varint((tag << 3) | 2),
	...varint(bytes.length),
	...bytes,
];

function encodeGlyph(g: Glyph): number[] {
	return [
		...field(1, varint(g.id)),
		...(g.bitmap.length ? bytesField(2, g.bitmap) : []),
		...field(3, varint(g.width)),
		...field(4, varint(g.height)),
		...field(5, svarint(g.left)),
		...field(6, svarint(g.top)),
		...field(7, varint(g.advance)),
	];
}

function encodePbf(glyphs: Glyph[]): Uint8Array {
	const name = [...new TextEncoder().encode('Test Regular')];
	const stack = [
		...bytesField(1, name),
		...bytesField(2, [...new TextEncoder().encode('0-255')]),
		...glyphs.flatMap((g) => bytesField(3, encodeGlyph(g))),
	];
	return new Uint8Array(bytesField(1, stack));
}

/** A glyph that is a solid block: distance 255 inside its box, 0 in the border. */
function block(id: number, width: number, height: number, advance: number, top = -7): Glyph {
	const w = width + 6;
	const h = height + 6;
	const bitmap = new Uint8Array(w * h);
	for (let y = 3; y < h - 3; y++) for (let x = 3; x < w - 3; x++) bitmap[y * w + x] = 255;
	return { id, bitmap, width, height, left: 0, top, advance };
}

describe('decodeGlyphs', () => {
	it('reads every field, including negative offsets', () => {
		const a = block(65, 4, 5, 6, -7);
		const space: Glyph = {
			id: 32,
			bitmap: new Uint8Array(),
			width: 0,
			height: 0,
			left: 0,
			top: 0,
			advance: 5,
		};
		const glyphs = decodeGlyphs(encodePbf([a, space]));
		expect(glyphs.size).toBe(2);
		expect(glyphs.get(65)).toMatchObject({
			id: 65,
			width: 4,
			height: 5,
			left: 0,
			top: -7,
			advance: 6,
		});
		expect([...glyphs.get(65)!.bitmap]).toEqual([...a.bitmap]);
		expect(glyphs.get(32)).toMatchObject({ advance: 5, width: 0 });
	});

	it('reads large code points and skips unknown fields', () => {
		const glyph = block(0x10ffff, 1, 1, 3);
		const withExtra = [
			...encodeGlyph(glyph),
			...field(15, varint(99)),
			...bytesField(14, [1, 2, 3]),
		];
		const stack = bytesField(3, withExtra);
		const glyphs = decodeGlyphs(new Uint8Array(bytesField(1, stack)));
		expect(glyphs.get(0x10ffff)).toMatchObject({ width: 1, advance: 3 });
	});

	it('rejects truncated data', () => {
		const data = encodePbf([block(65, 4, 5, 6)]);
		expect(() => decodeGlyphs(data.subarray(0, data.length - 20))).toThrow();
	});
});

describe('renderText', () => {
	const glyphs = decodeGlyphs(encodePbf([block(65, 10, 17, 12), block(66, 10, 17, 12)]));

	it('advances the pen by each glyph and skips unknown characters', () => {
		expect(renderText(glyphs, 'A', 24).width).toBe(12);
		expect(renderText(glyphs, 'AB', 24).width).toBe(24);
		expect(renderText(glyphs, 'A?B', 24).width).toBe(24);
	});

	it('scales with font size and pixel ratio', () => {
		const image = renderText(glyphs, 'AB', 12, 2);
		expect(image.width).toBe(24);
		expect(image.height).toBe(27);
		expect(image.alpha.length).toBe(image.width * image.height);
	});

	it('covers the inside of a character and leaves the rest empty', () => {
		const { width, alpha } = renderText(glyphs, 'A', 24);
		const at = (x: number, y: number) => alpha[y * width + x];
		// The block spans x 0–10 and, with top -7 and the line starting 4 px down, y 3–20.
		expect(at(5, 10)).toBe(255);
		expect(at(11, 10)).toBe(0);
		expect(at(5, 24)).toBe(0);
	});
});

describe('loadGlyphs', () => {
	afterEach(() => vi.restoreAllMocks());

	it('loads the Latin range of a face once, from the origin', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementation(async () => new Response(encodePbf([block(65, 4, 5, 6)]).slice().buffer));
		const [a, b] = await Promise.all([
			loadGlyphs('https://glyphs.example.org', 'fira_sans_regular'),
			loadGlyphs('https://glyphs.example.org', 'fira_sans_regular'),
		]);
		expect(a).toBe(b);
		expect(a?.get(65)?.advance).toBe(6);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(String(fetchSpy.mock.calls[0][0])).toBe(
			'https://glyphs.example.org/assets/glyphs/fira_sans_regular/0-255.pbf'
		);
	});

	it('gives undefined for a face the server does not have', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }));
		expect(await loadGlyphs('https://glyphs.example.org', 'no_such_face')).toBeUndefined();
	});
});
