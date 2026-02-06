<script lang="ts">
	let {
		label,
		value = $bindable(),
		defaultValue,
		options,
		onchange,
	}: {
		label: string;
		value: string;
		defaultValue: string;
		options: Record<string, string>;
		onchange?: () => void;
	} = $props();

	let isModified = $derived(value !== defaultValue);

	function handleChange(e: Event) {
		const select = e.target as HTMLSelectElement;
		value = select.value;
		onchange?.();
	}

	function reset() {
		value = defaultValue;
		onchange?.();
	}
</script>

<div class="entry select-container">
	<label>{label}</label>
	<div class="input">
		<select {value} onchange={handleChange}>
			{#each Object.entries(options) as [optLabel, optValue] (optValue)}
				<option value={optValue}>{optLabel}</option>
			{/each}
		</select>
		<button type="button" disabled={!isModified} onclick={reset}>&circlearrowleft;</button>
	</div>
</div>
