<script lang="ts">
	import type { SatelliteStyleOptions } from '@versatiles/style';
	import { defaultSatelliteOptions } from '../style_config';
	import SidebarSection from './SidebarSection.svelte';
	import SatelliteOptions from './sections/SatelliteOptions.svelte';
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

<SidebarSection title="Satellite options">
	<SatelliteOptions
		bind:options
		defaults={defaultSatelliteOptions}
		{overlayAvailable}
		{elevationAvailable}
		{onchange}
	/>
</SidebarSection>
<SidebarSection title="Other options">
	<LanguageOptions
		bind:language={() => (options.language as string) ?? '', (v: string) => (options.language = v)}
		{languages}
		{onchange}
	/>
</SidebarSection>
