import type { ResolvedLabelStyle, ResolvedText, TextGroupMap } from '@versatiles/style';

export type LabelStyleKey = keyof ResolvedLabelStyle;

/** The node that stands for every label. */
export const ALL_LABELS = 'all';

/** A node of the text tree as the labels section offers it: all labels, a group, or a topic. */
export interface LabelNode {
	/** `'all'`, a group (`'places'`) or a topic (`'places.cities'`, `'addresses'`). */
	path: string;
	label: string;
	/** 0 for all labels, 1 for groups and `addresses`, 2 for the topics of a group. */
	depth: number;
	/** The topics the node sets, e.g. `['places.cities', …]`; a topic lists itself. */
	topics: string[];
}

const GROUP_ORDER = ['places', 'streets', 'water', 'boundaries', 'pois', 'addresses'];

const LABELS: Record<string, string> = {
	[ALL_LABELS]: 'All labels',
	pois: 'POIs',
	addresses: 'House numbers',
	names: 'Street names',
	refs: 'Route numbers',
	exits: 'Motorway exits',
	general: 'Points of interest',
	transit: 'Transit stops',
};

function labelOf(key: string): string {
	return LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * The nodes of the text tree in reading order: all labels, then each group followed by its topics. Which
 * topics exist comes from `textGroups` (`osm.textGroups`), their order from the resolved tree.
 */
export function labelNodes(textGroups: TextGroupMap, defaults: ResolvedText): LabelNode[] {
	const rank = (key: string) => {
		const index = GROUP_ORDER.indexOf(key);
		return index === -1 ? GROUP_ORDER.length : index;
	};
	const groups = Object.keys(textGroups)
		.sort((a, b) => rank(a) - rank(b))
		.map((key): LabelNode[] => {
			const node = textGroups[key];
			if (Array.isArray(node)) return [{ path: key, label: labelOf(key), depth: 1, topics: [key] }];
			const order = Object.keys((defaults as unknown as Record<string, object>)[key] ?? {});
			const topics = Object.keys(node)
				.sort((a, b) => order.indexOf(a) - order.indexOf(b))
				.map((topic) => ({
					path: `${key}.${topic}`,
					label: labelOf(topic),
					depth: 2,
					topics: [`${key}.${topic}`],
				}));
			return [
				{ path: key, label: labelOf(key), depth: 1, topics: topics.map((t) => t.path) },
				...topics,
			];
		});
	return [
		{
			path: ALL_LABELS,
			label: labelOf(ALL_LABELS),
			depth: 0,
			topics: groups.flatMap((nodes) => nodes[0].topics),
		},
		...groups.flat(),
	];
}

/** The label style of a topic (`'water.rivers'`) in a resolved text tree. */
export function topicStyle(text: ResolvedText, topic: string): ResolvedLabelStyle {
	return topic
		.split('.')
		.reduce<unknown>(
			(node, key) => (node as Record<string, unknown>)[key],
			text
		) as ResolvedLabelStyle;
}

/** The value every topic of `node` shares, or `undefined` when they differ. */
export function nodeValue<K extends LabelStyleKey>(
	text: ResolvedText,
	node: LabelNode,
	key: K
): ResolvedLabelStyle[K] | undefined {
	const values = node.topics.map((topic) => topicStyle(text, topic)[key]);
	return values.every((value) => value === values[0]) ? values[0] : undefined;
}

/** Sets `key` on every topic of `node`; `undefined` restores each topic's default. */
export function setNodeValue<K extends LabelStyleKey>(
	text: ResolvedText,
	defaults: ResolvedText,
	node: LabelNode,
	key: K,
	value: ResolvedLabelStyle[K] | undefined
): void {
	for (const topic of node.topics) {
		topicStyle(text, topic)[key] = value ?? topicStyle(defaults, topic)[key];
	}
}

/** Whether a topic of `node` differs from its default, in `key` or, without `key`, in any property. */
export function nodeModified(
	text: ResolvedText,
	defaults: ResolvedText,
	node: LabelNode,
	key?: LabelStyleKey
): boolean {
	return node.topics.some((topic) => {
		const style = topicStyle(text, topic);
		const defaultStyle = topicStyle(defaults, topic);
		const keys = key ? [key] : (Object.keys(defaultStyle) as LabelStyleKey[]);
		return keys.some((k) => style[k] !== defaultStyle[k]);
	});
}

/** Restores every property of every topic of `node`. */
export function resetNode(text: ResolvedText, defaults: ResolvedText, node: LabelNode): void {
	for (const topic of node.topics) {
		Object.assign(topicStyle(text, topic), structuredClone(topicStyle(defaults, topic)));
	}
}

/** The fonts of every topic, e.g. for faces in use that the server does not list. */
export function topicFonts(text: ResolvedText, nodes: readonly LabelNode[]): string[] {
	return nodes[0].topics.map((topic) => topicStyle(text, topic).font);
}

/** The text layers a node styles, from `textGroups` (`osm.textGroups`). */
export function nodeLayers(textGroups: TextGroupMap, node: LabelNode): string[] {
	return node.topics.flatMap((topic) => {
		const layers = topic
			.split('.')
			.reduce<unknown>(
				(group, key) => (group as Record<string, unknown> | undefined)?.[key],
				textGroups
			);
		return Array.isArray(layers) ? (layers as string[]) : [];
	});
}
