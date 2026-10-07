import { describe, it, expect } from 'vitest';
import { osm, satellite } from '@versatiles/style';

/**
 * Every option of @versatiles/style has a control, or is left out on purpose. The trees — colors, layer
 * groups, label topics — are read from the library and have tests of their own; the single options are
 * written out in the components, where a new one of the library would go unnoticed. So each is listed
 * here with the component that edits it and the code that does: a new option fails the first test, a
 * control that was removed the second.
 */

/** Options without a control, and why. */
const IGNORED: Record<string, string> = {
	'features.landcover': 'detected from the tileset',
	theme: 'the base style, chosen in the theme picker',
	'osmOverlay.layerOpacity': 'only for MapLibre GL JS 6, MapLibre Native drops the layers',
};

/** Where an option is edited: the component, and the code in it that reads or writes the option. */
type Control = [file: string, code: string];

const elevation = (code: string): Control => ['sections/ElevationOptions.svelte', code];
const map = (code: string): Control => ['sections/MapOptions.svelte', code];
const recolor = (code: string): Control => ['sections/RecolorOptions.svelte', code];
const raster = (code: string): Control => ['sections/RasterOptions.svelte', code];
const label = (code: string): Control => ['sections/LabelOptions.svelte', code];
const layer = (code: string): Control => ['sections/LayerOptions.svelte', code];

const CONTROLS: Record<string, Control> = {
	'features.terrain.exaggeration': elevation('features.terrain.exaggeration'),
	'features.hillshade.exaggeration': elevation('features.hillshade.exaggeration'),
	'features.hillshade.shadowColor': elevation('features.hillshade.shadowColor'),
	'features.hillshade.highlightColor': elevation('features.hillshade.highlightColor'),
	'features.hillshade.accentColor': elevation('features.hillshade.accentColor'),
	'features.hillshade.anchor': elevation('features.hillshade.anchor'),
	'features.buildings': ['VectorStylePanel.svelte', 'options.features.buildings'],

	projection: map('bind:value={() => projection'),
	'sun.direction': map('sun.direction'),
	'sun.altitude': map('sun.altitude'),
	'sun.anchor': map('sun.anchor'),
	'sun.color': map('sun.color'),
	'sun.intensity': map('sun.intensity'),
	'sky.skyColor': map('sky.skyColor'),
	'sky.fogColor': map('sky.fogColor'),
	'sky.horizonColor': map('sky.horizonColor'),
	'sky.atmosphereBlend': map("key: 'atmosphereBlend'"),
	'sky.fogGroundBlend': map("key: 'fogGroundBlend'"),
	'sky.horizonFogBlend': map("key: 'horizonFogBlend'"),
	'sky.skyHorizonBlend': map("key: 'skyHorizonBlend'"),

	'recolor.invertBrightness': recolor('recolor.invertBrightness'),
	'recolor.rotateHue': recolor('recolor.rotateHue'),
	'recolor.saturate': recolor('recolor.saturate'),
	'recolor.gamma': recolor('recolor.gamma'),
	'recolor.contrast': recolor('recolor.contrast'),
	'recolor.brightness': recolor('recolor.brightness'),
	'recolor.tint.color': recolor('recolor.tint.color'),
	'recolor.tint.amount': recolor('recolor.tint.amount'),
	'recolor.blend.color': recolor('recolor.blend.color'),
	'recolor.blend.amount': recolor('recolor.blend.amount'),

	'icon.scale': ['sections/IconOptions.svelte', 'icon.scale'],
	'icon.spacing': ['sections/IconOptions.svelte', 'icon.spacing'],

	'text.language': ['sections/LanguageOptions.svelte', 'bind:value={language}'],
	'text.languageStrict': ['sections/LanguageOptions.svelte', 'bind:value={languageStrict}'],
	'text.pitchAlignment': label('text.pitchAlignment'),

	// What every label topic takes, e.g. `text.places.cities.font`.
	'text.*.font': label("set('font'"),
	'text.*.scale': label("key: 'scale'"),
	'text.*.spacing': label("key: 'spacing'"),
	'text.*.maxWidth': label("key: 'maxWidth'"),
	'text.*.lineHeight': label("key: 'lineHeight'"),
	'text.*.letterSpacing': label("key: 'letterSpacing'"),
	'text.*.transform': label("set('transform'"),
	'text.*.haloWidth': label("key: 'haloWidth'"),
	'text.*.haloBlur': label("key: 'haloBlur'"),

	// What a border or a path takes beyond showing, hiding and fading, e.g. `layers.boundaries.state.width`.
	'layers.*.opacity': layer('setLayerValue(layers, node, value)'),
	'layers.*.dashed': layer('style.dashed'),
	'layers.*.width': layer('style.width'),

	'raster.opacity': raster('raster.opacity'),
	'raster.hueRotate': raster('raster.hueRotate'),
	'raster.brightnessMin': raster('raster.brightnessMin'),
	'raster.brightnessMax': raster('raster.brightnessMax'),
	'raster.saturation': raster('raster.saturation'),
	'raster.contrast': raster('raster.contrast'),

	'osmOverlay.theme': ['sections/OverlayOptions.svelte', 'overlay.theme'],
};

