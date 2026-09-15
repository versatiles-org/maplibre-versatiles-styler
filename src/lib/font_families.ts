import { fontCovers } from '@versatiles/style';
import type { FontFaceInfo, ResolvedText } from '@versatiles/style';
import { topicStyle, type LabelNode } from './label_tree';
import { languageTitle } from './languages';

/** A font family with its faces, as the font picker lists it. */
export interface FontFamily {
	name: string;
	faces: FontFaceInfo[];
}

export interface FontStyle {
	weight: number;
	italic: boolean;
	width: string;
}

const REGULAR: FontStyle = { weight: 400, italic: false, width: 'normal' };

const WEIGHT_LABELS: Readonly<Record<number, string>> = {
	100: 'Thin',
	200: 'ExtraLight',
	300: 'Light',
	400: 'Regular',
	500: 'Medium',
	600: 'SemiBold',
	700: 'Bold',
	800: 'ExtraBold',
	900: 'Black',
};

/** From narrowest to widest. */
const WIDTH_ORDER = [
	'ultra-condensed',
	'extra-condensed',
	'condensed',
	'semi-condensed',
	'normal',
	'semi-expanded',
	'expanded',
	'extra-expanded',
	'ultra-expanded',
];

export function weightLabel(weight: number): string {
	return WEIGHT_LABELS[weight] ?? String(weight);
}

export function widthLabel(width: string): string {
	return width
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

/** The families of `faces`, in the order they first appear. */
export function fontFamilies(faces: readonly FontFaceInfo[]): FontFamily[] {
	const families = new Map<string, FontFamily>();
	for (const face of faces) {
		let family = families.get(face.family);
		if (!family) families.set(face.family, (family = { name: face.family, faces: [] }));
		family.faces.push(face);
	}
	return [...families.values()];
}

export function styleOf(face: FontFaceInfo | undefined): FontStyle {
	return face ? { weight: face.weight, italic: face.italic, width: face.width } : REGULAR;
}

/**
 * The face of `family` closest to `style`: the same width if the family has it (else the nearest),
 * then the same italic if that width has it, then the nearest weight (the lighter one on a tie).
 * The family's regular face is `closestFace(family, REGULAR)`.
 */
export function closestFace(family: FontFamily, style: FontStyle = REGULAR): FontFaceInfo {
	const rank = (width: string) => {
		const index = WIDTH_ORDER.indexOf(width);
		return index === -1 ? WIDTH_ORDER.indexOf('normal') : index;
	};
	const widthDistance = (face: FontFaceInfo) => Math.abs(rank(face.width) - rank(style.width));
	const nearestWidth = Math.min(...family.faces.map(widthDistance));
	let candidates = family.faces.filter((face) => widthDistance(face) === nearestWidth);
	const sameItalic = candidates.filter((face) => face.italic === style.italic);
	if (sameItalic.length > 0) candidates = sameItalic;
	return candidates.reduce((best, face) => {
		const d = Math.abs(face.weight - style.weight);
		const bestD = Math.abs(best.weight - style.weight);
		return d < bestD || (d === bestD && face.weight < best.weight) ? face : best;
	});
}

export function regularFace(family: FontFamily): FontFaceInfo {
	return closestFace(family, REGULAR);
}

/** The choices the style controls offer for a family, given the current style. */
export function styleChoices(
	family: FontFamily,
	style: FontStyle
): { widths: string[]; weights: number[]; italic: boolean } {
	const byRank = (a: string, b: string) => WIDTH_ORDER.indexOf(a) - WIDTH_ORDER.indexOf(b);
	const widths = [...new Set(family.faces.map((face) => face.width))].sort(byRank);
	const width = closestFace(family, style).width;
	const atWidth = family.faces.filter((face) => face.width === width);
	return {
		widths,
		weights: [...new Set(atWidth.map((face) => face.weight))].sort((a, b) => a - b),
		italic: atWidth.some((face) => face.italic),
	};
}

/** Whether every word of `query` is in the face's title, ignoring case. */
export function matchesQuery(face: FontFaceInfo, query: string): boolean {
	const title = face.title.toLowerCase();
	return query
		.toLowerCase()
		.split(/\s+/)
		.filter(Boolean)
		.every((word) => title.includes(word));
}

/**
 * The best face of a family for a search: among the faces matching `query`, the one closest to
 * `style`. `undefined` when none matches.
 */
export function matchFace(
	family: FontFamily,
	query: string,
	style: FontStyle
): FontFaceInfo | undefined {
	const matching = family.faces.filter((face) => matchesQuery(face, query));
	return matching.length > 0
		? closestFace({ name: family.name, faces: matching }, style)
		: undefined;
}

/** Whether a face has the letters of every language: `undefined` when that cannot be told. */
export function coversLanguages(
	face: FontFaceInfo,
	languages: readonly string[]
): boolean | undefined {
	if (face.codeblocks === '') return undefined;
	let unknown = false;
	for (const language of languages) {
		const covers = fontCovers(face, language);
		if (covers === false) return false;
		if (covers === undefined) unknown = true;
	}
	return unknown ? undefined : true;
}

/**
 * The families with only the faces that have the letters of `languages`. Faces whose coverage is
 * unknown stay. Families with no face left are counted as hidden.
 */
export function filterFamiliesByLanguages(
	families: readonly FontFamily[],
	languages: readonly string[]
): { families: FontFamily[]; hidden: number } {
	if (languages.length === 0) return { families: [...families], hidden: 0 };
	const result: FontFamily[] = [];
	for (const family of families) {
		const faces = family.faces.filter((face) => coversLanguages(face, languages) !== false);
		if (faces.length > 0) result.push({ name: family.name, faces });
	}
	return { families: result, hidden: families.length - result.length };
}

export interface FontUse {
	faceId: string;
	/** The rows that use the face: a group where all its topics do, else its topics. */
	labels: string[];
}

/** The faces in use in a text tree, most used first, with the rows that use them. */
export function fontUsage(text: ResolvedText, nodes: readonly LabelNode[]): FontUse[] {
	const uses = new Map<string, string[]>();
	const add = (faceId: string, label: string) =>
		uses.set(faceId, [...(uses.get(faceId) ?? []), label]);
	for (const group of nodes.filter((node) => node.depth === 1)) {
		const faces = new Set(group.topics.map((topic) => topicStyle(text, topic).font));
		if (faces.size === 1) {
			add([...faces][0], group.label);
		} else {
			for (const topic of nodes.filter(
				(node) => node.depth === 2 && group.topics.includes(node.path)
			))
				add(topicStyle(text, topic.path).font, topic.label);
		}
	}
	return [...uses]
		.map(([faceId, labels]) => ({ faceId, labels }))
		.sort((a, b) => b.labels.length - a.labels.length);
}

/** Languages with other scripts, offered in the language filter for maps with local names. */
const MORE_FILTER_LANGUAGES = ['ar', 'he', 'hi', 'th', 'ka', 'hy', 'ru', 'el', 'zh', 'ja', 'ko'];

/**
 * The languages the font filter offers: the tileset's (`codes`) and a few with other scripts, named in
 * their own language, the label language first and the rest by name.
 */
export function filterLanguageChoices(
	codes: readonly string[],
	labelCode: string
): { code: string; name: string }[] {
	const choices = [...new Set([...codes, ...MORE_FILTER_LANGUAGES])].flatMap((code) => {
		const name = languageTitle(code);
		return name ? [{ code, name }] : [];
	});
	return choices.sort((a, b) =>
		a.code === labelCode ? -1 : b.code === labelCode ? 1 : a.name.localeCompare(b.name)
	);
}
