<script lang="ts">
	import type { StyleBuilderOptions } from '@versatiles/style';
	import InputColor from './InputColor.svelte';

	let {
		colors = $bindable(),
		defaults,
		onchange,
	}: {
		colors: NonNullable<StyleBuilderOptions['colors']>;
		defaults: StyleBuilderOptions['colors'];
		onchange?: () => void;
	} = $props();
</script>

{#each Object.keys(defaults ?? {}) as key (key)}
	<InputColor
		label={key}
		bind:value={colors[key]}
		defaultValue={(defaults ?? {})[key]}
		{onchange}
	/>
{/each}
