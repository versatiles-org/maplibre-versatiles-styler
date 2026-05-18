<script lang="ts">
	import type { StyleBuilderOptions } from '@versatiles/style';
	import InputCheckbox from '../inputs/InputCheckbox.svelte';

	let {
		options = $bindable(),
		onchange,
	}: {
		options: StyleBuilderOptions;
		onchange?: () => void;
	} = $props();
</script>

<InputCheckbox
	label="Terrain"
	hint="Render the map surface in 3D using elevation data."
	bind:value={() => options.terrain === true, (v) => (options.terrain = v)}
	defaultValue={false}
	{onchange}
/>
<InputCheckbox
	label="Hillshade"
	hint="Add shaded relief to emphasize terrain steepness."
	bind:value={() => options.hillshade === true, (v) => (options.hillshade = v)}
	defaultValue={false}
	{onchange}
/>
