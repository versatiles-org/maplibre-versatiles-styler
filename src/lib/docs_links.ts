/**
 * Where the export and import dialogs send someone who wants to know more.
 *
 * In one place because most of these are placeholders for a page that does not exist yet:
 * docs.versatiles.org has nothing about map styles — no explanation of what a style.json is, and no
 * guide to `@versatiles/style` for either npm or the CDN. A guide is proposed in
 * versatiles-documentation#86; when it lands, the entries below point at it and the dialogs themselves
 * need no change.
 */
export const DOCS = {
	/** What a style.json is and what MapLibre does with it. */
	styleSpec: 'https://maplibre.org/maplibre-style-spec/',

	/** Background on vector tiles, style.json and tiles.json. */
	webMaps: 'https://docs.versatiles.org/basics/web_maps',

	/** Using `@versatiles/style` from npm. */
	styleNpm: 'https://github.com/versatiles-org/versatiles-style#backend-usage-nodejs',

	/** Using `@versatiles/style` from a script tag. */
	styleBrowser: 'https://github.com/versatiles-org/versatiles-style#frontend-usage-web-browser',

	/** Bringing a style built for other tiles onto VersaTiles (`guessOptions`). */
	migrate: 'https://github.com/versatiles-org/versatiles-style#style-generation-methods',
} as const;
