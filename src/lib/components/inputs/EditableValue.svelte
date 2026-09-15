<script lang="ts">
	let {
		label,
		display,
		editText,
		disabled = false,
		oncommit,
	}: {
		/** The name of the setting, for assistive technology. */
		label: string;
		/** The value as shown, e.g. "150%". */
		display: string;
		/** The text the field starts with, e.g. "150"; empty when there is no single value. */
		editText: string;
		disabled?: boolean;
		/** Called with the typed text when it is confirmed (Enter, or leaving the field). */
		oncommit: (text: string) => void;
	} = $props();

	let editing = $state(false);

	function commit(input: HTMLInputElement) {
		if (!editing) return;
		editing = false;
		oncommit(input.value);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			commit(e.target as HTMLInputElement);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			editing = false;
		}
	}

	function focusAndSelect(input: HTMLInputElement) {
		input.focus();
		input.select();
	}
</script>

{#if editing}
	<input
		class="value value-input"
		type="text"
		inputmode="decimal"
		value={editText}
		aria-label={label}
		onkeydown={handleKeydown}
		onblur={(e) => commit(e.currentTarget)}
		{@attach focusAndSelect}
	/>
{:else}
	<button
		type="button"
		class="value"
		{disabled}
		title="Click to enter a value"
		aria-label="{label}: {display}. Enter a value"
		onclick={() => (editing = true)}>{display}</button
	>
{/if}
