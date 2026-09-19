/**
 * Font previews from the glyphs MapLibre draws the labels with.
 *
 * VersaTiles servers publish their fonts only as MapLibre glyph PBFs: per face and range of 256 code
 * points, a signed distance field of every character, rendered at 24 px with a 3 px border. Drawing a
 * preview from them shows exactly what the map will show, and needs nothing but the tile server.
 */

export interface Glyph {
	id: number;
	/** Signed distance field, `(width + 6) × (height + 6)`, 192 at the edge of the character. */
	bitmap: Uint8Array;
	width: number;
	height: number;
	left: number;
	top: number;
	advance: number;
}

export type GlyphSet = Map<number, Glyph>;

/** Glyph size in the PBFs, and the border of the bitmaps. */
const EM = 24;
const BORDER = 3;
/** The distance field value at the edge of a character, as MapLibre draws text (0.75). */
const EDGE = 192 / 255;
/**
 * The part of the em box a preview shows, in glyph pixels from its top: the baseline is at 24,
 * capitals reach up to about 7, descenders down to about 30.
 */
const LINE_TOP = 4;
const LINE_BOTTOM = 31;

// ── PBF decoding ──────────────────────────────────────────────────────────────

/** The glyphs of a glyph PBF (`glyphs { fontstack { glyph* } }`). */
export function decodeGlyphs(data: ArrayBuffer | Uint8Array): GlyphSet {
	const glyphs: GlyphSet = new Map();
	const reader = new ProtobufReader(data instanceof Uint8Array ? data : new Uint8Array(data));
	reader.readMessage(reader.end, (tag, r) => {
		if (tag !== 1) return false; // glyphs.stacks
		r.readMessage(r.readVarint() + r.pos, (tag, r) => {
			if (tag !== 3) return false; // fontstack.glyphs
			const glyph: Glyph = {
				id: 0,
				bitmap: new Uint8Array(),
				width: 0,
				height: 0,
				left: 0,
				top: 0,
				advance: 0,
			};
			r.readMessage(r.readVarint() + r.pos, (tag, r) => {
				if (tag === 1) glyph.id = r.readVarint();
				else if (tag === 2) glyph.bitmap = r.readBytes();
				else if (tag === 3) glyph.width = r.readVarint();
				else if (tag === 4) glyph.height = r.readVarint();
				else if (tag === 5) glyph.left = r.readSVarint();
				else if (tag === 6) glyph.top = r.readSVarint();
				else if (tag === 7) glyph.advance = r.readVarint();
				else return false;
				return true;
			});
			glyphs.set(glyph.id, glyph);
			return true;
		});
		return true;
	});
	return glyphs;
}

/** Just enough of the protobuf wire format for glyph PBFs. */
class ProtobufReader {
	pos = 0;
	readonly end: number;

	constructor(readonly bytes: Uint8Array) {
		this.end = bytes.length;
	}

	/** Reads fields up to `end`; `read` returns `false` for fields it does not handle, which are skipped. */
	readMessage(end: number, read: (tag: number, reader: ProtobufReader) => boolean): void {
		while (this.pos < end) {
			const key = this.readVarint();
			const tag = key >>> 3;
			const wireType = key & 7;
			if (!read(tag, this)) this.skip(wireType);
		}
	}

	readVarint(): number {
		let result = 0;
		let shift = 0;
		let byte: number;
		do {
			if (this.pos >= this.end) throw new Error('glyph PBF: unexpected end of data');
			byte = this.bytes[this.pos++];
			result += (byte & 0x7f) * 2 ** shift;
			shift += 7;
		} while (byte & 0x80);
		return result;
	}

	readSVarint(): number {
		const n = this.readVarint();
		return n % 2 === 1 ? (n + 1) / -2 : n / 2;
	}

	readBytes(): Uint8Array {
		const length = this.readVarint();
		const bytes = this.bytes.subarray(this.pos, this.pos + length);
		this.pos += length;
		return bytes;
	}

	private skip(wireType: number): void {
		if (wireType === 0) {
			this.readVarint();
		} else if (wireType === 2) {
			// Not `this.pos += this.readVarint()`: that reads `pos` before the length moves it.
			const length = this.readVarint();
			this.pos += length;
		} else if (wireType === 5) {
			this.pos += 4;
		} else if (wireType === 1) {
			this.pos += 8;
		} else {
			throw new Error(`glyph PBF: unsupported wire type ${wireType}`);
		}
	}
}

