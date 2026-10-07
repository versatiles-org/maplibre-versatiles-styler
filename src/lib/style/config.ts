import type { StyleSpecification } from 'maplibre-gl';
import { isDarkPalette, osm, satellite, styleMetadata } from '@versatiles/style';
import { omt } from '@versatiles/style/omt';
import { protomaps } from '@versatiles/style/protomaps';
import type { CodeTarget } from '@versatiles/style';
import type {
	LayerGroupMap,
	OsmOptions,
	Palette,
	ResolvedColors,
	ResolvedOsm,
	ResolvedSatelliteOverlay,
	ResolvedSatellite,
	SatelliteOptions,
	TextGroupMap,
	TileJSONSpecification,
} from '@versatiles/style';
import type { VectorSchema } from './sources';

export const PALETTES: readonly Palette[] = osm.palettes;
export const DEFAULT_STYLE_KEY: StyleKey = 'colorful';

export type StyleKey = Palette | 'satellite';

/**
 * The options the vector panel edits: `osm`'s resolved options without `theme` (the style key) and
 * `urls` (derived from the sources when building). `features.landcover` is never edited — it is set
 * from the tileset when building.
 */
export type VectorState = Omit<ResolvedOsm, 'theme' | 'urls'>;

/** The options the satellite panel edits: `satellite`'s resolved options without `urls`. */
export type SatelliteState = Omit<ResolvedSatellite, 'urls'>;

export interface ThemeRow {
	/** The light theme's name, which names the row. */
	name: string;
	light?: Palette;
	dark?: Palette;
}

/**
 * The themes among `keys` as rows: each light theme with its `-dark` theme. A dark
 * theme without a light one, as `fnord`, has a row of its own and sits in the dark column.
 */
export function themeRows(keys: readonly StyleKey[]): ThemeRow[] {
	const rows: ThemeRow[] = [];
	for (const key of keys) {
		if (key === 'satellite') continue;
		const name = key.replace(/-dark$/, '');
		let row = rows.find((r) => r.name === name);
		if (!row) rows.push((row = { name }));
		row[isDarkPalette(key) ? 'dark' : 'light'] = key;
	}
	return rows;
}

/** The palettes of this project. Every other theme is a lookalike of another project's map. */
const OWN_THEMES: readonly string[] = ['colorful', 'natural', 'muted', 'gray', 'toner'];

export interface ThemeGroups {
	/** The project's own palettes, each light theme with its dark theme. */
	own: ThemeRow[];
	/** The lookalike themes, in the order the style lists them. */
	lookalikes: Palette[];
	satellite: boolean;
}

/** The style keys as the theme picker groups them. */
export function themeGroups(keys: readonly StyleKey[]): ThemeGroups {
	const isOwn = (name: string) => OWN_THEMES.includes(name);
	return {
		own: themeRows(keys).filter((row) => isOwn(row.name)),
		lookalikes: keys.filter(
			(key): key is Palette => key !== 'satellite' && !isOwn(key.replace(/-dark$/, ''))
		),
		satellite: keys.includes('satellite'),
	};
}

/** v5 style keys in links shared before v6, and the v6 theme closest to each. */
const V5_STYLE_KEYS: Record<string, Palette> = {
	eclipse: 'colorful-dark',
	graybeard: 'gray',
	neutrino: 'muted',
	shadow: 'gray-dark',
};

/** A valid style key for `key`, mapping v5 names to their themes; `undefined` if there is none. */
export function toStyleKey(key: string | null | undefined): StyleKey | undefined {
	if (key == null) return undefined;
	if (key === 'satellite' || (PALETTES as readonly string[]).includes(key)) return key as StyleKey;
	return Object.prototype.hasOwnProperty.call(V5_STYLE_KEYS, key) ? V5_STYLE_KEYS[key] : undefined;
}

/**
 * The colour behind the map: black for satellite and the dark themes, white for the light ones. It is
 * what shows around the globe, where MapLibre leaves the canvas transparent — a style cannot set it,
 * so it goes on the map container as CSS.
 */
export function isDarkStyle(styleKey: StyleKey): boolean {
	return styleKey === 'satellite' || isDarkPalette(styleKey);
}

export function containerBackground(styleKey: StyleKey): string {
	return isDarkStyle(styleKey) ? '#000000' : '#ffffff';
}

