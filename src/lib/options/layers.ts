import type { LayerGroupMap, ResolvedLayerGroups, ResolvedLineStyle } from '@versatiles/style';

/** A layer group's setting: hidden (`false`), shown (`true`), or shown with an opacity in (0, 1). */
export type LayerValue = boolean | number;

/** How a line group is dashed: `true` is the style's own pattern, `false` solid, a list a custom pattern. */
export type Dash = ResolvedLineStyle['dashed'];

export type DashMode = 'solid' | 'dashed' | 'custom';

/** What a leaf of the resolved tree holds: a line style for borders and paths, a plain value otherwise. */
type Leaf = LayerValue | ResolvedLineStyle;

export interface LayerNode {
	key: string;
	/** Keys from the root of `layers` to this group. */
	path: string[];
	label: string;
	/** Empty for a leaf group. */
	children: LayerNode[];
	/** Whether the group is a line, with a dash and a width next to its opacity. */
	line: boolean;
}

type Tree = { [key: string]: Leaf | Tree };

/**
 * `icons` is left out: it is only a fallback for `pois`, `markings` and `transit.stops`, which the
 * resolved tree always sets, so it changes nothing there. Those three are shown on their own.
 */
const ALIASES = new Set(['icons']);

const LABELS: Record<string, string> = {
	pois: 'POIs',
	country: 'Countries',
	state: 'States',
	footway: 'Footways',
	aerialways: 'Aerial ways',
	addresses: 'House numbers',
	statecapitals: 'State capitals',
	refs: 'Route numbers',
	exits: 'Motorway exits',
	names: 'Street names',
};

/**
 * The layer groups as the section shows them, in the order of the resolved tree. Which groups exist
 * comes from `layerGroups` — `osm.layerGroups`, or `satellite.layerGroups`, which leaves out what the
 * overlay does not draw.
 */
export function layerNodes(layerGroups: LayerGroupMap, defaults: ResolvedLayerGroups): LayerNode[] {
	return nodesOf(layerGroups, defaults as unknown as Tree, []);
}

function nodesOf(groups: LayerGroupMap, defaults: Tree, path: string[]): LayerNode[] {
	return Object.keys(defaults)
		.filter((key) => groups[key] !== undefined && !(path.length === 0 && ALIASES.has(key)))
		.map((key) => {
			const group = groups[key];
			const child = defaults[key];
			const isLeaf = Array.isArray(group) || typeof child !== 'object';
			const children = isLeaf ? [] : nodesOf(group, child as Tree, [...path, key]);
			return {
				key,
				path: [...path, key],
				label: labelOf(key),
				children,
				line: isLeaf && isLine(child),
			};
		});
}

