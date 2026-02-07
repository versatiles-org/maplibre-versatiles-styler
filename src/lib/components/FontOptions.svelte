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
		bind:value={() => (fonts.regular as string) ?? '', (v) => (fonts.regular = v)}
		defaultValue={(defaults?.regular as string) ?? ''}
		options={names}
		{onchange}
	/>
	<InputSelect
		label="Font Bold"
		bind:value={() => (fonts.bold as string) ?? '', (v) => (fonts.bold = v)}
		defaultValue={(defaults?.bold as string) ?? ''}
		options={names}
		{onchange}
	/>
{/await}
