import type { StyleKey } from './config';

/** The options that differ from a style's defaults, as `minimalConfig` gives them. */
export type StyleChanges = Record<string, unknown>;

/**
 * What the styler keeps of the changes while the base style is switched: the changes that mean the
 * same in every style, which follow from one style to the next, and per style the ones that do not,
 * which come back when that style does.
 */
export interface CarriedChanges {
	/** The changes every style shares, by where they are in the options of a vector style. */
	shared: StyleChanges;
	/** The other changes of each style that was left: its colours, and satellite's imagery. */
	own: Partial<Record<StyleKey, StyleChanges>>;
}

export function noCarriedChanges(): CarriedChanges {
	return { shared: {}, own: {} };
}

/**
 * The options every style shares, by where they are in the options of a vector style. The palettes
 * have the same defaults for all of them, and satellite has its own for the labels — so what is
 * carried is the changes, never the values. The colours are left out: they are values of one palette,
 * and so is the recolouring, which turns a dark palette light.
 */
const SHARED_PATHS: readonly (readonly string[])[] = [
	['features', 'terrain'],
	['features', 'hillshade'],
	['features', 'landcover'],
	['features', 'buildings'],
	['light'],
	['sky'],
	['projection'],
	['layers'],
	['text'],
	['icon'],
];

/** Where the satellite style keeps the options of its map overlay. */
const OVERLAY_GROUPS = ['layers', 'text', 'icon'];

/**
 * Where a style keeps a shared option, given its changes; `undefined` where it has no such option.
 * Satellite has no land cover and no buildings, and keeps the map's options in its overlay — which
 * it has none of while the overlay is off.
 */
function location(
	key: StyleKey,
	path: readonly string[],
	changes: StyleChanges
): readonly string[] | undefined {
	if (key !== 'satellite') return path;
	if (path[0] === 'features') {
		return path[1] === 'terrain' || path[1] === 'hillshade' ? path : undefined;
	}
	if (OVERLAY_GROUPS.includes(path[0])) {
		return changes.osmOverlay === false ? undefined : ['osmOverlay', ...path];
	}
	return path;
}

/** Records the changes of the style that is left, `key`, to carry them to the next one. */
export function leaveStyle(
	carried: CarriedChanges,
	key: StyleKey,
	changes: StyleChanges
): CarriedChanges {
	const shared = clone(carried.shared);
	const own = clone(changes);
	for (const path of SHARED_PATHS) {
		const at = location(key, path, changes);
		// An option the style does not have keeps what the styles before it set.
		if (!at) continue;
		// One it has is the style's to say, and it says the default by leaving it out.
		const value = getPath(changes, at);
		if (value === undefined) deletePath(shared, path);
		else setPath(shared, path, value);
		deletePath(own, at);
	}
	return { shared, own: { ...carried.own, [key]: own } };
}

/** The changes to enter the style `key` with: the shared ones, and its own from when it was left. */
export function enterStyle(carried: CarriedChanges, key: StyleKey): StyleChanges {
	const changes = clone(carried.own[key] ?? {});
	for (const path of SHARED_PATHS) {
		const at = location(key, path, changes);
		if (!at) continue;
		const value = getPath(carried.shared, path);
		if (value !== undefined) setPath(changes, at, clone(value));
	}
	return changes;
}

function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getPath(object: StyleChanges, path: readonly string[]): unknown {
	let value: unknown = object;
	for (const key of path) {
		if (!isRecord(value)) return undefined;
		value = value[key];
	}
	return value;
}

function setPath(object: StyleChanges, path: readonly string[], value: unknown): void {
	let parent = object;
	for (const key of path.slice(0, -1)) {
		if (!isRecord(parent[key])) parent[key] = {};
		parent = parent[key] as StyleChanges;
	}
	parent[path[path.length - 1]] = value;
}

/** Removes the option at `path`, and the groups it leaves empty, which say nothing. */
function deletePath(object: StyleChanges, path: readonly string[]): void {
	const [key, ...rest] = path;
	if (rest.length === 0) {
		delete object[key];
		return;
	}
	const child = object[key];
	if (!isRecord(child)) return;
	deletePath(child, rest);
	if (Object.keys(child).length === 0) delete object[key];
}
