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
	hint="Above 100% keeps icons further apart, so fewer are shown; below 100% lets them come closer together."
	{disabled}
	bind:value={icon.spacing}
	defaultValue={defaults.spacing}
	min={0.5}
	max={4}
	scale={100}
	unit="%"
/>
