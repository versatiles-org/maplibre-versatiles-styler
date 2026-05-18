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

<SidebarSection title="Satellite imagery">
	<RasterOptions bind:options defaults={defaultSatelliteOptions} {onchange} />
</SidebarSection>
{#if overlayAvailable}
	<SidebarSection title="Overlay">
		<OverlayOptions bind:options defaults={defaultSatelliteOptions} {onchange} />
	</SidebarSection>
{/if}
{#if elevationAvailable}
	<SidebarSection title="Terrain & hillshade">
		<ElevationOptions bind:options {onchange} />
	</SidebarSection>
{/if}
<SidebarSection title="Labels">
	<LanguageOptions
		bind:language={() => (options.language as string) ?? '', (v: string) => (options.language = v)}
		{languages}
		{onchange}
	/>
</SidebarSection>
