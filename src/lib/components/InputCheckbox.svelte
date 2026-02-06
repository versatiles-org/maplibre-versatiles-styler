<script lang="ts">
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

<div class="entry checkbox-container">
	<label>{label}</label>
	<div class="input">
		<input type="checkbox" checked={value} onchange={handleChange} />
		<button type="button" disabled={!isModified} onclick={reset}>&circlearrowleft;</button>
	</div>
</div>
