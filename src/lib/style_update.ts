import type { StyleKey } from './style_config';

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
