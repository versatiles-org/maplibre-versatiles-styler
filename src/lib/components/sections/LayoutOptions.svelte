<script lang="ts">
	import type { ResolvedLayout } from '@versatiles/style';
	import InputNumber from '../inputs/InputNumber.svelte';

	let {
		layout = $bindable(),
		defaults,
		disabled = false,
	}: {
		layout: ResolvedLayout;
		defaults: ResolvedLayout;
		disabled?: boolean;
	} = $props();
</script>

<InputNumber
	label="Text Scale"
	{disabled}
	bind:value={layout.scale.labels}
	defaultValue={defaults.scale.labels}
	min={0.5}
	max={3}
	scale={100}
	unit="%"
/>
<InputNumber
	label="Icon Scale"
	{disabled}
	bind:value={layout.scale.icons}
	defaultValue={defaults.scale.icons}
	min={0.5}
	max={3}
	scale={100}
	unit="%"
/>
