<script lang="ts">
	import { normalizeColor, sameColor } from './color_model';
	import ColorPicker from './ColorPicker.svelte';
	import InputRow from './InputRow.svelte';

	let {
		label,
		hint,
		disabled = false,
		value = $bindable(),
		defaultValue,
		alpha = true,
		onchange,
	}: {
		label: string;
		hint?: string;
		disabled?: boolean;
		value: string;
		defaultValue: string;
		/** Whether the color has an alpha channel; off for options that ignore it. */
		alpha?: boolean;
		onchange?: () => void;
	} = $props();

	/** The value as shown: `#RRGGBB` or `#RRGGBBAA`; a text that is no color as it is. */
	let shown = $derived(normalizeColor(value, alpha) ?? value);
	let opaque = $derived(normalizeColor(value, false) ?? value);
	let isModified = $derived(!sameColor(value, defaultValue));
	let invalid = $state(false);
	let open = $state(false);
	let swatch = $state<HTMLButtonElement>();

	/** A color from the picker. */
	function write(color: string) {
		invalid = false;
		value = color;
		onchange?.();
	}

	function close() {
		open = false;
		swatch?.focus();
	}

	/** Applies the typed text if it is a color, else puts the value back. */
	function commit(input: HTMLInputElement) {
		const color = normalizeColor(input.value, alpha);
		if (color === undefined) {
			invalid = input.value.trim() !== '';
			input.value = shown;
			return;
		}
		invalid = false;
		input.value = color;
		if (sameColor(color, value)) return;
		value = color;
		onchange?.();
	}

	function handleKeydown(e: KeyboardEvent) {
		const input = e.currentTarget as HTMLInputElement;
		if (e.key === 'Enter') {
			e.preventDefault();
			commit(input);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			invalid = false;
			input.value = shown;
		}
	}

	function reset() {
		invalid = false;
		value = defaultValue;
		onchange?.();
	}
</script>

<InputRow {label} {hint} {disabled} containerClass="color-container" {isModified} onReset={reset}>
	{#snippet leading()}
		<button
			type="button"
			class="color-swatch"
			style:--swatch={shown}
			style:--swatch-opaque={opaque}
			{disabled}
			aria-label="{label}: {shown}"
			aria-haspopup="dialog"
			aria-expanded={open}
			title="Choose a color"
			bind:this={swatch}
			onclick={() => (open = !open)}
		></button>
	{/snippet}
	{#snippet children(uid)}
		<input
			id={uid}
			class="color-text"
			class:invalid
			type="text"
			value={shown}
			{disabled}
			spellcheck="false"
			autocomplete="off"
			aria-invalid={invalid}
			title="A color: #RRGGBB{alpha ? ', #RRGGBBAA' : ''}, rgb(…) or hsl(…)"
			oninput={() => (invalid = false)}
			onkeydown={handleKeydown}
			onchange={(e) => commit(e.currentTarget)}
		/>
		{#if open && swatch}
			<ColorPicker title={label} {value} {alpha} anchor={swatch} onwrite={write} onclose={close} />
		{/if}
	{/snippet}
</InputRow>
