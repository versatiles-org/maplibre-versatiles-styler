<script lang="ts">
	import type { StyleBuilderOptions } from '@versatiles/style';
	import InputNumber from '../inputs/InputNumber.svelte';

	let {
		options = $bindable(),
		defaults,
		disabled = false,
		onchange,
	}: {
		options: StyleBuilderOptions;
		defaults: StyleBuilderOptions;
		disabled?: boolean;
		onchange?: () => void;
	} = $props();
</script>

<InputNumber
	label="Text Scale"
	{disabled}
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
	{disabled}
	bind:value={() => options.iconScale ?? 1, (v) => (options.iconScale = v)}
	defaultValue={defaults.iconScale ?? 1}
	min={0.5}
	max={3}
	scale={100}
	unit="%"
	{onchange}
/>
