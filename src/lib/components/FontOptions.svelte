<script lang="ts">
	import type { StyleBuilderOptions } from '@versatiles/style';
	import InputSelect from './InputSelect.svelte';

	let {
		fonts = $bindable(),
		defaults,
		fontNames,
		onchange,
	}: {
		fonts: NonNullable<StyleBuilderOptions['fonts']>;
		defaults: StyleBuilderOptions['fonts'];
		fontNames: Promise<Record<string, string>>;
		onchange?: () => void;
	} = $props();
</script>

{#await fontNames then names}
	<InputSelect
		label="Font Regular"
		bind:value={fonts.regular}
		defaultValue={defaults?.regular ?? ''}
		options={names}
		{onchange}
	/>
	<InputSelect
		label="Font Bold"
		bind:value={fonts.bold}
		defaultValue={defaults?.bold ?? ''}
		options={names}
		{onchange}
	/>
{/await}
