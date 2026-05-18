<script lang="ts">
	import type { StyleBuilderOptions } from '@versatiles/style';
	import type { EnforcedStyleBuilderOptions } from '../style_config';
	import SidebarSection from './SidebarSection.svelte';
	import ColorOptions from './sections/ColorOptions.svelte';
	import RecolorOptions from './sections/RecolorOptions.svelte';
	import FontOptions from './sections/FontOptions.svelte';
	import ScaleOptions from './sections/ScaleOptions.svelte';
	import ElevationOptions from './sections/ElevationOptions.svelte';
	import LanguageOptions from './sections/LanguageOptions.svelte';

	let {
		options = $bindable(),
		defaults,
		hasElevation,
		fontNames,
		languages,
		onchange,
	}: {
		options: EnforcedStyleBuilderOptions;
		defaults: StyleBuilderOptions;
		hasElevation: boolean;
		fontNames: Promise<Record<string, string>>;
		languages: Promise<Record<string, string>>;
		onchange?: () => void;
	} = $props();
</script>

<SidebarSection title="Edit individual colors">
	<ColorOptions bind:colors={options.colors} defaults={defaults.colors} {onchange} />
</SidebarSection>
<SidebarSection title="Modify all colors">
	<RecolorOptions bind:recolor={options.recolor} defaults={defaults.recolor} {onchange} />
</SidebarSection>
<SidebarSection title="Other options">
	<FontOptions bind:fonts={options.fonts} defaults={defaults.fonts} {fontNames} {onchange} />
	<ScaleOptions bind:options {defaults} {onchange} />
	{#if hasElevation}
		<ElevationOptions bind:options {onchange} />
	{/if}
	<LanguageOptions
		bind:language={() => (options.language as string) ?? '', (v: string) => (options.language = v)}
		{languages}
		{onchange}
	/>
</SidebarSection>
