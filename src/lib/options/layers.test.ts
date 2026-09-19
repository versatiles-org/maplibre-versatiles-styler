import { describe, it, expect } from 'vitest';
import { osm, satellite } from '@versatiles/style';
import {
	layerNodes,
	layerValue,
	setLayerValue,
	layerModified,
	resetLayer,
	opacityToValue,
	valueToOpacity,
	type LayerNode,
} from './layers';

const defaults = () => osm.resolveOptions().layers;

function find(nodes: LayerNode[], path: string): LayerNode {
	let list = nodes;
	let node: LayerNode | undefined;
	for (const key of path.split('.')) {
		node = list.find((n) => n.key === key);
		if (!node) throw new Error(`no node ${path}`);
		list = node.children;
	}
	return node!;
}

function leafPaths(nodes: LayerNode[]): string[] {
	return nodes.flatMap((n) =>
		n.children.length === 0 ? [n.path.join('.')] : leafPaths(n.children)
	);
}

describe('layerNodes', () => {
	it('lists the osm groups in the order of the resolved tree, without the icons alias', () => {
		const nodes = layerNodes(osm.layerGroups, defaults());
		expect(nodes.map((n) => n.key)).toEqual([
			'land',
			'water',
			'roads',
			'transit',
			'buildings',
			'sites',
			'airport',
			'pois',
			'boundaries',
			'markings',
			'labels',
		]);
		expect(find(nodes, 'roads.streets').children.map((n) => n.key)).toEqual([
			'residential',
			'service',
			'pedestrian',
			'track',
			'bus',
		]);
		expect(find(nodes, 'pois').label).toBe('POIs');
	});

	it('covers every group osm.layerGroups lists, except icons', () => {
		const expected: string[] = [];
		const walk = (node: object, path: string[]) => {
			for (const [key, child] of Object.entries(node)) {
				if (Array.isArray(child)) expected.push([...path, key].join('.'));
				else walk(child, [...path, key]);
			}
		};
		walk(osm.layerGroups, []);
		const paths = leafPaths(layerNodes(osm.layerGroups, defaults()));
		expect(paths.sort()).toEqual(expected.filter((p) => p !== 'icons').sort());
	});

	it('follows satellite.layerGroups: no groups the overlay does not draw', () => {
		const overlay = satellite.resolveOptions().osmOverlay;
		if (!overlay) throw new Error('overlay expected');
		const keys = layerNodes(satellite.layerGroups, overlay.layers).map((n) => n.key);
		expect(keys).not.toContain('land');
		expect(keys).not.toContain('water');
		expect(keys).not.toContain('buildings');
		expect(keys).toContain('roads');
		expect(keys).toContain('labels');
	});
});

describe('values', () => {
	it('reads a leaf, a uniform branch and a mixed branch', () => {
		const tree = defaults();
		const nodes = layerNodes(osm.layerGroups, tree);
		expect(layerValue(tree, find(nodes, 'buildings'))).toBe(true);
		expect(layerValue(tree, find(nodes, 'roads'))).toBe(true);
		tree.roads.streets.track = false;
		expect(layerValue(tree, find(nodes, 'roads'))).toBeUndefined();
		expect(layerValue(tree, find(nodes, 'roads.motorways'))).toBe(true);
	});

	it('sets a branch, and tracks what differs from the defaults', () => {
		const tree = defaults();
		const nodes = layerNodes(osm.layerGroups, tree);
		const labels = find(nodes, 'labels');
		setLayerValue(tree, labels, false);
		expect(tree.labels.water.rivers).toBe(false);
		expect(tree.labels.addresses).toBe(false);
		expect(layerModified(tree, defaults(), labels)).toBe(true);
		expect(layerModified(tree, defaults(), find(nodes, 'roads'))).toBe(false);
		expect(osm.minimizeOptions({ layers: tree })).toEqual({ layers: { labels: false } });

		resetLayer(tree, defaults(), labels);
		expect(tree).toEqual(defaults());
	});

	it('converts between opacity and layer values', () => {
		expect(opacityToValue(0)).toBe(false);
		expect(opacityToValue(0.5)).toBe(0.5);
		expect(opacityToValue(1)).toBe(true);
		expect(valueToOpacity(false)).toBe(0);
		expect(valueToOpacity(0.25)).toBe(0.25);
		expect(valueToOpacity(true)).toBe(1);
	});
});
