<script lang="ts">
	import type { ResolvedOsmOverlay } from '@versatiles/style';
	import { satelliteDefaults } from '../../style_config';
	import InputCheckbox from '../inputs/InputCheckbox.svelte';
	import LayoutOptions from './LayoutOptions.svelte';

	let {
		overlay = $bindable(),
		disabled = false,
	}: {
		overlay: false | ResolvedOsmOverlay;
		disabled?: boolean;
	} = $props();

	const defaults = satelliteDefaults().osmOverlay as ResolvedOsmOverlay;
</script>

<InputCheckbox
	label="Overlay"
	{disabled}
	bind:value={() => overlay !== false, (v) => (overlay = v ? structuredClone(defaults) : false)}
	defaultValue={true}
/>
<div class="nested">
	{#if overlay}
		<LayoutOptions bind:layout={overlay.layout} defaults={defaults.layout} {disabled} />
	{:else}
		<LayoutOptions layout={structuredClone(defaults.layout)} defaults={defaults.layout} disabled />
	{/if}
</div>
