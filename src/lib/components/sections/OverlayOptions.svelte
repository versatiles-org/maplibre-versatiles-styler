<script lang="ts">
	import type { SatelliteStyleOptions } from '@versatiles/style';
	import InputCheckbox from '../inputs/InputCheckbox.svelte';
	import ScaleOptions from './ScaleOptions.svelte';

	let {
		options = $bindable(),
		defaults,
		onchange,
	}: {
		options: SatelliteStyleOptions;
		defaults: { overlay: boolean; textScale: number; iconScale: number };
		onchange?: () => void;
	} = $props();
</script>

<InputCheckbox
	label="Overlay"
	bind:value={() => (options.overlay as boolean) ?? defaults.overlay, (v) => (options.overlay = v)}
	defaultValue={defaults.overlay}
	{onchange}
/>
<div class="nested">
	<ScaleOptions bind:options {defaults} {onchange} />
</div>
