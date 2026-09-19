// @vitest-environment node
// jsdom's `Blob` does not survive the `Response` round trip of @versatiles/style's fetch cache.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { loadOrigin } from './sources';

const ORIGIN = 'https://sources.example.org';

afterEach(() => {
	vi.restoreAllMocks();
});

function mockServer(files: Record<string, unknown>) {
	return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
		const url = String(input instanceof Request ? input.url : input);
		const path = new URL(url).pathname;
		if (path in files) return new Response(JSON.stringify(files[path]), { status: 200 });
		return new Response('', { status: 404, statusText: 'Not Found' });
	});
}

describe('loadOrigin', () => {
	it('fetches all TileJSONs at once, before any of them is awaited', () => {
		const fetchSpy = mockServer({});
		loadOrigin(`${ORIGIN}/a`);
		const urls = fetchSpy.mock.calls.map(([input]) => String(input));
		expect(urls).toEqual(
			expect.arrayContaining([
				`${ORIGIN}/tiles/osm/tiles.json`,
				`${ORIGIN}/tiles/satellite/tiles.json`,
				`${ORIGIN}/tiles/elevation/tiles.json`,
			])
		);
		expect(urls.some((url) => url.includes('index.json'))).toBe(false);
		expect(urls.some((url) => url.includes('font_families'))).toBe(false);
	});

	it('resolves relative tile URLs and reports missing sources as null', async () => {
		mockServer({
			'/tiles/osm/tiles.json': { tilejson: '3.0.0', tiles: ['/tiles/osm/{z}/{x}/{y}'] },
		});
		const sources = loadOrigin('https://missing.example.org');
		expect((await sources.osm)?.tiles).toEqual([
			'https://missing.example.org/tiles/osm/{z}/{x}/{y}',
		]);
		expect(await sources.satellite).toBeNull();
		expect(await sources.elevation).toBeNull();
	});

	it('treats a network failure as a missing source', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
		const sources = loadOrigin('https://offline.example.org');
		expect(await sources.osm).toBeNull();
	});

	it('loads font faces only on request, once', async () => {
		const fetchSpy = mockServer({
			'/assets/glyphs/font_families.json': [
				{
					name: 'Fira Sans',
					faces: [
						{
							id: 'fira_sans_regular',
							style: 'normal',
							weight: 400,
							width: 'normal',
							codeblocks: '0',
						},
					],
				},
			],
		});
		const sources = loadOrigin('https://fonts.example.org');
		const fontCalls = () =>
			fetchSpy.mock.calls.filter(([input]) => String(input).includes('font_families')).length;
		expect(fontCalls()).toBe(0);

		const [first, second] = await Promise.all([sources.fontFaces(), sources.fontFaces()]);
		expect(fontCalls()).toBe(1);
		expect(first).toBe(second);
	});

	it('gives undefined font faces when the server publishes none', async () => {
		mockServer({});
		expect(await loadOrigin('https://nofonts.example.org').fontFaces()).toBeUndefined();
	});
});
