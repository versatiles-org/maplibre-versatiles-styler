<script lang="ts">
	import type { ResolvedProjection, ResolvedLight, ResolvedSky } from '@versatiles/style';
	import { osm } from '@versatiles/style';
	import { sameColor } from '../inputs/color_model';
	import InputCheckbox from '../inputs/InputCheckbox.svelte';
	import InputColor from '../inputs/InputColor.svelte';
	import InputNumber from '../inputs/InputNumber.svelte';
	import InputSelect from '../inputs/InputSelect.svelte';

	let {
		projection = $bindable(),
		sky = $bindable(),
		light = $bindable(),
		skyColorFallback,
		disabled = false,
	}: {
		projection: ResolvedProjection;
		sky: ResolvedSky;
		light: ResolvedLight;
		/** The sky colour while `sky.skyColor` is unset: the theme's `colors.water`, or MapLibre's. */
		skyColorFallback: string;
		disabled?: boolean;
	} = $props();

	type Sky = Exclude<ResolvedSky, false>;
	type Light = Exclude<ResolvedLight, false>;
	type Blend = 'atmosphereBlend' | 'fogGroundBlend' | 'horizonFogBlend' | 'skyHorizonBlend';

	const skyDefaults = osm.resolveOptions({ sky: true }).sky as Sky;
	const lightDefaults = osm.resolveOptions({ light: true }).light as Light;
	const lightByDefault = osm.resolveOptions().light !== false;

	const PROJECTIONS = [
		{ value: 'globe', label: 'Globe' },
		{ value: 'mercator', label: 'Mercator' },
		{ value: 'vertical-perspective', label: 'Vertical perspective' },
	];
	const BLENDS: { key: Blend; label: string; hint: string }[] = [
		{
			key: 'skyHorizonBlend',
			label: 'Sky Blend',
			hint: 'The transition between sky and horizon. How far the horizon color reaches up into the sky: 0% is a sharp edge at the horizon, 100% blends up to the middle of the sky.',
		},
		{
			key: 'horizonFogBlend',
			label: 'Horizon Blend',
			hint: 'The transition between horizon and fog. How much the fog color mixes into the horizon: 0% leaves the horizon color alone, 100% blends the two up to the middle of the sky.',
		},
		{
			key: 'fogGroundBlend',
			label: 'Fog Blend',
			hint: 'The transition between fog and ground. Where the fog over the terrain begins: 0% at the center of the map, 100% only at the horizon. Shows with Terrain only.',
		},
		{
			key: 'atmosphereBlend',
			label: 'Atmosphere',
			hint: 'The glow of the atmosphere around the globe: 0% hides it, 100% shows it in full. With Light on, it glows on the side the light comes from.',
		},
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
			hint="The haze that fades distant terrain into the horizon. Shows with Terrain only."
			{disabled}
			bind:value={sky.fogColor}
			defaultValue={skyDefaults.fogColor}
		/>
		{#each BLENDS as { key: blend, label, hint } (blend)}
			<InputNumber
				{label}
				{hint}
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
	label="Light"
	hint="One light for the whole map: it shades the hillshade, lights 3D buildings and, on the globe, decides which side of the atmosphere glows. Off, MapLibre lights hillshade and buildings from different sides, and the hillshade draws its accent color."
	{disabled}
	bind:value={() => light !== false, (v) => (light = v ? structuredClone(lightDefaults) : false)}
	defaultValue={lightByDefault}
/>
{#if light}
	<div class="nested">
		<InputNumber
			label="Direction"
			hint="Where the light comes from, clockwise: 0° is the top of the screen, or north if the light turns with the map. The default, 315°, is the top left, under which relief never looks inverted."
			{disabled}
			bind:value={light.direction}
			defaultValue={lightDefaults.direction}
			min={0}
			max={360}
			unit="°"
		/>
		<InputNumber
			label="Altitude"
			hint="How high the light stands above the horizon: the lower, the longer the shadows of the hillshade."
			{disabled}
			bind:value={light.altitude}
			defaultValue={lightDefaults.altitude}
			min={0}
			max={90}
			unit="°"
		/>
		<InputCheckbox
			label="Turn with Map"
			hint="Off, the light stays fixed to the screen however the map is turned. On, it keeps its compass direction and turns with the map — but then the atmosphere of the globe cannot follow it."
			{disabled}
			bind:value={light.rotateWithMap}
			defaultValue={lightDefaults.rotateWithMap}
		/>
		<!-- MapLibre's light color has no alpha. -->
		<InputColor
			label="Color"
			hint="The color of the light on 3D buildings. Hillshade has colors of its own."
			{disabled}
			alpha={false}
			bind:value={light.color}
			defaultValue={lightDefaults.color}
		/>
		<InputNumber
			label="Intensity"
			hint="How strong the light on 3D buildings is: the higher, the more the lit and the shaded walls differ."
			{disabled}
			bind:value={light.intensity}
			defaultValue={lightDefaults.intensity}
			min={0}
			max={1}
			scale={100}
			unit="%"
		/>
	</div>
{/if}
