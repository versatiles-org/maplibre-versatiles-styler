<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		hint,
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
		hint?: string;
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
				onclick={onToggle}>▸</button
			>
		{:else if expanded !== undefined}
			<!-- Keeps the label in line with rows that have an expander. -->
			<span class="expander" aria-hidden="true"></span>
		{/if}
		{@render leading?.()}
		<label for={uid} title={hint}>{label}</label>
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
