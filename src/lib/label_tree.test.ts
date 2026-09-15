import { describe, it, expect } from 'vitest';
import { osm } from '@versatiles/style';
import {
	ALL_LABELS,
	labelNodes,
	nodeModified,
	nodeValue,
	resetNode,
	setNodeValue,
	topicFonts,
	topicStyle,
} from './label_tree';

const defaults = osm.resolveOptions().text;
const nodes = labelNodes(osm.textGroups, defaults);
const nodeAt = (path: string) => nodes.find((node) => node.path === path)!;

describe('labelNodes', () => {
	it('lists all labels, then each group in reading order followed by its topics', () => {
		expect(nodes.map((n) => [n.path, n.depth])).toEqual([
			['all', 0],
			['places', 1],
			['places.cities', 2],
			['places.villages', 2],
			['places.hamlets', 2],
			['places.districts', 2],
			['streets', 1],
			['streets.names', 2],
			['streets.refs', 2],
			['streets.exits', 2],
			['water', 1],
			['water.lakes', 2],
			['water.rivers', 2],
			['boundaries', 1],
			['boundaries.countries', 2],
			['boundaries.states', 2],
			['pois', 1],
			['pois.general', 2],
			['pois.transit', 2],
			['addresses', 1],
		]);
		expect(nodeAt('streets.refs').label).toBe('Route numbers');
		expect(nodeAt('addresses')).toEqual({
			path: 'addresses',
			label: 'House numbers',
			depth: 1,
			topics: ['addresses'],
		});
	});

	it('gives each node the topics below it; all labels covers every topic once', () => {
		expect(nodeAt('water').topics).toEqual(['water.lakes', 'water.rivers']);
		expect(nodeAt('water.rivers').topics).toEqual(['water.rivers']);
		const all = nodeAt(ALL_LABELS).topics;
		expect(all).toHaveLength(14);
		expect(new Set(all).size).toBe(all.length);
		for (const topic of all) expect(topicStyle(defaults, topic).scale).toBe(1);
	});
});

describe('node values', () => {
	it('reads the value the topics share, or undefined when they differ', () => {
		expect(nodeValue(defaults, nodeAt('places'), 'font')).toBe('noto_sans_regular');
		expect(nodeValue(defaults, nodeAt('places'), 'transform')).toBeUndefined(); // uppercase hamlets
		expect(nodeValue(defaults, nodeAt('streets'), 'haloWidth')).toBeUndefined();
		expect(nodeValue(defaults, nodeAt('streets.refs'), 'haloWidth')).toBe(0.1);
		expect(nodeValue(defaults, nodeAt(ALL_LABELS), 'scale')).toBe(1);
		expect(nodeValue(defaults, nodeAt(ALL_LABELS), 'font')).toBeUndefined();
	});

	it('sets every topic below a node, and restores the defaults with undefined', () => {
		const text = structuredClone(defaults);
		setNodeValue(text, defaults, nodeAt('streets'), 'haloWidth', 3);
		expect(nodeValue(text, nodeAt('streets'), 'haloWidth')).toBe(3);
		expect(topicStyle(text, 'water.rivers').haloWidth).toBe(2);
		expect(nodeModified(text, defaults, nodeAt('streets'), 'haloWidth')).toBe(true);
		expect(nodeModified(text, defaults, nodeAt('streets'), 'font')).toBe(false);
		expect(nodeModified(text, defaults, nodeAt(ALL_LABELS))).toBe(true);
		expect(nodeModified(text, defaults, nodeAt('water'))).toBe(false);

		setNodeValue(text, defaults, nodeAt('streets'), 'haloWidth', undefined);
		expect(text).toEqual(defaults);
	});

	it('builds the same text as the options it stands for', () => {
		const text = structuredClone(defaults);
		setNodeValue(text, defaults, nodeAt(ALL_LABELS), 'font', 'fira_sans_regular');
		setNodeValue(text, defaults, nodeAt('places.hamlets'), 'transform', 'none');
		expect(text).toEqual(
			osm.resolveOptions({
				text: { font: 'fira_sans_regular', places: { hamlets: { transform: 'none' } } },
			}).text
		);
	});

	it('resets every property of a node', () => {
		const text = structuredClone(defaults);
		setNodeValue(text, defaults, nodeAt('water'), 'font', 'fira_sans_bold');
		setNodeValue(text, defaults, nodeAt('water.rivers'), 'letterSpacing', 0.1);
		setNodeValue(text, defaults, nodeAt('places'), 'scale', 2);
		resetNode(text, defaults, nodeAt('water'));
		expect(nodeModified(text, defaults, nodeAt('water'))).toBe(false);
		expect(nodeValue(text, nodeAt('places'), 'scale')).toBe(2);
	});

	it('lists the font of every topic', () => {
		const fonts = topicFonts(defaults, nodes);
		expect(fonts).toHaveLength(14);
		expect(new Set(fonts)).toEqual(new Set(['noto_sans_regular', 'noto_sans_bold']));
	});
});
