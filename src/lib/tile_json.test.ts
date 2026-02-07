import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchJSON, fetchTileJSON } from './tile_json';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('fetchJSON', () => {
	it('resolves with parsed JSON on success', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ foo: 42 }), { status: 200 })
		);

		const result = await fetchJSON('https://example.com/data.json');
		expect(result).toEqual({ foo: 42 });
	});

	it('rejects with descriptive error on HTTP error', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response('', { status: 404, statusText: 'Not Found' })
		);

		await expect(fetchJSON('https://example.com/missing.json')).rejects.toThrow(
			'Failed to fetch JSON from https://example.com/missing.json: 404 Not Found'
		);
	});
});

describe('fetchTileJSON', () => {
	it('returns a TileJSON wrapper with working languages()', async () => {
		const spec = {
			tiles: ['https://example.com/{z}/{x}/{y}.pbf'],
			vector_layers: [
				{ id: 'place', fields: { name: 'String', name_en: 'String', name_de: 'String' } },
			],
		};
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify(spec), { status: 200 })
		);

		const tileJSON = await fetchTileJSON('https://example.com/tiles.json');
		const langs = tileJSON.languages();

		expect(langs).toHaveProperty('local', '');
		expect(Object.values(langs)).toContain('en');
		expect(Object.values(langs)).toContain('de');
	});
});

describe('TileJSON.languages', () => {
	it('returns only local when no vector_layers', async () => {
		const spec = { tiles: ['https://example.com/{z}/{x}/{y}.pbf'] };
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify(spec), { status: 200 })
		);

		const tileJSON = await fetchTileJSON('https://example.com/tiles.json');
		expect(tileJSON.languages()).toEqual({ local: '' });
	});

	it('extracts language codes from name_ fields across layers', async () => {
		const spec = {
			tiles: ['https://example.com/{z}/{x}/{y}.pbf'],
			vector_layers: [
				{ id: 'a', fields: { name: 'String', name_fr: 'String' } },
				{ id: 'b', fields: { name_es: 'String', name_fr: 'String' } },
			],
		};
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify(spec), { status: 200 })
		);

		const tileJSON = await fetchTileJSON('https://example.com/tiles.json');
		const langs = tileJSON.languages();
		const codes = Object.values(langs);

		expect(codes).toContain('');
		expect(codes).toContain('fr');
		expect(codes).toContain('es');
		// deduplicated — fr appears in both layers but only once in output
		expect(codes.filter((c) => c === 'fr').length).toBe(1);
	});

	it('falls back to raw code when Intl.DisplayNames throws', async () => {
		const spec = {
			tiles: ['https://example.com/{z}/{x}/{y}.pbf'],
			vector_layers: [{ id: 'a', fields: { name_zz: 'String' } }],
		};
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify(spec), { status: 200 })
		);

		const tileJSON = await fetchTileJSON('https://example.com/tiles.json');
		const langs = tileJSON.languages();

		// 'zz' is not a valid language code, so Intl.DisplayNames should fail
		// and the code falls back to using the raw code as title
		expect(langs).toHaveProperty('zz', 'zz');
	});
});