function labelOf(key: string): string {
	return LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

/** The node at `path`, e.g. `['water','lakes']`, or `undefined` when the tree has no such group. */
export function findLayerNode(
	nodes: readonly LayerNode[],
	path: readonly string[]
): LayerNode | undefined {
	const node = nodes.find((candidate) => candidate.key === path[0]);
	if (!node || path.length === 1) return node;
	return findLayerNode(node.children, path.slice(1));
}

function leaves(node: LayerNode): LayerNode[] {
	return node.children.length === 0 ? [node] : node.children.flatMap(leaves);
}

function read(tree: ResolvedLayerGroups, path: string[]): unknown {
	return path.reduce<unknown>((node, key) => (node as Tree | undefined)?.[key], tree);
}

function isLine(leaf: unknown): leaf is ResolvedLineStyle {
	return typeof leaf === 'object' && leaf !== null && 'opacity' in leaf;
}

function sameLeaf(a: Leaf, b: Leaf): boolean {
	if (!isLine(a) || !isLine(b)) return a === b;
	return a.opacity === b.opacity && a.width === b.width && sameDash(a.dashed, b.dashed);
}

function copyLeaf(leaf: Leaf): Leaf {
	return isLine(leaf) ? { ...leaf, dashed: copyDash(leaf.dashed) } : leaf;
}

/** The setting of a group, or `undefined` when the groups below it differ. A line's is its opacity. */
export function layerValue(tree: ResolvedLayerGroups, node: LayerNode): LayerValue | undefined {
	const values = leaves(node).map((leaf) => {
		const value = read(tree, leaf.path) as Leaf;
		return isLine(value) ? value.opacity : value;
	});
	return values.every((value) => value === values[0]) ? values[0] : undefined;
}

/** Sets every group below `node` to `value`, in place. A line keeps its dash and its width. */
export function setLayerValue(tree: ResolvedLayerGroups, node: LayerNode, value: LayerValue): void {
	for (const leaf of leaves(node)) {
		const parent = read(tree, leaf.path.slice(0, -1)) as Tree;
		const current = parent[leaf.key];
		if (isLine(current)) current.opacity = value;
		else parent[leaf.key] = value;
	}
}

/** Whether any group below `node` differs from `defaults`. */
export function layerModified(
	tree: ResolvedLayerGroups,
	defaults: ResolvedLayerGroups,
	node: LayerNode
): boolean {
	return leaves(node).some(
		(leaf) => !sameLeaf(read(tree, leaf.path) as Leaf, read(defaults, leaf.path) as Leaf)
	);
}

/** Sets every group below `node` back to `defaults`, in place. */
export function resetLayer(
	tree: ResolvedLayerGroups,
	defaults: ResolvedLayerGroups,
	node: LayerNode
): void {
	for (const leaf of leaves(node)) {
		const parent = read(tree, leaf.path.slice(0, -1)) as Tree;
		parent[leaf.key] = copyLeaf(read(defaults, leaf.path) as Leaf);
	}
}

/** The line style of a line group — the object in the tree, to edit in place. */
export function lineStyle(
	tree: ResolvedLayerGroups,
	node: LayerNode
): ResolvedLineStyle | undefined {
	const leaf = read(tree, node.path);
	return node.line && isLine(leaf) ? leaf : undefined;
}

/** The pattern a line gets when it is switched to a custom one and its theme has none of its own. */
const CUSTOM_DASH = [2, 1];

export function dashMode(dashed: Dash): DashMode {
	if (dashed === false) return 'solid';
	return dashed === true ? 'dashed' : 'custom';
}

/** The dash for `mode`. A custom one starts from the default's pattern, which also makes it the reset. */
export function dashOfMode(mode: DashMode, byDefault: Dash): Dash {
	if (mode === 'custom') return Array.isArray(byDefault) ? [...byDefault] : [...CUSTOM_DASH];
	return mode === 'dashed';
}

export function sameDash(a: Dash, b: Dash): boolean {
	if (!Array.isArray(a) || !Array.isArray(b)) return a === b;
	return a.length === b.length && a.every((length, index) => length === b[index]);
}

export function copyDash(dashed: Dash): Dash {
	return Array.isArray(dashed) ? [...dashed] : dashed;
}

/** A pattern as it is typed: the lengths of dashes and gaps in turn, e.g. `3 1 1 1`. */
export function formatDashPattern(pattern: readonly number[]): string {
	return pattern.join(' ');
}

/**
 * The pattern for a typed text, with spaces or commas between the lengths. `undefined` unless it is
 * one MapLibre can draw: an even number of lengths, none negative, not all zero.
 */
export function parseDashPattern(text: string): number[] | undefined {
	const parts = text.split(/[\s,;]+/).filter((part) => part !== '');
	const pattern = parts.map(Number);
	if (pattern.length === 0 || pattern.length % 2 !== 0) return undefined;
	if (pattern.some((length) => !Number.isFinite(length) || length < 0)) return undefined;
	return pattern.some((length) => length > 0) ? pattern : undefined;
}

/** An opacity as a layer value: 0 hides the group, 1 shows it fully, anything between dims it. */
export function opacityToValue(opacity: number): LayerValue {
	if (opacity <= 0) return false;
	if (opacity >= 1) return true;
	return opacity;
}

export function valueToOpacity(value: LayerValue): number {
	if (value === true) return 1;
	if (value === false) return 0;
	return value;
}
