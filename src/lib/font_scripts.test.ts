import { describe, it, expect } from 'vitest';
import { FONT_SCRIPTS } from '@versatiles/style';
import type { FontFaceInfo } from '@versatiles/style';
import { fontFamilies } from './font_families';
import { FontPickerState } from './font_picker_state.svelte';
import {
	availableScripts,
	closestFamilies,
	filterFamiliesByScripts,
	matchBadge,
	regionSelection,
	toggleRegion,
	inScriptOrder,
	needsEastAsiaNote,
	scriptCounts,
	scriptExamples,
	scriptName,
	scriptRegions,
	scriptSummary,
} from './font_scripts';

// 16-codepoint blocks: Latin U+0000–02FF, Greek U+0370–03FF, Cyrillic U+0400–04FF, Hebrew U+05D0–05DF,
// Arabic U+0620–062F, Devanagari U+0910–091F
const LATIN = '0-2F';
const GREEK = '37-3F';
const CYRILLIC = '40-4F';
const HEBREW = '5D';
const ARABIC = '62';

function face(family: string, codeblocks: string, weight = 400): FontFaceInfo {
	const id = `${family}_${weight}`.toLowerCase().replace(/\s/g, '_');
	return {
		id,
		family,
		title: `${family} ${weight}`,
		weight,
		italic: false,
		width: 'normal',
		codeblocks,
	};
}

const european = [LATIN, GREEK, CYRILLIC].join(',');
const families = fontFamilies([
	face('Fira Sans', european),
	face('Fira Sans', european, 700),
	face('Open Sans', [european, HEBREW].join(',')),
	// only the bold face writes Arabic
	face('Noto Sans', european),
	face('Noto Sans', [european, ARABIC].join(','), 700),
	face('Libre Baskerville', LATIN),
	face('Mystery', ''),
]);

describe('script names and regions', () => {
	it('names every script in English, with the renames', () => {
		// 'Thai' is both the code and the name
		for (const script of FONT_SCRIPTS) {
			expect(scriptName(script), script).toMatch(/^[A-Z][a-z]+( |$)/);
		}
		expect(scriptName('Cyrl')).toBe('Cyrillic');
		expect(scriptName('Hani')).toBe('Chinese (Han)');
		expect(scriptName('Hang')).toBe('Korean (Hangul)');
		expect(scriptName('Beng')).toBe('Bengali');
	});

	it('places every script in exactly one region, "Other" for unknown ones', () => {
		const regions = scriptRegions();
		expect(regions.map((r) => r.name)).toEqual([
			'Europe',
			'Middle East & Africa',
			'South Asia',
			'Southeast Asia',
			'East Asia',
		]);
		const placed = regions.flatMap((r) => r.scripts);
		expect([...placed].sort()).toEqual([...FONT_SCRIPTS].sort());
		expect(scriptRegions(['Grek', 'Latn', 'Zzzz'])).toEqual([
			{ name: 'Europe', scripts: ['Latn', 'Grek'] },
			{ name: 'Other', scripts: ['Zzzz'] },
		]);
	});

	it('gives example languages in English', () => {
		expect(scriptExamples('Cyrl')).toBe('Russian, Ukrainian, Serbian, Bulgarian, Kazakh');
		expect(scriptExamples('Zzzz')).toBeUndefined();
		for (const script of FONT_SCRIPTS) expect(scriptExamples(script), script).toBeDefined();
	});

	it('notes browser fonts for Chinese, Japanese and Korean only', () => {
		expect(needsEastAsiaNote(['Latn', 'Hang'])).toBe(true);
		expect(needsEastAsiaNote(['Mong', 'Thai'])).toBe(false);
	});
});

describe('filterFamiliesByScripts', () => {
	it('keeps everything without a selection', () => {
		expect(filterFamiliesByScripts(families, [])).toEqual({ families, hidden: 0 });
	});

	it('keeps families with a face writing all scripts, only those faces, and faces of unknown coverage', () => {
		const greek = filterFamiliesByScripts(families, ['Latn', 'Grek']);
		expect(greek.families.map((f) => f.name)).toEqual([
			'Fira Sans',
			'Open Sans',
			'Noto Sans',
			'Mystery',
		]);
		expect(greek.hidden).toBe(1);

		const arabic = filterFamiliesByScripts(families, ['Arab']);
		expect(arabic.families.map((f) => [f.name, f.faces.map((x) => x.weight)])).toEqual([
			['Noto Sans', [700]],
			['Mystery', [400]],
		]);
		expect(arabic.hidden).toBe(3);
	});
});

