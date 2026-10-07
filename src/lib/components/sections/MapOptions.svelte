<script lang="ts">
	import type { ResolvedProjection, ResolvedSky, ResolvedSun } from '@versatiles/style';
	import { osm } from '@versatiles/style';
	import { sameColor } from '../inputs/color_model';
	import InputCheckbox from '../inputs/InputCheckbox.svelte';
	import InputColor from '../inputs/InputColor.svelte';
	import InputNumber from '../inputs/InputNumber.svelte';
	import InputSegmented from '../inputs/InputSegmented.svelte';
	import InputSelect from '../inputs/InputSelect.svelte';

	let {
		projection = $bindable(),
		sky = $bindable(),
		sun = $bindable(),
		skyColorFallback,
		disabled = false,
	}: {
		projection: ResolvedProjection;
		sky: ResolvedSky;
		sun: ResolvedSun;
		/** The sky colour while `sky.skyColor` is unset: the theme's `colors.water`, or MapLibre's. */
		skyColorFallback: string;
		disabled?: boolean;
	} = $props();

	type Sky = Exclude<ResolvedSky, false>;
	type Sun = Exclude<ResolvedSun, undefined>;
	type Blend = 'atmosphereBlend' | 'fogGroundBlend' | 'horizonFogBlend' | 'skyHorizonBlend';

	const skyDefaults = osm.resolveOptions({ sky: true }).sky as Sky;
	const sunDefaults = osm.resolveOptions({ sun: true }).sun as Sun;

	const PROJECTIONS = [
		{ value: 'globe', label: 'Globe' },
		{ value: 'mercator', label: 'Mercator' },
		{ value: 'vertical-perspective', label: 'Vertical perspective' },
	];
	const ANCHORS = [
		{ value: 'map', label: 'Map' },
		{ value: 'viewport', label: 'Screen' },
	];

	function blendOf(value: Sky[Blend], fallback: Sky[Blend]): number {
		return typeof value === 'number' ? value : (fallback as number);
	}
</script>

<InputSelect
	label="Projection"
	hint="Globe: a sphere when zoomed out, turning into Mercator as you zoom in. Mercator: the usual flat web map. Vertical perspective: a sphere at every zoom."
	{disabled}
	bind:value={() => projection, (v) => (projection = (v ?? 'globe') as ResolvedProjection)}
	defaultValue="globe"
	options={PROJECTIONS}
/>

<InputCheckbox
	label="Sky"
	hint="Sky and fog above the horizon. They show where the horizon is in view: on the globe, or on a flat map tilted beyond 65°, which is more than MapLibre allows by default (60°)."
	{disabled}
	bind:value={() => sky !== false, (v) => (sky = v ? structuredClone(skyDefaults) : false)}
	defaultValue={true}
/>
{#if sky}
	<div class="nested">
		<InputColor
			label="Sky Color"
			hint="Follows the water color unless set."
			{disabled}
			bind:value={
				() => (sky ? (sky.skyColor ?? skyColorFallback) : skyColorFallback),
				(v) => {
					if (!sky) return;
					if (sameColor(v, skyColorFallback)) delete sky.skyColor;
					else sky.skyColor = v;
				}
			}
			defaultValue={skyColorFallback}
		/>
		<InputColor
			label="Horizon Color"
			{disabled}
			bind:value={sky.horizonColor}
			defaultValue={skyDefaults.horizonColor}
		/>
		<InputColor
			label="Fog Color"
			{disabled}
			bind:value={sky.fogColor}
			defaultValue={skyDefaults.fogColor}
		/>
		{#each [['skyHorizonBlend', 'Sky/Horizon Blend'], ['horizonFogBlend', 'Horizon/Fog Blend'], ['fogGroundBlend', 'Fog/Ground Blend'], ['atmosphereBlend', 'Atmosphere']] as [key, label] (key)}
			{@const blend = key as Blend}
			<InputNumber
				{label}
				{disabled}
				bind:value={
					() => (sky ? blendOf(sky[blend], skyDefaults[blend]) : 0), (v) => sky && (sky[blend] = v)
				}
				defaultValue={blendOf(skyDefaults[blend], 0)}
				min={0}
				max={1}
				scale={100}
				unit="%"
			/>
		{/each}
	</div>
{/if}

<InputCheckbox
	label="Sun"
	hint="Where the light comes from. It lights 3D buildings, and its direction and altitude also shade the hillshade."
	{disabled}
	bind:value={() => sun !== undefined, (v) => (sun = v ? structuredClone(sunDefaults) : undefined)}
	defaultValue={false}
/>
{#if sun}
	<div class="nested">
		<InputNumber
			label="Direction"
			hint="Where the light comes from, clockwise from north."
			{disabled}
			bind:value={sun.direction}
			defaultValue={sunDefaults.direction}
			min={0}
			max={360}
			unit="°"
		/>
		<InputNumber
			label="Altitude"
			hint="How high the sun stands above the horizon."
			{disabled}
			bind:value={sun.altitude}
			defaultValue={sunDefaults.altitude}
			min={0}
			max={90}
			unit="°"
		/>
		<InputSegmented
			label="Anchor"
			hint="For 3D buildings. Map: the light keeps its compass direction and turns with the map. Screen: it keeps its direction on the screen. Hillshade has a setting of its own."
			{disabled}
			bind:value={
				() => sun?.anchor, (v) => sun && (sun.anchor = (v ?? sunDefaults.anchor) as Sun['anchor'])
			}
			defaultValue={sunDefaults.anchor}
			options={ANCHORS}
		/>
		<!-- MapLibre's light color has no alpha. -->
		<InputColor
			label="Color"
			{disabled}
			alpha={false}
			bind:value={sun.color}
			defaultValue={sunDefaults.color}
		/>
		<InputNumber
			label="Intensity"
			{disabled}
			bind:value={sun.intensity}
			defaultValue={sunDefaults.intensity}
			min={0}
			max={1}
			scale={100}
			unit="%"
		/>
	</div>
{/if}
