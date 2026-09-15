import { describe, it, expect, vi, afterEach } from 'vitest';
import { osm } from '@versatiles/style';
import type { FontFaceInfo } from '@versatiles/style';
import {
	fontGroupNodes,
	uniformFace,
	withFace,
	pickerFaces,
	fontSample,
	labelLanguage,
	coverageWarning,
} from './font_tree';

const defaults = osm.resolveOptions().text.fonts;

function face(id: string, family: string, title: string, codeblocks = '0-7'): FontFaceInfo {
	return { id, family, title, weight: 400, italic: false, width: 'normal', codeblocks };
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('fontGroupNodes', () => {
	it('lists every group of osm.fontGroups in reading order, with its topics', () => {
		const nodes = fontGroupNodes(osm.fontGroups, defaults);
		expect(nodes.map((n) => n.key)).toEqual([
			'places',
			'streets',
			'water',
			'boundaries',
			'pois',
			'addresses',
		]);
		expect(nodes[0]).toEqual({
			key: 'places',
			label: 'Places',
			topics: [
				{ key: 'cities', label: 'Cities' },
				{ key: 'villages', label: 'Villages' },
				{ key: 'districts', label: 'Districts' },
			],
		});
		expect(nodes[nodes.length - 1]).toEqual({
			key: 'addresses',
			label: 'House numbers',
			topics: [],
		});
	});

	it('covers exactly the topics of the resolved tree', () => {
		const paths = fontGroupNodes(osm.fontGroups, defaults).flatMap((g) =>
			g.topics.length > 0 ? g.topics.map((t) => `${g.key}.${t.key}`) : [g.key]
		);
		const treePaths = Object.entries(defaults).flatMap(([group, node]) =>
			typeof node === 'string' ? [group] : Object.keys(node).map((topic) => `${group}.${topic}`)
		);
		expect(paths.sort()).toEqual(treePaths.sort());
	});
});

describe('uniformFace / withFace', () => {
	it('finds the face shared by a subtree', () => {
		expect(uniformFace('a')).toBe('a');
		expect(uniformFace({ x: 'a', y: 'a' })).toBe('a');
		expect(uniformFace({ x: 'a', y: { z: 'a' } })).toBe('a');
		expect(uniformFace({ x: 'a', y: 'b' })).toBeUndefined();
		expect(uniformFace(defaults)).toBeUndefined(); // bold refs and POI names
		expect(uniformFace(defaults.places)).toBe('noto_sans_regular');
	});

	it('sets every topic and keeps the shape', () => {
		const tree = withFace(defaults, 'fira_sans_regular');
		expect(tree).toEqual(osm.resolveOptions({ text: { fonts: 'fira_sans_regular' } }).text.fonts);
		expect(withFace(defaults.streets, 'x')).toEqual({ names: 'x', refs: 'x', exits: 'x' });
		expect(withFace('a', 'b')).toBe('b');
	});
});

describe('pickerFaces', () => {
	const faces = [face('fira_sans_regular', 'Fira Sans', 'Fira Sans Regular')];

	it('adds faces in use that the server does not list, once, under "Other"', () => {
		const result = pickerFaces(faces, ['fira_sans_regular', 'my_font', 'my_font']);
		expect(result.map((f) => [f.id, f.family])).toEqual([
			['fira_sans_regular', 'Fira Sans'],
			['my_font', 'Other'],
		]);
	});

	it('does not warn about letters of faces it knows nothing about', () => {
		const [, other] = pickerFaces(faces, ['my_font']);
		expect(coverageWarning([other], 'my_font', 'ar')).toBeUndefined();
	});
});

describe('fontSample', () => {
	it('has a sample for every group and topic of osm.fontGroups', () => {
		for (const group of fontGroupNodes(osm.fontGroups, defaults)) {
			expect(fontSample(group.key)).not.toBe(fontSample('all'));
			for (const topic of group.topics) {
				expect(fontSample(`${group.key}.${topic.key}`)).not.toBe(fontSample('all'));
			}
		}
		expect(fontSample('unknown')).toBe(fontSample('all'));
	});
});

describe('labelLanguage', () => {
	it('reads the browser language for "user"', () => {
		vi.stubGlobal('navigator', { language: 'de-AT' });
		expect(labelLanguage('user')).toBe('de');
		expect(labelLanguage('fr')).toBe('fr');
		expect(labelLanguage('local')).toBe('local');
	});
});

describe('coverageWarning', () => {
	// Latin only: 16-codepoint blocks 0–2F (U+0000–U+02FF)
	const latin = face('latin_only', 'Latin', 'Latin Only', '0-2F');
	const faces = [latin];

	it('warns when the face lacks the script of the language', () => {
		expect(coverageWarning(faces, 'latin_only', 'ar')).toBe(
			'Latin Only may lack the letters for العربية.'
		);
	});

	it('does not warn when the face covers it, or nothing can be checked', () => {
		expect(coverageWarning(faces, 'latin_only', 'en')).toBeUndefined();
		expect(coverageWarning(faces, 'latin_only', 'local')).toBeUndefined();
		expect(coverageWarning(faces, 'unknown_face', 'ar')).toBeUndefined();
		expect(coverageWarning(faces, undefined, 'ar')).toBeUndefined();
	});

	it('checks "user" against the browser language', () => {
		vi.stubGlobal('navigator', { language: 'el-GR' });
		expect(coverageWarning(faces, 'latin_only', 'user')).toMatch(/may lack the letters for/);
	});
});
