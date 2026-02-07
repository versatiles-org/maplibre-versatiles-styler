<script lang="ts">
	import InputSelect from './InputSelect.svelte';

	let {
		language = $bindable(),
		languages,
		onchange,
	}: {
		language: string;
		languages: Promise<Record<string, string>>;
		onchange?: () => void;
	} = $props();
</script>

{#await languages then langs}
	<InputSelect label="Language" bind:value={language} defaultValue="" options={langs} {onchange} />
{/await}
