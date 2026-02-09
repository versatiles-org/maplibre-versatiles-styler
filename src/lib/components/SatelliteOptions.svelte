<script lang="ts">
	import type { SatelliteStyleOptions } from '@versatiles/style';
	import InputCheckbox from './InputCheckbox.svelte';
	import InputNumber from './InputNumber.svelte';
	import { untrack } from 'svelte';

	type SatelliteStyleDefaults = {
		overlay: boolean;
		rasterOpacity: number;
		rasterHueRotate: number;
		rasterBrightnessMin: number;
		rasterBrightnessMax: number;
		rasterSaturation: number;
		rasterContrast: number;
	};

	let {
		options = $bindable(),
		defaults,
		overlayAvailable = true,
		onchange,
	}: {
		options: SatelliteStyleOptions;
		defaults: SatelliteStyleDefaults;
		overlayAvailable?: boolean;
		onchange?: () => void;
	} = $props();

	untrack(() => {
		if (!overlayAvailable) {
			options.overlay = false;
		}
	});
</script>

{#if overlayAvailable}
	<InputCheckbox
		label="Overlay"
		bind:value={
			() => (options.overlay as boolean) ?? defaults.overlay, (v) => (options.overlay = v)
		}
		defaultValue={defaults.overlay}
		{onchange}
	/>
{/if}
<InputNumber
	label="Opacity"
	bind:value={
		() => (options.rasterOpacity as number) ?? defaults.rasterOpacity,
		(v) => (options.rasterOpacity = v)
	}
	defaultValue={defaults.rasterOpacity}
	min={0}
	max={1}
	scale={100}
	{onchange}
/>
<InputNumber
	label="Hue Rotate"
	bind:value={
		() => (options.rasterHueRotate as number) ?? defaults.rasterHueRotate,
		(v) => (options.rasterHueRotate = v)
	}
	defaultValue={defaults.rasterHueRotate}
	min={0}
	max={360}
	{onchange}
/>
<InputNumber
	label="Brightness Min"
	bind:value={
		() => (options.rasterBrightnessMin as number) ?? defaults.rasterBrightnessMin,
		(v) => (options.rasterBrightnessMin = v)
	}
	defaultValue={defaults.rasterBrightnessMin}
	min={0}
	max={1}
	scale={100}
	{onchange}
/>
<InputNumber
	label="Brightness Max"
	bind:value={
		() => (options.rasterBrightnessMax as number) ?? defaults.rasterBrightnessMax,
		(v) => (options.rasterBrightnessMax = v)
	}
	defaultValue={defaults.rasterBrightnessMax}
	min={0}
	max={1}
	scale={100}
	{onchange}
/>
<InputNumber
	label="Saturation"
	bind:value={
		() => (options.rasterSaturation as number) ?? defaults.rasterSaturation,
		(v) => (options.rasterSaturation = v)
	}
	defaultValue={defaults.rasterSaturation}
	min={-1}
	max={1}
	scale={100}
	{onchange}
/>
<InputNumber
	label="Contrast"
	bind:value={
		() => (options.rasterContrast as number) ?? defaults.rasterContrast,
		(v) => (options.rasterContrast = v)
	}
	defaultValue={defaults.rasterContrast}
	min={-1}
	max={1}
	scale={100}
	{onchange}
/>
