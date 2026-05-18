<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		description,
		open = false,
		listClass = '',
		children,
	}: {
		title: string;
		description?: string;
		open?: boolean;
		listClass?: string;
		children: Snippet;
	} = $props();
</script>

<details {open}>
	<summary>{title}</summary>
	<div class="maplibregl-list {listClass}">
		{#if description}
			<p class="section-description">{description}</p>
		{/if}
		{@render children()}
	</div>
</details>
