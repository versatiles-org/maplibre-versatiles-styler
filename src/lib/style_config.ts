import type { StyleSpecification } from 'maplibre-gl';
import { osm, satellite } from '@versatiles/style';
import type {
	OsmOptions,
	Palette,
	ResolvedOsm,
	ResolvedOsmOverlay,
	ResolvedSatellite,
	SatelliteOptions,
	TileJSONSpecification,
} from '@versatiles/style';

export const PALETTES: readonly Palette[] = osm.palettes;
export const DEFAULT_STYLE_KEY: StyleKey = 'colorful';

export type StyleKey = Palette | 'satellite';

/**
 * The options the vector panel edits: `osm`'s resolved options without `theme` (the style key) and
 * `urls` (derived from the origin when building). `features.landcover` is never edited — it is set
 * from the tileset when building.
 */
export type VectorState = Omit<ResolvedOsm, 'theme' | 'urls'>;

/** The options the satellite panel edits: `satellite`'s resolved options without `urls`. */
export type SatelliteState = Omit<ResolvedSatellite, 'urls'>;

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

export function vectorDefaults(theme: Palette): VectorState {
	return toVectorState(osm.resolveOptions({ theme }));
}

export function satelliteDefaults(): SatelliteState {
	return toSatelliteState(satellite.resolveOptions());
}

/** The satellite overlay's defaults for a theme: its colours, plus the imagery treatment (bold fonts, …). */
export function overlayDefaults(theme: Palette): ResolvedOsmOverlay {
	return satellite.resolveOptions({ osmOverlay: { theme } }).osmOverlay as ResolvedOsmOverlay;
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

/** The TileJSONs a style is built from. A missing source is left out of the style. */
export interface StyleSources {
	osm?: TileJSONSpecification;
	satellite?: TileJSONSpecification;
	elevation?: TileJSONSpecification;
}

/** The full `osm` options for a theme and state, as built on `origin` with these sources. */
export function vectorOptions(
	theme: Palette,
	state: VectorState,
	origin: string,
	sources: StyleSources
): OsmOptions {
	const elevation = sources.elevation !== undefined;
	return {
		...state,
		theme,
		features: {
			...state.features,
			terrain: elevation ? state.features.terrain : false,
			hillshade: elevation ? state.features.hillshade : false,
			landcover: sources.osm !== undefined && osm.supportsLandcover(sources.osm),
		},
		urls: { base: origin, ...sourceUrls(sources, ['osm', 'elevation']) },
	};
}

/** The full `satellite` options for a state, as built on `origin` with these sources. */
export function satelliteOptions(
	state: SatelliteState,
	origin: string,
	sources: StyleSources
): SatelliteOptions {
	const elevation = sources.elevation !== undefined;
	return {
		...state,
		osmOverlay: sources.osm === undefined ? false : state.osmOverlay,
		features: {
			...state.features,
			terrain: elevation ? state.features.terrain : false,
			hillshade: elevation ? state.features.hillshade : false,
		},
		urls: { base: origin, ...sourceUrls(sources, ['satellite', 'osm', 'elevation']) },
	};
}

function sourceUrls(sources: StyleSources, names: (keyof StyleSources)[]): StyleSources {
	return Object.fromEntries(
		names.filter((name) => sources[name]).map((name) => [name, sources[name]])
	);
}

/**
 * A self-contained style: the TileJSONs are passed in already loaded, so `osm()` and `satellite()`
 * inline them and the style needs no `inlineSources`.
 */
export function buildVectorStyle(
	theme: Palette,
	state: VectorState,
	origin: string,
	sources: StyleSources
): StyleSpecification {
	return osm(vectorOptions(theme, state, origin, sources)) as StyleSpecification;
}

export function buildSatelliteStyle(
	state: SatelliteState,
	origin: string,
	sources: StyleSources
): StyleSpecification {
	return satellite(satelliteOptions(state, origin, sources)) as StyleSpecification;
}

/**
 * The smallest options for the URL hash. Leaves out `theme` (the hash stores the style key),
 * `features.landcover` (detected from the tileset) and `urls` (the origin is not part of the hash).
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

/** A runnable `@versatiles/style` snippet for the current style. */
export function styleCode(
	styleKey: StyleKey,
	vectorState: VectorState,
	satelliteState: SatelliteState,
	origin: string,
	sources: StyleSources
): string {
	// `toCode` must see URLs only, never the loaded TileJSONs: the snippet loads its own.
	const urls = { base: origin };
	if (styleKey === 'satellite') {
		return satellite.toCode({ ...satelliteOptions(satelliteState, origin, sources), urls });
	}
	return osm.toCode({ ...vectorOptions(styleKey, vectorState, origin, sources), urls });
}
