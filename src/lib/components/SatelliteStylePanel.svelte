<script lang="ts">
	import { satellite, type FontFaceInfo } from '@versatiles/style';
	import { overlayDefaults, satelliteDefaults, type SatelliteState } from '../style_config';
	import SidebarSection from './SidebarSection.svelte';
	import RasterOptions from './sections/RasterOptions.svelte';
	import OverlayOptions from './sections/OverlayOptions.svelte';
	import RecolorOptions from './sections/RecolorOptions.svelte';
	import ColorOptions from './sections/ColorOptions.svelte';
	import FontOptions from './sections/FontOptions.svelte';
	import LayoutOptions from './sections/LayoutOptions.svelte';
	import LayerOptions from './sections/LayerOptions.svelte';
	import ElevationOptions from './sections/ElevationOptions.svelte';
	import MapOptions from './sections/MapOptions.svelte';
	import LanguageOptions from './sections/LanguageOptions.svelte';

	let {
		options = $bindable(),
		overlayAvailable,
		elevationAvailable,
		fontFaces,
		languages,
	}: {
		options: SatelliteState;
		overlayAvailable: boolean;
		elevationAvailable: boolean;
		fontFaces: Promise<FontFaceInfo[] | undefined>;
		languages: Record<string, string>;
	} = $props();

	const defaults = satelliteDefaults();
	// MapLibre's own sky colour, used when there is no overlay palette to take `water` from.
	const MAPLIBRE_SKY_COLOR = '#88C6FC';

	// The overlay's defaults follow its theme.
	let overlay = $derived(
		options.osmOverlay ? overlayDefaults(options.osmOverlay.theme) : undefined
	);

	function resetImagery() {
		options.raster = structuredClone(defaults.raster);
	}
	function resetOverlay() {
		options.osmOverlay = structuredClone(defaults.osmOverlay);
	}
	function resetOverlayRecolor() {
		if (options.osmOverlay && overlay)
			options.osmOverlay.recolor = structuredClone(overlay.recolor);
	}
	function resetOverlayColors() {
		if (options.osmOverlay && overlay) options.osmOverlay.colors = structuredClone(overlay.colors);
	}
	function resetOverlayTypography() {
		if (options.osmOverlay && overlay) {
			options.osmOverlay.text.fonts = structuredClone(overlay.text.fonts);
			options.osmOverlay.layout = structuredClone(overlay.layout);
		}
	}
	function resetOverlayLayers() {
		if (options.osmOverlay && overlay) options.osmOverlay.layers = structuredClone(overlay.layers);
	}
	function resetElevation() {
		options.features = structuredClone(defaults.features);
	}
	function resetMap() {
		options.projection = defaults.projection;
		options.sky = structuredClone(defaults.sky);
		options.sun = structuredClone(defaults.sun);
	}
	function resetLabels() {
		if (options.osmOverlay && overlay) {
			options.osmOverlay.text.language = overlay.text.language;
			options.osmOverlay.text.languageStrict = overlay.text.languageStrict;
		}
	}
</script>

<SidebarSection
	title="Satellite imagery"
	description="Adjust how the raster satellite layer is displayed."
	onReset={resetImagery}
>
	<RasterOptions bind:raster={options.raster} defaults={defaults.raster} />
</SidebarSection>
<SidebarSection
	title="Overlay"
	description={overlayAvailable
		? 'Draw vector labels and roads over the satellite imagery.'
		: 'Unavailable — needs both a vector (OSM) and a satellite source.'}
	onReset={overlayAvailable ? resetOverlay : undefined}
>
	<OverlayOptions bind:overlay={options.osmOverlay} disabled={!overlayAvailable} />
</SidebarSection>
{#if options.osmOverlay && overlay}
	<SidebarSection
		title="Overlay color adjustments"
		description="Transformations applied to every color of the overlay."
		onReset={resetOverlayRecolor}
	>
		<RecolorOptions bind:recolor={options.osmOverlay.recolor} defaults={overlay.recolor} />
	</SidebarSection>
	<SidebarSection
		title="Overlay colors"
		description="Override the color of individual overlay features."
		onReset={resetOverlayColors}
	>
		<ColorOptions bind:colors={options.osmOverlay.colors} defaults={overlay.colors} />
	</SidebarSection>
	<SidebarSection title="Overlay fonts & text size" onReset={resetOverlayTypography}>
		<FontOptions
			bind:fonts={options.osmOverlay.text.fonts}
			defaults={overlay.text.fonts}
			fontGroups={satellite.fontGroups}
			{fontFaces}
			language={options.osmOverlay.text.language}
			disabled={!overlayAvailable}
		/>
		<LayoutOptions
			bind:layout={options.osmOverlay.layout}
			defaults={overlay.layout}
			disabled={!overlayAvailable}
		/>
	</SidebarSection>
	<SidebarSection
		title="Overlay layers"
		description="Show, hide or fade the overlay's roads, boundaries and labels."
		onReset={resetOverlayLayers}
	>
		<LayerOptions
			bind:layers={options.osmOverlay.layers}
			defaults={overlay.layers}
			layerGroups={satellite.layerGroups}
			disabled={!overlayAvailable}
		/>
	</SidebarSection>
{/if}
<SidebarSection
	title="Terrain & hillshade"
	description={elevationAvailable
		? '3D elevation features rendered from an elevation source.'
		: 'Unavailable — this server provides no elevation tiles.'}
	onReset={elevationAvailable ? resetElevation : undefined}
>
	<ElevationOptions bind:features={options.features} disabled={!elevationAvailable} />
</SidebarSection>
<SidebarSection title="Map" description="Projection, sky and sun." onReset={resetMap}>
	<MapOptions
		bind:projection={options.projection}
		bind:sky={options.sky}
		bind:sun={options.sun}
		skyColorFallback={options.osmOverlay ? options.osmOverlay.colors.water : MAPLIBRE_SKY_COLOR}
	/>
</SidebarSection>
<SidebarSection
	title="Labels"
	description="Language used for place names and labels."
	onReset={resetLabels}
>
	{#if options.osmOverlay}
		<LanguageOptions
			bind:language={options.osmOverlay.text.language}
			bind:languageStrict={options.osmOverlay.text.languageStrict}
			{languages}
		/>
	{:else}
		<LanguageOptions language="local" languageStrict={false} {languages} disabled />
	{/if}
</SidebarSection>
