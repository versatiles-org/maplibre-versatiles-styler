<script lang="ts">
	import { satelliteDefaults, type SatelliteState } from '../style_config';
	import SidebarSection from './SidebarSection.svelte';
	import RasterOptions from './sections/RasterOptions.svelte';
	import OverlayOptions from './sections/OverlayOptions.svelte';
	import ElevationOptions from './sections/ElevationOptions.svelte';
	import LanguageOptions from './sections/LanguageOptions.svelte';

	let {
		options = $bindable(),
		overlayAvailable,
		elevationAvailable,
		languages,
	}: {
		options: SatelliteState;
		overlayAvailable: boolean;
		elevationAvailable: boolean;
		languages: Record<string, string>;
	} = $props();

	const defaults = satelliteDefaults();

	function resetImagery() {
		options.raster = structuredClone(defaults.raster);
	}
	function resetOverlay() {
		options.osmOverlay = structuredClone(defaults.osmOverlay);
	}
	function resetElevation() {
		options.features = structuredClone(defaults.features);
	}
	function resetLabels() {
		if (options.osmOverlay && defaults.osmOverlay) {
			options.osmOverlay.text.language = defaults.osmOverlay.text.language;
			options.osmOverlay.text.languageStrict = defaults.osmOverlay.text.languageStrict;
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
<SidebarSection
	title="Terrain & hillshade"
	description={elevationAvailable
		? '3D elevation features rendered from an elevation source.'
		: 'Unavailable — this server provides no elevation tiles.'}
	onReset={elevationAvailable ? resetElevation : undefined}
>
	<ElevationOptions bind:features={options.features} disabled={!elevationAvailable} />
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
