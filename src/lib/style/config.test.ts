import { describe, it, expect, vi, afterEach } from 'vitest';
import { osm, readStyleOptions, satellite } from '@versatiles/style';
import { omt } from '@versatiles/style/omt';
import { protomaps } from '@versatiles/style/protomaps';
import type { TileJSONSpecification } from '@versatiles/style';
import {
	PALETTES,
	toStyleKey,
	themeRows,
	themeGroups,
	vectorDefaults,
	satelliteDefaults,
	overlayDefaults,
	vectorStateFromConfig,
	satelliteStateFromConfig,
	buildVectorStyle,
	buildSatelliteStyle,
	codeTargets,
	containerBackground,
	inspectSources,
	minimalConfig,
	configChangeCount,
	configChanges,
	themeSwatch,
	styleCode,
	styleForExport,
	type StyleSources,
} from './config';

const ORIGIN = 'https://tiles.example.org';

function tileJSON(name: string, extra: Partial<TileJSONSpecification> = {}): TileJSONSpecification {
	return {
		tilejson: '3.0.0',
		tiles: [`${ORIGIN}/tiles/${name}/{z}/{x}/{y}`],
		minzoom: 0,
		maxzoom: 14,
		...extra,
	} as TileJSONSpecification;
}

const osmTileJSON = tileJSON('osm', {
	vector_layers: [{ id: 'land', fields: { kind: 'String' }, minzoom: 10, maxzoom: 14 }],
} as Partial<TileJSONSpecification>);
const landcoverTileJSON = tileJSON('osm', {
	vector_layers: [{ id: 'land', fields: { kind: 'String' }, minzoom: 0, maxzoom: 14 }],
} as Partial<TileJSONSpecification>);
const omtTileJSON = tileJSON('omt', { vector_layers: [] } as Partial<TileJSONSpecification>);
const satelliteTileJSON = tileJSON('satellite');
const elevationTileJSON = tileJSON('elevation');

