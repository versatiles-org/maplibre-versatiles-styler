<script lang="ts">
	import type { StyleKey } from '../style/config';
	import ThemeCard from './ThemeCard.svelte';
	import ThemePicker from './ThemePicker.svelte';

	let {
		styleKeys,
		value,
		onselect,
	}: {
		/** The styles to choose from: the themes, and `satellite`. */
		styleKeys: StyleKey[];
		value: StyleKey;
		onselect: (key: StyleKey) => void;
	} = $props();

	let open = $state(false);
	let trigger = $state<HTMLButtonElement>();

	function close() {
		open = false;
		trigger?.focus();
	}
</script>

<!-- The current style as a button, which opens the picker with all of them. -->
<button
	type="button"
	class="theme-button"
	aria-haspopup="dialog"
	aria-expanded={open}
	aria-label="Base style: {value}"
	title="Choose a base style"
	bind:this={trigger}
	onclick={() => (open = !open)}
>
	<ThemeCard key={value} />
	<span class="theme-button-name">{value}</span>
	<span class="theme-button-caret" aria-hidden="true">▾</span>
</button>
{#if open && trigger}
	<ThemePicker {styleKeys} {value} anchor={trigger} {onselect} onclose={close} />
{/if}
