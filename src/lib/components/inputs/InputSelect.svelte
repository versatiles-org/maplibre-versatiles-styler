<script lang="ts">
	import type { SelectOption } from './select';
	import InputRow from './InputRow.svelte';

	let {
		label,
		hint,
		disabled = false,
		value = $bindable(),
		defaultValue,
		options,
		placeholder = '',
		modified,
		expanded,
		onToggle,
		warning,
		onchange,
	}: {
		label: string;
		hint?: string;
		disabled?: boolean;
		/** `undefined` shows `placeholder`, e.g. for a group whose topics differ. */
		value: string | undefined;
		defaultValue: string | undefined;
		options: SelectOption[] | Record<string, string>;
		placeholder?: string;
		/** Overrides `value !== defaultValue`, e.g. when `value` summarises several settings. */
		modified?: boolean;
		expanded?: boolean;
		onToggle?: () => void;
		warning?: string;
		onchange?: () => void;
	} = $props();

	let isModified = $derived(modified ?? value !== defaultValue);

	let list: SelectOption[] = $derived(
		Array.isArray(options)
			? options
			: Object.entries(options).map(([optionLabel, optionValue]) => ({
					label: optionLabel,
					value: optionValue,
				}))
	);

	/** Options in order, with consecutive options of the same group collected under it. */
	let sections = $derived.by(() => {
		const result: { group?: string; options: SelectOption[] }[] = [];
		for (const option of list) {
			const last = result[result.length - 1];
			if (last && last.group === option.group) last.options.push(option);
			else result.push({ group: option.group, options: [option] });
		}
		return result;
	});

	function handleChange(e: Event) {
		value = (e.target as HTMLSelectElement).value;
		onchange?.();
	}

	function reset() {
		value = defaultValue;
		onchange?.();
	}
</script>

{#snippet optionList(options: SelectOption[])}
	{#each options as option (option.value)}
		<option value={option.value}>{option.label}</option>
	{/each}
{/snippet}

<InputRow
	{label}
	{hint}
	{disabled}
	containerClass="select-container"
	{isModified}
	onReset={reset}
	{expanded}
	{onToggle}
	{warning}
>
	{#snippet children(uid)}
		<select id={uid} value={value ?? ''} {disabled} onchange={handleChange}>
			{#if value === undefined}
				<option value="" disabled>{placeholder}</option>
			{/if}
			{#each sections as section, index (index)}
				{#if section.group === undefined}
					{@render optionList(section.options)}
				{:else}
					<optgroup label={section.group}>
						{@render optionList(section.options)}
					</optgroup>
				{/if}
			{/each}
		</select>
	{/snippet}
</InputRow>
