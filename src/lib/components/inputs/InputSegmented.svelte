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
		modified,
		onchange,
	}: {
		label: string;
		hint?: string;
		disabled?: boolean;
		/** `undefined` selects no option, e.g. for a group whose topics differ. */
		value: string | undefined;
		defaultValue: string | undefined;
		/** Two or three short options; `title` names an option whose label is a symbol. */
		options: SelectOption[];
		/** Overrides `value !== defaultValue`, e.g. when `value` summarises several settings. */
		modified?: boolean;
		onchange?: () => void;
	} = $props();

	let isModified = $derived(modified ?? value !== defaultValue);
	let selectedIndex = $derived(options.findIndex((option) => option.value === value));

	function choose(next: string) {
		if (next === value) return;
		value = next;
		onchange?.();
	}

	/** ←/→ and Home/End move the selection, as in a radio group. */
	function handleKeydown(e: KeyboardEvent) {
		const current = Math.max(0, selectedIndex);
		const moves: Record<string, number> = {
			ArrowLeft: current - 1,
			ArrowUp: current - 1,
			ArrowRight: current + 1,
			ArrowDown: current + 1,
			Home: 0,
			End: options.length - 1,
		};
		if (!(e.key in moves)) return;
		e.preventDefault();
		const index = (moves[e.key] + options.length) % options.length;
		choose(options[index].value);
		const group = (e.currentTarget as HTMLElement).parentElement;
		(group?.children[index] as HTMLElement | undefined)?.focus();
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
	containerClass="segmented-container"
	{isModified}
	onReset={reset}
>
	{#snippet children(uid)}
		<div id={uid} class="segmented" role="radiogroup" aria-label={label}>
			{#each options as option, index (option.value)}
				{@const checked = index === selectedIndex}
				<button
					type="button"
					role="radio"
					aria-checked={checked}
					aria-label={option.title}
					title={option.title}
					tabindex={checked || (selectedIndex === -1 && index === 0) ? 0 : -1}
					{disabled}
					onclick={() => choose(option.value)}
					onkeydown={handleKeydown}>{option.label}</button
				>
			{/each}
		</div>
	{/snippet}
</InputRow>
