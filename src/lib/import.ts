import { osm, readStyleOptions, satellite } from '@versatiles/style';
import type { OsmOptions, SatelliteOptions, StyleSpecification } from '@versatiles/style';
import { guessOptions, type OptionsGuess } from '@versatiles/style/migrate';
import { decodeConfig } from './hash';
import { toStyleKey, DEFAULT_STYLE_KEY, type StyleKey } from './style_config';

/** What the pasted text turned out to be. Shown to the user, so they learn what the tool accepts. */
export type ImportKind =
	/** A link to this styler — the whole configuration travels in the hash. */
	| 'link'
	/** A bare `@versatiles/style` options object. */
	| 'options'
	/** A style.json this styler exported, which records the options it was built from. */
	| 'recorded'
	/** Any other MapLibre style, read by reconstruction. */
	| 'derived';

export interface ImportResult {
	kind: ImportKind;
	styleKey: StyleKey;
	/**
	 * The options to apply, without `theme` (which `styleKey` carries) and without `urls` — the shape
	 * `setBaseStyle` takes, and the same shape the URL hash stores.
	 */
	config: Record<string, unknown>;
	/** What could not be carried over. Empty for an exact import. */
	warnings: string[];
	/** A tile server the imported style names, when it differs from the one in use. */
	origin?: string;
}

export type ImportOutcome =
	{ ok: true; result: ImportResult } | { ok: false; error: string; detail?: string };

/** How many settings the imported config changes — what the dialog reports before applying. */
export function countSettings(config: Record<string, unknown>): number {
	const count = (node: unknown): number =>
		node === undefined
			? 0
			: node !== null && typeof node === 'object' && !Array.isArray(node)
				? Object.values(node).reduce<number>((sum, child) => sum + count(child), 0)
				: 1;
	return count(config);
}

