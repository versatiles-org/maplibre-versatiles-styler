import { fetchFontFaces, fetchTileJSON } from '@versatiles/style';
import type { FontFaceInfo, TileJSONSpecification } from '@versatiles/style';

export type SourceName = 'vector' | 'satellite' | 'elevation';

/**
 * Where a style gets its tiles and assets from. The tile sources are TileJSON URLs; one that is left
 * out is not available. `assets` is the base URL of the server the glyphs, the sprites and the font list
 * come from, which need not be the one serving the tiles.
 */
export interface SourceConfig {
	vector?: string;
	satellite?: string;
	elevation?: string;
	assets: string;
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
		return url === undefined ? Promise.resolve(null) : fetchTileJSON(url).catch(() => null);
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
