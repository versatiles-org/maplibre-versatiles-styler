<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * A modal dialog.
	 *
	 * A native `<dialog>` opened with `showModal()`, which is what makes this work at all inside a
	 * MapLibre control. MapLibre puts a `transform` on the control corner, so `position: fixed` resolves
	 * against the control rather than the window — the reason the colour and font pickers portal
	 * themselves to the map container (see `inputs/popover.ts`). A modal dialog is painted in the
	 * browser's top layer instead, above everything and clipped by nothing, so none of that applies.
	 *
	 * The element still sits in the DOM under `.maplibregl-versatiles-styler`, because the top layer
	 * changes where a thing is painted, not where it is in the tree — so the design tokens and the
	 * `.versatiles-styler-dark` class on the map container reach it with no portal at all.
	 *
	 * Escape, the focus trap, inertness of the page behind and focus restored to the opener all come from
	 * `showModal()`.
	 */
	let {
		title,
		description,
		onclose,
		children,
		footer,
	}: {
		title: string;
		/** A sentence under the title saying what this dialog is for. */
		description?: string;
		onclose: () => void;
		children: Snippet;
		footer?: Snippet;
	} = $props();

	let dialog = $state<HTMLDialogElement | undefined>();

	// Opened once, on mount: the caller renders this component only while the dialog should be open, so
	// unmounting is what closes it.
	$effect(() => {
		if (dialog && !dialog.open) dialog.showModal();
	});

	/**
	 * A click on the backdrop. The backdrop is not an element of its own — a click beside the dialog's
	 * content still lands on the dialog itself, which is how it is told apart from a click inside.
	 */
	function handleClick(event: MouseEvent) {
		if (event.target === dialog) onclose();
	}
</script>

<dialog bind:this={dialog} class="styler-dialog" aria-label={title} {onclose} onclick={handleClick}>
	<div class="dialog-head">
		<div class="dialog-heading">
			<h2 class="dialog-title">{title}</h2>
			{#if description}
				<p class="dialog-description">{description}</p>
			{/if}
		</div>
		<button type="button" class="icon-button" aria-label="Close" onclick={onclose}>
			<span class="icon icon-close" aria-hidden="true"></span>
		</button>
	</div>
	<div class="dialog-body">
		{@render children()}
	</div>
	{#if footer}
		<div class="dialog-foot">
			{@render footer()}
		</div>
	{/if}
</dialog>
