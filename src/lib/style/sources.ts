import { fetchFontFaces, fetchTileJSON, guessSchema, osm } from '@versatiles/style';
import type { FontFaceInfo, TileJSONSpecification } from '@versatiles/style';
import { isPMTilesUrl, loadArchiveTileJSON, pmtilesUrl } from './pmtiles';

export type SourceName = 'vector' | 'satellite' | 'elevation';

/**
 * Where a style gets its tiles and assets from. The tile sources are TileJSON URLs, or the `pmtiles://`
 * URLs of PMTiles archives; one that is left out is not available. `assets` is the base URL of the server
 * the glyphs, the sprites and the font list come from, which need not be the one serving the tiles.
 */
export interface SourceConfig {
	vector?: string;
	/** The schema of the vector tiles, for tiles whose layers do not tell it. */
	schema?: VectorSchema;
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
export type Provider = 'versatiles' | 'openfreemap' | 'protomaps' | 'custom';

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

/**
 * The provider whose sources a config is: a VersaTiles server, or the vector tiles of OpenFreeMap or of a
 * Protomaps archive with nothing but elevation added. Anything else is a custom set of sources.
 */
export function providerOf(config: SourceConfig): Provider {
	if (same(config, versatilesSources(config.assets))) return 'versatiles';
	const { vector, elevation: _elevation, ...rest } = config;
	if (vector !== undefined && same(rest, { assets: VERSATILES_ASSETS })) {
		if (vector === OPENFREEMAP_TILES) return 'openfreemap';
		if (isPMTilesUrl(vector)) return 'protomaps';
	}
	return 'custom';
}

function same(a: unknown, b: unknown): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * A source address as someone types it: the address of a TileJSON, or of a PMTiles archive, which is
 * told by its file name and gets the `pmtiles://` scheme. Empty text is no source.
 */
export function sourceUrl(text: string): string | undefined {
	const url = text.trim();
	if (url === '') return undefined;
	return /\.pmtiles([?#]|$)/i.test(url) ? pmtilesUrl(url) : url;
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

/** The addresses of tile sources, by what they are used for. */
export type SourceUrls = Partial<Record<SourceName, string>>;

/**
 * The sources of a VersaTiles server: its tilesets `osm`, `satellite` and `elevation`, and its assets.
 * A server that has a tileset under another name says so in `tilesets`, by the address of its TileJSON,
 * which may be relative to the origin. An origin that is no URL has no tiles.
 */
export function versatilesSources(origin: string, tilesets: SourceUrls = {}): SourceConfig {
	const tileJSON = (name: SourceName, tileset: string) => {
		const url = tilesets[name] ?? `/tiles/${tileset}/tiles.json`;
		return isPMTilesUrl(url) ? url : new URL(url, origin).href;
	};
	try {
		new URL(origin);
	} catch {
		return { assets: origin };
	}
	return {
		vector: tileJSON('vector', 'osm'),
		satellite: tileJSON('satellite', 'satellite'),
		elevation: tileJSON('elevation', 'elevation'),
		assets: origin,
	};
}

/**
 * Starts loading everything the styler needs from its sources.
 *
 * The TileJSONs are fetched in parallel right away: they decide which styles are available, and the
 * first style can only be built once its TileJSON is in (VersaTiles servers publish relative tile URLs,
 * which MapLibre cannot resolve). A source that fails to load counts as unavailable, and so does one
 * that holds the wrong kind of tiles: imagery where vector tiles belong, or the other way round.
 * Repeated requests for the same URL are served from `@versatiles/style`'s response cache.
 */
export function loadSources(config: SourceConfig): LoadedSources {
	const load = (name: SourceName): Promise<LoadedTileJSON> => {
		const url = config[name];
		if (url === undefined) return Promise.resolve(null);
		return (isPMTilesUrl(url) ? loadArchiveTileJSON(url) : fetchTileJSON(url))
			.then((tileJSON) =>
				'vector_layers' in tileJSON === (name === 'vector')
					? ({ ...TILEJSON_DEFAULTS[url], ...tileJSON } as TileJSONSpecification)
					: null
			)
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

/** What a row of the tile sources says about its source. */
export interface SourceStatus {
	state: 'none' | 'loading' | 'ok' | 'error';
	text: string;
}

const SCHEMA_LABELS: Record<VectorSchema, string> = {
	shortbread: 'Shortbread',
	openmaptiles: 'OpenMapTiles',
	protomaps: 'Protomaps',
};

/** The schemas as options of a select. */
export const SCHEMA_OPTIONS = Object.entries(SCHEMA_LABELS).map(([value, label]) => ({
	value,
	label,
}));

/**
 * The state of a source, from its address and what loading it gave: `undefined` while it loads, `null`
 * when it failed. A loaded source is described by its zoom range, and vector tiles by their schema
 * and languages as well.
 */
export function sourceStatus(
	name: SourceName,
	url: string | undefined,
	tileJSON: LoadedTileJSON | undefined,
	schema?: VectorSchema
): SourceStatus {
	if (url === undefined) return { state: 'none', text: 'None' };
	if (tileJSON === undefined) return { state: 'loading', text: 'Loading…' };
	if (tileJSON === null) {
		const kind = name === 'vector' ? 'vector' : name === 'satellite' ? 'image' : 'elevation';
		return { state: 'error', text: `No ${kind} tiles could be loaded from this address.` };
	}
	const parts: string[] = [];
	if (name === 'vector') {
		const known = schema ?? vectorSchema(tileJSON);
		parts.push(known ? SCHEMA_LABELS[known] : 'Unknown schema');
	}
	if (tileJSON.maxzoom !== undefined) {
		parts.push(`zoom ${tileJSON.minzoom ?? 0}–${tileJSON.maxzoom}`);
	}
	if (name === 'vector') {
		const languages = osm.languages(tileJSON).length;
		if (languages > 0) parts.push(`${languages} language${languages === 1 ? '' : 's'}`);
	}
	return { state: 'ok', text: parts.join(' · ') || 'Available' };
}

/** The sources in use and the provider they were chosen as. */
export interface ChosenSources {
	provider: Provider;
	config: SourceConfig;
}

const PROVIDER_NAMES: readonly Provider[] = ['versatiles', 'openfreemap', 'protomaps', 'custom'];

/**
 * The chosen sources as plain data, for a link and for the record in an exported style. A VersaTiles
 * server is its origin alone: its tilesets follow from it.
 */
export function serializeSources({ provider, config }: ChosenSources): Record<string, unknown> {
	if (provider === 'versatiles') return { provider, origin: config.assets };
	return { provider, ...config };
}

/**
 * The chosen sources from data that may come from anywhere: a link, a file. `undefined` for anything
 * that is not a set of sources.
 */
export function parseSources(value: unknown): ChosenSources | undefined {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
	const data = value as Record<string, unknown>;
	const text = (key: string) => (typeof data[key] === 'string' ? (data[key] as string) : undefined);

	if (data.provider === 'versatiles') {
		const origin = text('origin');
		return origin ? { provider: 'versatiles', config: versatilesSources(origin) } : undefined;
	}

	const assets = text('assets');
	if (!assets) return undefined;
	const config: SourceConfig = { assets };
	for (const name of ['vector', 'satellite', 'elevation'] as const) {
		const url = text(name);
		if (url) config[name] = url;
	}
	const schema = text('schema');
	if (schema && schema in SCHEMA_LABELS) config.schema = schema as VectorSchema;
	const provider = PROVIDER_NAMES.find((name) => name === data.provider);
	return { provider: provider ?? providerOf(config), config };
}