describe('scriptCounts and availableScripts', () => {
	it('counts the families that could write the selection plus each script', () => {
		const none = scriptCounts(families, []);
		expect(none.Latn).toBe(4);
		expect(none.Grek).toBe(3);
		expect(none.Hebr).toBe(1);
		expect(none.Arab).toBe(1);
		expect(none.Thai).toBe(0);

		const hebrew = scriptCounts(families, ['Hebr']);
		expect(hebrew.Hebr).toBe(1);
		expect(hebrew.Grek).toBe(1);
		expect(hebrew.Arab).toBe(0);
	});

	it('lists the scripts some family can write, in FONT_SCRIPTS order', () => {
		expect(availableScripts(families)).toEqual(['Latn', 'Cyrl', 'Grek', 'Hebr', 'Arab']);
	});
});

describe('selection', () => {
	it('summarises the selection for the filter button', () => {
		expect(scriptSummary([])).toBe('Scripts');
		expect(scriptSummary(['Latn', 'Grek'])).toBe('Scripts: Latin, Greek');
		expect(scriptSummary(['Latn', 'Grek', 'Cyrl'])).toBe('Scripts: 3');
	});

	it('keeps the selection in FONT_SCRIPTS order and toggles scripts', () => {
		expect(inScriptOrder(['Hani', 'Grek', 'Latn'])).toEqual(['Latn', 'Grek', 'Hani']);
		const state = new FontPickerState();
		state.toggleScript('Grek');
		state.toggleScript('Latn');
		expect(state.scripts).toEqual(['Latn', 'Grek']);
		state.toggleScript('Grek');
		expect(state.scripts).toEqual(['Latn']);
		state.clearScripts();
		expect(state.scripts).toEqual([]);
		state.setScripts(['Hebr', 'Latn', 'Hebr']);
		expect(state.scripts).toEqual(['Latn', 'Hebr']);
	});
});

describe('regions as a whole', () => {
	const available = availableScripts(families); // Latn, Cyrl, Grek, Hebr, Arab
	const europe = ['Latn', 'Grek', 'Cyrl', 'Armn', 'Geor'];
	const middleEast = ['Arab', 'Hebr', 'Syrc', 'Ethi'];

	it('is selected when all its available scripts are, partly when some are', () => {
		expect(regionSelection(europe, available, [])).toBe('none');
		expect(regionSelection(europe, available, ['Latn'])).toBe('some');
		expect(regionSelection(europe, available, ['Cyrl', 'Grek', 'Latn'])).toBe('all');
		expect(regionSelection(middleEast, available, ['Arab', 'Hebr'])).toBe('all');
		expect(regionSelection(['Thai', 'Laoo'], available, [])).toBe('none');
	});

	it('selects the available scripts of a region, and clears them when all were selected', () => {
		const all = toggleRegion(europe, available, ['Hebr', 'Grek']);
		expect(all).toEqual(['Latn', 'Cyrl', 'Grek', 'Hebr']);
		expect(toggleRegion(europe, available, all)).toEqual(['Hebr']);
		expect(toggleRegion(europe, available, [])).toEqual(['Latn', 'Cyrl', 'Grek']);
	});
});

describe('closestFamilies', () => {
	it('ranks the families by how many selected scripts they write, with what they miss', () => {
		const matches = closestFamilies(families, ['Latn', 'Grek', 'Hebr', 'Arab']);
		expect(matches.map((m) => [m.family.name, m.covered.length, m.missing])).toEqual([
			['Open Sans', 3, ['Arab']],
			['Noto Sans', 3, ['Hebr']],
			['Fira Sans', 2, ['Hebr', 'Arab']],
			['Libre Baskerville', 1, ['Grek', 'Hebr', 'Arab']],
		]);
		// only the Noto Sans face that writes Arabic
		expect(matches[1].family.faces.map((f) => f.weight)).toEqual([700]);
		expect(matchBadge(matches[0])).toBe('3 of 4 — missing: Arabic');
	});

	it('leaves out families that write none of the selection', () => {
		expect(closestFamilies(families, ['Thai'])).toEqual([]);
	});
});
