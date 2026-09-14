<script lang="ts">
	import InputRow from './InputRow.svelte';

	let {
		label,
		hint,
		disabled = false,
		value = $bindable(),
		defaultValue,
		placeholder = '',
		modified,
		expanded,
		onToggle,
		onchange,
	}: {
		label: string;
		hint?: string;
		disabled?: boolean;
		/** `undefined` shows an empty field with `placeholder`. */
		value: string | undefined;
		defaultValue: string | undefined;
		placeholder?: string;
		/** Overrides `value !== defaultValue`, e.g. when `value` summarises several settings. */
		modified?: boolean;
		expanded?: boolean;
		onToggle?: () => void;
		onchange?: () => void;
	} = $props();

	let isModified = $derived(modified ?? value !== defaultValue);

	function handleChange(e: Event) {
		const text = (e.target as HTMLInputElement).value.trim();
		if (text === '') return;
		value = text;
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
	containerClass="text-input-container"
	{isModified}
	onReset={reset}
	{expanded}
	{onToggle}
>
	{#snippet children(uid)}
		<input
			id={uid}
			type="text"
			value={value ?? ''}
			{placeholder}
			{disabled}
			onchange={handleChange}
		/>
	{/snippet}
</InputRow>
