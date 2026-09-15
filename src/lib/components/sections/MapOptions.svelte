<script lang="ts">
	import type { ResolvedProjection, ResolvedSky, ResolvedSun } from '@versatiles/style';
	import { Color, osm } from '@versatiles/style';
	import InputCheckbox from '../inputs/InputCheckbox.svelte';
	import InputColor from '../inputs/InputColor.svelte';
	import InputNumber from '../inputs/InputNumber.svelte';
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
	// `sun.color` and `sun.intensity` stay unset unless set: MapLibre's own `light` defaults apply.
	const SUN_COLOR = '#ffffff';
	const SUN_INTENSITY = 0.5;

	const PROJECTIONS = [
		{ value: 'globe', label: 'Globe' },
		{ value: 'mercator', label: 'Mercator' },
		{ value: 'vertical-perspective', label: 'Vertical perspective' },
	];
	const ANCHORS = [
		{ value: 'map', label: 'Map' },
		{ value: 'viewport', label: 'Screen' },
	];

	function sameColor(a: string, b: string): boolean {
		try {
			return Color.parse(a).asHex() === Color.parse(b).asHex();
		} catch {
			return a === b;
		}
	}

	function blendOf(value: Sky[Blend], fallback: Sky[Blend]): number {
		return typeof value === 'number' ? value : (fallback as number);
	}
</script>

<InputSelect
	label="Projection"
	hint="Globe shows the earth as a sphere when zoomed out and flattens as you zoom in."
	{disabled}
	bind:value={() => projection, (v) => (projection = (v ?? 'globe') as ResolvedProjection)}
	defaultValue="globe"
	options={PROJECTIONS}
/>

<InputCheckbox
	label="Sky"
	hint="Sky and fog above the horizon, visible on a globe or a strongly tilted map."
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
	hint="A light source for 3D buildings and the shading of hillshade."
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
		<InputSelect
			label="Anchor"
			hint="Map: the direction turns with the map. Screen: it is fixed to the screen."
			{disabled}
			bind:value={
				() => sun?.anchor, (v) => sun && (sun.anchor = (v ?? sunDefaults.anchor) as Sun['anchor'])
			}
			defaultValue={sunDefaults.anchor}
			options={ANCHORS}
		/>
		<InputColor
			label="Color"
			{disabled}
			bind:value={
				() => sun?.color ?? SUN_COLOR,
				(v) => {
					if (!sun) return;
					if (sameColor(v, SUN_COLOR)) delete sun.color;
					else sun.color = v;
				}
			}
			defaultValue={SUN_COLOR}
		/>
		<InputNumber
			label="Intensity"
			{disabled}
			bind:value={
				() => sun?.intensity ?? SUN_INTENSITY,
				(v) => {
					if (!sun) return;
					if (v === SUN_INTENSITY) delete sun.intensity;
					else sun.intensity = v;
				}
			}
			defaultValue={SUN_INTENSITY}
			min={0}
			max={1}
			scale={100}
			unit="%"
		/>
	</div>
{/if}
