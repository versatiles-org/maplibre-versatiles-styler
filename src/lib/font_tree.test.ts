import { describe, it, expect, vi, afterEach } from 'vitest';
import { osm } from '@versatiles/style';
import type { FontFaceInfo } from '@versatiles/style';
import { pickerFaces, fontSample, labelLanguage, coverageWarning } from './font_tree';
import { labelNodes } from './label_tree';

const defaults = osm.resolveOptions().text;

function face(id: string, family: string, title: string, codeblocks = '0-7'): FontFaceInfo {
	return { id, family, title, weight: 400, italic: false, width: 'normal', codeblocks };
}

afterEach(() => {
	vi.unstubAllGlobals();
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
	it('has a sample for every group and topic of osm.textGroups', () => {
		for (const node of labelNodes(osm.textGroups, defaults).slice(1)) {
			expect(fontSample(node.path), node.path).not.toBe(fontSample('all'));
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
