<script lang="ts">
	import type { SatelliteStyleOptions } from '@versatiles/style';
	import { defaultSatelliteOptions } from '../style_config';
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
		onchange,
	}: {
		options: SatelliteStyleOptions;
		overlayAvailable: boolean;
		elevationAvailable: boolean;
		languages: Promise<Record<string, string>>;
		onchange?: () => void;
	} = $props();

	function resetImagery() {
		options.rasterOpacity = undefined;
		options.rasterHueRotate = undefined;
		options.rasterBrightnessMin = undefined;
		options.rasterBrightnessMax = undefined;
		options.rasterSaturation = undefined;
		options.rasterContrast = undefined;
		onchange?.();
	}
	function resetOverlay() {
		options.overlay = undefined;
		options.textScale = undefined;
		options.iconScale = undefined;
		onchange?.();
	}
	function resetElevation() {
		options.terrain = undefined;
		options.hillshade = undefined;
		onchange?.();
	}
	function resetLabels() {
		options.language = undefined;
		onchange?.();
	}
</script>

<SidebarSection
	title="Satellite imagery"
	description="Adjust how the raster satellite layer is displayed."
	onReset={resetImagery}
>
	<RasterOptions bind:options defaults={defaultSatelliteOptions} {onchange} />
</SidebarSection>
<SidebarSection
	title="Overlay"
	description={overlayAvailable
		? 'Draw vector labels and roads over the satellite imagery.'
		: 'Unavailable — needs both a vector (OSM) and a satellite source.'}
	onReset={overlayAvailable ? resetOverlay : undefined}
>
	<OverlayOptions
		bind:options
		defaults={defaultSatelliteOptions}
		disabled={!overlayAvailable}
		{onchange}
	/>
</SidebarSection>
<SidebarSection
	title="Terrain & hillshade"
	description={elevationAvailable
		? '3D elevation features rendered from an elevation source.'
		: 'Unavailable — this server provides no elevation tiles.'}
	onReset={elevationAvailable ? resetElevation : undefined}
>
	<ElevationOptions bind:options disabled={!elevationAvailable} {onchange} />
</SidebarSection>
<SidebarSection
	title="Labels"
	description="Language used for place names and labels."
	onReset={resetLabels}
>
	<LanguageOptions
		bind:language={() => (options.language as string) ?? '', (v: string) => (options.language = v)}
		{languages}
		{onchange}
	/>
</SidebarSection>
