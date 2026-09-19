import type { LayerGroupMap, ResolvedLayerGroups } from '@versatiles/style';

/** A layer group's setting: hidden (`false`), shown (`true`), or shown with an opacity in (0, 1). */
export type LayerValue = boolean | number;

export interface LayerNode {
	key: string;
	/** Keys from the root of `layers` to this group. */
	path: string[];
	label: string;
	/** Empty for a leaf group. */
	children: LayerNode[];
}

type Tree = { [key: string]: LayerValue | Tree };

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
			const children =
				Array.isArray(group) || typeof child !== 'object'
					? []
					: nodesOf(group, child, [...path, key]);
			return { key, path: [...path, key], label: labelOf(key), children };
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

/** The setting of a group, or `undefined` when the groups below it differ. */
export function layerValue(tree: ResolvedLayerGroups, node: LayerNode): LayerValue | undefined {
	const values = leaves(node).map((leaf) => read(tree, leaf.path) as LayerValue);
	return values.every((value) => value === values[0]) ? values[0] : undefined;
}

/** Sets every group below `node` to `value`, in place. */
export function setLayerValue(tree: ResolvedLayerGroups, node: LayerNode, value: LayerValue): void {
	for (const leaf of leaves(node)) {
		const parent = read(tree, leaf.path.slice(0, -1)) as Tree;
		parent[leaf.key] = value;
	}
}

/** Whether any group below `node` differs from `defaults`. */
export function layerModified(
	tree: ResolvedLayerGroups,
	defaults: ResolvedLayerGroups,
	node: LayerNode
): boolean {
	return leaves(node).some((leaf) => read(tree, leaf.path) !== read(defaults, leaf.path));
}

/** Sets every group below `node` back to `defaults`, in place. */
export function resetLayer(
	tree: ResolvedLayerGroups,
	defaults: ResolvedLayerGroups,
	node: LayerNode
): void {
	for (const leaf of leaves(node)) {
		const parent = read(tree, leaf.path.slice(0, -1)) as Tree;
		parent[leaf.key] = read(defaults, leaf.path) as LayerValue;
	}
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
