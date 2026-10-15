<script lang="ts">
	import type { ResolvedHillshade, ResolvedTerrain } from '@versatiles/style';
	import { osm } from '@versatiles/style';
	import InputCheckbox from '../inputs/InputCheckbox.svelte';
	import InputColor from '../inputs/InputColor.svelte';
	import InputNumber from '../inputs/InputNumber.svelte';

	let {
		features = $bindable(),
		lit,
		disabled = false,
	}: {
		features: { terrain: ResolvedTerrain; hillshade: ResolvedHillshade };
		/** Whether the map has a light, which shades the hillshade without its accent color. */
		lit: boolean;
		disabled?: boolean;
	} = $props();

	// What `terrain: true` and `hillshade: true` resolve to.
	const enabled = osm.resolveOptions({ features: { terrain: true, hillshade: true } }).features;
	const terrainDefaults = enabled.terrain as Exclude<ResolvedTerrain, false>;
	const hillshadeDefaults = enabled.hillshade as Exclude<ResolvedHillshade, false>;
</script>

<InputCheckbox
	label="Terrain"
	hint="Render the map surface in 3D using elevation data. It shows once the map is tilted. To tilt the map, drag with the right mouse button or Ctrl + drag; on a touch screen, drag up or down with two fingers."
	{disabled}
	bind:value={
		() => features.terrain !== false,
		(v) => (features.terrain = v ? structuredClone(terrainDefaults) : false)
	}
	defaultValue={false}
/>
{#if features.terrain}
	<div class="nested">
		<InputNumber
			label="Exaggeration"
			hint="Stretch heights: 100% is true to scale."
			{disabled}
			bind:value={features.terrain.exaggeration}
			defaultValue={terrainDefaults.exaggeration}
			min={0.1}
			max={5}
			scale={100}
			unit="%"
		/>
	</div>
{/if}
<InputCheckbox
	label="Hillshade"
	hint="Shade the slopes so that the relief shows, also on a map that is not tilted. The light comes from the Light of the Map section."
	{disabled}
	bind:value={
		() => features.hillshade !== false,
		(v) => (features.hillshade = v ? structuredClone(hillshadeDefaults) : false)
	}
	defaultValue={false}
/>
{#if features.hillshade}
	<div class="nested">
		<InputNumber
			label="Intensity"
			hint="How strongly slopes are shaded."
			{disabled}
			bind:value={features.hillshade.exaggeration}
			defaultValue={hillshadeDefaults.exaggeration}
			min={0}
			max={1}
			scale={100}
			unit="%"
		/>
		<InputColor
			label="Shadow Color"
			{disabled}
			bind:value={features.hillshade.shadowColor}
			defaultValue={hillshadeDefaults.shadowColor}
		/>
		<InputColor
			label="Highlight Color"
			{disabled}
			bind:value={features.hillshade.highlightColor}
			defaultValue={hillshadeDefaults.highlightColor}
		/>
		<InputColor
			label="Accent Color"
			hint={lit
				? 'An extra shade for rugged terrain such as cliffs and gorges. Only without the Light of the Map section, which shades the slopes by itself.'
				: 'An extra shade for rugged terrain such as cliffs and gorges.'}
			disabled={disabled || lit}
			bind:value={features.hillshade.accentColor}
			defaultValue={hillshadeDefaults.accentColor}
		/>
	</div>
{/if}
