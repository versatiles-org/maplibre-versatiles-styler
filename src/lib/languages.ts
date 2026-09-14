/**
 * The entries of the language select, as `{ title: value }`.
 *
 * `codes` comes from `osm.languages()`, which returns every `name_xx` / `name:xx` suffix of a
 * tileset — including transliterations (`int`, `latin`) and regional variants (`zh-Hant`). Only
 * two-letter codes the browser can name are offered, titled in their own language.
 */
export function languageOptions(codes: readonly string[]): Record<string, string> {
	const options: Record<string, string> = {
		'Local names': 'local',
		'Browser language': 'user',
	};
	for (const code of [...new Set(codes)].sort()) {
		const title = languageTitle(code);
		if (title !== undefined) options[title] = code;
	}
	return options;
}

/** The name of a language in that language (`de` → "Deutsch"), or `undefined` if it is not one. */
export function languageTitle(code: string): string | undefined {
	if (!/^[a-z]{2}$/.test(code)) return undefined;
	let title: string | undefined;
	try {
		title = new Intl.DisplayNames([code], { type: 'language' }).of(code);
	} catch {
		return undefined;
	}
	if (!title || title === code) return undefined;
	return title.charAt(0).toLocaleUpperCase(code) + title.slice(1);
}
