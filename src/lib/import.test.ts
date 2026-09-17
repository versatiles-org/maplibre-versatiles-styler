// @vitest-environment node
// `guessOptions` uses @versatiles/style's fetch cache, which jsdom's Blob breaks.
import { describe, it, expect } from 'vitest';
import { osm, satellite, styleMetadata } from '@versatiles/style';
import type { StyleSpecification } from '@versatiles/style';
import { countSettings, groupDiagnostics, parseImport, summarizeProvenance } from './import';
import type { Diagnostic, ProvenanceMap } from '@versatiles/style/migrate';

/** The result of a successful import, or a failure of the test naming why it was refused. */
async function imported(text: string) {
	const outcome = await parseImport(text);
	if (!outcome.ok) throw new Error(`refused: ${outcome.error} ${outcome.detail ?? ''}`);
	return outcome.result;
}

async function refused(text: string) {
	const outcome = await parseImport(text);
	if (outcome.ok) throw new Error(`unexpectedly accepted: ${JSON.stringify(outcome.result)}`);
	return outcome;
}

/** The styler's own encoding of a config for the URL hash — base64url of the JSON, as `hash.ts` writes it. */
function encodeConfig(config: object): string {
	const bytes = new TextEncoder().encode(JSON.stringify(config));
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('parseImport: nothing', () => {
	it('asks for something rather than failing obscurely', async () => {
		const outcome = await refused('   ');
		expect(outcome.error).toContain('Nothing to import');
		expect(outcome.detail).toContain('style.json');
	});
});

describe('parseImport: a styler link', () => {
	const config = { text: { scale: 1.5 } };

	it('reads the style and config out of a full link', async () => {
		const link = `https://example.org/map/#map=5/50/10&style=gray-dark&config=${encodeConfig(config)}`;
		expect(await imported(link)).toEqual({
			kind: 'link',
			styleKey: 'gray-dark',
			config,
			diagnostics: [],
			provenance: {},
		});
	});

	it('reads a bare hash too, which is what someone copies out of the address bar', async () => {
		const result = await imported(`#style=toner&config=${encodeConfig(config)}`);
		expect(result.kind).toBe('link');
		expect(result.styleKey).toBe('toner');
		expect(result.config).toEqual(config);
	});

	it('accepts a link with a style but no config', async () => {
		const result = await imported('https://example.org/#style=muted');
		expect(result).toEqual({
			kind: 'link',
			styleKey: 'muted',
			config: {},
			diagnostics: [],
			provenance: {},
		});
	});

	it('maps a v5 style name from an old link to its closest theme', async () => {
		expect((await imported('https://example.org/#style=eclipse')).styleKey).toBe('colorful-dark');
	});

	it('falls back to the default theme for an unknown style name', async () => {
		expect((await imported('https://example.org/#style=nonsense')).styleKey).toBe('colorful');
	});

	it('reports a config that cannot be decoded, instead of silently ignoring it', async () => {
		const outcome = await refused('https://example.org/#style=gray&config=!!!not-base64!!!');
		expect(outcome.error).toContain('cannot read');
	});

	it('is not fooled by a link that only carries a map position', async () => {
		// `#map=` alone is a link to a place; there is no style in it. It falls through to "a URL pointing
		// at a style.json", which is the right guess for any other URL — `.invalid` never resolves.
		const outcome = await refused('https://nothing.invalid/#map=5/50/10');
		expect(outcome.error).toContain('could not be downloaded');
	}, 30_000);
});

describe('parseImport: an options object', () => {
	it('takes a bare options object and splits the theme off', async () => {
		const result = await imported('{"theme":"gray","text":{"scale":1.5}}');
		expect(result).toEqual({
			kind: 'options',
			styleKey: 'gray',
			config: { text: { scale: 1.5 } },
			diagnostics: [],
			provenance: {},
			origin: undefined,
		});
	});

	it('defaults the theme when the options name none', async () => {
		expect((await imported('{"text":{"scale":2}}')).styleKey).toBe('colorful');
	});

	it('recognises satellite options by raster or osmOverlay', async () => {
		expect((await imported('{"raster":{"opacity":0.5}}')).styleKey).toBe('satellite');
		expect((await imported('{"osmOverlay":false}')).styleKey).toBe('satellite');
	});

	it('reports the tile server the options name, without adopting it silently', async () => {
		const result = await imported('{"theme":"gray","urls":{"base":"https://tiles.example.org"}}');
		expect(result.origin).toBe('https://tiles.example.org');
		// `urls` never becomes part of the config: it is environment, not style
		expect(result.config).toEqual({});
	});

	it('refuses an unknown option, and passes the library’s own explanation through', async () => {
		const outcome = await refused('{"theme":"gray","nonsense":true}');
		expect(outcome.error).toContain('not valid');
		expect(outcome.detail).toContain('nonsense');
		// the library lists what is valid there, which is the useful part for a beginner
		expect(outcome.detail).toContain('known keys here');
	});

	it('explains a v5 option name in terms of its v6 replacement', async () => {
		const outcome = await refused('{"theme":"gray","colors":{"wood":"#123456"}}');
		expect(outcome.detail).toContain('natureWood');
	});

	it('refuses malformed JSON with the parser’s message', async () => {
		const outcome = await refused('{"theme": }');
		expect(outcome.error).toContain('not valid JSON');
		expect(outcome.detail).toBeTruthy();
	});

	it('refuses JSON that is not an object', async () => {
		expect((await refused('[1,2,3]')).error).toContain('not an object');
		expect((await refused('42')).error).toContain('not an object');
	});
});

describe('parseImport: a style.json this styler wrote', () => {
	it('reads the recorded options back exactly, with nothing to report', async () => {
		const options = osm.minimizeOptions({ theme: 'gray-dark', text: { scale: 1.5 } });
		const style = { ...osm(options), metadata: styleMetadata('osm', options) };

		const result = await imported(JSON.stringify(style));
		expect(result.kind).toBe('recorded');
		expect(result.styleKey).toBe('gray-dark');
		expect(result.config).toEqual({ text: { scale: 1.5 } });
		expect(result.diagnostics).toEqual([]);
		expect(result.provenance).toEqual({});
	});

	it('reads a recorded satellite style back as satellite', async () => {
		const options = satellite.minimizeOptions({ raster: { opacity: 0.5 } });
		const style = { ...satellite(options), metadata: styleMetadata('satellite', options) };

		const result = await imported(JSON.stringify(style));
		expect(result.kind).toBe('recorded');
		expect(result.styleKey).toBe('satellite');
		expect(result.config).toEqual({ raster: { opacity: 0.5 } });
	});

	it('never carries urls over, even though the style was built against a server', async () => {
		const options = osm.minimizeOptions({
			theme: 'gray',
			urls: { base: 'https://tiles.example.org' },
		});
		const style = { ...osm(options), metadata: styleMetadata('osm', options) };
		expect((await imported(JSON.stringify(style))).config).not.toHaveProperty('urls');
	});
});

describe('parseImport: any other style.json', () => {
	it('reconstructs options from a style that records none', async () => {
		// the same style without the metadata: it has to be read by evaluating what it draws
		const style = osm({ theme: 'toner' }) as StyleSpecification;
		const result = await imported(JSON.stringify(style));

		expect(result.kind).toBe('derived');
		expect(result.styleKey).toBe('toner');
	}, 30_000);

	it('reports a clean reconstruction as notes only, with nothing to warn about', async () => {
		// Re-reading one of our own styles is the best case there is: it should not look alarming.
		const style = osm({ theme: 'muted' }) as StyleSpecification;
		const groups = groupDiagnostics((await imported(JSON.stringify(style))).diagnostics);

		expect(groups.errors).toEqual([]);
		expect(groups.warnings).toEqual([]);
		expect(groups.notes.length).toBeGreaterThan(0);
	}, 30_000);

	it('reports most of the palette as read from the style', async () => {
		const style = osm({ theme: 'muted' }) as StyleSpecification;
		const { observed, total } = summarizeProvenance(
			(await imported(JSON.stringify(style))).provenance,
			'colors'
		);
		expect(total).toBeGreaterThan(0);
		expect(observed).toBeGreaterThan(total / 2);
	}, 30_000);

	it('offers the discarded colours when several layers paint one setting', async () => {
		// Four symbol layers matching the same probe: the topmost wins and the rest are the alternatives
		// a consumer offers back as a choice.
		const colors = ['#16a085', '#8e44ad', '#c0392b', '#d35400'];
		const style = {
			version: 8,
			sources: { omt: { type: 'vector', url: 'https://example.org/t.json' } },
			layers: [
				{ id: 'bg', type: 'background', paint: { 'background-color': '#ffffff' } },
				...colors.map((color, i) => ({
					id: `poi-${i}`,
					type: 'symbol',
					source: 'omt',
					'source-layer': 'poi',
					layout: { 'text-field': '{name}', 'text-font': ['Noto Sans Regular'] },
					paint: { 'text-color': color },
				})),
			],
		};

		const result = await imported(JSON.stringify(style));
		const conflicts = groupDiagnostics(result.diagnostics).warnings.filter(
			(d) => d.code === 'color.conflict'
		);
		expect(conflicts.length).toBeGreaterThan(0);

		const conflict = conflicts[0];
		if (conflict.code !== 'color.conflict') throw new Error('narrowing');
		expect(conflict.optionPath).toMatch(/^colors\./);
		// one entry per colour, which is what the swatch list is built from
		expect(conflict.data.observed.map((o) => o.color.toLowerCase()).sort()).toEqual(
			[...colors].sort()
		);
		expect(conflict.data.chosen.toLowerCase()).toBe('#d35400'); // the topmost, which is what the map shows
	}, 30_000);

	it('refuses something shaped like a style but drawing nothing it knows', async () => {
		const outcome = await refused('{"version":8,"sources":{},"layers":[]}');
		expect(outcome.error).toContain('could not be read');
	}, 30_000);
});

describe('groupDiagnostics', () => {
	const d = (severity: 'error' | 'warning' | 'info', code: string) =>
		({ code, severity, message: code }) as unknown as Diagnostic;

	it('splits by severity, keeping the library’s order within each group', () => {
		const groups = groupDiagnostics([
			d('info', 'icons.replaced'),
			d('warning', 'color.conflict'),
			d('error', 'schema.none'),
			d('info', 'layer.unread'),
		]);
		expect(groups.errors.map((x) => x.code)).toEqual(['schema.none']);
		expect(groups.warnings.map((x) => x.code)).toEqual(['color.conflict']);
		expect(groups.notes.map((x) => x.code)).toEqual(['icons.replaced', 'layer.unread']);
	});

	it('gives three empty groups for nothing', () => {
		expect(groupDiagnostics([])).toEqual({ errors: [], warnings: [], notes: [] });
	});
});

describe('summarizeProvenance', () => {
	const map = {
		theme: { origin: 'observed' },
		'colors.water': { origin: 'observed' },
		'colors.land': { origin: 'observed' },
		'colors.poi': { origin: 'inherited' },
		'colors.labelPoi': { origin: 'default' },
		'text.places.font': { origin: 'pooled' },
	} as ProvenanceMap;

	it('counts observed against everything the derivation considered', () => {
		expect(summarizeProvenance(map, 'colors')).toEqual({ observed: 2, total: 4 });
	});

	it('takes only the prefix asked for', () => {
		expect(summarizeProvenance(map, 'text')).toEqual({ observed: 0, total: 1 });
		expect(summarizeProvenance(map, 'theme')).toEqual({ observed: 1, total: 1 });
	});

	it('is zero for an empty map, so an exact import reports nothing', () => {
		expect(summarizeProvenance({}, 'colors')).toEqual({ observed: 0, total: 0 });
	});

	it('ignores paths the library does not annotate', () => {
		// Absence under an uncovered prefix means "not reported yet", not "nothing was read" — counting
		// it as the latter would understate every import.
		const withUncovered = { ...map, 'layers.labels': { origin: 'observed' } } as ProvenanceMap;
		expect(summarizeProvenance(withUncovered, 'layers')).toEqual({ observed: 0, total: 0 });
	});
});

describe('countSettings', () => {
	it('counts leaves, however deeply nested', () => {
		expect(countSettings({})).toBe(0);
		expect(countSettings({ a: 1 })).toBe(1);
		expect(countSettings({ text: { scale: 1.5, language: 'de' } })).toBe(2);
		expect(countSettings({ layers: { labels: false } })).toBe(1);
	});

	it('counts an array as one setting, not one per entry', () => {
		expect(countSettings({ a: [1, 2, 3] })).toBe(1);
	});
});
