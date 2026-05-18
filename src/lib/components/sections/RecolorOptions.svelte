<script lang="ts">
	import type { StyleBuilderOptions } from '@versatiles/style';
	import InputCheckbox from '../inputs/InputCheckbox.svelte';
	import InputColor from '../inputs/InputColor.svelte';
	import InputNumber from '../inputs/InputNumber.svelte';

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
	hint="Flip each color between light and dark while keeping its hue."
	bind:value={() => recolor.invertBrightness as boolean, (v) => (recolor.invertBrightness = v)}
	defaultValue={(defaults?.invertBrightness as boolean) ?? false}
	{onchange}
/>
<InputNumber
	label="Rotate Hue"
	hint="Shift every color around the hue wheel."
	bind:value={() => (recolor.rotate as number) ?? 0, (v) => (recolor.rotate = v)}
	defaultValue={(defaults?.rotate as number) ?? 0}
	min={0}
	max={360}
	unit="°"
	{onchange}
/>
<InputNumber
	label="Saturate"
	hint="Negative values fade colors toward grey; positive values intensify them."
	bind:value={() => (recolor.saturate as number) ?? 0, (v) => (recolor.saturate = v)}
	defaultValue={(defaults?.saturate as number) ?? 0}
	min={-1}
	max={1}
	scale={100}
	unit="%"
	{onchange}
/>
<InputNumber
	label="Gamma"
	hint="Non-linear brightness curve. 1 means no change."
	bind:value={() => (recolor.gamma as number) ?? 1, (v) => (recolor.gamma = v)}
	defaultValue={(defaults?.gamma as number) ?? 1}
	min={0.1}
	max={10}
	{onchange}
/>
<InputNumber
	label="Contrast"
	hint="Push colors away from mid-grey. 100% means no change."
	bind:value={() => (recolor.contrast as number) ?? 1, (v) => (recolor.contrast = v)}
	defaultValue={(defaults?.contrast as number) ?? 1}
	min={0}
	max={10}
	scale={100}
	unit="%"
	{onchange}
/>
<InputNumber
	label="Brightness"
	hint="Lighten or darken every color."
	bind:value={() => (recolor.brightness as number) ?? 0, (v) => (recolor.brightness = v)}
	defaultValue={(defaults?.brightness as number) ?? 0}
	min={-1}
	max={1}
	scale={100}
	unit="%"
	{onchange}
/>
<InputNumber
	label="Tint"
	hint="Blend every color toward the tint color."
	bind:value={() => (recolor.tint as number) ?? 0, (v) => (recolor.tint = v)}
	defaultValue={(defaults?.tint as number) ?? 0}
	min={0}
	max={1}
	scale={100}
	unit="%"
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
	hint="Blend every color toward the blend color."
	bind:value={() => (recolor.blend as number) ?? 0, (v) => (recolor.blend = v)}
	defaultValue={(defaults?.blend as number) ?? 0}
	min={0}
	max={1}
	scale={100}
	unit="%"
	{onchange}
/>
<InputColor
	label="Blend Color"
	bind:value={recolor.blendColor}
	defaultValue={defaults?.blendColor}
	{onchange}
/>
