<script lang="ts">
	import type { FontFaceInfo } from '@versatiles/style';
	import type { VectorState } from '../style_config';
	import SidebarSection from './SidebarSection.svelte';
	import ColorOptions from './sections/ColorOptions.svelte';
	import RecolorOptions from './sections/RecolorOptions.svelte';
	import FontOptions from './sections/FontOptions.svelte';
	import LayoutOptions from './sections/LayoutOptions.svelte';
	import ElevationOptions from './sections/ElevationOptions.svelte';
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
	function resetElevation() {
		options.features.terrain = defaults.features.terrain;
		options.features.hillshade = defaults.features.hillshade;
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
	<FontOptions bind:fonts={options.text.fonts} defaults={defaults.text.fonts} {fontFaces} />
	<LayoutOptions bind:layout={options.layout} defaults={defaults.layout} />
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