type Tree = { [key: string]: unknown };

const isTree = (value: unknown): value is Tree =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** The paths of the values of a tree, e.g. `recolor.tint.amount`. */
function paths(tree: Tree, prefix = ''): string[] {
	return Object.entries(tree).flatMap(([key, value]) =>
		isTree(value) ? paths(value, `${prefix}${key}.`) : [`${prefix}${key}`]
	);
}

/**
 * The options of a style as the controls see them. The trees with tests of their own are left out,
 * except for what their leaves take: the properties of a label topic, and of a border or a path.
 */
function optionKeys(resolved: Tree, textGroups: Tree, layerGroups: Tree): string[] {
	const keys = new Set<string>();
	for (const path of paths(resolved)) {
		const parts = path.split('.');
		const [root, group] = parts;
		const leaf = parts[parts.length - 1];
		if (root === 'urls' || root === 'colors') continue;
		if (root === 'layers') {
			// A group is a switch or an opacity. A border or a path is an object with more to set: its
			// path ends below what `layerGroups` lists as a group.
			if (Array.isArray(valueAt(layerGroups, parts.slice(1, -1)))) keys.add(`layers.*.${leaf}`);
		} else if (root === 'text' && group in textGroups) {
			keys.add(`text.*.${leaf}`);
		} else {
			keys.add(path);
		}
	}
	return [...keys].sort();
}

function valueAt(tree: Tree, path: string[]): unknown {
	return path.reduce<unknown>((node, key) => (isTree(node) ? node[key] : undefined), tree);
}

// Everything switched on, so that the options of terrain, hillshade and sun are there to list.
const everything = { sun: true as const, features: { terrain: true, hillshade: true } };
const osmResolved = osm.resolveOptions(everything) as unknown as Tree;
const { osmOverlay, ...satelliteResolved } = satellite.resolveOptions(everything);

const osmKeys = optionKeys(osmResolved, osm.textGroups, osm.layerGroups);
// The overlay is edited by the sections of the vector style, so its options go by the same names;
// only what the overlay has of its own keeps the prefix.
const overlayKeys = optionKeys(
	osmOverlay as unknown as Tree,
	satellite.textGroups,
	satellite.layerGroups
).map((key) => (osmKeys.includes(key) && key !== 'theme' ? key : `osmOverlay.${key}`));
const satelliteKeys = [...optionKeys(satelliteResolved as unknown as Tree, {}, {}), ...overlayKeys];
// `sky.skyColor` is resolved only when it is set: the sky follows the water otherwise.
const libraryKeys = [...new Set([...osmKeys, ...satelliteKeys, 'sky.skyColor'])].sort();

// The components as text.
const sources = import.meta.glob<string>('./**/*.svelte', {
	query: '?raw',
	import: 'default',
	eager: true,
});
const source = (file: string) => sources[`./${file}`] ?? '';

describe('the controls and the options of @versatiles/style', () => {
	it('finds the options of both styles, the leaves of the trees included', () => {
		expect(libraryKeys).toContain('recolor.tint.amount');
		expect(libraryKeys).toContain('raster.brightnessMin');
		expect(libraryKeys).toContain('text.*.haloBlur');
		expect(libraryKeys).toContain('layers.*.dashed');
		expect(libraryKeys).toContain('osmOverlay.layerOpacity');
		expect(libraryKeys.some((key) => key.startsWith('colors.'))).toBe(false);
	});

	it('has a control for every option, or leaves it out on purpose', () => {
		const known = [...Object.keys(CONTROLS), ...Object.keys(IGNORED)].sort();
		expect(known).toEqual(libraryKeys);
	});

	it('edits every option in the component listed for it', () => {
		for (const [key, [file, code]] of Object.entries(CONTROLS)) {
			expect(source(file).includes(code), `${key}: "${code}" in ${file}`).toBe(true);
		}
	});
});
