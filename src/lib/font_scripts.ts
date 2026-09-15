import { FONT_SCRIPTS, fontScripts } from '@versatiles/style';
import type { FontFaceInfo } from '@versatiles/style';
import type { FontFamily } from './font_families';
import { englishLanguageName } from './languages';

/** The scripts of `FONT_SCRIPTS` by region, like Google Fonts groups its languages. */
const REGIONS: readonly { name: string; scripts: readonly string[] }[] = [
	{ name: 'Europe', scripts: ['Latn', 'Grek', 'Cyrl', 'Armn', 'Geor'] },
	{ name: 'Middle East & Africa', scripts: ['Arab', 'Hebr', 'Syrc', 'Ethi'] },
	{
		name: 'South Asia',
		scripts: [
			'Deva',
			'Beng',
			'Guru',
			'Gujr',
			'Orya',
			'Taml',
			'Telu',
			'Knda',
			'Mlym',
			'Sinh',
			'Thaa',
			'Tibt',
		],
	},
	{ name: 'Southeast Asia', scripts: ['Thai', 'Laoo', 'Khmr', 'Mymr'] },
	{ name: 'East Asia', scripts: ['Hani', 'Jpan', 'Hang', 'Mong'] },
];

export const EAST_ASIA_NOTE =
	'MapLibre GL JS draws Chinese, Japanese and Korean with a browser font by default.';

const EAST_ASIAN = ['Hani', 'Jpan', 'Hang'];

/** Names `Intl` gives that say less than they could on a map. */
const RENAMES: Readonly<Record<string, string>> = {
	Hani: 'Chinese (Han)',
	Hang: 'Korean (Hangul)',
	Beng: 'Bengali',
};

/** Languages written in a script, for its tooltip. Presentation only: coverage is the library's. */
const EXAMPLE_LANGUAGES: Readonly<Record<string, readonly string[]>> = {
	Latn: ['en', 'es', 'fr', 'de', 'pl', 'tr', 'vi'],
	Grek: ['el'],
	Cyrl: ['ru', 'uk', 'sr', 'bg', 'kk'],
	Armn: ['hy'],
	Geor: ['ka'],
	Arab: ['ar', 'fa', 'ur'],
	Hebr: ['he', 'yi'],
	Syrc: ['syr'],
	Ethi: ['am', 'ti'],
	Deva: ['hi', 'mr', 'ne'],
	Beng: ['bn', 'as'],
	Guru: ['pa'],
	Gujr: ['gu'],
	Orya: ['or'],
	Taml: ['ta'],
	Telu: ['te'],
	Knda: ['kn'],
	Mlym: ['ml'],
	Sinh: ['si'],
	Thaa: ['dv'],
	Tibt: ['bo', 'dz'],
	Thai: ['th'],
	Laoo: ['lo'],
	Khmr: ['km'],
	Mymr: ['my'],
	Hani: ['zh', 'ja'],
	Jpan: ['ja'],
	Hang: ['ko'],
	Mong: ['mn'],
};

/** The English name of a script (`Cyrl` → "Cyrillic"). */
export function scriptName(code: string): string {
	if (RENAMES[code]) return RENAMES[code];
	try {
		return new Intl.DisplayNames(['en'], { type: 'script' }).of(code) ?? code;
	} catch {
		return code;
	}
}

/** "Russian, Ukrainian, …": languages written in a script, or `undefined` when there are none to name. */
export function scriptExamples(code: string): string | undefined {
	const names = (EXAMPLE_LANGUAGES[code] ?? []).flatMap((language) => {
		const name = englishLanguageName(language);
		return name ? [name] : [];
	});
	return names.length > 0 ? names.join(', ') : undefined;
}

export interface ScriptRegion {
	name: string;
	scripts: string[];
}

/** The regions with their scripts of `FONT_SCRIPTS`; scripts the table lacks go into "Other". */
export function scriptRegions(scripts: readonly string[] = FONT_SCRIPTS): ScriptRegion[] {
	const regions = REGIONS.map((region) => ({
		name: region.name,
		scripts: region.scripts.filter((script) => scripts.includes(script)),
	}));
	const placed = new Set(REGIONS.flatMap((region) => region.scripts));
	const other = scripts.filter((script) => !placed.has(script));
	if (other.length > 0) regions.push({ name: 'Other', scripts: other });
	return regions.filter((region) => region.scripts.length > 0);
}

/** Whether a note about browser fonts for CJK belongs next to these scripts. */
export function needsEastAsiaNote(scripts: readonly string[]): boolean {
	return scripts.some((script) => EAST_ASIAN.includes(script));
}

const faceScriptCache = new WeakMap<FontFaceInfo, ReadonlySet<string> | null>();

/** The scripts a face covers; `null` when its server lists no coverage for it. */
export function faceScripts(face: FontFaceInfo): ReadonlySet<string> | null {
	let scripts = faceScriptCache.get(face);
	if (scripts === undefined) {
		scripts = face.codeblocks === '' ? null : new Set(fontScripts(face));
		faceScriptCache.set(face, scripts);
	}
	return scripts;
}

function coversAll(face: FontFaceInfo, scripts: readonly string[]): boolean {
	const covered = faceScripts(face);
	return covered !== null && scripts.every((script) => covered.has(script));
}

/**
 * The families with only the faces that can write all `scripts`. Faces whose coverage is unknown stay.
 * Families with no face left are counted as hidden.
 */
export function filterFamiliesByScripts(
	families: readonly FontFamily[],
	scripts: readonly string[]
): { families: FontFamily[]; hidden: number } {
	if (scripts.length === 0) return { families: [...families], hidden: 0 };
	const result: FontFamily[] = [];
	for (const family of families) {
		const faces = family.faces.filter(
			(face) => faceScripts(face) === null || coversAll(face, scripts)
		);
		if (faces.length > 0) result.push({ name: family.name, faces });
	}
	return { families: result, hidden: families.length - result.length };
}

/**
 * For each script of `FONT_SCRIPTS`: how many families have a face that can write the `selected` scripts
 * and that one. Faces of unknown coverage are not counted.
 */
export function scriptCounts(
	families: readonly FontFamily[],
	selected: readonly string[],
	scripts: readonly string[] = FONT_SCRIPTS
): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const script of scripts) {
		const wanted = selected.includes(script) ? selected : [...selected, script];
		counts[script] = families.filter((family) =>
			family.faces.some((face) => coversAll(face, wanted))
		).length;
	}
	return counts;
}

/** The scripts at least one family can write. */
export function availableScripts(
	families: readonly FontFamily[],
	scripts: readonly string[] = FONT_SCRIPTS
): string[] {
	const counts = scriptCounts(families, [], scripts);
	return scripts.filter((script) => counts[script] > 0);
}

/** `scripts` in the order of `FONT_SCRIPTS`. */
export function inScriptOrder(scripts: readonly string[]): string[] {
	const rank = (script: string) => {
		const index = FONT_SCRIPTS.indexOf(script);
		return index === -1 ? FONT_SCRIPTS.length : index;
	};
	return [...scripts].sort((a, b) => rank(a) - rank(b));
}

/** The label of the filter button: "Scripts", "Scripts: Latin, Greek", "Scripts: 5". */
export function scriptSummary(selected: readonly string[]): string {
	if (selected.length === 0) return 'Scripts';
	if (selected.length <= 2) return `Scripts: ${selected.map(scriptName).join(', ')}`;
	return `Scripts: ${selected.length}`;
}
