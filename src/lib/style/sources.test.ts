// @vitest-environment node
// jsdom's `Blob` does not survive the `Response` round trip of @versatiles/style's fetch cache.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { OMT_SCHEMA } from '@versatiles/style/omt';
import { PROTOMAPS_SCHEMA } from '@versatiles/style/protomaps';
import type { TileJSONSpecification } from '@versatiles/style';
import {
	fetchTilesetIndex,
	loadSources,
	tilesetsFromIndex,
	type SourceConfig,
	type SourceName,
	parseSources,
	serializeSources,
	openFreeMapSources,
	providerOf,
	protomapsSources,
	sourceStatus,
	sourceUrl,
	vectorSchema,
	versatilesSources,
	MAPTERHORN_TILES,
	OPENFREEMAP_TILES,
	VERSATILES_ASSETS,
} from './sources';

const ORIGIN = 'https://sources.example.org';

afterEach(() => {
	vi.restoreAllMocks();
});

/** Lets every request and promise that is ready settle. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 20));

function mockServer(files: Record<string, unknown>) {
	return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
		const url = String(input instanceof Request ? input.url : input);
		const path = new URL(url).pathname;
		if (path in files) return new Response(JSON.stringify(files[path]), { status: 200 });
		return new Response('', { status: 404, statusText: 'Not Found' });
	});
}

describe('loadSources', () => {
	it('fetches all TileJSONs at once, before any of them is awaited', () => {
		const fetchSpy = mockServer({});
		loadSources(versatilesSources(`${ORIGIN}/a`));
		const urls = fetchSpy.mock.calls.map(([input]) => String(input));
		expect(urls).toEqual(
			expect.arrayContaining([
				`${ORIGIN}/tiles/osm-vector/tiles.json`,
				`${ORIGIN}/tiles/satellite-raster/tiles.json`,
				`${ORIGIN}/tiles/elevation-raster/tiles.json`,
				`${ORIGIN}/tiles/landcover-vector/tiles.json`,
			])
		);
		expect(urls.some((url) => url.includes('index.json'))).toBe(false);
		expect(urls.some((url) => url.includes('font_families'))).toBe(false);
	});

	it('resolves relative tile URLs and reports missing sources as null', async () => {
		mockServer({
			'/tiles/osm-vector/tiles.json': {
				tilejson: '3.0.0',
				tiles: ['/tiles/osm-vector/{z}/{x}/{y}'],
				vector_layers: [],
			},
		});
		const sources = loadSources(versatilesSources('https://missing.example.org'));
		expect((await sources.vector)?.tiles).toEqual([
			'https://missing.example.org/tiles/osm-vector/{z}/{x}/{y}',
		]);
		expect(await sources.satellite).toBeNull();
		expect(await sources.elevation).toBeNull();
	});

	it('reports a source that is not configured as null, without a request', async () => {
		const fetchSpy = mockServer({});
		const sources = loadSources({ assets: 'https://assets.example.org' });
		expect(await sources.vector).toBeNull();
		expect(await sources.satellite).toBeNull();
		expect(await sources.elevation).toBeNull();
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('counts tiles of the wrong kind as a missing source', async () => {
		const raster = { tilejson: '3.0.0', tiles: ['/tiles/{z}/{x}/{y}'] };
		mockServer({
			'/tiles/osm-vector/tiles.json': raster,
			'/tiles/satellite-raster/tiles.json': { ...raster, vector_layers: [] },
			'/tiles/elevation-raster/tiles.json': raster,
		});
		const sources = loadSources(versatilesSources('https://kinds.example.org'));
		expect(await sources.vector).toBeNull();
		expect(await sources.satellite).toBeNull();
		expect(await sources.elevation).not.toBeNull();
	});

	it('takes only land cover for the land cover', async () => {
		const tileJSON = (layer: string) => ({
			tilejson: '3.0.0',
			tiles: ['/tiles/{z}/{x}/{y}'],
			vector_layers: [{ id: layer, fields: { kind: 'String' } }],
		});
		mockServer({
			'/a/tiles.json': tileJSON('landcover'),
			'/b/tiles.json': tileJSON('land'),
		});
		const origin = 'https://landcover.example.org';
		const load = (path: string) =>
			loadSources({ landcover: `${origin}${path}`, assets: origin }).landcover;
		expect(await load('/a/tiles.json')).not.toBeNull();
		expect(await load('/b/tiles.json')).toBeNull();
	});

	it('takes the tilesets a server has under other names, by address or by path', () => {
		expect(
			versatilesSources('https://tiles.example.org', {
				vector: '/tiles/planet/tiles.json',
				elevation: 'https://dem.example.org/tiles.json',
			})
		).toEqual({
			vector: 'https://tiles.example.org/tiles/planet/tiles.json',
			satellite: 'https://tiles.example.org/tiles/satellite-raster/tiles.json',
			elevation: 'https://dem.example.org/tiles.json',
			landcover: 'https://tiles.example.org/tiles/landcover-vector/tiles.json',
			assets: 'https://tiles.example.org',
		});
		// A path follows the server; an archive is no path.
		expect(
			versatilesSources('https://b.example.org', { vector: '/tiles/planet/tiles.json' }).vector
		).toBe('https://b.example.org/tiles/planet/tiles.json');
		expect(
			versatilesSources('https://b.example.org', {
				vector: 'pmtiles://https://c.example.org/a.pmtiles',
			}).vector
		).toBe('pmtiles://https://c.example.org/a.pmtiles');
	});

	it('has no tiles for an origin that is no URL', () => {
		expect(versatilesSources('not a url')).toEqual({ assets: 'not a url' });
	});

	it('treats a network failure as a missing source', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
		const sources = loadSources(versatilesSources('https://offline.example.org'));
		expect(await sources.vector).toBeNull();
	});

	it('gives a source that loads at once, without waiting for the settled config', async () => {
		mockServer({
			'/tiles/osm-vector/tiles.json': { tilejson: '3.0.0', tiles: [], vector_layers: [] },
		});
		const sources = loadSources(
			versatilesSources('https://early.example.org'),
			new Promise<SourceConfig>(() => {})
		);
		expect(await sources.vector).not.toBeNull();
	});

	it('holds a failed source until the settled config shows whether it keeps its address', async () => {
		mockServer({});
		const origin = 'https://settling.example.org';
		let settle: (config: SourceConfig) => void = () => {};
		const sources = loadSources(
			versatilesSources(origin),
			new Promise<SourceConfig>((resolve) => (settle = resolve))
		);
		const given: Partial<Record<SourceName, unknown>> = {};
		for (const name of ['vector', 'satellite'] as const) {
			void sources[name].then((tileJSON) => (given[name] = tileJSON));
		}
		await tick();
		expect(given).toEqual({});

		// The vector tiles move to another name; the satellite imagery stays missing where it was.
		settle(versatilesSources(origin, { vector: '/tiles/osm/tiles.json' }));
		await tick();
		expect(given).toEqual({ satellite: null });
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
		const sources = loadSources(versatilesSources('https://fonts.example.org'));
		const fontCalls = () =>
			fetchSpy.mock.calls.filter(([input]) => String(input).includes('font_families')).length;
		expect(fontCalls()).toBe(0);

		const [first, second] = await Promise.all([sources.fontFaces(), sources.fontFaces()]);
		expect(fontCalls()).toBe(1);
		expect(first).toBe(second);
	});

	it('gives undefined font faces when the server publishes none', async () => {
		mockServer({});
		expect(
			await loadSources(versatilesSources('https://nofonts.example.org')).fontFaces()
		).toBeUndefined();
	});
});

describe('tilesetsFromIndex', () => {
	const path = (name: string) => `/tiles/${name}/tiles.json`;

	it('takes the default names', () => {
		expect(
			tilesetsFromIndex([
				'bathymetry-vector',
				'elevation-raster',
				'hillshade-vector',
				'landcover-vector',
				'osm-vector',
				'satellite-raster',
			])
		).toEqual({
			vector: path('osm-vector'),
			satellite: path('satellite-raster'),
			elevation: path('elevation-raster'),
			landcover: path('landcover-vector'),
		});
	});

	it('takes a name with or without the format, in the plural or not, and with a version', () => {
		expect(tilesetsFromIndex(['osm', 'satellite', 'elevation', 'landcover-vectors'])).toEqual({
			vector: path('osm'),
			satellite: path('satellite'),
			elevation: path('elevation'),
			landcover: path('landcover-vectors'),
		});
		expect(tilesetsFromIndex(['osm-vectors']).vector).toBe(path('osm-vectors'));
		expect(tilesetsFromIndex(['osm-vector.20251201']).vector).toBe(path('osm-vector.20251201'));
	});

	it('prefers the default name, else the newest version', () => {
		expect(tilesetsFromIndex(['osm-vector.20260101', 'osm-vector', 'osm']).vector).toBe(
			path('osm-vector')
		);
		expect(tilesetsFromIndex(['osm-vector.20260101', 'osm-vector.20251201']).vector).toBe(
			path('osm-vector.20260101')
		);
	});

	it('leaves out what has no name in the list, and names that only start alike', () => {
		expect(tilesetsFromIndex([])).toEqual({});
		expect(
			tilesetsFromIndex(['osmand', 'osm-vector-extra', 'satellites', 'hillshade-vector'])
		).toEqual({});
	});
});

describe('fetchTilesetIndex', () => {
	it('reads the list of a VersaTiles server', async () => {
		mockServer({ '/tiles/index.json': ['osm', 'satellite-raster', 42] });
		expect(await fetchTilesetIndex('https://index.example.org')).toEqual({
			vector: '/tiles/osm/tiles.json',
			satellite: '/tiles/satellite-raster/tiles.json',
		});
	});

	it('lists nothing for a server without a list, or with one that is no list of names', async () => {
		mockServer({ '/tiles/index.json': { osm: true } });
		expect(await fetchTilesetIndex('https://object.example.org')).toEqual({});
		vi.restoreAllMocks();
		mockServer({});
		expect(await fetchTilesetIndex('https://nolist.example.org')).toEqual({});
		expect(await fetchTilesetIndex('not a url')).toEqual({});
	});

	it('lists nothing when the server cannot be reached', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
		expect(await fetchTilesetIndex('https://offline.example.org')).toEqual({});
	});
});

describe('OpenFreeMap', () => {
	it('has vector tiles only, and the assets of VersaTiles', () => {
		expect(openFreeMapSources()).toEqual({ vector: OPENFREEMAP_TILES, assets: VERSATILES_ASSETS });
		expect(openFreeMapSources(MAPTERHORN_TILES).elevation).toBe(MAPTERHORN_TILES);
	});

	it('is told from a VersaTiles server by its vector tiles', () => {
		expect(providerOf(openFreeMapSources(MAPTERHORN_TILES))).toBe('openfreemap');
		expect(providerOf(versatilesSources(VERSATILES_ASSETS))).toBe('versatiles');
	});

	it('limits Mapterhorn to the zoom it covers the world at, which its TileJSON does not name', async () => {
		const tiles = ['https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'];
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
			const url = String(input instanceof Request ? input.url : input);
			const tileJSON = url === MAPTERHORN_TILES ? { tiles } : { tiles, maxzoom: 9 };
			return new Response(JSON.stringify({ tilejson: '3.0.0', ...tileJSON }), { status: 200 });
		});
		const mapterhorn = loadSources(openFreeMapSources(MAPTERHORN_TILES));
		expect((await mapterhorn.elevation)?.maxzoom).toBe(12);
		// A `maxzoom` a TileJSON does name is kept, and so is one of any other server.
		const other = loadSources(openFreeMapSources('https://dem.example.org/tiles.json'));
		expect((await other.elevation)?.maxzoom).toBe(9);
	});
});

describe('providerOf', () => {
	it('recognises the sources of each provider', () => {
		expect(providerOf(versatilesSources('https://tiles.example.org'))).toBe('versatiles');
		expect(providerOf(openFreeMapSources())).toBe('openfreemap');
		expect(providerOf(protomapsSources('https://example.org/extract.pmtiles'))).toBe('protomaps');
		expect(providerOf({ ...protomapsSources(), elevation: MAPTERHORN_TILES })).toBe('protomaps');
	});

	it('takes everything else for custom sources', () => {
		const versatiles = versatilesSources('https://tiles.example.org');
		expect(providerOf({ ...versatiles, satellite: 'https://other.example.org/tiles.json' })).toBe(
			'custom'
		);
		expect(providerOf({ ...openFreeMapSources(), assets: 'https://tiles.example.org' })).toBe(
			'custom'
		);
		expect(providerOf({ ...openFreeMapSources(), schema: 'shortbread' })).toBe('custom');
		expect(providerOf({ assets: VERSATILES_ASSETS })).toBe('custom');
	});
});

describe('sources as data', () => {
	it('keeps a VersaTiles server as its origin, and brings its tilesets back', () => {
		const chosen = { provider: 'versatiles' as const, config: versatilesSources('https://a.org') };
		expect(serializeSources(chosen)).toEqual({ provider: 'versatiles', origin: 'https://a.org' });
		expect(parseSources(serializeSources(chosen))).toEqual(chosen);
	});

	it('keeps other sources by their addresses', () => {
		for (const chosen of [
			{ provider: 'openfreemap' as const, config: openFreeMapSources(MAPTERHORN_TILES) },
			{ provider: 'protomaps' as const, config: protomapsSources() },
			// The same sources as a provider's, chosen as custom ones: the choice is kept.
			{
				provider: 'custom' as const,
				config: { ...openFreeMapSources(), schema: 'shortbread' as const },
			},
		]) {
			expect(parseSources(JSON.parse(JSON.stringify(serializeSources(chosen))))).toEqual(chosen);
		}
	});

	it('refuses what is not a set of sources, and reads over what does not belong', () => {
		for (const value of [
			null,
			'openfreemap',
			[],
			{},
			{ provider: 'versatiles' },
			{ vector: 'x' },
		]) {
			expect(parseSources(value)).toBeUndefined();
		}
		expect(
			parseSources({
				provider: 'nobody',
				assets: VERSATILES_ASSETS,
				vector: OPENFREEMAP_TILES,
				satellite: 5,
				schema: 'mapbox',
			})
		).toEqual({ provider: 'openfreemap', config: openFreeMapSources() });
	});
});

describe('sourceUrl', () => {
	it('takes an address as typed, and tells a PMTiles archive by its name', () => {
		expect(sourceUrl('  https://example.org/tiles.json ')).toBe('https://example.org/tiles.json');
		expect(sourceUrl('https://example.org/a.pmtiles')).toBe(
			'pmtiles://https://example.org/a.pmtiles'
		);
		expect(sourceUrl('https://example.org/a.PMTiles?v=2')).toBe(
			'pmtiles://https://example.org/a.PMTiles?v=2'
		);
		expect(sourceUrl('pmtiles://https://example.org/a.pmtiles')).toBe(
			'pmtiles://https://example.org/a.pmtiles'
		);
		expect(sourceUrl('   ')).toBeUndefined();
	});
});

describe('sourceStatus', () => {
	const url = 'https://tiles.example.org/tiles.json';
	const raster = {
		tilejson: '3.0.0',
		tiles: [url],
		minzoom: 0,
		maxzoom: 12,
	} as TileJSONSpecification;

	it('tells a source that is not set, loading or failed', () => {
		expect(sourceStatus('satellite', undefined, undefined)).toEqual({
			state: 'none',
			text: 'None',
		});
		expect(sourceStatus('satellite', url, undefined).state).toBe('loading');
		expect(sourceStatus('satellite', url, null)).toEqual({
			state: 'error',
			text: 'No image tiles could be loaded from this address.',
		});
		expect(sourceStatus('vector', url, null).text).toContain('vector tiles');
	});

	it('describes loaded tiles by their zoom range', () => {
		expect(sourceStatus('elevation', url, raster)).toEqual({ state: 'ok', text: 'zoom 0–12' });
		const { minzoom: _minzoom, ...open } = raster;
		expect(sourceStatus('elevation', url, open as TileJSONSpecification).text).toBe('zoom 0–12');
		const bare = { tilejson: '3.0.0', tiles: [url] } as TileJSONSpecification;
		expect(sourceStatus('elevation', url, bare).text).toBe('Available');
	});

	it('describes vector tiles by their schema and languages too', () => {
		const vector = {
			...raster,
			maxzoom: 14,
			vector_layers: [{ id: 'parcels', fields: { name_de: 'String', name_en: 'String' } }],
		} as TileJSONSpecification;
		expect(sourceStatus('vector', url, vector).text).toBe(
			'Unknown schema · zoom 0–14 · 2 languages'
		);
		expect(sourceStatus('vector', url, vector, 'openmaptiles').text).toBe(
			'OpenMapTiles · zoom 0–14 · 2 languages'
		);
	});
});

describe('vectorSchema', () => {
	type Layers = Record<string, { fields: readonly string[] }>;
	const tileJSON = (layers: Layers) =>
		({
			tilejson: '3.0.0',
			tiles: ['https://tiles.example.org/{z}/{x}/{y}'],
			vector_layers: Object.entries(layers).map(([id, layer]) => ({
				id,
				fields: Object.fromEntries(layer.fields.map((field) => [field, 'String'])),
			})),
		}) as TileJSONSpecification;

	it('recognises the schemas the styler has a style for', () => {
		expect(vectorSchema(tileJSON(OMT_SCHEMA))).toBe('openmaptiles');
		expect(vectorSchema(tileJSON(PROTOMAPS_SCHEMA))).toBe('protomaps');
	});

	it('gives undefined for other vector tiles and for raster tiles', () => {
		expect(vectorSchema(tileJSON({ parcels: { fields: ['owner'] } }))).toBeUndefined();
		// The land cover on its own has a schema of its own, but no style: it goes under Shortbread.
		expect(vectorSchema(tileJSON({ landcover: { fields: ['kind'] } }))).toBeUndefined();
		expect(
			vectorSchema({ tilejson: '3.0.0', tiles: ['https://tiles.example.org/{z}/{x}/{y}'] })
		).toBeUndefined();
	});
});
