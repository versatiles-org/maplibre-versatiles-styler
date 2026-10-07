<script lang="ts">
	import type { Snippet } from 'svelte';
	import HintTip from './HintTip.svelte';

	let {
		label,
		hint,
		name,
		containerClass,
		disabled = false,
		isModified,
		onReset,
		expanded,
		onToggle,
		warning,
		leading,
		children,
	}: {
		label: string;
		/** An explanation of the setting: an ⓘ after the label shows it as a tooltip. */
		hint?: string;
		/** What the row stands for in the style, e.g. an option key: the tooltip of the label. */
		name?: string;
		containerClass: string;
		disabled?: boolean;
		isModified: boolean;
		onReset: () => void;
		/** With `onToggle`: shows an expander before the label, open when `true`. */
		expanded?: boolean;
		onToggle?: () => void;
		/** A notice shown below the row. */
		warning?: string;
		/** A control before the label, e.g. a color swatch or a visibility toggle. */
		leading?: Snippet;
		children: Snippet<[string]>;
	} = $props();

	const uid = $props.id();

	let tip = $state<HintTip>();
	let touched = false;

	/** A finger on the label of a row with a hint opens the hint: the ⓘ alone is small to hit. */
	function tapLabel(e: MouseEvent) {
		if (!touched) return;
		e.preventDefault();
		tip?.toggle();
	}
</script>

<div class="entry {containerClass}" class:disabled class:modified={isModified}>
	<div class="label">
		{#if onToggle}
			<button
				type="button"
				class="expander"
				class:expanded
				aria-expanded={expanded}
				aria-label="{expanded ? 'Collapse' : 'Expand'} {label}"
				onclick={onToggle}
			></button>
		{:else if expanded !== undefined}
			<!-- Keeps the label in line with rows that have an expander. -->
			<span class="expander" aria-hidden="true"></span>
		{/if}
		{@render leading?.()}
		{#if hint}
			<!-- One run of text, so that the ⓘ follows the last word of a label that wraps. -->
			<span class="hinted">
				<!-- A larger target for a finger only: the ⓘ button is what the keyboard and a mouse use. -->
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
				<label
					for={uid}
					title={name}
					onpointerdown={(e) => (touched = e.pointerType !== 'mouse')}
					onclick={tapLabel}>{label}</label
				><HintTip {label} {hint} bind:this={tip} />
			</span>
		{:else}
			<label for={uid} title={name}>{label}</label>
		{/if}
	</div>
	<div class="input">
		{@render children(uid)}
		<button type="button" class="reset" disabled={disabled || !isModified} onclick={onReset}
			>&circlearrowleft;</button
		>
	</div>
	{#if warning}
		<p class="warning" role="note">⚠ {warning}</p>
	{/if}
</div>
