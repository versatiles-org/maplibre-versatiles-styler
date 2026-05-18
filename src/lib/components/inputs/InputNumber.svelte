<script lang="ts">
	import InputRow from './InputRow.svelte';

	let {
		label,
		hint,
		value = $bindable(),
		defaultValue,
		min,
		max,
		scale = 1,
		unit = '',
		onchange,
	}: {
		label: string;
		hint?: string;
		value: number;
		defaultValue: number;
		min: number;
		max: number;
		scale?: number;
		unit?: string;
		onchange?: () => void;
	} = $props();

	let isModified = $derived(value !== defaultValue);
	let scaledMin = $derived(min * scale);
	let scaledMax = $derived(max * scale);
	let scaledValue = $derived(clamp(value) * scale);
	let displayValue = $derived(Math.round(scaledValue * 100) / 100 + unit);

	function clamp(v: number): number {
		if (v < min) return min;
		if (v > max) return max;
		return v;
	}

	function handleChange(e: Event) {
		const input = e.target as HTMLInputElement;
		value = parseFloat(input.value) / scale;
		onchange?.();
	}

	function reset() {
		value = defaultValue;
		onchange?.();
	}
</script>

<InputRow {label} {hint} containerClass="number-container" {isModified} onReset={reset}>
	{#snippet children(uid)}
		<input
			id={uid}
			type="range"
			min={scaledMin}
			max={scaledMax}
			step="1"
			value={scaledValue}
			onchange={handleChange}
		/>
		<span class="value">{displayValue}</span>
	{/snippet}
</InputRow>
