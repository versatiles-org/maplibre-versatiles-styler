<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		open = false,
		listClass = '',
		children,
	}: {
		title: string;
		open?: boolean;
		listClass?: string;
		children: Snippet;
	} = $props();
</script>

<details {open}>
	<summary>{title}</summary>
	<div class="maplibregl-list {listClass}">
		{@render children()}
	</div>
</details>
