<script lang="ts">
	import type { ResolvedOsm } from '@versatiles/style';
	import InputColor from '../inputs/InputColor.svelte';

	type Colors = ResolvedOsm['colors'];

	let {
		colors = $bindable(),
		defaults,
	}: {
		colors: Colors;
		defaults: Colors;
	} = $props();

	let keys = $derived(Object.keys(defaults) as (keyof Colors & string)[]);
</script>

{#each keys as key (key)}
	<InputColor label={key} bind:value={colors[key]} defaultValue={defaults[key]} />
{/each}
