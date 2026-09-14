import { fetchFontFaces, fetchTileJSON } from '@versatiles/style';
import type { FontFaceInfo, TileJSONSpecification } from '@versatiles/style';

export type SourceName = 'osm' | 'satellite' | 'elevation';

/** A loaded TileJSON, or `null` when the server does not provide the source. */
export type LoadedTileJSON = TileJSONSpecification | null;

export interface OriginSources {
	readonly origin: string;
	readonly osm: Promise<LoadedTileJSON>;
	readonly satellite: Promise<LoadedTileJSON>;
	readonly elevation: Promise<LoadedTileJSON>;
	/** The font faces the server publishes; fetched on the first call only. */
	fontFaces(): Promise<FontFaceInfo[] | undefined>;
}

/**
 * Starts loading everything the styler needs from an origin.
 *
 * The three TileJSONs are fetched in parallel right away: they decide which styles are available,
 * and the first style can only be built once its TileJSON is in (VersaTiles servers publish relative
 * tile URLs, which MapLibre cannot resolve). A source that fails to load counts as unavailable.
 * Repeated requests for the same URL are served from `@versatiles/style`'s response cache.
 */
export function loadOrigin(origin: string): OriginSources {
	const load = (name: SourceName): Promise<LoadedTileJSON> =>
		fetchTileJSON(new URL(`/tiles/${name}/tiles.json`, origin).href).catch(() => null);

	let fontFaces: Promise<FontFaceInfo[] | undefined> | undefined;

	return {
		origin,
		osm: load('osm'),
		satellite: load('satellite'),
		elevation: load('elevation'),
		fontFaces: () => (fontFaces ??= fetchFontFaces({ base: origin }).catch(() => undefined)),
	};
}
