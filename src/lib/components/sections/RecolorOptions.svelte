<script lang="ts">
	import type { ResolvedRecolor } from '@versatiles/style';
	import InputCheckbox from '../inputs/InputCheckbox.svelte';
	import InputColor from '../inputs/InputColor.svelte';
	import InputNumber from '../inputs/InputNumber.svelte';

	let {
		recolor = $bindable(),
		defaults,
	}: {
		recolor: ResolvedRecolor;
		defaults: ResolvedRecolor;
	} = $props();
</script>

<InputCheckbox
	label="Invert Brightness"
	hint="Flip each color between light and dark while keeping its hue."
	bind:value={recolor.invertBrightness}
	defaultValue={defaults.invertBrightness}
/>
<InputNumber
	label="Rotate Hue"
	hint="Shift every color around the hue wheel."
	bind:value={recolor.rotateHue}
	defaultValue={defaults.rotateHue}
	min={0}
	max={360}
	unit="°"
/>
<InputNumber
	label="Saturate"
	hint="Negative values fade colors toward grey; positive values intensify them."
	bind:value={recolor.saturate}
	defaultValue={defaults.saturate}
	min={-1}
	max={1}
	scale={100}
	unit="%"
/>
<InputNumber
	label="Gamma"
	hint="Non-linear brightness curve. 1 means no change."
	bind:value={recolor.gamma}
	defaultValue={defaults.gamma}
	min={0.1}
	max={10}
/>
<InputNumber
	label="Contrast"
	hint="Push colors away from mid-grey. 100% means no change."
	bind:value={recolor.contrast}
	defaultValue={defaults.contrast}
	min={0}
	max={10}
	scale={100}
	unit="%"
/>
<InputNumber
	label="Brightness"
	hint="Lighten or darken every color."
	bind:value={recolor.brightness}
	defaultValue={defaults.brightness}
	min={-1}
	max={1}
	scale={100}
	unit="%"
/>
<InputNumber
	label="Tint"
	hint="Blend every color toward the tint color."
	bind:value={recolor.tint.amount}
	defaultValue={defaults.tint.amount}
	min={0}
	max={1}
	scale={100}
	unit="%"
/>
<InputColor label="Tint Color" bind:value={recolor.tint.color} defaultValue={defaults.tint.color} />
<InputNumber
	label="Blend"
	hint="Blend every color toward the blend color."
	bind:value={recolor.blend.amount}
	defaultValue={defaults.blend.amount}
	min={0}
	max={1}
	scale={100}
	unit="%"
/>
<InputColor
	label="Blend Color"
	bind:value={recolor.blend.color}
	defaultValue={defaults.blend.color}
/>
