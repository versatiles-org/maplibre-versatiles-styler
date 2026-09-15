<script lang="ts">
	import type { FontFaceInfo } from '@versatiles/style';
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
		language,
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
		language: string;
		expanded?: boolean;
		onToggle?: () => void;
		warning?: string;
	} = $props();

	let open = $state(false);
	let trigger = $state<HTMLButtonElement>();
	let current = $derived(faces.find((face) => face.id === value));
	let isModified = $derived(modified ?? value !== defaultValue);

	function select(faceId: string) {
		value = faceId;
		close();
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
			bind:this={trigger}
			onclick={() => (open = !open)}
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
				title={label}
				{faces}
				{value}
				{origin}
				{sample}
				{language}
				anchor={trigger}
				onselect={select}
				onclose={close}
			/>
		{/if}
	{/snippet}
</InputRow>
