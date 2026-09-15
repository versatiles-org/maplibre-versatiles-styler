<script lang="ts">
	import InputRow from './InputRow.svelte';
	import EditableValue from './EditableValue.svelte';
	import {
		parseSliderInput,
		sliderLabel,
		sliderPosition,
		sliderRange,
		sliderValue,
	} from './number_slider';

	let {
		label,
		hint,
		disabled = false,
		value = $bindable(),
		defaultValue,
		min,
		max,
		scale = 1,
		step,
		logarithmic = false,
		unit = '',
		placeholder = 'Mixed',
		modified,
		onchange,
	}: {
		label: string;
		hint?: string;
		disabled?: boolean;
		/** `undefined` shows `placeholder`, e.g. for a group whose topics differ. */
		value: number | undefined;
		/** Reset writes it; `undefined` when the defaults differ, too. */
		defaultValue: number | undefined;
		min: number;
		max: number;
		/** Factor from the value to what is shown, e.g. 100 for percent. */
		scale?: number;
		/** The smallest change of the value. Default: 1 of what is shown (1 %, 1°). */
		step?: number;
		/** Spread the slider over the ratio `min`–`max`, for factors where 1 means no change. */
		logarithmic?: boolean;
		unit?: string;
		placeholder?: string;
		/** Overrides `value !== defaultValue`, when `value` summarises several settings. */
		modified?: boolean;
		onchange?: () => void;
	} = $props();

	let options = $derived({ min, max, scale, step: step ?? 1 / scale, logarithmic });
	let range = $derived(sliderRange(options));
	let isModified = $derived(modified ?? value !== defaultValue);

	function handleChange(e: Event) {
		const input = e.target as HTMLInputElement;
		value = sliderValue(parseFloat(input.value), options);
		onchange?.();
	}

	function handleTyped(text: string) {
		const typed = parseSliderInput(text, options);
		if (typed === undefined || typed === value) return;
		value = typed;
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
	containerClass={value === undefined ? 'number-container mixed' : 'number-container'}
	{isModified}
	onReset={reset}
>
	{#snippet children(uid)}
		<input
			id={uid}
			type="range"
			min={range.min}
			max={range.max}
			step={range.step}
			value={sliderPosition(value ?? defaultValue ?? min, options)}
			{disabled}
			onchange={handleChange}
		/>
		<EditableValue
			{label}
			{disabled}
			display={value === undefined ? placeholder : sliderLabel(value, options, unit)}
			editText={value === undefined ? '' : sliderLabel(value, options, '')}
			oncommit={handleTyped}
		/>
	{/snippet}
</InputRow>
