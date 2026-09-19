import type { StyleSpecification } from 'maplibre-gl';
import type { StyleKey } from './config';

/** What a style on the map was built from. */
export interface RenderedStyle {
	styleKey: StyleKey;
	origin: string;
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
	// A new origin changes every source, glyph and sprite URL.
	if (previous.origin !== next.origin) return false;
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

/**
 * The style as the styler puts it on the map, tuned for editing. Downloads and copied code use the style
 * as built.
 *
 * `transition: { duration: 0 }`: MapLibre animates paint changes over 300 ms by default, so every color,
 * recolor and opacity edit would take that long to settle. Without the animation, the first frame after
 * an edit is final. MapLibre reads the transition from the current style, so this also applies to diffs.
 */
export function styleForEditing(style: StyleSpecification): StyleSpecification {
	return { ...style, transition: { duration: 0, delay: 0 } };
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
