<script lang="ts">
	import type { Palette } from '@versatiles/style';
	import { themeSwatch, type StyleKey } from '../style/config';
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
	let swatch = $derived(value === 'satellite' ? undefined : themeSwatch(value as Palette));

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
	<span
		class="theme-card"
		class:satellite-card={!swatch}
		style:--land={swatch?.land}
		style:--water={swatch?.water}
		style:--park={swatch?.park}
		style:--street={swatch?.street}
		style:--motorway={swatch?.motorway}
	></span>
	<span class="theme-button-name">{value}</span>
	<span class="theme-button-caret" aria-hidden="true">▾</span>
</button>
{#if open && trigger}
	<ThemePicker {styleKeys} {value} anchor={trigger} {onselect} onclose={close} />
{/if}
