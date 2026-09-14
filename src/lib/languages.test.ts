import { describe, it, expect, vi, afterEach } from 'vitest';
import { languageOptions, languageTitle } from './languages';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('languageTitle', () => {
	it('names a language in that language, capitalised', () => {
		expect(languageTitle('de')).toBe('Deutsch');
		expect(languageTitle('en')).toBe('English');
		expect(languageTitle('fr')).toBe('Français');
	});

	it('rejects everything that is not a two-letter language code', () => {
		for (const code of ['int', 'latin', 'nonlatin', 'zh-Hant', 'DE', 'd', '', 'xx']) {
			expect(languageTitle(code)).toBeUndefined();
		}
	});

	it('rejects a code Intl.DisplayNames throws on', () => {
		vi.spyOn(Intl, 'DisplayNames').mockImplementationOnce(() => {
			throw new RangeError('invalid_argument');
		});
		expect(languageTitle('de')).toBeUndefined();
	});
});

describe('languageOptions', () => {
	it('starts with local names and the browser language', () => {
		expect(languageOptions([])).toEqual({ 'Local names': 'local', 'Browser language': 'user' });
	});

	it('adds valid codes, sorted and deduplicated, and drops the rest', () => {
		const options = languageOptions(['fr', 'int', 'de', 'latin', 'de', 'zh-Hant', 'en']);
		expect(Object.values(options)).toEqual(['local', 'user', 'de', 'en', 'fr']);
		expect(options['Deutsch']).toBe('de');
	});
});