const allSources: StyleSources = {
	vector: osmTileJSON,
	satellite: satelliteTileJSON,
	elevation: elevationTileJSON,
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe('toStyleKey', () => {
	it('accepts every theme and satellite', () => {
		for (const key of [...PALETTES, 'satellite']) expect(toStyleKey(key)).toBe(key);
	});

	it('maps v5 style keys to their themes', () => {
		expect(toStyleKey('colorful')).toBe('colorful');
		expect(toStyleKey('eclipse')).toBe('colorful-dark');
		expect(toStyleKey('graybeard')).toBe('gray');
		expect(toStyleKey('neutrino')).toBe('muted');
		expect(toStyleKey('shadow')).toBe('gray-dark');
	});

	it('rejects anything else', () => {
		expect(toStyleKey('nonexistent')).toBeUndefined();
		expect(toStyleKey('toString')).toBeUndefined();
		expect(toStyleKey(null)).toBeUndefined();
		expect(toStyleKey(undefined)).toBeUndefined();
	});
});

describe('containerBackground', () => {
	it('is white for light themes, black for dark themes and satellite', () => {
		expect(containerBackground('colorful')).toBe('#ffffff');
		expect(containerBackground('toner')).toBe('#ffffff');
		expect(containerBackground('colorful-dark')).toBe('#000000');
		expect(containerBackground('gray-dark')).toBe('#000000');
		expect(containerBackground('satellite')).toBe('#000000');
		expect(containerBackground('fnord')).toBe('#000000');
		expect(containerBackground('protozoa')).toBe('#ffffff');
	});
});

describe('themeRows', () => {
	it('pairs every light theme with its dark theme, in palette order', () => {
		expect(themeRows([...PALETTES, 'satellite']).slice(0, 5)).toEqual([
			{ name: 'colorful', light: 'colorful', dark: 'colorful-dark' },
			{ name: 'natural', light: 'natural', dark: 'natural-dark' },
			{ name: 'muted', light: 'muted', dark: 'muted-dark' },
			{ name: 'gray', light: 'gray', dark: 'gray-dark' },
			{ name: 'toner', light: 'toner', dark: 'toner-dark' },
		]);
	});

	it('leaves out satellite, and gives no rows without themes', () => {
		expect(themeRows(['satellite'])).toEqual([]);
		expect(themeRows([])).toEqual([]);
	});

	it('keeps a row whose light or dark theme is missing', () => {
		expect(themeRows(['gray-dark'])).toEqual([{ name: 'gray', dark: 'gray-dark' }]);
	});

	it('puts a dark theme without a light one in the dark column', () => {
		expect(themeRows(['fnord', 'protozoa'])).toEqual([
			{ name: 'fnord', dark: 'fnord' },
			{ name: 'protozoa', light: 'protozoa' },
		]);
	});
});

describe('themeGroups', () => {
	it('splits the themes into the own palettes, the lookalikes and satellite', () => {
		const groups = themeGroups([...PALETTES, 'satellite']);
		expect(groups.own.map((row) => row.name)).toEqual([
			'colorful',
			'natural',
			'muted',
			'gray',
			'toner',
		]);
		expect(groups.own[3]).toEqual({ name: 'gray', light: 'gray', dark: 'gray-dark' });
		expect(groups.lookalikes).toEqual(PALETTES.slice(10));
		expect(groups.lookalikes).toContain('positrino-dark');
		expect(groups.satellite).toBe(true);
	});

	it('is empty without style keys', () => {
		expect(themeGroups([])).toEqual({ own: [], lookalikes: [], satellite: false });
		expect(themeGroups(['satellite'])).toEqual({ own: [], lookalikes: [], satellite: true });
	});
});

describe('defaults', () => {
	it('vector defaults are the resolved options of the theme, without theme and urls', () => {
		const defaults = vectorDefaults('gray-dark');
		const { theme: _theme, urls: _urls, ...resolved } = osm.resolveOptions({ theme: 'gray-dark' });
		expect(defaults).toEqual(resolved);
		expect(defaults).not.toHaveProperty('theme');
		expect(defaults).not.toHaveProperty('urls');
	});

	it('themes have their own colours', () => {
		expect(vectorDefaults('colorful').colors).not.toEqual(vectorDefaults('colorful-dark').colors);
	});

	it('satellite defaults are the resolved options without urls', () => {
		const { urls: _urls, ...resolved } = satellite.resolveOptions();
		expect(satelliteDefaults()).toEqual(resolved);
	});
});

describe('overlayDefaults', () => {
	it('gives the overlay of a theme, with the imagery treatment', () => {
		const gray = overlayDefaults('gray');
		expect(gray).toEqual(satelliteDefaults().osmOverlay);
		const colorful = overlayDefaults('colorful');
		expect(colorful.theme).toBe('colorful');
		expect(colorful.colors.water).toBe(vectorDefaults('colorful').colors.water);
		// The treatment lightens every label token for legibility over imagery — tinted from the
		// theme rather than flat white, so the basemap's dark ink is gone either way.
		expect(colorful.colors.label).toBe('#E2E2F8');
		expect(colorful.colors.label).not.toBe(vectorDefaults('colorful').colors.label);
		expect(colorful.text).toEqual(gray.text);
	});
});

describe('state from hash config', () => {
	it('applies valid options on top of the theme', () => {
		const state = vectorStateFromConfig('muted', { colors: { water: '#ff0000' } });
		expect(state.colors.water).toBe('#ff0000');
		expect(state.colors.land).toBe(vectorDefaults('muted').colors.land);
	});

	it('falls back to the theme defaults for v5 options', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const state = vectorStateFromConfig('gray', { textScale: 2, fonts: { regular: 'x' } });
		expect(state).toEqual(vectorDefaults('gray'));
		expect(console.warn).toHaveBeenCalled();
	});

	it('falls back to the theme defaults for pre-release v6 text and layout options', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		expect(vectorStateFromConfig('gray', { text: { fonts: 'fira_sans_regular' } })).toEqual(
			vectorDefaults('gray')
		);
		expect(vectorStateFromConfig('gray', { layout: { scale: 2 } })).toEqual(vectorDefaults('gray'));
	});

	it('never takes theme, urls or landcover from the config', () => {
		const state = vectorStateFromConfig('gray', {
			theme: 'toner',
			urls: { base: 'https://evil.example' },
			features: { landcover: true },
		});
		expect(state.colors).toEqual(vectorDefaults('gray').colors);
		expect(state).not.toHaveProperty('urls');
		expect(state.features.landcover).toBe(false);
	});

	it('falls back to satellite defaults for v5 options', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		expect(satelliteStateFromConfig({ rasterOpacity: 0.5 })).toEqual(satelliteDefaults());
		expect(satelliteStateFromConfig({ raster: { opacity: 0.5 } }).raster.opacity).toBe(0.5);
		expect(satelliteStateFromConfig(null)).toEqual(satelliteDefaults());
	});
});

