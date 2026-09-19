<script lang="ts">
	import type { FontFaceInfo } from '@versatiles/style';
	import type { FontUse } from '../../fonts/families';
	import { useFontPickerState } from '../state/font_picker.svelte';
	import FontPicker from './FontPicker.svelte';
	import FontPreview from './FontPreview.svelte';
	import InputRow from './InputRow.svelte';

	let {
		label,
		hint,
		disabled = false,
		value = $bindable(),
		defaultValue,
		modified,
		faces,
		origin,
		sample,
		pickerTitle,
		language,
		layers = [],
		usage,
		expanded,
		onToggle,
		warning,
	}: {
		label: string;
		hint?: string;
		disabled?: boolean;
		/** The face in use; `undefined` shows "Mixed". Reset writes `defaultValue`, which may be `undefined`. */
		value: string | undefined;
		defaultValue: string | undefined;
		/** Overrides `value !== defaultValue`, when `value` summarises several settings. */
		modified?: boolean;
		faces: FontFaceInfo[];
		origin: string;
		/** The preview text in the picker. */
		sample: string;
		/** What the picker is for, "Font for …". Default: `label`. */
		pickerTitle?: string;
		language: string;
		/** The text layers the font is for, to read the scripts of their labels in view. */
		layers?: string[];
		/** The faces in use in this style, for the picker's "Used in this style". */
		usage: FontUse[];
		expanded?: boolean;
		onToggle?: () => void;
		warning?: string;
	} = $props();

	const shared = useFontPickerState();
	const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
	const shortcut = isMac ? '⌘' : 'Ctrl+';

	let open = $state(false);
	let trigger = $state<HTMLButtonElement>();
	let current = $derived(faces.find((face) => face.id === value));
	let isModified = $derived(modified ?? value !== defaultValue);

	function select(faceId: string, closePicker: boolean) {
		value = faceId;
		if (closePicker) close();
	}

	/** Ctrl/Cmd+C copies the face of this row, Ctrl/Cmd+V pastes a copied face into it. */
	function handleKeydown(e: KeyboardEvent) {
		if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
		const key = e.key.toLowerCase();
		if (key === 'c' && value !== undefined) {
			shared.clipboard = value;
		} else if (key === 'v' && shared.clipboard !== undefined && !disabled) {
			value = shared.clipboard;
		} else {
			return;
		}
		e.preventDefault();
	}

	function close() {
		open = false;
		trigger?.focus();
	}

	function reset() {
		value = defaultValue;
	}
</script>

<InputRow
	{label}
	{hint}
	{disabled}
	containerClass="font-container"
	{isModified}
	onReset={reset}
	{expanded}
	{onToggle}
	{warning}
>
	{#snippet children(uid)}
		<button
			id={uid}
			type="button"
			class="font-button"
			{disabled}
			aria-haspopup="dialog"
			aria-expanded={open}
			aria-label="{label}: {current?.title ?? value ?? 'Mixed'}"
			title="Choose a font · {shortcut}C copies it, {shortcut}V pastes a copied font"
			bind:this={trigger}
			onclick={() => (open = !open)}
			onkeydown={handleKeydown}
		>
			{#if value === undefined}
				<span class="font-button-mixed">Mixed</span>
			{:else}
				<FontPreview {origin} faceId={value} text={current?.title ?? value} size={12} />
			{/if}
			<span class="font-button-caret" aria-hidden="true">▾</span>
		</button>
		{#if open && trigger}
			<FontPicker
				title={pickerTitle ?? label}
				{faces}
				{value}
				{origin}
				{sample}
				{language}
				{layers}
				{usage}
				anchor={trigger}
				onselect={select}
				onclose={close}
			/>
		{/if}
	{/snippet}
</InputRow>
