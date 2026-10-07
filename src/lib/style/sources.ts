import { fetchFontFaces, fetchTileJSON, guessSchema } from '@versatiles/style';
import type { FontFaceInfo, TileJSONSpecification } from '@versatiles/style';
import { isPMTilesUrl, loadArchiveTileJSON, pmtilesUrl } from './pmtiles';

export type SourceName = 'vector' | 'satellite' | 'elevation';

/**
 * Where a style gets its tiles and assets from. The tile sources are TileJSON URLs, or the `pmtiles://`
 * URLs of PMTiles archives; one that is left out is not available. `assets` is the base URL of the server the glyphs, the sprites and the font list
 * come from, which need not be the one serving the tiles.
 */
export interface SourceConfig {
	vector?: string;
	satellite?: string;
	elevation?: string;
	assets: string;
}

/** The vector tile schemas the styler has a style for. */
export type VectorSchema = 'shortbread' | 'openmaptiles' | 'protomaps';

/** The schema of a vector tileset, read from its layers; `undefined` when it is none the styler knows. */
export function vectorSchema(tileJSON: TileJSONSpecification): VectorSchema | undefined {
	const guess = guessSchema(tileJSON);
	return guess.type === 'vector' && guess.schema !== 'mapbox' ? guess.schema : undefined;
}

/** A loaded TileJSON, or `null` when the source is not configured or its server does not provide it. */
export type LoadedTileJSON = TileJSONSpecification | null;

export interface LoadedSources {
	readonly config: SourceConfig;
	readonly vector: Promise<LoadedTileJSON>;
	readonly satellite: Promise<LoadedTileJSON>;
	readonly elevation: Promise<LoadedTileJSON>;
	/** The font faces the assets server publishes; fetched on the first call only. */
	fontFaces(): Promise<FontFaceInfo[] | undefined>;
}

/** The VersaTiles server other providers get their glyphs and sprites from: they have none of their own. */
export const VERSATILES_ASSETS = 'https://tiles.versatiles.org';
export const OPENFREEMAP_TILES = 'https://tiles.openfreemap.org/planet';
export const MAPTERHORN_TILES = 'https://tiles.mapterhorn.com/tilejson.json';
/**
 * The mirror of the Protomaps basemap on Source Cooperative: the only build that any page may read.
 * Protomaps asks not to rely on it, so the archive is a field in the sidebar.
 */
export const PROTOMAPS_ARCHIVE = 'https://data.source.coop/protomaps/openstreetmap/v4.pmtiles';

/** Whose tiles a style is built from. */
export type Provider = 'versatiles' | 'openfreemap' | 'protomaps';

/**
 * The sources of OpenFreeMap: vector tiles in the OpenMapTiles schema and nothing else, so elevation
 * is another server's, if any, and the assets are those of VersaTiles.
 */
export function openFreeMapSources(elevation?: string): SourceConfig {
	return {
		vector: OPENFREEMAP_TILES,
		...(elevation ? { elevation } : {}),
		assets: VERSATILES_ASSETS,
	};
}

/**
 * The sources of a Protomaps basemap: a PMTiles archive of vector tiles in the Protomaps schema. As with
 * OpenFreeMap, everything else comes from elsewhere.
 */
export function protomapsSources(archive: string = PROTOMAPS_ARCHIVE): SourceConfig {
	return { vector: pmtilesUrl(archive), assets: VERSATILES_ASSETS };
}

/** The provider of a source config, told by its vector tiles. */
export function providerOf(config: SourceConfig): Provider {
	if (config.vector === OPENFREEMAP_TILES) return 'openfreemap';
	if (config.vector !== undefined && isPMTilesUrl(config.vector)) return 'protomaps';
	return 'versatiles';
}

/**
 * What the TileJSON of a known source leaves out.
 *
 * Mapterhorn names no `maxzoom`, and covers the world to zoom 12 only: deeper tiles exist where it has
 * finer data, and are a 404 everywhere else. Without a `maxzoom` MapLibre asks for them.
 */
const TILEJSON_DEFAULTS: Record<string, Partial<TileJSONSpecification>> = {
	[MAPTERHORN_TILES]: { maxzoom: 12 },
};

/** The sources of a VersaTiles server: its tilesets `osm`, `satellite` and `elevation`, and its assets. */
export function versatilesSources(origin: string): SourceConfig {
	const tileJSON = (name: string) => new URL(`/tiles/${name}/tiles.json`, origin).href;
	return {
		vector: tileJSON('osm'),
		satellite: tileJSON('satellite'),
		elevation: tileJSON('elevation'),
		assets: origin,
	};
}

/**
 * Starts loading everything the styler needs from its sources.
 *
 * The TileJSONs are fetched in parallel right away: they decide which styles are available, and the
 * first style can only be built once its TileJSON is in (VersaTiles servers publish relative tile URLs,
 * which MapLibre cannot resolve). A source that fails to load counts as unavailable.
 * Repeated requests for the same URL are served from `@versatiles/style`'s response cache.
 */
export function loadSources(config: SourceConfig): LoadedSources {
	const load = (name: SourceName): Promise<LoadedTileJSON> => {
		const url = config[name];
		if (url === undefined) return Promise.resolve(null);
		return (isPMTilesUrl(url) ? loadArchiveTileJSON(url) : fetchTileJSON(url))
			.then((tileJSON) => ({ ...TILEJSON_DEFAULTS[url], ...tileJSON }) as TileJSONSpecification)
			.catch(() => null);
	};

	let fontFaces: Promise<FontFaceInfo[] | undefined> | undefined;

	return {
		config,
		vector: load('vector'),
		satellite: load('satellite'),
		elevation: load('elevation'),
		fontFaces: () => (fontFaces ??= fetchFontFaces({ base: config.assets }).catch(() => undefined)),
	};
}
