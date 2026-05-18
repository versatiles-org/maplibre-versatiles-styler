<script lang="ts">
	import type { StyleBuilderOptions } from '@versatiles/style';
	import InputCheckbox from '../inputs/InputCheckbox.svelte';

	let {
		options = $bindable(),
		disabled = false,
		onchange,
	}: {
		options: StyleBuilderOptions;
		disabled?: boolean;
		onchange?: () => void;
	} = $props();
</script>

<InputCheckbox
	label="Terrain"
	hint="Render the map surface in 3D using elevation data."
	{disabled}
	bind:value={() => options.terrain === true, (v) => (options.terrain = v)}
	defaultValue={false}
	{onchange}
/>
<InputCheckbox
	label="Hillshade"
	hint="Add shaded relief to emphasize terrain steepness."
	{disabled}
	bind:value={() => options.hillshade === true, (v) => (options.hillshade = v)}
	defaultValue={false}
	{onchange}
/>
