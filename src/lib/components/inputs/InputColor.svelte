<script lang="ts">
	import { Color } from '@versatiles/style';
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
		value: string;
		defaultValue: string;
		onchange?: () => void;
	} = $props();

	/** `#rrggbbaa`, lowercase, for comparing colours however they are spelled. */
	function normalize(color: string): string {
		try {
			return Color.parse(color).asHex().toLowerCase();
		} catch {
			return color;
		}
	}

	let normalized = $derived(normalize(value));
	let isModified = $derived(normalized !== normalize(defaultValue));
	// `<input type="color">` only takes `#rrggbb`; the alpha channel is kept from the current value.
	let inputValue = $derived(normalized.slice(0, 7));

	function handleChange(e: Event) {
		const input = e.target as HTMLInputElement;
		value = input.value + normalized.slice(7);
		onchange?.();
	}

	function reset() {
		value = defaultValue;
		onchange?.();
	}
</script>

<InputRow {label} {hint} {disabled} containerClass="color-container" {isModified} onReset={reset}>
	{#snippet children(uid)}
		<input id={uid} type="color" value={inputValue} {disabled} onchange={handleChange} />
	{/snippet}
</InputRow>