export function vectorDefaults(theme: Palette): VectorState {
	return toVectorState(osm.resolveOptions({ theme }));
}

export function satelliteDefaults(): SatelliteState {
	return toSatelliteState(satellite.resolveOptions());
}

/** The satellite overlay's defaults for a theme: its colours, plus the imagery treatment (bold fonts, …). */
export function overlayDefaults(theme: Palette): ResolvedSatelliteOverlay {
	return satellite.resolveOptions({ osmOverlay: { theme } }).osmOverlay as ResolvedSatelliteOverlay;
}

/**
 * The vector state for options stored in a URL hash. Options that do not resolve — v5 shapes from
 * an old link, or anything else invalid — fall back to the theme's defaults.
 */
export function vectorStateFromConfig(
	theme: Palette,
	config: Record<string, unknown> | null | undefined
): VectorState {
	try {
		return toVectorState(osm.resolveOptions({ ...(config as OsmOptions), theme }));
	} catch (error) {
		console.warn('Ignoring invalid style options:', error);
		return vectorDefaults(theme);
	}
}

export function satelliteStateFromConfig(
	config: Record<string, unknown> | null | undefined
): SatelliteState {
	try {
		return toSatelliteState(satellite.resolveOptions(config as SatelliteOptions));
	} catch (error) {
		console.warn('Ignoring invalid style options:', error);
		return satelliteDefaults();
	}
}

function toVectorState(resolved: ResolvedOsm): VectorState {
	const { theme: _theme, urls: _urls, ...state } = resolved;
	return { ...state, features: { ...state.features, landcover: false } };
}

function toSatelliteState(resolved: ResolvedSatellite): SatelliteState {
	const { urls: _urls, ...state } = resolved;
	return state;
}

/**
 * What differs between the vector schemas: the function that builds the style, and with it the layers
 * the style has. The options are the same for all of them, so the state, its defaults and the URL hash
 * are those of `osm` whatever the schema.
 */
interface VectorBuilder {
	/** The builder's name, as a style's metadata records it. It is also the key of its tiles in `urls`. */
	readonly name: 'osm' | 'omt' | 'protomaps';
	readonly style: {
		(options: never): unknown;
		readonly layerGroups: LayerGroupMap;
		readonly textGroups: TextGroupMap;
		readonly colorKeys: readonly string[];
		toCode(options: never, codeOptions?: { target?: CodeTarget }): string;
	};
	/** `features.landcover` for a tileset, or `undefined` where the schema has no such option. */
	landcover(tileJSON: TileJSONSpecification | undefined): boolean | undefined;
}

const VECTOR_BUILDERS: Record<VectorSchema, VectorBuilder> = {
	shortbread: {
		name: 'osm',
		style: osm,
		// An extension of the tileset, which not every server has.
		landcover: (tileJSON) => tileJSON !== undefined && osm.supportsLandcover(tileJSON),
	},
	openmaptiles: { name: 'omt', style: omt, landcover: () => undefined },
	// Part of the schema: every tileset has it.
	protomaps: { name: 'protomaps', style: protomaps, landcover: () => true },
};

/**
 * What the inspector and the panels need to name the layers of a style: its group maps and its colour
 * keys. The layers are those of the vector tiles' schema.
 */
export function inspectSources(
	styleKey: StyleKey,
	schema: VectorSchema = 'shortbread'
): {
	layerGroups: LayerGroupMap;
	textGroups: TextGroupMap;
	colorKeys: readonly string[];
} {
	const builder = styleKey === 'satellite' ? satellite : VECTOR_BUILDERS[schema].style;
	return {
		layerGroups: builder.layerGroups,
		textGroups: builder.textGroups,
		colorKeys: builder.colorKeys,
	};
}

/** Recolor with every effect at zero, which leaves a palette as it is. */
const NO_RECOLOR = osm.resolveOptions().recolor;

/**
 * The same options with the palette replaced by `colors` and recolor switched off. The styles built from
 * these say which key reaches which layer — see `colorIndex` in `inspect.ts`. Recolor goes because it
 * could make two palettes look alike (full desaturation, a full tint), and the key a color control
 * edits is the one before recolor anyway. A satellite style without its overlay has no palette to
 * probe, and comes back unchanged.
 */
