<script lang="ts">
	import type { ResolvedLayout } from '@versatiles/style';
	import InputNumber from '../inputs/InputNumber.svelte';
	import InputSelect from '../inputs/InputSelect.svelte';

	let {
		layout = $bindable(),
		defaults,
		disabled = false,
	}: {
		layout: ResolvedLayout;
		defaults: ResolvedLayout;
		disabled?: boolean;
	} = $props();

	const PITCH_ALIGNMENTS = [
		{ value: 'map', label: 'On the map' },
		{ value: 'viewport', label: 'Upright' },
	];
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
<InputNumber
	label="Label Spacing"
	hint="Keep labels further apart (above 100%) so fewer are shown, or closer together."
	{disabled}
	bind:value={layout.spacing.labels}
	defaultValue={defaults.spacing.labels}
	min={0.5}
	max={4}
	scale={100}
	unit="%"
/>
<InputNumber
	label="Icon Spacing"
	hint="Keep icons further apart (above 100%) so fewer are shown, or closer together."
	{disabled}
	bind:value={layout.spacing.icons}
	defaultValue={defaults.spacing.icons}
	min={0.5}
	max={4}
	scale={100}
	unit="%"
/>
<InputSelect
	label="Tilted Line Labels"
	hint="How street and river names sit when the map is tilted: lying on the ground, or standing up facing the viewer."
	{disabled}
	bind:value={
		() => layout.pitchAlignment,
		(v) =>
			(layout.pitchAlignment = (v ?? defaults.pitchAlignment) as ResolvedLayout['pitchAlignment'])
	}
	defaultValue={defaults.pitchAlignment}
	options={PITCH_ALIGNMENTS}
/>
