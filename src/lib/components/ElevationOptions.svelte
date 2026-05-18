<script lang="ts">
	import type { StyleBuilderOptions } from '@versatiles/style';
	import InputCheckbox from './InputCheckbox.svelte';

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
	bind:value={() => options.terrain === true, (v) => (options.terrain = v)}
	defaultValue={false}
	{onchange}
/>
<InputCheckbox
	label="Hillshade"
	bind:value={() => options.hillshade === true, (v) => (options.hillshade = v)}
	defaultValue={false}
	{onchange}
/>