export function probeVectorState(state: VectorState, colors: Record<string, string>): VectorState {
	return { ...state, colors: colors as ResolvedColors, recolor: NO_RECOLOR };
}

export function probeSatelliteState(
	state: SatelliteState,
	colors: Record<string, string>
): SatelliteState {
	if (!state.osmOverlay) return state;
	return {
		...state,
		osmOverlay: {
			...state.osmOverlay,
			colors: colors as ResolvedColors,
			recolor: NO_RECOLOR,
		},
	};
}

/** The TileJSONs a style is built from. A missing source is left out of the style. */
export interface StyleSources {
	vector?: TileJSONSpecification;
	/** The schema of the vector tiles. Default: `shortbread`. */
	schema?: VectorSchema;
	satellite?: TileJSONSpecification;
	elevation?: TileJSONSpecification;
}

/** The elevation features of a state, switched off where there is no elevation source. */
function elevationFeatures<T extends { terrain: unknown; hillshade: unknown }>(
	features: T,
	sources: StyleSources
): T {
	if (sources.elevation !== undefined) return features;
	return { ...features, terrain: false, hillshade: false };
}

function elevationUrl(sources: StyleSources): { elevation?: TileJSONSpecification } {
	return sources.elevation ? { elevation: sources.elevation } : {};
}

/**
 * The full options for a theme and state, as built with the assets of `assetsBase` and these sources:
 * those of `osm`, `omt` or `protomaps`, whichever builds the schema of the vector tiles.
 */
export function vectorOptions(
	theme: Palette,
	state: VectorState,
	assetsBase: string,
	sources: StyleSources
): Record<string, unknown> {
	const builder = VECTOR_BUILDERS[sources.schema ?? 'shortbread'];
	const { landcover: _landcover, ...features } = elevationFeatures(state.features, sources);
	const landcover = builder.landcover(sources.vector);
	return {
		...state,
		theme,
		features: landcover === undefined ? features : { ...features, landcover },
		urls: {
			base: assetsBase,
			...(sources.vector ? { [builder.name]: sources.vector } : {}),
			...elevationUrl(sources),
		},
	};
}

/** Whether the satellite style can draw its overlay from vector tiles of this schema. */
export function overlaySupported(schema: VectorSchema = 'shortbread'): boolean {
	return schema === 'shortbread';
}

/**
 * The full `satellite` options for a state, as built with the assets of `assetsBase` and these sources.
 * The overlay is drawn from Shortbread tiles only: `satellite` has no layers for another schema.
 */
export function satelliteOptions(
	state: SatelliteState,
	assetsBase: string,
	sources: StyleSources
): SatelliteOptions {
	const overlay = sources.vector !== undefined && overlaySupported(sources.schema);
	return {
		...state,
		osmOverlay: overlay ? state.osmOverlay : false,
		features: elevationFeatures(state.features, sources),
		urls: {
			base: assetsBase,
			...(sources.satellite ? { satellite: sources.satellite } : {}),
			...(overlay ? { osm: sources.vector } : {}),
			...elevationUrl(sources),
		},
	};
}

/**
 * A self-contained style: the TileJSONs are passed in already loaded, so `osm()` and `satellite()`
 * inline them and the style needs no `inlineSources`.
 */
export function buildVectorStyle(
	theme: Palette,
	state: VectorState,
	assetsBase: string,
	sources: StyleSources
): StyleSpecification {
	const builder = VECTOR_BUILDERS[sources.schema ?? 'shortbread'];
	return builder.style(
		vectorOptions(theme, state, assetsBase, sources) as never
	) as StyleSpecification;
}

export function buildSatelliteStyle(
	state: SatelliteState,
	assetsBase: string,
	sources: StyleSources
): StyleSpecification {
	return satellite(satelliteOptions(state, assetsBase, sources)) as StyleSpecification;
}

/**
 * The smallest options for the URL hash. Leaves out `theme` (the hash stores the style key),
 * `features.landcover` (detected from the tileset) and `urls` (the sources are not part of the hash).
 */
export function minimalConfig(
	styleKey: StyleKey,
	vectorState: VectorState,
	satelliteState: SatelliteState
): Record<string, unknown> {
	if (styleKey === 'satellite') {
		return satellite.minimizeOptions(satelliteState) as Record<string, unknown>;
	}
	const state = { ...vectorState, features: { ...vectorState.features, landcover: false } };
	const { theme: _theme, ...config } = osm.minimizeOptions({ ...state, theme: styleKey });
	return config as Record<string, unknown>;
}