// ── Loading ───────────────────────────────────────────────────────────────────

const cache = new Map<string, Promise<GlyphSet | undefined>>();

/**
 * The Latin glyphs (U+0000–U+00FF) of a face, loaded once per origin and face. `undefined` when the
 * server has none for it.
 */
export function loadGlyphs(origin: string, faceId: string): Promise<GlyphSet | undefined> {
	const url = new URL(`/assets/glyphs/${encodeURIComponent(faceId)}/0-255.pbf`, origin).href;
	let glyphs = cache.get(url);
	if (!glyphs) {
		glyphs = fetch(url)
			.then(async (response) =>
				response.ok ? decodeGlyphs(await response.arrayBuffer()) : undefined
			)
			.catch(() => undefined);
		cache.set(url, glyphs);
	}
	return glyphs;
}

// ── Rendering ─────────────────────────────────────────────────────────────────

export interface TextImage {
	/** Size in device pixels. */
	width: number;
	height: number;
	/** Coverage per pixel, 0–255. */
	alpha: Uint8ClampedArray;
}

/**
 * `text` drawn with `glyphs` at `fontSize` CSS pixels and `pixelRatio` device pixels per CSS pixel, as
 * a coverage mask. Characters the glyphs do not have are left out.
 */
export function renderText(
	glyphs: GlyphSet,
	text: string,
	fontSize: number,
	pixelRatio = 1
): TextImage {
	const scale = (fontSize / EM) * pixelRatio; // device pixels per glyph pixel
	const placed: { glyph: Glyph; x: number }[] = [];
	let pen = 0;
	for (const char of text) {
		const glyph = glyphs.get(char.codePointAt(0)!);
		if (!glyph) continue;
		placed.push({ glyph, x: pen });
		pen += glyph.advance;
	}

	const width = Math.max(1, Math.ceil(pen * scale));
	const height = Math.ceil((LINE_BOTTOM - LINE_TOP) * scale);
	const alpha = new Uint8ClampedArray(width * height);
	// Anti-aliasing: the width of the edge in distance field units, for one device pixel.
	const smoothing = Math.min(0.2, 0.1 / scale);

	for (const { glyph, x } of placed) {
		if (glyph.width === 0 || glyph.height === 0) continue;
		const bitmapWidth = glyph.width + 2 * BORDER;
		const bitmapHeight = glyph.height + 2 * BORDER;
		// The bitmap's top left corner, in glyph pixels on the line.
		const left = x + glyph.left - BORDER;
		const top = -glyph.top - BORDER - LINE_TOP;

		const x0 = Math.max(0, Math.floor(left * scale));
		const x1 = Math.min(width, Math.ceil((left + bitmapWidth) * scale));
		const y0 = Math.max(0, Math.floor(top * scale));
		const y1 = Math.min(height, Math.ceil((top + bitmapHeight) * scale));

		for (let py = y0; py < y1; py++) {
			const v = (py + 0.5) / scale - top - 0.5;
			for (let px = x0; px < x1; px++) {
				const u = (px + 0.5) / scale - left - 0.5;
				const distance = sample(glyph.bitmap, bitmapWidth, bitmapHeight, u, v) / 255;
				const coverage = smoothstep(EDGE - smoothing, EDGE + smoothing, distance);
				const i = py * width + px;
				const a = Math.round(coverage * 255);
				if (a > alpha[i]) alpha[i] = a;
			}
		}
	}
	return { width, height, alpha };
}

/** Bilinear sample of a distance field; outside it the distance is 0 (far outside the character). */
function sample(bitmap: Uint8Array, width: number, height: number, u: number, v: number): number {
	const x = Math.floor(u);
	const y = Math.floor(v);
	const fx = u - x;
	const fy = v - y;
	const at = (xx: number, yy: number) =>
		xx < 0 || yy < 0 || xx >= width || yy >= height ? 0 : bitmap[yy * width + xx];
	const top = at(x, y) * (1 - fx) + at(x + 1, y) * fx;
	const bottom = at(x, y + 1) * (1 - fx) + at(x + 1, y + 1) * fx;
	return top * (1 - fy) + bottom * fy;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
	const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
	return t * t * (3 - 2 * t);
}
