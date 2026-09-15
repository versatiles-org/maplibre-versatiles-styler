<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		description,
		open = false,
		listClass = '',
		onReset,
		changes = 0,
		children,
	}: {
		title: string;
		description?: string;
		open?: boolean;
		listClass?: string;
		onReset?: () => void;
		/** How many settings of the section differ from their defaults: shown, with the reset button, when any do. */
		changes?: number;
		children: Snippet;
	} = $props();

	function handleReset(e: MouseEvent) {
		e.preventDefault();
		onReset?.();
	}
</script>

<details {open}>
	<summary>
		<span class="section-title">{title}</span>
		{#if changes > 0}
			<span class="section-count" title="{changes} {changes === 1 ? 'change' : 'changes'}"
				>{changes}</span
			>
			{#if onReset}
				<button
					type="button"
					class="section-reset"
					title="Reset this section"
					aria-label="Reset {title}"
					onclick={handleReset}>&circlearrowleft;</button
				>
			{/if}
		{/if}
	</summary>
	<div class="maplibregl-list {listClass}">
		{#if description}
			<p class="section-description">{description}</p>
		{/if}
		{@render children()}
	</div>
</details>