describe('buildVectorStyle', () => {
	it('builds the theme with inlined sources — no TileJSON url left for MapLibre', () => {
		const style = buildVectorStyle('muted', vectorDefaults('muted'), ORIGIN, allSources);
		expect(style.name).toBe('versatiles-muted');
		const source = style.sources['versatiles-shortbread'] as { url?: string; tiles?: string[] };
		expect(source.url).toBeUndefined();
		expect(source.tiles).toEqual(osmTileJSON.tiles);
	});

	it('resolves glyphs and sprites against the origin', () => {
		const style = buildVectorStyle('colorful', vectorDefaults('colorful'), ORIGIN, allSources);
		expect(style.glyphs).toContain(ORIGIN);
		expect(JSON.stringify(style.sprite)).toContain(ORIGIN);
	});

	it('sets landcover from the tileset, whatever the state says', () => {
		const state = vectorDefaults('colorful');
		const plain = buildVectorStyle('colorful', state, ORIGIN, { vector: osmTileJSON });
		const landcover = buildVectorStyle('colorful', state, ORIGIN, { vector: landcoverTileJSON });
		expect(JSON.stringify(plain)).not.toEqual(JSON.stringify(landcover));
		expect(landcover).toEqual(
			osm({
				...state,
				features: { ...state.features, landcover: true },
				urls: { base: ORIGIN, osm: landcoverTileJSON },
			})
		);
	});

	it('leaves terrain and hillshade out while there is no elevation source', () => {
		const state = vectorDefaults('colorful');
		state.features.terrain = { exaggeration: 1 };
		const without = buildVectorStyle('colorful', state, ORIGIN, { vector: osmTileJSON });
		const withElevation = buildVectorStyle('colorful', state, ORIGIN, allSources);
		expect(without.terrain).toBeUndefined();
		expect(withElevation.terrain).toBeDefined();
		expect(withElevation.sources.elevation).not.toHaveProperty('url');
	});
});

describe('vector tiles of another schema', () => {
	const state = vectorDefaults('colorful');
	state.features.landcover = true;

	it('builds OpenMapTiles tiles with omt, which has no landcover', () => {
		const sources: StyleSources = { ...allSources, vector: omtTileJSON, schema: 'openmaptiles' };
		const { landcover: _landcover, ...features } = state.features;
		expect(buildVectorStyle('gray', state, ORIGIN, sources)).toEqual(
			omt({
				...state,
				theme: 'gray',
				features,
				urls: { base: ORIGIN, omt: omtTileJSON, elevation: elevationTileJSON },
			})
		);
	});

	it('builds Protomaps tiles with protomaps, which always has landcover', () => {
		const sources: StyleSources = { vector: omtTileJSON, schema: 'protomaps' };
		expect(buildVectorStyle('gray', vectorDefaults('gray'), ORIGIN, sources)).toEqual(
			protomaps({
				...vectorDefaults('gray'),
				theme: 'gray',
				features: { ...vectorDefaults('gray').features, landcover: true },
				urls: { base: ORIGIN, protomaps: omtTileJSON },
			})
		);
	});

	it('carries the zoom range of the elevation tiles into the style', () => {
		const { hillshade } = osm.resolveOptions({ features: { hillshade: true } }).features;
		const shaded = { ...state, features: { ...state.features, hillshade } };
		const style = buildVectorStyle('gray', shaded, ORIGIN, {
			vector: omtTileJSON,
			schema: 'openmaptiles',
			elevation: tileJSON('elevation', { maxzoom: 12 }),
		});
		expect(style.sources.elevation).toMatchObject({ type: 'raster-dem', maxzoom: 12 });
	});

	it('has a snippet for an npm project only: the browser bundle builds Shortbread tiles', () => {
		expect(codeTargets('gray')).toEqual(['npm', 'browser']);
		expect(codeTargets('gray', 'openmaptiles')).toEqual(['npm']);
		expect(codeTargets('gray', 'protomaps')).toEqual(['npm']);
		expect(codeTargets('satellite', 'openmaptiles')).toEqual(['npm', 'browser']);
		const sources: StyleSources = { vector: omtTileJSON, schema: 'openmaptiles' };
		expect(styleCode('gray', state, satelliteDefaults(), ORIGIN, sources)).toContain(
			"import { omt } from '@versatiles/style/omt';"
		);
	});

	it('names the layers of the schema', () => {
		expect(inspectSources('colorful').layerGroups).toBe(osm.layerGroups);
		expect(inspectSources('colorful', 'openmaptiles').layerGroups).toBe(omt.layerGroups);
		expect(inspectSources('colorful', 'protomaps').textGroups).toBe(protomaps.textGroups);
		expect(inspectSources('satellite', 'protomaps').layerGroups).toBe(satellite.layerGroups);
	});

	it('records the builder of the schema in an exported style', () => {
		const style = buildVectorStyle('gray', state, ORIGIN, allSources);
		expect(readStyleOptions(styleForExport(style, 'gray', {}))?.builder).toBe('osm');
		expect(readStyleOptions(styleForExport(style, 'gray', {}, 'openmaptiles'))?.builder).toBe(
			'omt'
		);
		expect(readStyleOptions(styleForExport(style, 'satellite', {}, 'protomaps'))?.builder).toBe(
			'satellite'
		);
	});

	it('leaves the overlay out of the satellite style: it is drawn from Shortbread tiles only', () => {
		const style = buildSatelliteStyle(satelliteDefaults(), ORIGIN, {
			...allSources,
			vector: omtTileJSON,
			schema: 'openmaptiles',
		});
		expect(style.sources['versatiles-shortbread']).toBeUndefined();
		expect(style.layers.some((layer) => layer.type === 'symbol')).toBe(false);
	});
});

