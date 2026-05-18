<script lang="ts">
	import InputRow from './InputRow.svelte';

	let {
		label,
		value = $bindable(),
		defaultValue,
		options,
		onchange,
	}: {
		label: string;
		value: string | undefined;
		defaultValue: string;
		options: Record<string, string>;
		onchange?: () => void;
	} = $props();

	let isModified = $derived(value !== undefined && value !== defaultValue);
	$effect(() => {
		if (value === undefined) value = defaultValue;
	});

	function handleChange(e: Event) {
		const select = e.target as HTMLSelectElement;
		value = select.value ?? defaultValue;
		onchange?.();
	}

	function reset() {
		value = defaultValue;
		onchange?.();
	}
</script>

<InputRow {label} containerClass="select-container" {isModified} onReset={reset}>
	{#snippet children(uid)}
		<select id={uid} {value} onchange={handleChange}>
			{#each Object.entries(options) as [optLabel, optValue] (optValue)}
				<option value={optValue}>{optLabel}</option>
			{/each}
		</select>
	{/snippet}
</InputRow>
