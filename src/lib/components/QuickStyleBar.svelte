<script lang="ts">
	import { styleName, type StyleKey } from '../style/config';
	import ThemeCard from './ThemeCard.svelte';

	let {
		styles,
		value,
		onselect,
		onopen,
		settings = $bindable(),
	}: {
		/** The styles to offer; one whose tiles are still loading is shown, but cannot be chosen yet. */
		styles: { key: StyleKey; ready: boolean }[];
		value: StyleKey;
		onselect: (key: StyleKey) => void;
		/** Opens the sidebar. */
		onopen: () => void;
		/** The button that opens the sidebar, for the focus to come back to when it closes. */
		settings?: HTMLButtonElement;
	} = $props();

	const uid = $props.id();
</script>

<!--
	The closed styler as a bar: a button for each style it offers, and one that opens the sidebar. Not
	a `maplibregl-ctrl-group`, which sizes every button in it to 29×29px.
-->
<div class="maplibregl-ctrl styler-quickbar">
	<div class="quickbar-styles" role="radiogroup" aria-label="Base style">
		{#each styles as style (style.key)}
			<label title={styleName(style.key)}>
				<input
					type="radio"
					name="{uid}-style"
					value={style.key}
					checked={value === style.key}
					disabled={!style.ready}
					aria-label={styleName(style.key)}
					onchange={() => onselect(style.key)}
				/>
				<ThemeCard key={style.key} />
			</label>
		{/each}
	</div>
	<button
		type="button"
		class="quickbar-settings"
		title="Open the style editor"
		aria-label="Open the style editor"
		aria-expanded="false"
		bind:this={settings}
		onclick={onopen}
	></button>
</div>
