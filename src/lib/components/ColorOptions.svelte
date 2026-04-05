<script lang="ts">
	import type { Color, StyleBuilderOptions } from '@versatiles/style';
	import InputColor from './InputColor.svelte';

	interface Colors {
		[key: string]: Color | string | undefined;
	}

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
		bind:value={(colors as Colors)[key]}
		defaultValue={((defaults as Colors) ?? {})[key]}
		{onchange}
	/>
{/each}