/** Splits `theme` and `urls` off options, leaving what the panel edits. */
function splitOptions(options: Record<string, unknown>): {
	styleKey: StyleKey | undefined;
	config: Record<string, unknown>;
	base?: string;
} {
	const { theme, urls, ...config } = options;
	const base = (urls as { base?: unknown } | undefined)?.base;
	return {
		styleKey: toStyleKey(typeof theme === 'string' ? theme : undefined),
		config,
		base: typeof base === 'string' ? base : undefined,
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Whether a parsed object is a MapLibre style rather than an options object. */
function isStyleSpecification(value: Record<string, unknown>): boolean {
	return value.version === 8 && Array.isArray(value.layers);
}

/**
 * Whether options describe a satellite style. `raster` and `osmOverlay` exist only there; everything
 * else in the vocabulary is shared with `osm()`, so anything without them is a vector style.
 */
function looksSatellite(config: Record<string, unknown>): boolean {
	return 'raster' in config || 'osmOverlay' in config;
}

/** The styler's own share link, or the bare hash from one. */
function parseLink(text: string): ImportOutcome | undefined {
	let hash: string;
	if (text.startsWith('#')) {
		hash = text.slice(1);
	} else {
		let url: URL;
		try {
			url = new URL(text);
		} catch {
			return undefined;
		}
		hash = url.hash.replace(/^#/, '');
	}
	if (hash === '') return undefined;

	const params = new Map<string, string>();
	for (const segment of hash.split('&')) {
		const eq = segment.indexOf('=');
		if (eq > 0) params.set(segment.slice(0, eq), segment.slice(eq + 1));
	}
	// `map=` alone is a link to a place, not to a style; without either we are not looking at our hash.
	if (!params.has('style') && !params.has('config')) return undefined;

	const encoded = params.get('config');
	const config = encoded ? decodeConfig(encoded) : {};
	if (encoded && config === null) {
		return {
			ok: false,
			error: 'That link carries a configuration this styler cannot read.',
			detail: 'The "config" part of the hash is not valid — the link may have been cut short.',
		};
	}
	return {
		ok: true,
		result: {
			kind: 'link',
			styleKey: toStyleKey(params.get('style')) ?? DEFAULT_STYLE_KEY,
			config: config ?? {},
			warnings: [],
		},
	};
}

/** Validates a bare options object by resolving it, and reports the library's own message if it fails. */
function parseOptions(value: Record<string, unknown>): ImportOutcome {
	const { styleKey, config, base } = splitOptions(value);

	try {
		if (styleKey === undefined && looksSatellite(config)) {
			satellite.resolveOptions(value as SatelliteOptions);
			return {
				ok: true,
				result: { kind: 'options', styleKey: 'satellite', config, warnings: [], origin: base },
			};
		}
		const key = styleKey ?? DEFAULT_STYLE_KEY;
		// `resolveOptions` throws on anything it does not accept, naming the key and its replacement.
		osm.resolveOptions({ ...(config as OsmOptions), theme: key as OsmOptions['theme'] });
		return {
			ok: true,
			result: { kind: 'options', styleKey: key, config, warnings: [], origin: base },
		};
	} catch (error) {
		return {
			ok: false,
			error: 'Those options are not valid.',
			// The library names the offending path, lists the keys valid there, and maps v5 names to v6.
			detail: error instanceof Error ? error.message : String(error),
		};
	}
}

/** Turns a reconstruction into a result, carrying over what it says it could not read. */
function fromGuess(guess: OptionsGuess): ImportOutcome {
	if (guess.kind === 'unknown') {
		return {
			ok: false,
			error: 'That style could not be read.',
			detail:
				guess.report.warnings.join('\n') ||
				'It does not look like a style built for OpenMapTiles, Protomaps or Shortbread tiles.',
		};
	}

	const { styleKey, config, base } = splitOptions(guess.options as Record<string, unknown>);
	const warnings = [...guess.report.warnings];
	const unmatched = guess.report.unmatched;
	if (unmatched.length > 0) {
		// `unmatched` is the layers no probe read — *not* layers that were dropped. They are still drawn;
		// they simply keep whatever the chosen theme gives them rather than anything read from the source
		// style. Saying "left out" here would be alarming and wrong: re-reading one of this styler's own
		// styles leaves a couple of hundred layers unprobed, and nothing is missing from the result.
		const shown = unmatched.slice(0, 6).join(', ');
		warnings.push(
			`${unmatched.length} layer${unmatched.length === 1 ? '' : 's'} could not be read one by one and ` +
				`follow${unmatched.length === 1 ? 's' : ''} the theme instead: ${shown}${unmatched.length > 6 ? ', …' : ''}`
		);
	}
	return {
		ok: true,
		result: {
			kind: 'derived',
			styleKey: guess.kind === 'satellite' ? 'satellite' : (styleKey ?? DEFAULT_STYLE_KEY),
			config,
			warnings,
			origin: base,
		},
	};
}

/** A style.json: exact when it records its own options, reconstructed otherwise. */
async function parseStyle(style: StyleSpecification): Promise<ImportOutcome> {
	// A style this styler exported says what it was built from, so there is nothing to work out.
	const recorded = readStyleOptions(style);
	if (recorded && (recorded.builder === 'osm' || recorded.builder === 'satellite')) {
		const { styleKey, config, base } = splitOptions(recorded.options);
		return {
			ok: true,
			result: {
				kind: 'recorded',
				styleKey: recorded.builder === 'satellite' ? 'satellite' : (styleKey ?? DEFAULT_STYLE_KEY),
				config,
				warnings: [],
				origin: base,
			},
		};
	}

	// Anything else is read by reconstruction: the style spec's own expression engine is run over the
	// style's filters and paint to work out what it draws. Approximate by nature, and it says so.
	return fromGuess(await guessOptions(style));
}

/** Downloads a style.json, so a URL can be pasted instead of the file's contents. */
async function parseStyleUrl(url: string): Promise<ImportOutcome> {
	let style: unknown;
	try {
		const response = await fetch(url);
		if (!response.ok) {
			return {
				ok: false,
				error: `That URL answered ${response.status}.`,
				detail: 'Check the address, and that the server allows other sites to read it (CORS).',
			};
		}
		style = await response.json();
	} catch (error) {
		return {
			ok: false,
			error: 'That style could not be downloaded.',
			// Cross-origin reads are the usual cause, and the browser's own message says so.
			detail: error instanceof Error ? error.message : String(error),
		};
	}

	if (!isRecord(style) || !isStyleSpecification(style)) {
		return {
			ok: false,
			error: 'That URL did not return a MapLibre style.',
			detail: 'A style.json has "version": 8 and a list of layers.',
		};
	}
	return parseStyle(style as unknown as StyleSpecification);
}

/**
 * Works out what `text` is and turns it into options the panel can apply.
 *
 * Accepts, in this order: a link to this styler (or its bare hash), a URL to a style.json, a
 * `@versatiles/style` options object, and any MapLibre style.json. Never throws — everything it cannot
 * use comes back as `{ ok: false }` with a message written for someone who has not built a map before.
 */
export async function parseImport(text: string): Promise<ImportOutcome> {
	const trimmed = text.trim();
	if (trimmed === '') {
		return {
			ok: false,
			error: 'Nothing to import yet.',
			detail: 'Paste a link, a style.json or an options object.',
		};
	}

	const link = parseLink(trimmed);
	if (link) return link;

	// A URL that is not one of our links is taken to be a style.json to download.
	if (/^https?:\/\//i.test(trimmed)) return parseStyleUrl(trimmed);

	let parsed: unknown;
	try {
		parsed = JSON.parse(trimmed);
	} catch (error) {
		return {
			ok: false,
			error: 'That is not a link, and not valid JSON.',
			detail: error instanceof Error ? error.message : String(error),
		};
	}

	if (!isRecord(parsed)) {
		return {
			ok: false,
			error: 'That JSON is not an object.',
			detail: 'A style.json or an options object is expected, not a list or a single value.',
		};
	}

	return isStyleSpecification(parsed)
		? parseStyle(parsed as unknown as StyleSpecification)
		: parseOptions(parsed);
}