/**
 * Whether a minimal config (see `minimalConfig`) sets anything under one of `paths`, e.g.
 * `['text', 'icon']`. It judges changes the way the URL hash stores them: a color in other letter
 * case, or a tint with no amount, is no change.
 */
export function configChanges(config: Record<string, unknown>, paths: readonly string[]): boolean {
	return configChangeCount(config, paths) > 0;
}

/**
 * How many settings a minimal config (see `minimalConfig`) changes under `paths`: its values, however
 * deeply nested — `{ text: { places: { scale: 1.5 } } }` is one change, and so is a group switched off
 * with `false`.
 */
export function configChangeCount(
	config: Record<string, unknown>,
	paths: readonly string[]
): number {
	const count = (node: unknown): number =>
		node === undefined
			? 0
			: node !== null && typeof node === 'object' && !Array.isArray(node)
				? Object.values(node).reduce<number>((sum, child) => sum + count(child), 0)
				: 1;
	return paths.reduce(
		(sum, path) =>
			sum +
			count(
				path
					.split('.')
					.reduce<unknown>(
						(node, key) =>
							node !== null && typeof node === 'object'
								? (node as Record<string, unknown>)[key]
								: undefined,
						config
					)
			),
		0
	);
}

/** The colors a theme card is drawn with. */
export interface ThemeSwatch {
	land: string;
	water: string;
	park: string;
	street: string;
	motorway: string;
}

/** The colors of a theme for its card in the theme picker. */
export function themeSwatch(theme: Palette): ThemeSwatch {
	const colors = osm.resolveOptions({ theme }).colors;
	return {
		land: colors.land,
		water: colors.water,
		park: colors.naturePark,
		street: colors.roadStreet,
		motorway: colors.roadMotorway,
	};
}

/**
 * Where a snippet for a style can run. Only `osm` and `satellite` are in the bundle a plain HTML page
 * loads, so tiles of another schema leave the npm form.
 */
export function codeTargets(
	styleKey: StyleKey,
	schema: VectorSchema = 'shortbread'
): readonly CodeTarget[] {
	return styleKey === 'satellite' || schema === 'shortbread' ? ['npm', 'browser'] : ['npm'];
}

/**
 * A runnable `@versatiles/style` snippet for the current style.
 *
 * `target` picks the form: an ES module for a project with a bundler, or the `<script>` tag and
 * `VersaTilesStyle` global that a plain HTML page needs.
 */
export function styleCode(
	styleKey: StyleKey,
	vectorState: VectorState,
	satelliteState: SatelliteState,
	assetsBase: string,
	sources: StyleSources,
	target: CodeTarget = 'npm'
): string {
	// `toCode` must see URLs only, never the loaded TileJSONs: the snippet loads its own.
	const urls = { base: assetsBase };
	if (styleKey === 'satellite') {
		return satellite.toCode(
			{ ...satelliteOptions(satelliteState, assetsBase, sources), urls },
			{ target }
		);
	}
	const builder = VECTOR_BUILDERS[sources.schema ?? 'shortbread'];
	return builder.style.toCode(
		{ ...vectorOptions(styleKey, vectorState, assetsBase, sources), urls } as never,
		{ target }
	);
}

/**
 * The style as it is exported: the built style, plus a record in its `metadata` of the options it came
 * from, so that importing it again restores exactly these settings.
 *
 * Without it, reading a style.json back means reconstructing the options from what the style draws —
 * what `@versatiles/style/migrate` does for foreign styles, and necessarily approximate. The options
 * written here are the minimal ones, the same few hundred bytes the URL hash carries.
 */
export function styleForExport(
	style: StyleSpecification,
	styleKey: StyleKey,
	minimal: Record<string, unknown>,
	schema: VectorSchema = 'shortbread'
): StyleSpecification {
	const options = styleKey === 'satellite' ? minimal : { ...minimal, theme: styleKey };
	return {
		...style,
		metadata: styleMetadata(
			styleKey === 'satellite' ? 'satellite' : VECTOR_BUILDERS[schema].name,
			options,
			style.metadata
		),
	} as StyleSpecification;
}
