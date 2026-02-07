<script lang="ts">
	import type { StyleBuilderOptions } from '@versatiles/style';
	import InputCheckbox from './InputCheckbox.svelte';
	import InputColor from './InputColor.svelte';
	import InputNumber from './InputNumber.svelte';

	let {
		recolor = $bindable(),
		defaults,
		onchange,
	}: {
		recolor: NonNullable<StyleBuilderOptions['recolor']>;
		defaults: StyleBuilderOptions['recolor'];
		onchange?: () => void;
	} = $props();
</script>

<InputCheckbox
	label="Invert Brightness"
	bind:value={() => recolor.invertBrightness as boolean, (v) => (recolor.invertBrightness = v)}
	defaultValue={(defaults?.invertBrightness as boolean) ?? false}
	{onchange}
/>
<InputNumber
	label="Rotate Hue"
	bind:value={() => (recolor.rotate as number) ?? 0, (v) => (recolor.rotate = v)}
	defaultValue={(defaults?.rotate as number) ?? 0}
	min={0}
	max={360}
	{onchange}
/>
<InputNumber
	label="Saturate"
	bind:value={() => (recolor.saturate as number) ?? 0, (v) => (recolor.saturate = v)}
	defaultValue={(defaults?.saturate as number) ?? 0}
	min={-1}
	max={1}
	scale={100}
	{onchange}
/>
<InputNumber
	label="Gamma"
	bind:value={() => (recolor.gamma as number) ?? 1, (v) => (recolor.gamma = v)}
	defaultValue={(defaults?.gamma as number) ?? 1}
	min={0.1}
	max={10}
	{onchange}
/>
<InputNumber
	label="Contrast"
	bind:value={() => (recolor.contrast as number) ?? 1, (v) => (recolor.contrast = v)}
	defaultValue={(defaults?.contrast as number) ?? 1}
	min={0}
	max={10}
	scale={100}
	{onchange}
/>
<InputNumber
	label="Brightness"
	bind:value={() => (recolor.brightness as number) ?? 0, (v) => (recolor.brightness = v)}
	defaultValue={(defaults?.brightness as number) ?? 0}
	min={-1}
	max={1}
	scale={100}
	{onchange}
/>
<InputNumber
	label="Tint"
	bind:value={() => (recolor.tint as number) ?? 0, (v) => (recolor.tint = v)}
	defaultValue={(defaults?.tint as number) ?? 0}
	min={0}
	max={1}
	scale={100}
	{onchange}
/>
<InputColor
	label="Tint Color"
	bind:value={recolor.tintColor}
	defaultValue={defaults?.tintColor}
	{onchange}
/>
<InputNumber
	label="Blend"
	bind:value={() => (recolor.blend as number) ?? 0, (v) => (recolor.blend = v)}
	defaultValue={(defaults?.blend as number) ?? 0}
	min={0}
	max={1}
	scale={100}
	{onchange}
/>
<InputColor
	label="Blend Color"
	bind:value={recolor.blendColor}
	defaultValue={defaults?.blendColor}
	{onchange}
/>
