<script lang="ts">
	import type { StyleBuilderOptions } from '@versatiles/style';
	import InputNumber from './InputNumber.svelte';

	let {
		options = $bindable(),
		defaults,
		onchange,
	}: {
		options: StyleBuilderOptions;
		defaults: StyleBuilderOptions;
		onchange?: () => void;
	} = $props();
</script>

<InputNumber
	label="Text Scale"
	bind:value={() => options.textScale ?? 1, (v) => (options.textScale = v)}
	defaultValue={defaults.textScale ?? 1}
	min={0.5}
	max={3}
	scale={100}
	unit="%"
	{onchange}
/>
<InputNumber
	label="Icon Scale"
	bind:value={() => options.iconScale ?? 1, (v) => (options.iconScale = v)}
	defaultValue={defaults.iconScale ?? 1}
	min={0.5}
	max={3}
	scale={100}
	unit="%"
	{onchange}
/>