describe('buildSatelliteStyle', () => {
	it('builds imagery with the overlay and inlined sources', () => {
		const style = buildSatelliteStyle(satelliteDefaults(), ORIGIN, allSources);
		const raster = style.sources.satellite as { url?: string; tiles?: string[] };
		expect(raster.url).toBeUndefined();
		expect(raster.tiles).toEqual(satelliteTileJSON.tiles);
		expect(style.sources['versatiles-shortbread']).toBeDefined();
	});

	it('drops the overlay when there is no OSM source', () => {
		const style = buildSatelliteStyle(satelliteDefaults(), ORIGIN, {
			satellite: satelliteTileJSON,
		});
		expect(style.sources['versatiles-shortbread']).toBeUndefined();
	});
});

describe('minimalConfig', () => {
	it('is empty for defaults', () => {
		expect(minimalConfig('colorful', vectorDefaults('colorful'), satelliteDefaults())).toEqual({});
		expect(minimalConfig('gray-dark', vectorDefaults('gray-dark'), satelliteDefaults())).toEqual(
			{}
		);
		expect(minimalConfig('satellite', vectorDefaults('colorful'), satelliteDefaults())).toEqual({});
	});

	it('keeps changes, without theme, urls or landcover', () => {
		const state = vectorDefaults('muted');
		state.colors.water = '#ff0000';
		state.text.places.cities.scale = 2;
		state.icon.scale = 2;
		state.features.landcover = true;
		expect(minimalConfig('muted', state, satelliteDefaults())).toEqual({
			colors: { water: '#ff0000' },
			text: { places: { cities: { scale: 2 } } },
			icon: { scale: 2 },
		});
	});

	it('round-trips through the hash config', () => {
		const state = vectorDefaults('natural-dark');
		state.recolor.tint = { color: '#00ff00', amount: 0 };
		state.text.language = 'user';
		state.features.hillshade = { ...state.features.hillshade, exaggeration: 0.1 } as never;
		state.layers.labels.water.rivers = false;
		state.layers.boundaries.state = { opacity: 0.5, dashed: [4, 2], width: 2 };
		state.layers.roads.footway.dashed = false;
		const config = minimalConfig('natural-dark', state, satelliteDefaults());
		expect(config.layers).toEqual({
			labels: { water: { rivers: false } },
			boundaries: { state: { opacity: 0.5, dashed: [4, 2], width: 2 } },
			roads: { footway: { dashed: false } },
		});
		const restored = vectorStateFromConfig('natural-dark', config);
		expect(buildVectorStyle('natural-dark', restored, ORIGIN, allSources)).toEqual(
			buildVectorStyle('natural-dark', state, ORIGIN, allSources)
		);
	});

	it('round-trips satellite options with a full overlay and map options', () => {
		const state = satelliteDefaults();
		const overlay = overlayDefaults('toner');
		overlay.colors.labelWater = '#00ff00';
		overlay.text.places.cities.font = 'fira_sans_regular';
		overlay.text.streets.names.haloWidth = 3;
		overlay.layers.roads.motorways = 0.5;
		state.osmOverlay = overlay;
		state.projection = 'mercator';
		state.sky = { ...(state.sky as object), skyColor: '#123456' } as typeof state.sky;
		state.sun = {
			direction: 90,
			altitude: 60,
			anchor: 'viewport',
			color: '#ffffff',
			intensity: 0.8,
		};
		const config = minimalConfig('satellite', vectorDefaults('colorful'), state);
		expect(config).toEqual({
			osmOverlay: {
				theme: 'toner',
				colors: { labelWater: '#00ff00' },
				text: {
					places: { cities: { font: 'fira_sans_regular' } },
					streets: { names: { haloWidth: 3 } },
				},
				layers: { roads: { motorways: 0.5 } },
			},
			projection: 'mercator',
			sky: { skyColor: '#123456' },
			sun: { direction: 90, intensity: 0.8 },
		});
		const restored = satelliteStateFromConfig(config);
		expect(buildSatelliteStyle(restored, ORIGIN, allSources)).toEqual(
			buildSatelliteStyle(state, ORIGIN, allSources)
		);
	});

	it('minimises satellite options', () => {
		const state = satelliteDefaults();
		state.raster.opacity = 0.5;
		state.osmOverlay = false;
		expect(minimalConfig('satellite', vectorDefaults('colorful'), state)).toEqual({
			raster: { opacity: 0.5 },
			osmOverlay: false,
		});
	});
});

