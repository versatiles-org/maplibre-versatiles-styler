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
	hint="Below 100% the imagery lets the black background through, which darkens it."
	bind:value={raster.opacity}
	defaultValue={defaults.opacity}
	min={0}
	max={1}
	scale={100}
	unit="%"
/>
<InputNumber
	label="Hue Rotate"
	hint="Shift every color of the imagery around the hue wheel."
	bind:value={raster.hueRotate}
	defaultValue={defaults.hueRotate}
	min={0}
	max={360}
	unit="°"
/>
<InputNumber
	label="Brightness Min"
	hint="How bright the darkest parts of the imagery are drawn. Raising it lightens the shadows."
	bind:value={raster.brightnessMin}
	defaultValue={defaults.brightnessMin}
	min={0}
	max={1}
	scale={100}
	unit="%"
/>
<InputNumber
	label="Brightness Max"
	hint="How bright the lightest parts of the imagery are drawn. Lowering it dims the highlights."
	bind:value={raster.brightnessMax}
	defaultValue={defaults.brightnessMax}
	min={0}
	max={1}
	scale={100}
	unit="%"
/>
<InputNumber
	label="Saturation"
	hint="Negative values fade the imagery toward grey, positive values intensify its colors."
	bind:value={raster.saturation}
	defaultValue={defaults.saturation}
	min={-1}
	max={1}
	scale={100}
	unit="%"
/>
<InputNumber
	label="Contrast"
	hint="Negative values flatten the imagery, positive values set light and dark further apart."
	bind:value={raster.contrast}
	defaultValue={defaults.contrast}
	min={-1}
	max={1}
	scale={100}
	unit="%"
/>
