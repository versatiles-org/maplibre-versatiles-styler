import { describe, it, expect } from 'vitest';
import { osm } from '@versatiles/style';
import type { FontFaceInfo } from '@versatiles/style';
import {
	closestFace,
	fontFamilies,
	fontUsage,
	matchFace,
	regularFace,
	styleChoices,
	styleOf,
	weightLabel,
	widthLabel,
} from './font_families';
import { labelNodes } from './label_tree';

// Latin, Cyrillic and Greek blocks (U+0000–U+04FF), like Fira Sans
const EUROPEAN = '0-4F';
const LATIN = '0-2F';

function face(
	family: string,
	weight: number,
	italic = false,
	width = 'normal',
	codeblocks = EUROPEAN
): FontFaceInfo {
	const id = [family, width === 'normal' ? '' : width, weight, italic ? 'italic' : '']
		.filter(Boolean)
		.join('_')
		.toLowerCase()
		.replace(/[\s-]/g, '_');
	const title = [
		family,
		width === 'normal' ? '' : widthLabel(width),
		weightLabel(weight),
		italic ? 'Italic' : '',
	]
		.filter(Boolean)
		.join(' ');
	return { id, family, title, weight, italic, width, codeblocks };
}

const fira = [
	...[100, 300, 400, 700].flatMap((w) => [face('Fira Sans', w), face('Fira Sans', w, true)]),
	...[300, 400, 700].map((w) => face('Fira Sans', w, false, 'condensed')),
];
const noto = [face('Noto Sans', 400), face('Noto Sans', 700)];
const baskerville = [
	face('Libre Baskerville', 400, false, 'normal', LATIN),
	face('Libre Baskerville', 400, true, 'normal', LATIN),
	face('Libre Baskerville', 700, false, 'normal', LATIN),
];
const lato = [face('Lato', 100), face('Lato', 300), face('Lato', 900)];
const all = [...fira, ...noto, ...baskerville, ...lato];

describe('fontFamilies', () => {
	it('groups faces by family, in order', () => {
		expect(fontFamilies(all).map((f) => [f.name, f.faces.length])).toEqual([
			['Fira Sans', 11],
			['Noto Sans', 2],
			['Libre Baskerville', 3],
			['Lato', 3],
		]);
	});
});

describe('closestFace and regularFace', () => {
	const [firaFamily, notoFamily, baskervilleFamily, latoFamily] = fontFamilies(all);

	it('finds the regular face: normal width, upright, weight 400', () => {
		expect(regularFace(firaFamily).title).toBe('Fira Sans Regular');
		expect(regularFace(notoFamily).title).toBe('Noto Sans Regular');
	});

	it('takes the nearest weight, the lighter one on a tie', () => {
		expect(regularFace(latoFamily).title).toBe('Lato Light'); // 300 and 900 around 400: 300 is nearer
		expect(closestFace(latoFamily, { weight: 600, italic: false, width: 'normal' }).title).toBe(
			'Lato Light'
		);
	});

	it('keeps the style when switching family, as far as the family has it', () => {
		const notoBold = styleOf(noto[1]);
		expect(closestFace(firaFamily, notoBold).title).toBe('Fira Sans Bold');
		const firaLightItalic = styleOf(fira.find((f) => f.title === 'Fira Sans Light Italic'));
		expect(closestFace(notoFamily, firaLightItalic).title).toBe('Noto Sans Regular');
		expect(
			closestFace(baskervilleFamily, { weight: 700, italic: true, width: 'normal' }).title
		).toBe('Libre Baskerville Regular Italic');
	});

	it('keeps the width, or takes the nearest', () => {
		const condensedBold = { weight: 700, italic: false, width: 'condensed' };
		expect(closestFace(firaFamily, condensedBold).title).toBe('Fira Sans Condensed Bold');
		expect(closestFace(firaFamily, { ...condensedBold, width: 'extra-condensed' }).title).toBe(
			'Fira Sans Condensed Bold'
		);
		expect(closestFace(notoFamily, condensedBold).title).toBe('Noto Sans Bold');
	});
});

describe('styleChoices', () => {
	const [firaFamily, notoFamily] = fontFamilies(all);

	it('offers the widths of the family, narrowest first, and the weights of the current width', () => {
		expect(styleChoices(firaFamily, styleOf(fira[0]))).toEqual({
			widths: ['condensed', 'normal'],
			weights: [100, 300, 400, 700],
			italic: true,
		});
		expect(styleChoices(firaFamily, { weight: 400, italic: true, width: 'condensed' })).toEqual({
			widths: ['condensed', 'normal'],
			weights: [300, 400, 700],
			italic: false,
		});
		expect(styleChoices(notoFamily, styleOf(noto[0]))).toEqual({
			widths: ['normal'],
			weights: [400, 700],
			italic: false,
		});
	});
});

describe('matchFace', () => {
	const [firaFamily, notoFamily] = fontFamilies(all);

	it('finds the matching face closest to the current style', () => {
		expect(matchFace(firaFamily, 'fira cond', styleOf(noto[1]))?.title).toBe(
			'Fira Sans Condensed Bold'
		);
		expect(matchFace(firaFamily, 'light italic', styleOf(noto[0]))?.title).toBe(
			'Fira Sans Light Italic'
		);
		expect(matchFace(notoFamily, 'fira', styleOf(noto[0]))).toBeUndefined();
	});
});

describe('fontUsage', () => {
	it('lists the faces in use with their rows, most used first', () => {
		const defaults = osm.resolveOptions().text;
		const usage = fontUsage(defaults, labelNodes(osm.textGroups, defaults));
		expect(usage[0].faceId).toBe('noto_sans_regular');
		expect(usage[0].labels).toEqual(
			expect.arrayContaining(['Places', 'Water', 'Boundaries', 'Street names', 'Transit stops'])
		);
		expect(usage.find((u) => u.faceId === 'noto_sans_bold')?.labels).toEqual([
			'Route numbers',
			'Points of interest',
		]);
	});
});
