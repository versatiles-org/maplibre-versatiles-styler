import { fontCovers, labelLanguage } from '@versatiles/style';
import type { FontFaceInfo } from '@versatiles/style';
import { englishLanguageName } from './languages';

/**
 * The faces to pick from: the server's, plus faces in use that it does not list (`extra`), under
 * "Other" — so a hash or a theme default with such a face still shows it.
 */
export function pickerFaces(
	faces: readonly FontFaceInfo[],
	extra: readonly string[] = []
): FontFaceInfo[] {
	const known = new Set(faces.map((face) => face.id));
	const others = [...new Set(extra)]
		.filter((id) => !known.has(id))
		.map((id) => ({
			id,
			family: 'Other',
			title: id,
			weight: 400,
			italic: false,
			width: 'normal',
			codeblocks: '',
		}));
	return [...faces, ...others];
}

/** Preview texts: a label of the kind the font is for, in Latin letters with some accents. */
const FONT_SAMPLES: Record<string, string> = {
	all: 'Hamburg · Hauptstraße 12',
	places: 'Zürich',
	'places.cities': 'Zürich',
	'places.villages': 'Grünwald',
	'places.hamlets': 'Hinterzarten',
	'places.districts': 'Altstadt',
	streets: 'Hauptstraße',
	'streets.names': 'Hauptstraße',
	'streets.refs': 'A 7',
	'streets.exits': 'Exit 12',
	water: 'Bodensee',
	'water.lakes': 'Bodensee',
	'water.rivers': 'Rhein',
	boundaries: 'Österreich',
	'boundaries.countries': 'Österreich',
	'boundaries.states': 'Bayern',
	pois: 'Café Central',
	'pois.general': 'Café Central',
	'pois.transit': 'Hauptbahnhof',
	addresses: '12a',
};

/** The preview text for a node of the text tree (`'all'`, `'water'`, `'water.rivers'`). */
export function fontSample(path: string): string {
	return FONT_SAMPLES[path] ?? FONT_SAMPLES.all;
}

/**
 * A warning when `faceId` lacks the letters of `language` (any `text.language`, `'user'` included), or
 * `undefined` when there is nothing to warn about — including faces the server does not list and
 * languages with nothing to check.
 */
export function coverageWarning(
	faces: readonly FontFaceInfo[],
	faceId: string | undefined,
	language: string
): string | undefined {
	const face = faces.find((f) => f.id === faceId);
	// fontCovers is undefined for faces the server does not list, which have no codeblocks.
	if (!face || fontCovers(face, language) !== false) return undefined;
	return `${face.title} may lack ${lettersOf(language)}.`;
}

/** "Arabic letters", or "the letters of xx" for a language `Intl` cannot name. */
export function lettersOf(language: string): string {
	const code = labelLanguage(language);
	const name = englishLanguageName(code);
	return name ? `${name} letters` : `the letters of ${code}`;
}
