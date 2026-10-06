import { describe, it, expect } from 'vitest';
import { osm, satellite } from '@versatiles/style';
import {
	layerNodes,
	layerValue,
	setLayerValue,
	layerModified,
	resetLayer,
	lineStyle,
	dashMode,
	dashOfMode,
	sameDash,
	formatDashPattern,
	parseDashPattern,
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

	it('marks the six line groups, and no other', () => {
		const nodes = layerNodes(osm.layerGroups, defaults());
		const lines = (list: LayerNode[]): string[] =>
			list.flatMap((n) => (n.line ? [n.path.join('.')] : lines(n.children)));
		expect(lines(nodes)).toEqual([
			'roads.paths',
			'roads.footway',
			'roads.steps',
			'boundaries.country',
			'boundaries.state',
			'boundaries.disputed',
		]);
		expect(find(nodes, 'boundaries').line).toBe(false);
		expect(find(nodes, 'boundaries.disputed').label).toBe('Disputed');
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

	it('reads the opacity of a line group, and a branch of lines as uniform', () => {
		const tree = defaults();
		const nodes = layerNodes(osm.layerGroups, tree);
		expect(layerValue(tree, find(nodes, 'boundaries.state'))).toBe(true);
		expect(layerValue(tree, find(nodes, 'boundaries'))).toBe(true);
		expect(layerModified(tree, defaults(), find(nodes, 'boundaries'))).toBe(false);
		tree.boundaries.state.opacity = 0.5;
		expect(layerValue(tree, find(nodes, 'boundaries.state'))).toBe(0.5);
		expect(layerValue(tree, find(nodes, 'boundaries'))).toBeUndefined();
	});

	it('keeps the dash and the width of a line group when its opacity is set', () => {
		const tree = defaults();
		const nodes = layerNodes(osm.layerGroups, tree);
		tree.boundaries.state.dashed = [4, 2];
		tree.boundaries.state.width = 2;
		setLayerValue(tree, find(nodes, 'boundaries'), 0.5);
		expect(tree.boundaries.state).toEqual({ opacity: 0.5, dashed: [4, 2], width: 2 });
		expect(tree.boundaries.country).toEqual({ opacity: 0.5, dashed: false, width: 1 });
		expect(osm.minimizeOptions({ layers: tree })).toEqual({
			layers: {
				boundaries: {
					country: 0.5,
					state: { opacity: 0.5, dashed: [4, 2], width: 2 },
					disputed: 0.5,
				},
			},
		});
	});

	it('counts a changed dash or width as modified, and resets to a copy of the defaults', () => {
		const tree = defaults();
		const usual = defaults();
		const nodes = layerNodes(osm.layerGroups, tree);
		const state = find(nodes, 'boundaries.state');
		tree.boundaries.state.dashed = false;
		expect(layerModified(tree, usual, state)).toBe(true);
		resetLayer(tree, usual, state);
		expect(layerModified(tree, usual, state)).toBe(false);
		tree.boundaries.state.width = 0.5;
		expect(layerModified(tree, usual, find(nodes, 'boundaries'))).toBe(true);

		resetLayer(tree, usual, find(nodes, 'boundaries'));
		expect(tree).toEqual(usual);
		expect(tree.boundaries.state).not.toBe(usual.boundaries.state);
	});

	it('resets a line group to the line style of its theme', () => {
		const usual = osm.resolveOptions({ theme: 'positrino' }).layers;
		const tree = osm.resolveOptions({ theme: 'positrino' }).layers;
		const nodes = layerNodes(osm.layerGroups, usual);
		const state = find(nodes, 'boundaries.state');
		expect(Array.isArray(usual.boundaries.state.dashed)).toBe(true);
		expect(layerModified(tree, usual, state)).toBe(false);
		tree.boundaries.state.dashed = true;
		expect(layerModified(tree, usual, state)).toBe(true);
		resetLayer(tree, usual, state);
		expect(tree.boundaries.state.dashed).toEqual(usual.boundaries.state.dashed);
		expect(tree.boundaries.state.dashed).not.toBe(usual.boundaries.state.dashed);
	});

	it('gives the line style of a line group to edit in place', () => {
		const tree = defaults();
		const nodes = layerNodes(osm.layerGroups, tree);
		expect(lineStyle(tree, find(nodes, 'roads.footway'))).toBe(tree.roads.footway);
		expect(lineStyle(tree, find(nodes, 'roads.motorways'))).toBeUndefined();
		expect(lineStyle(tree, find(nodes, 'boundaries'))).toBeUndefined();
	});

	it('converts between a dash and its mode', () => {
		expect(dashMode(false)).toBe('solid');
		expect(dashMode(true)).toBe('dashed');
		expect(dashMode([2, 1])).toBe('custom');
		expect(dashOfMode('solid', true)).toBe(false);
		expect(dashOfMode('dashed', false)).toBe(true);
		expect(dashOfMode('custom', true)).toEqual([2, 1]);
		const preset = [6, 3];
		expect(dashOfMode('custom', preset)).toEqual([6, 3]);
		expect(dashOfMode('custom', preset)).not.toBe(preset);
		expect(sameDash([6, 3], [6, 3])).toBe(true);
		expect(sameDash([6, 3], [6, 2])).toBe(false);
		expect(sameDash([6, 3], true)).toBe(false);
		expect(sameDash(true, true)).toBe(true);
	});

	it('formats and parses a dash pattern', () => {
		expect(formatDashPattern([3, 1, 1, 1])).toBe('3 1 1 1');
		expect(parseDashPattern('3 1 1 1')).toEqual([3, 1, 1, 1]);
		expect(parseDashPattern(' 1.5, 0.75 ')).toEqual([1.5, 0.75]);
		expect(parseDashPattern('')).toBeUndefined();
		expect(parseDashPattern('2')).toBeUndefined();
		expect(parseDashPattern('2 1 1')).toBeUndefined();
		expect(parseDashPattern('2 -1')).toBeUndefined();
		expect(parseDashPattern('0 0')).toBeUndefined();
		expect(parseDashPattern('2 x')).toBeUndefined();
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