describe('styleCode', () => {
	it('emits a runnable snippet with the origin as base', () => {
		const state = vectorDefaults('toner');
		state.colors.water = '#ff0000';
		const code = styleCode('toner', state, satelliteDefaults(), ORIGIN, allSources);
		expect(code).toContain("import { osm, inlineSources } from '@versatiles/style';");
		expect(code).toContain('theme: "toner"');
		expect(code).toContain('water: "#ff0000"');
		expect(code).toContain(`base: "${ORIGIN}"`);
		// never the loaded TileJSON
		expect(code).not.toContain('/{z}/{x}/{y}');
	});

	it('carries the detected landcover flag', () => {
		const code = styleCode('colorful', vectorDefaults('colorful'), satelliteDefaults(), ORIGIN, {
			vector: landcoverTileJSON,
		});
		expect(code).toContain('landcover: true');
	});

	it('emits a satellite snippet', () => {
		const state = satelliteDefaults();
		state.raster.opacity = 0.5;
		const code = styleCode('satellite', vectorDefaults('colorful'), state, ORIGIN, allSources);
		expect(code).toContain("import { satellite, inlineSources } from '@versatiles/style';");
		expect(code).toContain('opacity: 0.5');
	});
});

describe('configChangeCount', () => {
	it('counts the values set under the paths', () => {
		const config = {
			text: { language: 'de', places: { cities: { scale: 1.5, font: 'fira_sans_bold' } } },
			layers: { labels: false },
			colors: { water: '#FF0000' },
		};
		expect(configChangeCount(config, ['text'])).toBe(3);
		expect(configChangeCount(config, ['text.places'])).toBe(2);
		expect(configChangeCount(config, ['layers', 'colors'])).toBe(2);
		expect(configChangeCount(config, ['icon', 'sky'])).toBe(0);
		expect(configChangeCount({ osmOverlay: false }, ['osmOverlay'])).toBe(1);
	});
});

describe('themeSwatch', () => {
	it('takes the colors of a card from the theme', () => {
		const colorful = themeSwatch('colorful');
		expect(colorful).toEqual({
			land: vectorDefaults('colorful').colors.land,
			water: vectorDefaults('colorful').colors.water,
			park: vectorDefaults('colorful').colors.naturePark,
			street: vectorDefaults('colorful').colors.roadStreet,
			motorway: vectorDefaults('colorful').colors.roadMotorway,
		});
		expect(themeSwatch('colorful-dark').land).not.toBe(colorful.land);
	});
});

describe('configChanges', () => {
	it('finds set paths, at any depth', () => {
		const config = { recolor: { rotateHue: 90 }, text: { font: 'fira_sans_regular' } };
		expect(configChanges(config, ['recolor'])).toBe(true);
		expect(configChanges(config, ['text.font', 'icon'])).toBe(true);
		expect(configChanges(config, ['text.language'])).toBe(false);
		expect(configChanges(config, ['colors', 'layers'])).toBe(false);
		expect(configChanges({}, ['recolor'])).toBe(false);
	});

	it('sees a switched-off overlay, but nothing below it', () => {
		const config = { osmOverlay: false };
		expect(configChanges(config, ['osmOverlay'])).toBe(true);
		expect(configChanges(config, ['osmOverlay.colors'])).toBe(false);
	});

	it('follows the hash: changes without effect are no changes', () => {
		const state = vectorDefaults('colorful');
		state.colors.water = state.colors.water.toLowerCase();
		state.recolor.tint = { color: '#00ff00', amount: 0 };
		const config = minimalConfig('colorful', state, satelliteDefaults());
		expect(configChanges(config, ['colors', 'recolor'])).toBe(false);
	});
});
