<script lang="ts">
	import { osm, type FontFaceInfo } from '@versatiles/style';
	import { configChanges, type VectorState } from '../style_config';
	import SidebarSection from './SidebarSection.svelte';
	import ColorOptions from './sections/ColorOptions.svelte';
	import RecolorOptions from './sections/RecolorOptions.svelte';
	import LabelOptions from './sections/LabelOptions.svelte';
	import IconOptions from './sections/IconOptions.svelte';
	import ElevationOptions from './sections/ElevationOptions.svelte';
	import LayerOptions from './sections/LayerOptions.svelte';
	import MapOptions from './sections/MapOptions.svelte';
	import InputCheckbox from './inputs/InputCheckbox.svelte';

	let {
		options = $bindable(),
		defaults,
		config,
		origin,
		hasElevation,
		fontFaces,
		languages,
	}: {
		options: VectorState;
		defaults: VectorState;
		/** The minimal config of the current options, to tell which sections have changes. */
		config: Record<string, unknown>;
		/** The server the font previews load their glyphs from. */
		origin: string;
		hasElevation: boolean;
		fontFaces: Promise<FontFaceInfo[] | undefined>;
		languages: Record<string, string>;
	} = $props();

	const changed = (...paths: string[]) => configChanges(config, paths);

	function resetColorAdjustments() {
		options.recolor = structuredClone(defaults.recolor);
	}
	function resetIndividualColors() {
		options.colors = structuredClone(defaults.colors);
	}
	function resetLabels() {
		options.text = structuredClone(defaults.text);
	}
	function resetIcons() {
		options.icon = structuredClone(defaults.icon);
	}
	function resetLayers() {
		options.layers = structuredClone(defaults.layers);
		options.features.buildings = defaults.features.buildings;
	}
	function resetElevation() {
		options.features.terrain = defaults.features.terrain;
		options.features.hillshade = defaults.features.hillshade;
	}
	function resetMap() {
		options.projection = defaults.projection;
		options.sky = structuredClone(defaults.sky);
		options.sun = structuredClone(defaults.sun);
	}
</script>

<SidebarSection
	title="Color adjustments"
	description="Transformations applied to every color in the style."
	onReset={resetColorAdjustments}
	modified={changed('recolor')}
>
	<RecolorOptions bind:recolor={options.recolor} defaults={defaults.recolor} />
</SidebarSection>
<SidebarSection
	title="Individual colors"
	description="Override the color of individual map features."
	onReset={resetIndividualColors}
	modified={changed('colors')}
>
	<ColorOptions bind:colors={options.colors} defaults={defaults.colors} />
</SidebarSection>
<SidebarSection
	title="Labels"
	description="Language, fonts and the look of labels."
	onReset={resetLabels}
	modified={changed('text')}
>
	<LabelOptions
		bind:text={options.text}
		defaults={defaults.text}
		textGroups={osm.textGroups}
		{fontFaces}
		{languages}
		{origin}
	/>
</SidebarSection>
<SidebarSection
	title="Icons"
	description="Size and spacing of POI icons, shields and road markings."
	onReset={resetIcons}
	modified={changed('icon')}
>
	<IconOptions bind:icon={options.icon} defaults={defaults.icon} />
</SidebarSection>
<SidebarSection
	title="Layers"
	description="Show, hide or fade groups of map features."
	onReset={resetLayers}
	modified={changed('layers', 'features.buildings')}
>
	<InputCheckbox
		label="3D buildings"
		hint="Extrude buildings by their height when the map is tilted."
		bind:value={
			() => options.features.buildings === 'extruded',
			(v) => (options.features.buildings = v ? 'extruded' : 'flat')
		}
		defaultValue={defaults.features.buildings === 'extruded'}
	/>
	<LayerOptions
		bind:layers={options.layers}
		defaults={defaults.layers}
		layerGroups={osm.layerGroups}
	/>
</SidebarSection>
<SidebarSection
	title="Terrain & hillshade"
	description={hasElevation
		? '3D elevation features rendered from an elevation source.'
		: 'Unavailable — this server provides no elevation tiles.'}
	onReset={hasElevation ? resetElevation : undefined}
	modified={changed('features.terrain', 'features.hillshade')}
>
	<ElevationOptions bind:features={options.features} disabled={!hasElevation} />
</SidebarSection>
<SidebarSection
	title="Map"
	description="Projection, sky and sun."
	onReset={resetMap}
	modified={changed('projection', 'sky', 'sun')}
>
	<MapOptions
		bind:projection={options.projection}
		bind:sky={options.sky}
		bind:sun={options.sun}
		skyColorFallback={options.colors.water}
	/>
</SidebarSection>
