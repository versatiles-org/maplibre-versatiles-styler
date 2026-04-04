<script lang="ts">
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

	const uid = $props.id();
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

<div class="entry select-container">
	<label for={uid}>{label}</label>
	<div class="input">
		<select id={uid} {value} onchange={handleChange}>
			{#each Object.entries(options) as [optLabel, optValue] (optValue)}
				<option value={optValue}>{optLabel}</option>
			{/each}
		</select>
		<button type="button" disabled={!isModified} onclick={reset}>&circlearrowleft;</button>
	</div>
</div>
