<script lang="ts">
	import { Color } from '@versatiles/style';
	import InputRow from './InputRow.svelte';

	let {
		label,
		value = $bindable(),
		defaultValue,
		onchange,
	}: {
		label: string;
		value: Color | string | undefined;
		defaultValue: Color | string | undefined;
		onchange?: () => void;
	} = $props();

	let isModified = $derived(String(value) !== String(defaultValue));

	function handleChange(e: Event) {
		const input = e.target as HTMLInputElement;
		input.style.backgroundColor = input.value;
		value = Color.parse(input.value);
		onchange?.();
	}

	function reset() {
		value = defaultValue;
		onchange?.();
	}
</script>

<InputRow {label} containerClass="color-container" {isModified} onReset={reset}>
	{#snippet children(uid)}
		<input id={uid} type="color" value={String(value)} onchange={handleChange} />
	{/snippet}
</InputRow>
