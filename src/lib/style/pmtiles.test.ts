// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { PROTOMAPS_SCHEMA } from '@versatiles/style/protomaps';
import { byteRange, pmtilesArchive } from '../../../e2e/pmtiles-archive';
import {
	archiveUrl,
	isPMTilesUrl,
	loadArchiveTileJSON,
	pmtilesUrl,
	registerPMTiles,
} from './pmtiles';
import { loadSources, protomapsSources, providerOf, vectorSchema } from './sources';

afterEach(() => {
	vi.restoreAllMocks();
});

const METADATA = {
	attribution: '© OpenStreetMap',
	vector_layers: Object.entries(PROTOMAPS_SCHEMA).map(([id, layer]) => ({
		id,
		fields: Object.fromEntries(layer.fields.map((field) => [field, 'String'])),
	})),
};

/** Serves archives by URL, answering range requests as a storage bucket does. */
function mockArchives(archives: Record<string, Uint8Array>) {
	return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
		const archive = archives[String(input instanceof Request ? input.url : input)];
		if (!archive) return new Response('', { status: 404 });
		const { body, contentRange } = byteRange(archive, new Headers(init?.headers).get('range'));
		return new Response(body as BodyInit, {
			status: 206,
			headers: { 'Content-Range': contentRange, 'Content-Length': String(body.length) },
		});
	});
}

describe('pmtiles URLs', () => {
	it('adds the scheme to the address of an archive, once', () => {
		const address = 'https://example.org/planet.pmtiles';
		expect(pmtilesUrl(address)).toBe(`pmtiles://${address}`);
		expect(pmtilesUrl(`pmtiles://${address}`)).toBe(`pmtiles://${address}`);
		expect(archiveUrl(`pmtiles://${address}`)).toBe(address);
		expect(archiveUrl(address)).toBe(address);
		expect(isPMTilesUrl(`pmtiles://${address}`)).toBe(true);
		expect(isPMTilesUrl(address)).toBe(false);
	});
});

describe('registerPMTiles', () => {
	it('registers the pmtiles protocol with the function MapLibre gives', () => {
		const addProtocol = vi.fn();
		registerPMTiles(addProtocol);
		expect(addProtocol).toHaveBeenCalledWith('pmtiles', expect.any(Function));
	});
});

describe('loadArchiveTileJSON', () => {
	it('builds a TileJSON from the header and the metadata of an archive', async () => {
		const address = 'https://archives.example.org/vector.pmtiles';
		mockArchives({ [address]: pmtilesArchive(METADATA, { maxZoom: 15 }) });
		const tileJSON = await loadArchiveTileJSON(`pmtiles://${address}`);
		expect(tileJSON).toMatchObject({
			tiles: [`pmtiles://${address}/{z}/{x}/{y}.mvt`],
			minzoom: 0,
			maxzoom: 15,
			attribution: '© OpenStreetMap',
			vector_layers: METADATA.vector_layers,
		});
		expect(tileJSON.bounds?.[0]).toBe(-180);
	});

	it('gives a raster TileJSON for an archive of images: no layers, not even as a key', async () => {
		const address = 'https://archives.example.org/raster.pmtiles';
		mockArchives({ [address]: pmtilesArchive({}, { tileType: 4, maxZoom: 12 }) });
		const tileJSON = await loadArchiveTileJSON(`pmtiles://${address}`);
		expect(tileJSON.tiles).toEqual([`pmtiles://${address}/{z}/{x}/{y}.webp`]);
		expect(tileJSON).not.toHaveProperty('vector_layers');
	});

	it('rejects what is not an archive', async () => {
		const address = 'https://archives.example.org/not-an-archive.pmtiles';
		mockArchives({ [address]: new TextEncoder().encode('<html>Not Found</html>') });
		await expect(loadArchiveTileJSON(`pmtiles://${address}`)).rejects.toThrow();
	});
});

describe('Protomaps', () => {
	it('is a PMTiles archive, whose schema is read from its metadata', async () => {
		const address = 'https://archives.example.org/protomaps.pmtiles';
		mockArchives({ [address]: pmtilesArchive(METADATA) });
		const config = protomapsSources(address);
		expect(config.vector).toBe(`pmtiles://${address}`);
		expect(providerOf(config)).toBe('protomaps');

		const vector = await loadSources(config).vector;
		expect(vector && vectorSchema(vector)).toBe('protomaps');
	});

	it('counts an archive that cannot be read as a missing source', async () => {
		mockArchives({});
		const sources = loadSources(protomapsSources('https://archives.example.org/missing.pmtiles'));
		expect(await sources.vector).toBeNull();
	});
});
