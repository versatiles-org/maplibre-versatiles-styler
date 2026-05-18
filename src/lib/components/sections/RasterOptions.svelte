<script lang="ts">
	import type { SatelliteStyleOptions } from '@versatiles/style';
	import InputNumber from '../inputs/InputNumber.svelte';

	type RasterDefaults = {
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
		onchange,
	}: {
		options: SatelliteStyleOptions;
		defaults: RasterDefaults;
		onchange?: () => void;
	} = $props();
</script>

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
	unit="%"
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
	unit="°"
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
	unit="%"
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
	unit="%"
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
	unit="%"
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
	unit="%"
	{onchange}
/>
