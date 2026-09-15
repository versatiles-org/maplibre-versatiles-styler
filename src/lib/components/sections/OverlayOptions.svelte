<script lang="ts">
	import type { Palette, ResolvedOsmOverlay } from '@versatiles/style';
	import { PALETTES, overlayDefaults, satelliteDefaults } from '../../style_config';
	import InputCheckbox from '../inputs/InputCheckbox.svelte';
	import InputSelect from '../inputs/InputSelect.svelte';

	let {
		overlay = $bindable(),
		disabled = false,
	}: {
		overlay: false | ResolvedOsmOverlay;
		disabled?: boolean;
	} = $props();

	const defaults = satelliteDefaults().osmOverlay as ResolvedOsmOverlay;
	const THEMES = PALETTES.map((palette) => ({ value: palette, label: palette }));

	/** A new theme brings its own colours: the overlay's colours are reset to that theme's. */
	function setTheme(theme: string | undefined) {
		if (!overlay) return;
		const palette = (theme ?? defaults.theme) as Palette;
		overlay.theme = palette;
		overlay.colors = overlayDefaults(palette).colors;
	}
</script>

<InputCheckbox
	label="Overlay"
	{disabled}
	bind:value={() => overlay !== false, (v) => (overlay = v ? structuredClone(defaults) : false)}
	defaultValue={true}
/>
{#if overlay}
	<div class="nested">
		<InputSelect
			label="Theme"
			hint="The vector style the roads and labels are taken from."
			{disabled}
			bind:value={() => (overlay ? overlay.theme : undefined), setTheme}
			defaultValue={defaults.theme}
			options={THEMES}
		/>
	</div>
{/if}
