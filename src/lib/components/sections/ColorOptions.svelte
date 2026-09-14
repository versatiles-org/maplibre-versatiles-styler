<script lang="ts">
	import type { ResolvedColors } from '@versatiles/style';
	import { colorGroups } from '../../color_groups';
	import InputColor from '../inputs/InputColor.svelte';

	let {
		colors = $bindable(),
		defaults,
	}: {
		colors: ResolvedColors;
		defaults: ResolvedColors;
	} = $props();

	let groups = $derived(colorGroups(Object.keys(defaults) as (keyof ResolvedColors & string)[]));
</script>

{#each groups as group (group.title)}
	<p class="subsection-title">{group.title}</p>
	{#each group.colors as { key, label } (key)}
		<InputColor {label} hint={key} bind:value={colors[key]} defaultValue={defaults[key]} />
	{/each}
{/each}
