<script lang="ts">
	let {
		label,
		value = $bindable(),
		defaultValue,
		min,
		max,
		scale = 1,
		onchange,
	}: {
		label: string;
		value: number;
		defaultValue: number;
		min: number;
		max: number;
		scale?: number;
		onchange?: () => void;
	} = $props();

	let isModified = $derived(value !== defaultValue);
	let scaledMin = $derived(min * scale);
	let scaledMax = $derived(max * scale);
	let scaledValue = $derived(clamp(value) * scale);

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

<div class="entry number-container">
	<label>{label}</label>
	<div class="input">
		<input
			type="range"
			min={scaledMin}
			max={scaledMax}
			step="1"
			value={scaledValue}
			onchange={handleChange}
		/>
		<button type="button" disabled={!isModified} onclick={reset}>&circlearrowleft;</button>
	</div>
</div>
