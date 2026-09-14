import { fontCovers } from '@versatiles/style';
import type { FontFaceInfo, FontGroupMap, ResolvedFonts } from '@versatiles/style';
import { languageTitle } from './languages';
import type { SelectOption } from './components/inputs/select';

export interface FontTopicNode {
	key: string;
	label: string;
}

export interface FontGroupNode {
	key: string;
	label: string;
	/** Empty for a group that is a single topic (`addresses`). */
	topics: FontTopicNode[];
}

const GROUP_ORDER = ['places', 'streets', 'water', 'boundaries', 'pois', 'addresses'];

const LABELS: Record<string, string> = {
	pois: 'POIs',
	addresses: 'House numbers',
	names: 'Street names',
	refs: 'Route numbers',
	exits: 'Motorway exits',
	general: 'Points of interest',
	transit: 'Transit stops',
};

/**
 * The font topics as the section shows them: groups in reading order, each with its topics in the
 * order of the resolved tree. Which topics exist comes from `fontGroups` (`osm.fontGroups`).
 */
export function fontGroupNodes(fontGroups: FontGroupMap, defaults: ResolvedFonts): FontGroupNode[] {
	const rank = (key: string) => {
		const index = GROUP_ORDER.indexOf(key);
		return index === -1 ? GROUP_ORDER.length : index;
	};
	return Object.keys(fontGroups)
		.sort((a, b) => rank(a) - rank(b))
		.map((key) => {
			const node = fontGroups[key];
			const order = Object.keys((defaults as Record<string, unknown>)[key] ?? {});
			const topics = Array.isArray(node)
				? []
				: Object.keys(node)
						.sort((a, b) => order.indexOf(a) - order.indexOf(b))
						.map((topic) => ({ key: topic, label: labelOf(topic) }));
			return { key, label: labelOf(key), topics };
		});
}

function labelOf(key: string): string {
	return LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

/** The face every topic below `node` uses, or `undefined` when they differ. */
export function uniformFace(node: unknown): string | undefined {
	if (typeof node === 'string') return node;
	if (!node || typeof node !== 'object') return undefined;
	const faces = Object.values(node).map(uniformFace);
	return faces.length > 0 && faces.every((face) => face !== undefined && face === faces[0])
		? faces[0]
		: undefined;
}

/** `node` with every topic below it set to `face`, in the same shape. */
export function withFace<T>(node: T, face: string): T {
	if (typeof node === 'string') return face as T;
	return Object.fromEntries(
		Object.entries(node as Record<string, unknown>).map(([key, child]) => [
			key,
			withFace(child, face),
		])
	) as T;
}

/**
 * The select entries for a list of faces, grouped by family and labelled with their full title — a
 * closed select shows only the chosen option, so "Bold" alone would not say which family. Faces in
 * use that the server does not list (`extra`) are added under "Other", so the select can show them.
 */
export function faceOptions(
	faces: readonly FontFaceInfo[],
	extra: readonly string[] = []
): SelectOption[] {
	const options: SelectOption[] = faces.map((face) => ({
		value: face.id,
		label: face.title,
		group: face.family,
	}));
	const known = new Set(faces.map((face) => face.id));
	for (const id of new Set(extra)) {
		if (!known.has(id)) options.push({ value: id, label: id, group: 'Other' });
	}
	return options;
}

/** The language labels are drawn in: `'user'` stands for the browser language. */
export function labelLanguage(language: string): string {
	if (language !== 'user') return language;
	return (typeof navigator !== 'undefined' && navigator.language?.split('-')[0]) || 'local';
}

/**
 * A warning when `faceId` lacks the glyphs for `language`, or `undefined` when there is nothing to
 * warn about — including faces the server does not list and languages with nothing to check.
 */
export function coverageWarning(
	faces: readonly FontFaceInfo[],
	faceId: string | undefined,
	language: string
): string | undefined {
	const face = faces.find((f) => f.id === faceId);
	if (!face) return undefined;
	const code = labelLanguage(language);
	if (fontCovers(face, code) !== false) return undefined;
	return `${face.title} may lack the letters for ${languageTitle(code) ?? code}.`;
}
