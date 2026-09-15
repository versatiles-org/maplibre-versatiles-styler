<script lang="ts">
	import type { ResolvedIcon } from '@versatiles/style';
	import InputNumber from '../inputs/InputNumber.svelte';

	let {
		icon = $bindable(),
		defaults,
		disabled = false,
	}: {
		icon: ResolvedIcon;
		defaults: ResolvedIcon;
		disabled?: boolean;
	} = $props();
</script>

<InputNumber
	label="Size"
	{disabled}
	bind:value={icon.scale}
	defaultValue={defaults.scale}
	min={0.5}
	max={3}
	scale={100}
	unit="%"
/>
<InputNumber
	label="Spacing"
	hint="Keep icons further apart (above 100%) so fewer are shown, or closer together."
	{disabled}
	bind:value={icon.spacing}
	defaultValue={defaults.spacing}
	min={0.5}
	max={4}
	scale={100}
	unit="%"
/>
