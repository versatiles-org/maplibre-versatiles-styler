<script lang="ts">
	import { opacityToValue, valueToOpacity, type LayerValue } from '../../layer_tree';
	import EditableValue from './EditableValue.svelte';
	import InputRow from './InputRow.svelte';
	import { parseSliderInput } from './number_slider';

	let {
		label,
		hint,
		disabled = false,
		value,
		modified,
		onchange,
		onReset,
		expanded,
		onToggle,
	}: {
		label: string;
		hint?: string;
		disabled?: boolean;
		/** `undefined` when the groups below differ. */
		value: LayerValue | undefined;
		modified: boolean;
		onchange: (value: LayerValue) => void;
		onReset: () => void;
		expanded?: boolean;
		onToggle?: () => void;
	} = $props();

	let mixed = $derived(value === undefined);
	let percent = $derived(value === undefined ? 100 : Math.round(valueToOpacity(value) * 100));

	function handleCheckbox(e: Event) {
		onchange((e.target as HTMLInputElement).checked);
	}

	function handleTyped(text: string) {
		const opacity = parseSliderInput(text, {
			min: 0,
			max: 1,
			scale: 100,
			step: 0.01,
			logarithmic: false,
		});
		if (opacity !== undefined) onchange(opacityToValue(opacity));
	}

	function handleRange(e: Event) {
		onchange(opacityToValue(parseFloat((e.target as HTMLInputElement).value) / 100));
	}
</script>

<InputRow
	{label}
	{hint}
	{disabled}
	containerClass="visibility-container"
	isModified={modified}
	{onReset}
	{expanded}
	{onToggle}
>
	{#snippet children(uid)}
		<input
			id={uid}
			type="checkbox"
			checked={value !== false && !mixed}
			indeterminate={mixed}
			{disabled}
			aria-label="Show {label}"
			onchange={handleCheckbox}
		/>
		<input
			type="range"
			min="0"
			max="100"
			step="5"
			value={percent}
			style:--val="{percent}%"
			disabled={disabled || mixed}
			aria-label="{label} opacity"
			onchange={handleRange}
		/>
		<EditableValue
			label="{label} opacity"
			{disabled}
			display={mixed ? '—' : `${percent}%`}
			editText={mixed ? '' : String(percent)}
			oncommit={handleTyped}
		/>
	{/snippet}
</InputRow>
