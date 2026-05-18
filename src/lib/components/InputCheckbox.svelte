<script lang="ts">
	import InputRow from './InputRow.svelte';

	let {
		label,
		value = $bindable(),
		defaultValue,
		onchange,
	}: {
		label: string;
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

<InputRow {label} containerClass="checkbox-container" {isModified} onReset={reset}>
	{#snippet children(uid)}
		<input id={uid} type="checkbox" checked={value} onchange={handleChange} />
	{/snippet}
</InputRow>
