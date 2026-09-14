<script lang="ts">
	import type { ResolvedHillshade, ResolvedTerrain } from '@versatiles/style';
	import { osm } from '@versatiles/style';
	import InputCheckbox from '../inputs/InputCheckbox.svelte';

	let {
		features = $bindable(),
		disabled = false,
	}: {
		features: { terrain: ResolvedTerrain; hillshade: ResolvedHillshade };
		disabled?: boolean;
	} = $props();

	// What `terrain: true` and `hillshade: true` resolve to.
	const enabled = osm.resolveOptions({ features: { terrain: true, hillshade: true } }).features;
</script>

<InputCheckbox
	label="Terrain"
	hint="Render the map surface in 3D using elevation data."
	{disabled}
	bind:value={
		() => features.terrain !== false,
		(v) => (features.terrain = v ? structuredClone(enabled.terrain) : false)
	}
	defaultValue={false}
/>
<InputCheckbox
	label="Hillshade"
	hint="Add shaded relief to emphasize terrain steepness."
	{disabled}
	bind:value={
		() => features.hillshade !== false,
		(v) => (features.hillshade = v ? structuredClone(enabled.hillshade) : false)
	}
	defaultValue={false}
/>
