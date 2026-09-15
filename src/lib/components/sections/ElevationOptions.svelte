<script lang="ts">
	import type { ResolvedHillshade, ResolvedTerrain } from '@versatiles/style';
	import { osm } from '@versatiles/style';
	import InputCheckbox from '../inputs/InputCheckbox.svelte';
	import InputColor from '../inputs/InputColor.svelte';
	import InputNumber from '../inputs/InputNumber.svelte';
	import InputSegmented from '../inputs/InputSegmented.svelte';

	let {
		features = $bindable(),
		disabled = false,
	}: {
		features: { terrain: ResolvedTerrain; hillshade: ResolvedHillshade };
		disabled?: boolean;
	} = $props();

	// What `terrain: true` and `hillshade: true` resolve to.
	const enabled = osm.resolveOptions({ features: { terrain: true, hillshade: true } }).features;
	const terrainDefaults = enabled.terrain as Exclude<ResolvedTerrain, false>;
	const hillshadeDefaults = enabled.hillshade as Exclude<ResolvedHillshade, false>;

	const ANCHORS = [
		{ value: 'map', label: 'Map' },
		{ value: 'viewport', label: 'Screen' },
	];
</script>

<InputCheckbox
	label="Terrain"
	hint="Render the map surface in 3D using elevation data."
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
	hint="Add shaded relief to emphasize terrain steepness."
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
			hint="The color of the steepest slopes."
			{disabled}
			bind:value={features.hillshade.accentColor}
			defaultValue={hillshadeDefaults.accentColor}
		/>
		<InputSegmented
			label="Light Source"
			hint="Map: the light comes from a fixed direction on the map and turns with it. Screen: it always comes from the top of the screen."
			{disabled}
			bind:value={
				() => (features.hillshade ? features.hillshade.anchor : undefined),
				(v) =>
					features.hillshade &&
					(features.hillshade.anchor = (v ?? hillshadeDefaults.anchor) as 'map' | 'viewport')
			}
			defaultValue={hillshadeDefaults.anchor}
			options={ANCHORS}
		/>
	</div>
{/if}
