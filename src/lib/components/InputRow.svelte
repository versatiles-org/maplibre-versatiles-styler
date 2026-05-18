<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		containerClass,
		isModified,
		onReset,
		children,
	}: {
		label: string;
		containerClass: string;
		isModified: boolean;
		onReset: () => void;
		children: Snippet<[string]>;
	} = $props();

	const uid = $props.id();
</script>

<div class="entry {containerClass}">
	<label for={uid}>{label}</label>
	<div class="input">
		{@render children(uid)}
		<button type="button" disabled={!isModified} onclick={onReset}>&circlearrowleft;</button>
	</div>
</div>
