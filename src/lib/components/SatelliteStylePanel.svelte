<script lang="ts">
	import { satellite, type FontFaceInfo } from '@versatiles/style';
	import {
		configChangeCount,
		overlayDefaults,
		satelliteDefaults,
		type SatelliteState,
	} from '../style/config';
	import SidebarSection from './SidebarSection.svelte';
	import RasterOptions from './sections/RasterOptions.svelte';
	import OverlayOptions from './sections/OverlayOptions.svelte';
	import RecolorOptions from './sections/RecolorOptions.svelte';
	import ColorOptions from './sections/ColorOptions.svelte';
	import LabelOptions from './sections/LabelOptions.svelte';
	import IconOptions from './sections/IconOptions.svelte';
	import LayerOptions from './sections/LayerOptions.svelte';
	import ElevationOptions from './sections/ElevationOptions.svelte';
	import MapOptions from './sections/MapOptions.svelte';

	let {
		options = $bindable(),
		config,
		origin,
		overlayAvailable,
		elevationAvailable,
		fontFaces,
		languages,
	}: {
		options: SatelliteState;
		/** The minimal config of the current options, to tell which sections have changes. */
		config: Record<string, unknown>;
		/** The server the font previews load their glyphs from. */
		origin: string;
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
	const changes = (...paths: string[]) => configChangeCount(config, paths);

	/** The overlay section covers the overlay switch and its theme; the theme brings its colors. */
	function resetOverlay() {
		if (!options.osmOverlay) {
			options.osmOverlay = structuredClone(defaults.osmOverlay);
		} else if (defaults.osmOverlay) {
			options.osmOverlay.theme = defaults.osmOverlay.theme;
			options.osmOverlay.colors = structuredClone(defaults.osmOverlay.colors);
		}
	}
	function resetOverlayRecolor() {
		if (options.osmOverlay && overlay)
			options.osmOverlay.recolor = structuredClone(overlay.recolor);
	}
	function resetOverlayColors() {
		if (options.osmOverlay && overlay) options.osmOverlay.colors = structuredClone(overlay.colors);
	}
	function resetOverlayLabels() {
		if (options.osmOverlay && overlay) options.osmOverlay.text = structuredClone(overlay.text);
	}
	function resetOverlayIcons() {
		if (options.osmOverlay && overlay) options.osmOverlay.icon = structuredClone(overlay.icon);
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
</script>

<h4 class="section-group">Content</h4>
<SidebarSection
	title="Satellite imagery"
	description="Adjust how the raster satellite layer is displayed."
	onReset={resetImagery}
	changes={changes('raster')}
>
	<RasterOptions bind:raster={options.raster} defaults={defaults.raster} />
</SidebarSection>
<SidebarSection
	title="Overlay"
	description={overlayAvailable
		? 'Draw vector labels and roads over the satellite imagery.'
		: 'Unavailable — needs both a vector (OSM) and a satellite source.'}
	onReset={overlayAvailable ? resetOverlay : undefined}
	changes={config.osmOverlay === false ? 1 : changes('osmOverlay.theme')}
>
	<OverlayOptions bind:overlay={options.osmOverlay} disabled={!overlayAvailable} />
</SidebarSection>
{#if options.osmOverlay && overlay}
	<SidebarSection
		title="Overlay layers"
		description="Show, hide or fade the overlay's roads, boundaries and labels."
		onReset={resetOverlayLayers}
		changes={changes('osmOverlay.layers')}
	>
		<LayerOptions
			bind:layers={options.osmOverlay.layers}
			defaults={overlay.layers}
			layerGroups={satellite.layerGroups}
			disabled={!overlayAvailable}
		/>
	</SidebarSection>
	<h4 class="section-group">Appearance</h4>
	<SidebarSection
		title="Overlay colors"
		description="Override the color of individual overlay features."
		onReset={resetOverlayColors}
		changes={changes('osmOverlay.colors')}
	>
		<ColorOptions bind:colors={options.osmOverlay.colors} defaults={overlay.colors} />
	</SidebarSection>
	<SidebarSection
		title="Overlay color adjustments"
		description="Transformations applied to every color of the overlay."
		onReset={resetOverlayRecolor}
		changes={changes('osmOverlay.recolor')}
	>
		<RecolorOptions bind:recolor={options.osmOverlay.recolor} defaults={overlay.recolor} />
	</SidebarSection>
	<SidebarSection
		title="Overlay labels"
		description="Language, fonts and the look of the overlay's labels."
		onReset={resetOverlayLabels}
		changes={changes('osmOverlay.text')}
	>
		<LabelOptions
			bind:text={options.osmOverlay.text}
			defaults={overlay.text}
			textGroups={satellite.textGroups}
			{fontFaces}
			{languages}
			{origin}
			disabled={!overlayAvailable}
		/>
	</SidebarSection>
	<SidebarSection
		title="Overlay icons"
		description="Size and spacing of the overlay's icons, shields and road markings."
		onReset={resetOverlayIcons}
		changes={changes('osmOverlay.icon')}
	>
		<IconOptions
			bind:icon={options.osmOverlay.icon}
			defaults={overlay.icon}
			disabled={!overlayAvailable}
		/>
	</SidebarSection>
{/if}
<h4 class="section-group">Scene</h4>
<SidebarSection
	title="Terrain & hillshade"
	description={elevationAvailable
		? '3D elevation features rendered from an elevation source.'
		: 'Unavailable — this server provides no elevation tiles.'}
	onReset={elevationAvailable ? resetElevation : undefined}
	changes={changes('features.terrain', 'features.hillshade')}
>
	<ElevationOptions bind:features={options.features} disabled={!elevationAvailable} />
</SidebarSection>
<SidebarSection
	title="Map"
	description="Projection, sky and sun."
	onReset={resetMap}
	changes={changes('projection', 'sky', 'sun')}
>
	<MapOptions
		bind:projection={options.projection}
		bind:sky={options.sky}
		bind:sun={options.sun}
		skyColorFallback={options.osmOverlay ? options.osmOverlay.colors.water : MAPLIBRE_SKY_COLOR}
	/>
</SidebarSection>
