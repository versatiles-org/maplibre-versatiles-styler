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

	function resetColorAdjustments() {
		options.recolor = { ...defaults.recolor };
		onchange?.();
	}
	function resetIndividualColors() {
		options.colors = { ...defaults.colors };
		onchange?.();
	}
	function resetTypography() {
		options.fonts = {};
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
	title="Color adjustments"
	description="Transformations applied to every color in the style."
	onReset={resetColorAdjustments}
>
	<RecolorOptions bind:recolor={options.recolor} defaults={defaults.recolor} {onchange} />
</SidebarSection>
<SidebarSection
	title="Individual colors"
	description="Override the color of individual map features."
	onReset={resetIndividualColors}
>
	<ColorOptions bind:colors={options.colors} defaults={defaults.colors} {onchange} />
</SidebarSection>
<SidebarSection title="Fonts & text size" onReset={resetTypography}>
	<FontOptions bind:fonts={options.fonts} defaults={defaults.fonts} {fontNames} {onchange} />
	<ScaleOptions bind:options {defaults} {onchange} />
</SidebarSection>
<SidebarSection
	title="Terrain & hillshade"
	description={hasElevation
		? '3D elevation features rendered from an elevation source.'
		: 'Unavailable — this server provides no elevation tiles.'}
	onReset={hasElevation ? resetElevation : undefined}
>
	<ElevationOptions bind:options disabled={!hasElevation} {onchange} />
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
