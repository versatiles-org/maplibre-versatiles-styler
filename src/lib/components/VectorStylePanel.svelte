<script lang="ts">
	import { osm, type FontFaceInfo } from '@versatiles/style';
	import type { VectorState } from '../style_config';
	import SidebarSection from './SidebarSection.svelte';
	import ColorOptions from './sections/ColorOptions.svelte';
	import RecolorOptions from './sections/RecolorOptions.svelte';
	import FontOptions from './sections/FontOptions.svelte';
	import LayoutOptions from './sections/LayoutOptions.svelte';
	import ElevationOptions from './sections/ElevationOptions.svelte';
	import LayerOptions from './sections/LayerOptions.svelte';
	import MapOptions from './sections/MapOptions.svelte';
	import InputCheckbox from './inputs/InputCheckbox.svelte';
	import LanguageOptions from './sections/LanguageOptions.svelte';

	let {
		options = $bindable(),
		defaults,
		hasElevation,
		fontFaces,
		languages,
	}: {
		options: VectorState;
		defaults: VectorState;
		hasElevation: boolean;
		fontFaces: Promise<FontFaceInfo[] | undefined>;
		languages: Record<string, string>;
	} = $props();

	function resetColorAdjustments() {
		options.recolor = structuredClone(defaults.recolor);
	}
	function resetIndividualColors() {
		options.colors = structuredClone(defaults.colors);
	}
	function resetTypography() {
		options.text.fonts = structuredClone(defaults.text.fonts);
		options.layout = structuredClone(defaults.layout);
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
	function resetLabels() {
		options.text.language = defaults.text.language;
		options.text.languageStrict = defaults.text.languageStrict;
	}
</script>

<SidebarSection
	title="Color adjustments"
	description="Transformations applied to every color in the style."
	onReset={resetColorAdjustments}
>
	<RecolorOptions bind:recolor={options.recolor} defaults={defaults.recolor} />
</SidebarSection>
<SidebarSection
	title="Individual colors"
	description="Override the color of individual map features."
	onReset={resetIndividualColors}
>
	<ColorOptions bind:colors={options.colors} defaults={defaults.colors} />
</SidebarSection>
<SidebarSection title="Fonts & text size" onReset={resetTypography}>
	<FontOptions
		bind:fonts={options.text.fonts}
		defaults={defaults.text.fonts}
		fontGroups={osm.fontGroups}
		{fontFaces}
		language={options.text.language}
	/>
	<LayoutOptions bind:layout={options.layout} defaults={defaults.layout} />
</SidebarSection>
<SidebarSection
	title="Layers"
	description="Show, hide or fade groups of map features."
	onReset={resetLayers}
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
>
	<ElevationOptions bind:features={options.features} disabled={!hasElevation} />
</SidebarSection>
<SidebarSection title="Map" description="Projection, sky and sun." onReset={resetMap}>
	<MapOptions
		bind:projection={options.projection}
		bind:sky={options.sky}
		bind:sun={options.sun}
		skyColorFallback={options.colors.water}
	/>
</SidebarSection>
<SidebarSection
	title="Labels"
	description="Language used for place names and labels."
	onReset={resetLabels}
>
	<LanguageOptions
		bind:language={options.text.language}
		bind:languageStrict={options.text.languageStrict}
		{languages}
	/>
</SidebarSection>
