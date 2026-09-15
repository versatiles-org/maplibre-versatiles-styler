<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		description,
		open = false,
		listClass = '',
		onReset,
		modified = false,
		children,
	}: {
		title: string;
		description?: string;
		open?: boolean;
		listClass?: string;
		onReset?: () => void;
		/** Whether the section differs from its defaults: only then is its reset button shown. */
		modified?: boolean;
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
		{#if onReset && modified}
			<button type="button" class="section-reset" title="Reset this section" onclick={handleReset}
				>&circlearrowleft;</button
			>
		{/if}
	</summary>
	<div class="maplibregl-list {listClass}">
		{#if description}
			<p class="section-description">{description}</p>
		{/if}
		{@render children()}
	</div>
</details>
