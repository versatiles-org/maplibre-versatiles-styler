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
</script>

<SidebarSection
	title="Satellite imagery"
	description="Adjust how the raster satellite layer is displayed."
>
	<RasterOptions bind:options defaults={defaultSatelliteOptions} {onchange} />
</SidebarSection>
{#if overlayAvailable}
	<SidebarSection
		title="Overlay"
		description="Draw vector labels and roads over the satellite imagery."
	>
		<OverlayOptions bind:options defaults={defaultSatelliteOptions} {onchange} />
	</SidebarSection>
{/if}
{#if elevationAvailable}
	<SidebarSection
		title="Terrain & hillshade"
		description="3D elevation features rendered from an elevation source."
	>
		<ElevationOptions bind:options {onchange} />
	</SidebarSection>
{/if}
<SidebarSection title="Labels" description="Language used for place names and labels.">
	<LanguageOptions
		bind:language={() => (options.language as string) ?? '', (v: string) => (options.language = v)}
		{languages}
		{onchange}
	/>
</SidebarSection>
