import type { StyleSpecification } from 'maplibre-gl';
import type { StyleKey } from './config';
import type { SourceConfig } from './sources';

/** What a style on the map was built from. */
export interface RenderedStyle {
	styleKey: StyleKey;
	sources: SourceConfig;
	/** The options the style was built from: a `VectorState` or a `SatelliteState`. */
	options: object;
}

/**
 * Option paths whose change replaces the style with a full reload instead of MapLibre's style diff.
 * Everything else goes through the diff, which keeps the loaded tiles and repaints in place.
 *
 * Add a path here when MapLibre cannot apply a change of it as a diff, and say why.
 */
export const FULL_RELOAD_PATHS: readonly string[] = [
	// MapLibre (5.24, 6.9) applies the diff's `setTerrain` with the style as `this`, which throws; it then
	// rebuilds the style itself, with a console warning. Reloading directly is the same without the detour.
	'features.terrain',
];

/**
 * Whether the next style can be applied with MapLibre's style diff (`setStyle(style, { diff: true })`),
 * or has to replace the current one with a full reload.
 */
export function canDiff(previous: RenderedStyle | undefined, next: RenderedStyle): boolean {
	// The first style replaces whatever the host page had set; there is nothing of ours to diff against.
	if (previous === undefined) return false;
	// Other sources change the source, glyph and sprite URLs.
	if (!same(previous.sources, next.sources)) return false;
	return FULL_RELOAD_PATHS.every((path) =>
		same(valueAt(previous.options, path), valueAt(next.options, path))
	);
}

function valueAt(object: object, path: string): unknown {
	return path
		.split('.')
		.reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], object);
}

function same(a: unknown, b: unknown): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

/** Whether `version` (`map.version`) is at least `major.minor`. An unreadable version counts as current. */
function isAtLeast(version: string | undefined, major: number, minor: number): boolean {
	const match = /^(\d+)\.(\d+)/.exec(version ?? '');
	if (!match) return true;
	const [mapMajor, mapMinor] = [Number(match[1]), Number(match[2])];
	return mapMajor > major || (mapMajor === major && mapMinor >= minor);
}

/**
 * The style without what the MapLibre GL JS of the page does not know yet, so that the styler works
 * from 5.0.0 on.
 *
 * Before 5.5.0 the hillshade's light has a fixed altitude: MapLibre throws on
 * `hillshade-illumination-altitude` while it builds the layer, and the style never finishes loading.
 * `@versatiles/style` writes the property when a sun is set. Without it, the sun turns the hillshade's
 * light but does not raise or lower it.
 */
function styleForVersion(
	style: StyleSpecification,
	version: string | undefined
): StyleSpecification {
	if (isAtLeast(version, 5, 5)) return style;
	return {
		...style,
		layers: style.layers.map((layer) => {
			if (layer.type !== 'hillshade' || !layer.paint) return layer;
			const paint: Record<string, unknown> = { ...layer.paint };
			delete paint['hillshade-illumination-altitude'];
			return { ...layer, paint };
		}),
	};
}

/**
 * The style as the styler puts it on the map, tuned for editing and for the MapLibre GL JS of the page
 * (`mapVersion`, see `styleForVersion`). Downloads and copied code use the style as built.
 *
 * `transition: { duration: 0 }`: MapLibre animates paint changes over 300 ms by default, so every color,
 * recolor and opacity edit would take that long to settle. Without the animation, the first frame after
 * an edit is final. MapLibre reads the transition from the current style, so this also applies to diffs.
 */
export function styleForEditing(
	style: StyleSpecification,
	mapVersion?: string
): StyleSpecification {
	return { ...styleForVersion(style, mapVersion), transition: { duration: 0, delay: 0 } };
}

/**
 * The options for `map.setStyle()`.
 *
 * `validate: false`: the styles come from `@versatiles/style`, whose tests validate them against the
 * style spec. Skipping MapLibre's validation saves about 5 ms per edit.
 *
 * `styleLoaded`: MapLibre can only diff against a style it has finished loading. Asked to diff against
 * one that is still loading, it logs "Unable to perform style diff" and rebuilds the style from scratch
 * — so an edit while the previous style loads says so and reloads without the warning.
 */
export function setStyleOptions(
	previous: RenderedStyle | undefined,
	next: RenderedStyle,
	styleLoaded = true
): { diff: boolean; validate: boolean } {
	return { diff: styleLoaded && canDiff(previous, next), validate: false };
}
