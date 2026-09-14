<script lang="ts">
	import type { ResolvedSatelliteRaster } from '@versatiles/style';
	import InputNumber from '../inputs/InputNumber.svelte';

	let {
		raster = $bindable(),
		defaults,
	}: {
		raster: ResolvedSatelliteRaster;
		defaults: ResolvedSatelliteRaster;
	} = $props();
</script>

<InputNumber
	label="Opacity"
	bind:value={raster.opacity}
	defaultValue={defaults.opacity}
	min={0}
	max={1}
	scale={100}
	unit="%"
/>
<InputNumber
	label="Hue Rotate"
	bind:value={raster.hueRotate}
	defaultValue={defaults.hueRotate}
	min={0}
	max={360}
	unit="°"
/>
<InputNumber
	label="Brightness Min"
	bind:value={raster.brightnessMin}
	defaultValue={defaults.brightnessMin}
	min={0}
	max={1}
	scale={100}
	unit="%"
/>
<InputNumber
	label="Brightness Max"
	bind:value={raster.brightnessMax}
	defaultValue={defaults.brightnessMax}
	min={0}
	max={1}
	scale={100}
	unit="%"
/>
<InputNumber
	label="Saturation"
	bind:value={raster.saturation}
	defaultValue={defaults.saturation}
	min={-1}
	max={1}
	scale={100}
	unit="%"
/>
<InputNumber
	label="Contrast"
	bind:value={raster.contrast}
	defaultValue={defaults.contrast}
	min={-1}
	max={1}
	scale={100}
	unit="%"
/>
