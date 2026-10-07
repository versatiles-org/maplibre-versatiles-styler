import { PMTiles, Protocol } from 'pmtiles';
import type { addProtocol } from 'maplibre-gl';
import type { TileJSONSpecification } from '@versatiles/style';

const SCHEME = 'pmtiles://';

/**
 * Reads the tiles of the archives for MapLibre, and holds the archives the styler has opened: a tile
 * is found through the directories that reading the TileJSON has already fetched.
 */
const protocol = new Protocol();

/**
 * Teaches MapLibre the `pmtiles://` URLs of a PMTiles archive. The styler cannot do that by itself: the
 * protocols are registered with the MapLibre library, and a control only ever sees a map.
 */
export function registerPMTiles(register: typeof addProtocol): void {
	register('pmtiles', protocol.tile as Parameters<typeof addProtocol>[1]);
}

export function isPMTilesUrl(url: string): boolean {
	return url.startsWith(SCHEME);
}

/** The `pmtiles://` URL of an archive, from its address with or without the scheme. */
export function pmtilesUrl(archive: string): string {
	return isPMTilesUrl(archive) ? archive : SCHEME + archive;
}

/** The address of the archive behind a `pmtiles://` URL. */
export function archiveUrl(url: string): string {
	return isPMTilesUrl(url) ? url.slice(SCHEME.length) : url;
}

/**
 * The TileJSON of an archive, which has none: the zoom range and the bounds come from its header, the
 * layers and the attribution from its metadata. Its tiles are `pmtiles://` URLs.
 */
export async function loadArchiveTileJSON(url: string): Promise<TileJSONSpecification> {
	const address = archiveUrl(url);
	let archive = protocol.get(address);
	if (!archive) {
		archive = new PMTiles(address);
		protocol.add(archive);
	}
	// An archive of raster tiles has no layers, and the key is left out rather than `undefined`.
	return JSON.parse(JSON.stringify(await archive.getTileJson(pmtilesUrl(address))));
}
