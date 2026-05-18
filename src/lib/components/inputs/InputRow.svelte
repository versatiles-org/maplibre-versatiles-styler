<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		hint,
		containerClass,
		disabled = false,
		isModified,
		onReset,
		children,
	}: {
		label: string;
		hint?: string;
		containerClass: string;
		disabled?: boolean;
		isModified: boolean;
		onReset: () => void;
		children: Snippet<[string]>;
	} = $props();

	const uid = $props.id();
</script>

<div class="entry {containerClass}" class:disabled class:modified={isModified}>
	<label for={uid} title={hint}>{label}</label>
	<div class="input">
		{@render children(uid)}
		<button type="button" disabled={disabled || !isModified} onclick={onReset}
			>&circlearrowleft;</button
		>
	</div>
</div>
