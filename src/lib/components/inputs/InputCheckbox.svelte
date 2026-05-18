<script lang="ts">
	import InputRow from './InputRow.svelte';

	let {
		label,
		hint,
		disabled = false,
		value = $bindable(),
		defaultValue,
		onchange,
	}: {
		label: string;
		hint?: string;
		disabled?: boolean;
		value: boolean;
		defaultValue: boolean;
		onchange?: () => void;
	} = $props();

	let isModified = $derived(value !== defaultValue);

	function handleChange(e: Event) {
		const input = e.target as HTMLInputElement;
		value = input.checked;
		onchange?.();
	}

	function reset() {
		value = defaultValue;
		onchange?.();
	}
</script>

<InputRow
	{label}
	{hint}
	{disabled}
	containerClass="checkbox-container"
	{isModified}
	onReset={reset}
>
	{#snippet children(uid)}
		<input id={uid} type="checkbox" checked={value} {disabled} onchange={handleChange} />
	{/snippet}
</InputRow>
