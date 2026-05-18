<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		hint,
		containerClass,
		isModified,
		onReset,
		children,
	}: {
		label: string;
		hint?: string;
		containerClass: string;
		isModified: boolean;
		onReset: () => void;
		children: Snippet<[string]>;
	} = $props();

	const uid = $props.id();
</script>

<div class="entry {containerClass}">
	<label for={uid} title={hint}>{label}</label>
	<div class="input">
		{@render children(uid)}
		<button type="button" disabled={!isModified} onclick={onReset}>&circlearrowleft;</button>
	</div>
</div>
