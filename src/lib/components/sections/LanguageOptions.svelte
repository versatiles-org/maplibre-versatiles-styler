<script lang="ts">
	import InputSelect from '../inputs/InputSelect.svelte';

	let {
		language = $bindable(),
		languages,
		disabled = false,
	}: {
		language: string;
		languages: Record<string, string>;
		disabled?: boolean;
	} = $props();
</script>

<InputSelect
	label="Language"
	bind:value={language}
	defaultValue="local"
	options={languages}
	{disabled}
/>
