<script lang="ts">
	import InputCheckbox from '../inputs/InputCheckbox.svelte';
	import InputSelect from '../inputs/InputSelect.svelte';

	let {
		language = $bindable(),
		languageStrict = $bindable(),
		languages,
		disabled = false,
	}: {
		language: string;
		languageStrict: boolean;
		languages: Record<string, string>;
		disabled?: boolean;
	} = $props();
</script>

<InputSelect
	label="Language"
	hint="The language of the labels. Local names shows every place in its own language, Browser language in that of the viewer's browser. A place without a name in the chosen language keeps its local name."
	bind:value={language}
	defaultValue="local"
	options={languages}
	{disabled}
/>
<InputCheckbox
	label="Only this language"
	hint="Hide labels that have no name in the selected language, instead of showing the local name."
	bind:value={languageStrict}
	defaultValue={false}
	disabled={disabled || language === 'local'}
/>
