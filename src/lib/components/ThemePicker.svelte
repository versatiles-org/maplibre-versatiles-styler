<script lang="ts">
	import type { Palette } from '@versatiles/style';
	import { themeGroups, themeSwatch, type StyleKey } from '../style/config';
	import { placeBesidePane, portalToMap, type PopoverPosition } from './inputs/popover';

	let {
		styleKeys,
		value,
		anchor,
		onselect,
		onclose,
	}: {
		/** The styles to choose from: the themes, and `satellite`. */
		styleKeys: StyleKey[];
		value: StyleKey;
		/** The button that opened the picker: it is placed next to it, and clicks on it do not close it. */
		anchor: HTMLElement;
		onselect: (key: StyleKey) => void;
		onclose: () => void;
	} = $props();

	const uid = $props.id();

	let groups = $derived(themeGroups(styleKeys));
	let position = $state<PopoverPosition>({
		left: 0,
		top: 0,
		maxHeight: 520,
		pointer: 0,
		beside: true,
	});

	/** Once the picker is placed and visible: it is moved by `portalToMap` and hidden until then. */
	function focus(picker: HTMLElement) {
		(
			picker.querySelector<HTMLInputElement>('input:checked') ??
			picker.querySelector<HTMLInputElement>('input')
		)?.focus();
	}

	/**
	 * Whether the last thing done in the picker was a key press. The arrow keys move through the
	 * radios, and the browser reports each move as a click on the radio it lands on — which nothing in
	 * the event tells from a click with the pointer in every browser, so the picker keeps track itself.
	 */
	let byKey = false;

	/**
	 * A click with the pointer picks a style and closes the picker. With the arrow keys the map
	 * follows, and the picker stays open until Enter or Escape.
	 */
	function handleClick(key: StyleKey) {
		onselect(key);
		if (!byKey) onclose();
	}

	function handleKeydown(e: KeyboardEvent) {
		byKey = true;
		if (e.key !== 'Enter') return;
		e.preventDefault();
		onclose();
	}
</script>

{#snippet card(key: StyleKey, caption?: string)}
	{@const swatch = key === 'satellite' ? undefined : themeSwatch(key as Palette)}
	<label title={key}>
		<input
			type="radio"
			name="{uid}-style"
			value={key}
			checked={value === key}
			aria-label={key.replace(/-dark$/, ' dark')}
			onclick={() => handleClick(key)}
		/>
		<span
			class="theme-card"
			class:satellite-card={!swatch}
			style:--land={swatch?.land}
			style:--water={swatch?.water}
			style:--park={swatch?.park}
			style:--street={swatch?.street}
			style:--motorway={swatch?.motorway}
		></span>
		{#if caption}<span class="theme-caption">{caption}</span>{/if}
	</label>
{/snippet}

<div class="maplibregl-versatiles-styler theme-picker-layer" {@attach portalToMap(anchor)}>
	{#if position.beside}
		<!-- points at the button that opened the picker -->
		<span
			class="popover-arrow"
			style:left="{position.left - 6}px"
			style:top="{position.top + position.pointer - 6}px"
		></span>
	{/if}
	<div
		class="theme-picker"
		role="dialog"
		aria-label="Base style"
		tabindex="-1"
		style:left="{position.left}px"
		style:top="{position.top}px"
		style:max-height="{position.maxHeight}px"
		onkeydown={handleKeydown}
		onpointerdown={() => (byKey = false)}
		{@attach placeBesidePane({ anchor, onclose, onplace: (p) => (position = p), onready: focus })}
	>
		<div class="theme-picker-header">
			<span class="theme-picker-title">Base style</span>
			<button type="button" class="theme-picker-close" aria-label="Close" onclick={onclose}
				>×</button
			>
		</div>
		<div class="theme-picker-body" role="radiogroup" aria-label="Base style">
			{#if groups.own.length > 0}
				<!-- A column per palette: its light theme, its dark theme below, then its name. -->
				<div class="theme-grid theme-pairs">
					{#each groups.own as row (row.name)}
						{#if row.light}{@render card(row.light)}{:else}<span></span>{/if}
						{#if row.dark}{@render card(row.dark)}{:else}<span></span>{/if}
						<span class="theme-caption">{row.name}</span>
					{/each}
				</div>
			{/if}
			{#if groups.lookalikes.length > 0}
				<h5>Lookalikes</h5>
				<div class="theme-grid">
					{#each groups.lookalikes as key (key)}
						{@render card(key, key)}
					{/each}
				</div>
			{/if}
			{#if groups.satellite}
				<h5>Imagery</h5>
				<div class="theme-grid">
					{@render card('satellite', 'satellite')}
				</div>
			{/if}
		</div>
	</div>
</div>
