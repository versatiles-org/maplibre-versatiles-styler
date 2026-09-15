<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { formatHex, parseColor, sameColor, type Hsva } from '../../color_model';
	import { frameWriter } from '../../frame';
	import ColorArea from './ColorArea.svelte';
	import { placeBesidePane, portalToMap, type PopoverPosition } from './popover';

	let {
		title,
		value,
		alpha = true,
		anchor,
		onwrite,
		onclose,
	}: {
		/** What the color is for, e.g. "Water". */
		title: string;
		/** The color of the row. Changes from outside (a reset) move the picker along. */
		value: string;
		/** Whether the color has an alpha channel. */
		alpha?: boolean;
		/** The swatch button that opened the picker. */
		anchor: HTMLElement;
		/** Writes a color to the row — at most once per animation frame while dragging. */
		onwrite: (color: string) => void;
		onclose: () => void;
	} = $props();

	/** The color the picker opened with: Escape and the "old" swatch go back to it. */
	const initial = untrack(() => value);
	const BLACK: Hsva = { h: 0, s: 0, v: 0, a: 1 };

	// The color being edited, unrounded. Converting back from the hex value on every change would lose the
	// hue of gray, black and white, and jitter by rounding.
	let hsva = $state<Hsva>(untrack(() => parseColor(value) ?? BLACK));
	let lastWritten = untrack(() => value);
	let position = $state<PopoverPosition>({ left: 0, top: 0, maxHeight: 520 });

	let current = $derived(formatHex(hsva, alpha));
	let opaque = $derived(formatHex(hsva, false));

	const writer = frameWriter<string>((color) => {
		lastWritten = color;
		onwrite(color);
	});

	// A change from outside, e.g. the reset button of the row: follow it, keeping the hue of a gray.
	$effect(() => {
		const outside = value;
		untrack(() => {
			if (sameColor(outside, lastWritten)) return;
			lastWritten = outside;
			const color = parseColor(outside);
			if (color) hsva = color.s === 0 || color.v === 0 ? { ...color, h: hsva.h } : color;
		});
	});

	onDestroy(() => writer.flush());

	function update(change: Partial<Hsva>) {
		hsva = { ...hsva, ...change };
		const color = formatHex(hsva, alpha);
		// Back at the written color: a waiting write would now be wrong.
		if (sameColor(color, lastWritten)) writer.cancel();
		else writer.schedule(color);
	}

	function close() {
		writer.flush();
		onclose();
	}

	/** Back to the color the picker opened with, and close. */
	function cancel() {
		writer.cancel();
		if (!sameColor(initial, lastWritten)) {
			lastWritten = initial;
			onwrite(initial);
		}
		onclose();
	}

	function revert() {
		const color = parseColor(initial);
		if (color) update(color);
		writer.flush();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key !== 'Enter' || (e.target as HTMLElement).closest('button')) return;
		e.preventDefault();
		close();
	}

	function focus(area: HTMLElement) {
		// After `portalToMap` has moved the picker: moving a focused element drops its focus.
		queueMicrotask(() => area.querySelector<HTMLElement>('.color-area')?.focus());
	}
</script>

<div class="maplibregl-versatiles-styler color-picker-layer" {@attach portalToMap(anchor)}>
	<div
		class="color-picker"
		role="dialog"
		tabindex="-1"
		aria-label="Color for {title}"
		style:left="{position.left}px"
		style:top="{position.top}px"
		style:max-height="{position.maxHeight}px"
		style:--hue={hsva.h}
		style:--color={current}
		style:--color-opaque={opaque}
		onkeydown={handleKeydown}
		{@attach placeBesidePane({
			anchor,
			onclose: close,
			onescape: cancel,
			onplace: (p) => (position = p),
		})}
		{@attach focus}
	>
		<div class="color-picker-header">
			<span>Color for {title}</span>
			<button type="button" class="color-picker-close" aria-label="Close" onclick={close}>×</button>
		</div>
		<div class="color-picker-body">
			<div class="color-picker-top">
				<ColorArea
					hue={hsva.h}
					saturation={hsva.s}
					value={hsva.v}
					onchange={(s, v) => update({ s, v })}
					oncommit={() => writer.flush()}
				/>
				<div class="color-picker-compare">
					<button
						type="button"
						class="color-picker-old"
						style:--swatch={initial}
						title="Back to {initial}"
						aria-label="Back to the old color, {initial}"
						onclick={revert}
					></button>
					<span class="color-picker-new" aria-hidden="true"></span>
				</div>
			</div>
			<label class="color-picker-slider">
				<span aria-hidden="true">Hue</span>
				<input
					type="range"
					class="color-track color-track-hue"
					aria-label="Hue"
					min="0"
					max="360"
					step="1"
					value={Math.round(hsva.h)}
					oninput={(e) => update({ h: Number(e.currentTarget.value) })}
					onchange={() => writer.flush()}
				/>
				<output aria-hidden="true">{Math.round(hsva.h)}°</output>
			</label>
			{#if alpha}
				<label class="color-picker-slider">
					<span aria-hidden="true">Alpha</span>
					<input
						type="range"
						class="color-track color-track-alpha"
						aria-label="Alpha"
						min="0"
						max="100"
						step="1"
						value={Math.round(hsva.a * 100)}
						oninput={(e) => update({ a: Number(e.currentTarget.value) / 100 })}
						onchange={() => writer.flush()}
					/>
					<output aria-hidden="true">{Math.round(hsva.a * 100)} %</output>
				</label>
			{/if}
		</div>
	</div>
</div>
